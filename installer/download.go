/*
 * Majic — release download
 */

package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"time"
)

const (
	repository = "MajicCord/Majic"
	userAgent  = "Majic-Installer (https://github.com/MajicCord/Majic)"
)

var distFiles = []string{"patcher.js", "preload.js", "renderer.js"}

type release struct {
	Name   string `json:"name"`
	Assets []struct {
		Name string `json:"name"`
		URL  string `json:"browser_download_url"`
	} `json:"assets"`
}

var httpClient = &http.Client{Timeout: 60 * time.Second}

func dataDir() string {
	home, _ := os.UserHomeDir()
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(os.Getenv("APPDATA"), "Majic")
	case "darwin":
		return filepath.Join(home, "Library", "Application Support", "Majic")
	default:
		if config := os.Getenv("XDG_CONFIG_HOME"); config != "" {
			return filepath.Join(config, "Majic")
		}
		return filepath.Join(home, ".config", "Majic")
	}
}

func distDir() string {
	return filepath.Join(dataDir(), "dist")
}

func get(url string) (*http.Response, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "application/vnd.github+json")

	res, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	if res.StatusCode != http.StatusOK {
		res.Body.Close()
		return nil, fmt.Errorf("%s returned %d", url, res.StatusCode)
	}
	return res, nil
}

func latestRelease() (*release, error) {
	res, err := get("https://api.github.com/repos/" + repository + "/releases/latest")
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var latest release
	return &latest, json.NewDecoder(res.Body).Decode(&latest)
}

func downloadMajic() (string, error) {
	latest, err := latestRelease()
	if err != nil {
		return "", err
	}

	dir := distDir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}

	urls := map[string]string{}
	for _, asset := range latest.Assets {
		urls[asset.Name] = asset.URL
	}

	for _, name := range distFiles {
		url, ok := urls[name]
		if !ok {
			return "", fmt.Errorf(tr("errMissingAsset"), name)
		}

		res, err := get(url)
		if err != nil {
			return "", err
		}
		data, err := io.ReadAll(res.Body)
		res.Body.Close()
		if err != nil {
			return "", err
		}
		if err := os.WriteFile(filepath.Join(dir, name), data, 0o644); err != nil {
			return "", err
		}
	}

	return latest.Name, nil
}
