//go:build cli

/*
 * Majic — command line installer
 */

package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"strconv"
	"strings"
)

var input = bufio.NewReader(os.Stdin)

func prompt(text string) string {
	fmt.Print(text)
	line, _ := input.ReadString('\n')
	return strings.TrimSpace(line)
}

func printLine(message string) {
	fmt.Println(message)
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

	action := installMajic
	if remove {
		action = uninstallMajic
	}
	if err := action(target, printLine); err != nil {
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
		actionErr = installMajic(target, printLine)
	case "2":
		actionErr = uninstallMajic(target, printLine)
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
	branch := flag.String("branch", "stable", "Discord branch: stable, ptb, canary or development")
	flag.Parse()

	installs := findInstalls()

	if *installFlag || *uninstallFlag {
		os.Exit(runCli(installs, *branch, *uninstallFlag))
	}
	runInteractive(installs)
}
