/*
 * Majic — install and uninstall actions shared by the GUI and the CLI
 */

package main

import (
	"fmt"
	"path/filepath"
)

type reporter func(message string)

func installMajic(target DiscordInstall, report reporter) error {
	report(tr("downloading"))
	name, err := downloadMajic()
	if err != nil {
		return err
	}
	report(fmt.Sprintf(tr("downloaded"), name))

	report(fmt.Sprintf(tr("closing"), target.Branch.Name))
	target.Close()

	report(fmt.Sprintf(tr("injecting"), target.Branch.Name))
	if err := target.Inject(filepath.Join(distDir(), "patcher.js")); err != nil {
		return err
	}

	report(fmt.Sprintf(tr("done"), target.Branch.Name))
	return nil
}

func uninstallMajic(target DiscordInstall, report reporter) error {
	report(fmt.Sprintf(tr("closing"), target.Branch.Name))
	target.Close()

	if err := target.Uninject(); err != nil {
		return err
	}
	report(fmt.Sprintf(tr("uninstalled"), target.Branch.Name))
	return nil
}
