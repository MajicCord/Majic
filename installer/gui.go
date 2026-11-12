//go:build !cli

/*
 * Majic — graphical installer
 */

package main

import (
	"image/color"
	"os"
	"os/exec"
	"runtime"
	"sync"

	g "github.com/AllenDang/giu"
)

var (
	discordGreen  = color.RGBA{0x24, 0x80, 0x46, 0xff}
	discordBlue   = color.RGBA{0x58, 0x65, 0xf2, 0xff}
	discordRed    = color.RGBA{0xda, 0x37, 0x3c, 0xff}
	discordYellow = color.RGBA{0xf0, 0xb2, 0x32, 0xff}
	mutedColor    = color.RGBA{0xa0, 0xa4, 0xab, 0xff}
)

type state struct {
	mu       sync.Mutex
	installs []DiscordInstall
	injected []bool
	selected int
	busy     bool
	log      []string
	failed   bool
}

var app = &state{}

func (s *state) refresh() {
	s.installs = findInstalls()
	s.injected = make([]bool, len(s.installs))
	for i, install := range s.installs {
		s.injected[i] = install.IsInjected()
	}
	if s.selected >= len(s.installs) {
		s.selected = 0
	}
}

func (s *state) addLog(line string) {
	s.mu.Lock()
	s.log = append(s.log, line)
	s.mu.Unlock()
	g.Update()
}

func (s *state) run(action func(DiscordInstall, reporter) error) {
	if s.busy || len(s.installs) == 0 {
		return
	}

	target := s.installs[s.selected]
	s.busy = true
	s.failed = false
	s.log = nil

	go func() {
		err := action(target, s.addLog)
		if err != nil {
			s.addLog(tr("failed") + " " + err.Error())
		}

		s.mu.Lock()
		s.failed = err != nil
		s.busy = false
		s.refresh()
		s.mu.Unlock()
		g.Update()
	}()
}

func openFolder(path string) {
	_ = os.MkdirAll(path, 0o755)
	switch runtime.GOOS {
	case "windows":
		_ = exec.Command("explorer", path).Start()
	case "darwin":
		_ = exec.Command("open", path).Start()
	default:
		_ = exec.Command("xdg-open", path).Start()
	}
}

func coloredButton(label string, col color.Color, disabled bool, onClick func()) g.Widget {
	return g.Style().
		SetColor(g.StyleColorButton, col).
		SetColor(g.StyleColorButtonHovered, col).
		SetColor(g.StyleColorButtonActive, col).
		SetColor(g.StyleColorText, color.White).
		To(g.Button(label).Size(130, 34).Disabled(disabled).OnClick(onClick))
}

func installList() g.Widget {
	if len(app.installs) == 0 {
		return g.Style().SetColor(g.StyleColorText, discordYellow).To(g.Label(tr("noDiscord")))
	}

	layout := g.Layout{}
	for i, install := range app.installs {
		index := i
		label := install.Branch.Name
		if app.injected[i] {
			label += " (" + tr("installed") + ")"
		}
		layout = append(layout,
			g.RadioButton(label, app.selected == index).OnChange(func() {
				if !app.busy {
					app.selected = index
				}
			}),
			g.Style().SetColor(g.StyleColorText, mutedColor).To(g.Label("    "+install.Resources)),
		)
	}
	return layout
}

func actions() g.Widget {
	noTarget := len(app.installs) == 0
	injected := !noTarget && app.injected[app.selected]

	return g.Row(
		coloredButton(tr("install"), discordGreen, app.busy || noTarget || injected, func() { app.run(installMajic) }),
		coloredButton(tr("repair"), discordBlue, app.busy || !injected, func() { app.run(installMajic) }),
		coloredButton(tr("uninstall"), discordRed, app.busy || !injected, func() { app.run(uninstallMajic) }),
	)
}

func logView() g.Widget {
	app.mu.Lock()
	lines := append([]string(nil), app.log...)
	failed := app.failed
	app.mu.Unlock()

	layout := g.Layout{}
	for i, line := range lines {
		widget := g.Widget(g.Label(line).Wrapped(true))
		if failed && i == len(lines)-1 {
			widget = g.Style().SetColor(g.StyleColorText, discordRed).To(widget)
		}
		layout = append(layout, widget)
	}
	return layout
}

func loop() {
	applyWindowChrome()

	g.SingleWindow().Layout(
		g.Style().SetFontSize(24).To(g.Label(tr("title"))),
		g.Dummy(0, 4),
		g.Label(tr("downloadTo")),
		g.Style().SetColor(g.StyleColorText, mutedColor).To(g.Label(distDir())),
		g.Dummy(0, 8),
		g.Separator(),
		g.Dummy(0, 8),
		g.Label(tr("selectDiscord")),
		g.Dummy(0, 2),
		installList(),
		g.Dummy(0, 10),
		actions(),
		g.Dummy(0, 8),
		g.Separator(),
		g.Dummy(0, 4),
		logView(),
		g.Row(
			g.Style().SetColor(g.StyleColorText, mutedColor).To(g.Label("github.com/"+repository)),
			g.Button(tr("openFolder")).OnClick(func() { openFolder(dataDir()) }),
		),
	)
}

func main() {
	app.refresh()

	window := g.NewMasterWindow(tr("title"), 640, 480, 0)
	if runtime.GOOS == "windows" {
		g.Context.FontAtlas.SetDefaultFont("segoeui.ttf")
	}
	g.Context.FontAtlas.SetDefaultFontSize(16)
	window.SetIcon(appIcon())
	window.Run(loop)
}
