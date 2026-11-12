/*
 * Majic — installer entry point
 */

package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

var input = bufio.NewReader(os.Stdin)

func prompt(text string) string {
	fmt.Print(text)
	line, _ := input.ReadString('\n')
	return strings.TrimSpace(line)
}

func install(target DiscordInstall) error {
	fmt.Println(tr("downloading"))
	name, err := downloadMajic()
	if err != nil {
		return err
	}
	fmt.Printf(tr("downloaded")+"\n", name)

	fmt.Printf(tr("closing")+"\n", target.Branch.Name)
	target.Close()

	fmt.Printf(tr("injecting")+"\n", target.Branch.Name)
	if err := target.Inject(filepath.Join(distDir(), "patcher.js")); err != nil {
		return err
	}

	fmt.Printf(tr("done")+"\n", target.Branch.Name)
	return nil
}

func uninstall(target DiscordInstall) error {
	fmt.Printf(tr("closing")+"\n", target.Branch.Name)
	target.Close()

	if err := target.Uninject(); err != nil {
		return err
	}
	fmt.Printf(tr("uninstalled")+"\n", target.Branch.Name)
	return nil
}

func findBranch(installs []DiscordInstall, key string) (DiscordInstall, bool) {
	for _, candidate := range installs {
		if candidate.Branch.Key == key {
			return candidate, true
		}
	}
	return DiscordInstall{}, false
}

func runCli(installs []DiscordInstall, branch string, remove bool) int {
	target, ok := findBranch(installs, branch)
	if !ok {
		fmt.Printf(tr("unknownBranch")+"\n", branch)
		return 1
	}

	action := install
	if remove {
		action = uninstall
	}
	if err := action(target); err != nil {
		fmt.Printf(tr("failed")+"\n", err)
		return 1
	}
	return 0
}

func runInteractive(installs []DiscordInstall) {
	defer prompt(tr("pressEnter"))

	fmt.Println(tr("title"))
	fmt.Println(strings.Repeat("=", len([]rune(tr("title")))))
	fmt.Println()

	if len(installs) == 0 {
		fmt.Println(tr("noDiscord"))
		return
	}

	fmt.Println(tr("found"))
	for i, candidate := range installs {
		status := tr("notInstalled")
		if candidate.IsInjected() {
			status = tr("installed")
		}
		fmt.Printf("  %d. %s (%s)\n", i+1, candidate.Branch.Name, status)
	}
	fmt.Println()

	choice := prompt(tr("chooseBranch"))
	if strings.EqualFold(choice, "q") {
		return
	}
	index, err := strconv.Atoi(choice)
	if err != nil || index < 1 || index > len(installs) {
		fmt.Println(tr("invalid"))
		return
	}
	target := installs[index-1]

	fmt.Println()
	fmt.Println(tr("chooseAction"))
	fmt.Println("  1. " + tr("actionInstall"))
	fmt.Println("  2. " + tr("actionUninstall"))
	fmt.Println("  3. " + tr("actionCancel"))

	var actionErr error
	switch prompt(tr("choice")) {
	case "1":
		actionErr = install(target)
	case "2":
		actionErr = uninstall(target)
	case "3":
		return
	default:
		fmt.Println(tr("invalid"))
		return
	}

	if actionErr != nil {
		fmt.Printf(tr("failed")+"\n", actionErr)
	}
}

func main() {
	installFlag := flag.Bool("install", false, "install or repair Majic without prompts")
	uninstallFlag := flag.Bool("uninstall", false, "uninstall Majic without prompts")
	branch := flag.String("branch", "stable", "Discord branch: stable, ptb or canary")
	flag.Parse()

	installs := findInstalls()

	if *installFlag || *uninstallFlag {
		os.Exit(runCli(installs, *branch, *uninstallFlag))
	}
	runInteractive(installs)
}
