/*
 * Majic — Discord install detection and injection
 */

package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"
)

type Branch struct {
	Key         string
	Name        string
	PackageName string
	Process     string
	Paths       []string
}

type DiscordInstall struct {
	Branch    Branch
	Resources string
}

func (d DiscordInstall) appAsar() string      { return filepath.Join(d.Resources, "app.asar") }
func (d DiscordInstall) originalAsar() string { return filepath.Join(d.Resources, "_app.asar") }

func branches() []Branch {
	home, _ := os.UserHomeDir()
	local := os.Getenv("LOCALAPPDATA")

	switch runtime.GOOS {
	case "windows":
		return []Branch{
			{"stable", "Discord", "discord", "Discord.exe", []string{filepath.Join(local, "Discord")}},
			{"ptb", "Discord PTB", "discordptb", "DiscordPTB.exe", []string{filepath.Join(local, "DiscordPTB")}},
			{"canary", "Discord Canary", "discordcanary", "DiscordCanary.exe", []string{filepath.Join(local, "DiscordCanary")}},
		}
	case "darwin":
		return []Branch{
			{"stable", "Discord", "discord", "Discord", []string{"/Applications/Discord.app/Contents/Resources"}},
			{"ptb", "Discord PTB", "discordptb", "Discord PTB", []string{"/Applications/Discord PTB.app/Contents/Resources"}},
			{"canary", "Discord Canary", "discordcanary", "Discord Canary", []string{"/Applications/Discord Canary.app/Contents/Resources"}},
		}
	default:
		linux := func(name string) []string {
			return []string{
				filepath.Join("/usr/share", name, "resources"),
				filepath.Join("/usr/lib", name, "resources"),
				filepath.Join("/opt", name, "resources"),
				filepath.Join(home, ".local/share", name, "resources"),
			}
		}
		return []Branch{
			{"stable", "Discord", "discord", "Discord", linux("discord")},
			{"ptb", "Discord PTB", "discordptb", "DiscordPTB", linux("discord-ptb")},
			{"canary", "Discord Canary", "discordcanary", "DiscordCanary", linux("discord-canary")},
		}
	}
}

func compareVersions(a, b string) bool {
	pa, pb := strings.Split(a, "."), strings.Split(b, ".")
	for i := 0; i < len(pa) && i < len(pb); i++ {
		na, _ := strconv.Atoi(pa[i])
		nb, _ := strconv.Atoi(pb[i])
		if na != nb {
			return na < nb
		}
	}
	return len(pa) < len(pb)
}

func latestWindowsResources(base string) string {
	entries, err := os.ReadDir(base)
	if err != nil {
		return ""
	}

	var versions []string
	for _, entry := range entries {
		if entry.IsDir() && strings.HasPrefix(entry.Name(), "app-") {
			versions = append(versions, strings.TrimPrefix(entry.Name(), "app-"))
		}
	}
	if len(versions) == 0 {
		return ""
	}

	sort.Slice(versions, func(i, j int) bool { return compareVersions(versions[i], versions[j]) })
	return filepath.Join(base, "app-"+versions[len(versions)-1], "resources")
}

func findInstalls() []DiscordInstall {
	var installs []DiscordInstall
	for _, branch := range branches() {
		for _, path := range branch.Paths {
			resources := path
			if runtime.GOOS == "windows" {
				resources = latestWindowsResources(path)
			}
			if resources == "" {
				continue
			}

			_, asarErr := os.Stat(filepath.Join(resources, "app.asar"))
			_, originalErr := os.Stat(filepath.Join(resources, "_app.asar"))
			if asarErr == nil || originalErr == nil {
				installs = append(installs, DiscordInstall{Branch: branch, Resources: resources})
				break
			}
		}
	}
	return installs
}

func isMajicStub(path string) bool {
	data, err := readAsarFile(path, "package.json")
	if err != nil {
		return false
	}
	var pkg struct {
		Majic bool `json:"majic"`
	}
	return json.Unmarshal(data, &pkg) == nil && pkg.Majic
}

func (d DiscordInstall) IsInjected() bool {
	_, err := os.Stat(d.originalAsar())
	return err == nil && isMajicStub(d.appAsar())
}

func (d DiscordInstall) Inject(patcherPath string) error {
	if _, err := os.Stat(d.originalAsar()); err == nil {
		if !isMajicStub(d.appAsar()) {
			return errors.New(tr("errOtherMod"))
		}
	} else if err := os.Rename(d.appAsar(), d.originalAsar()); err != nil {
		return err
	}

	_ = os.RemoveAll(filepath.Join(d.Resources, "app"))

	patcherJSON, _ := json.Marshal(patcherPath)
	packageJSON, _ := json.Marshal(map[string]any{"name": d.Branch.PackageName, "main": "index.js", "majic": true})

	return writeAsar(d.appAsar(), []asarFile{
		{Name: "index.js", Contents: []byte(fmt.Sprintf("process.env.MAJIC_INJECTOR_DIR = __dirname;\nrequire(%s);\n", patcherJSON))},
		{Name: "package.json", Contents: packageJSON},
	})
}

func (d DiscordInstall) Uninject() error {
	if _, err := os.Stat(d.originalAsar()); err != nil {
		return errors.New(tr("errNotInstalled"))
	}
	if !isMajicStub(d.appAsar()) {
		return errors.New(tr("errNotOurAsar"))
	}
	if err := os.Remove(d.appAsar()); err != nil {
		return err
	}
	return os.Rename(d.originalAsar(), d.appAsar())
}

func (d DiscordInstall) Close() {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("taskkill", "/F", "/IM", d.Branch.Process)
	default:
		cmd = exec.Command("pkill", "-x", d.Branch.Process)
	}
	if cmd.Run() == nil {
		time.Sleep(1500 * time.Millisecond)
	}
}
