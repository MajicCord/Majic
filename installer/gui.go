//go:build !cli

/*
 * Majic — graphical installer
 */

package main

import (
	"fmt"
	"image"
	"image/color"
	"os"
	"os/exec"
	"runtime"
	"sync"

	g "github.com/AllenDang/giu"
)

// Same palette as majicord.com: near-black surfaces, white text, the pink accent kept for the main action.
// Colors are opaque on purpose (giu does not un-premultiply alpha).
var (
	colorBg           = color.RGBA{0x0a, 0x0a, 0x0a, 0xff}
	colorSurface      = color.RGBA{0x11, 0x11, 0x11, 0xff}
	colorSurface2     = color.RGBA{0x16, 0x16, 0x16, 0xff}
	colorHover        = color.RGBA{0x1f, 0x1f, 0x1f, 0xff}
	colorPressed      = color.RGBA{0x26, 0x26, 0x26, 0xff}
	colorLine         = color.RGBA{0x1e, 0x1e, 0x1e, 0xff}
	colorLineStrong   = color.RGBA{0x31, 0x31, 0x31, 0xff}
	colorText         = color.RGBA{0xff, 0xff, 0xff, 0xff}
	colorMuted        = color.RGBA{0xa1, 0xa1, 0xaa, 0xff}
	colorAccent       = color.RGBA{0xff, 0x00, 0x5a, 0xff}
	colorAccentHover  = color.RGBA{0xff, 0x3d, 0x7f, 0xff}
	colorAccentActive = color.RGBA{0xb3, 0x00, 0x40, 0xff}
	colorSuccess      = color.RGBA{0x4a, 0xde, 0x80, 0xff}
	colorDanger       = color.RGBA{0xf8, 0x71, 0x71, 0xff}
	colorWarning      = color.RGBA{0xfb, 0xbf, 0x24, 0xff}
)

const (
	buttonWidth  = 140
	buttonHeight = 40
	rowHeight    = 34
	pathHeight   = 22
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

var (
	app  = &state{}
	logo image.Image
)

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
			s.addLog(fmt.Sprintf(tr("failed"), err))
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

/* ---------- Theme ---------- */

func theme() *g.StyleSetter {
	return g.Style().
		SetStyle(g.StyleVarWindowPadding, 28, 24).
		SetStyle(g.StyleVarFramePadding, 14, 10).
		SetStyle(g.StyleVarItemSpacing, 10, 8).
		SetStyle(g.StyleVarSelectableTextAlign, 0, 0.5).
		SetStyleFloat(g.StyleVarWindowRounding, 0).
		SetStyleFloat(g.StyleVarWindowBorderSize, 0).
		SetStyleFloat(g.StyleVarChildRounding, 12).
		SetStyleFloat(g.StyleVarChildBorderSize, 1).
		SetStyleFloat(g.StyleVarFrameRounding, 10).
		SetStyleFloat(g.StyleVarFrameBorderSize, 0).
		SetStyleFloat(g.StyleVarScrollbarSize, 8).
		SetStyleFloat(g.StyleVarScrollbarRounding, 8).
		SetStyleFloat(g.StyleVarDisabledAlpha, 0.35).
		SetColor(g.StyleColorText, colorText).
		SetColor(g.StyleColorTextDisabled, colorMuted).
		SetColor(g.StyleColorWindowBg, colorBg).
		SetColor(g.StyleColorChildBg, colorSurface).
		SetColor(g.StyleColorPopupBg, colorSurface2).
		SetColor(g.StyleColorBorder, colorLine).
		SetColor(g.StyleColorSeparator, colorLine).
		SetColor(g.StyleColorFrameBg, colorSurface2).
		SetColor(g.StyleColorFrameBgHovered, colorHover).
		SetColor(g.StyleColorFrameBgActive, colorPressed).
		SetColor(g.StyleColorButton, colorSurface2).
		SetColor(g.StyleColorButtonHovered, colorHover).
		SetColor(g.StyleColorButtonActive, colorPressed).
		SetColor(g.StyleColorHeader, colorSurface2).
		SetColor(g.StyleColorHeaderHovered, colorHover).
		SetColor(g.StyleColorHeaderActive, colorPressed).
		SetColor(g.StyleColorScrollbarBg, colorSurface).
		SetColor(g.StyleColorScrollbarGrab, colorLineStrong).
		SetColor(g.StyleColorScrollbarGrabHovered, colorMuted).
		SetColor(g.StyleColorScrollbarGrabActive, colorMuted).
		SetColor(g.StyleColorTextSelectedBg, colorPressed)
}

func muted(widget g.Widget) g.Widget {
	return g.Style().SetColor(g.StyleColorText, colorMuted).To(widget)
}

/* ---------- Widgets ---------- */

func primaryButton(label string, disabled bool, onClick func()) g.Widget {
	return g.Style().
		SetColor(g.StyleColorButton, colorAccent).
		SetColor(g.StyleColorButtonHovered, colorAccentHover).
		SetColor(g.StyleColorButtonActive, colorAccentActive).
		SetColor(g.StyleColorText, colorText).
		To(g.Button(label).Size(buttonWidth, buttonHeight).Disabled(disabled).OnClick(onClick))
}

func secondaryButton(label string, width, height float32, disabled bool, onClick func()) g.Widget {
	return g.Style().
		SetStyleFloat(g.StyleVarFrameBorderSize, 1).
		SetColor(g.StyleColorBorder, colorLineStrong).
		To(g.Button(label).Size(width, height).Disabled(disabled).OnClick(onClick))
}

func header() g.Widget {
	return g.Row(
		g.ImageWithRgba(logo).ID("majic-logo").Size(44, 44),
		g.Column(
			g.Style().SetFontSize(22).To(g.Label(tr("title"))),
			muted(g.Label(tr("subtitle"))),
		),
	)
}

func installList() g.Widget {
	if len(app.installs) == 0 {
		return g.Style().SetColor(g.StyleColorText, colorWarning).To(g.Label(tr("noDiscord")).Wrapped(true))
	}

	layout := g.Layout{}
	for i, install := range app.installs {
		index := i
		label := install.Branch.Name
		if app.injected[i] {
			label += "   ·   " + tr("installed")
		}
		layout = append(layout,
			g.Style().
				SetColor(g.StyleColorHeader, colorPressed).
				SetStyleFloat(g.StyleVarFrameRounding, 8).
				To(g.Selectable(fmt.Sprintf("  %s##branch-%d", label, index)).
					Selected(app.selected == index).
					Size(0, rowHeight).
					OnClick(func() {
						if !app.busy {
							app.selected = index
						}
					})),
			muted(g.Label("  "+install.Resources)),
		)
	}
	return layout
}

func installCard() g.Widget {
	rows := len(app.installs)
	if rows == 0 {
		rows = 1
	}
	height := float32(rows)*(rowHeight+pathHeight+16) + 12
	return card(g.Child().ID("installs").Border(true).Size(-1, height).Layout(installList()))
}

// card gives a bordered child the tighter inner padding of the site's cards.
func card(child *g.ChildWidget) g.Widget {
	return g.Style().SetStyle(g.StyleVarWindowPadding, 12, 12).To(child)
}

func actions() g.Widget {
	noTarget := len(app.installs) == 0
	injected := !noTarget && app.injected[app.selected]

	return g.Row(
		primaryButton(tr("install"), app.busy || noTarget || injected, func() { app.run(installMajic) }),
		secondaryButton(tr("repair"), buttonWidth, buttonHeight, app.busy || !injected, func() { app.run(installMajic) }),
		secondaryButton(tr("uninstall"), buttonWidth, buttonHeight, app.busy || !injected, func() { app.run(uninstallMajic) }),
	)
}

func logLines() g.Widget {
	app.mu.Lock()
	lines := append([]string(nil), app.log...)
	failed := app.failed
	busy := app.busy
	app.mu.Unlock()

	if len(lines) == 0 {
		return muted(g.Label(tr("idle")).Wrapped(true))
	}

	layout := g.Layout{}
	for i, line := range lines {
		widget := g.Widget(g.Label(line).Wrapped(true))
		if i == len(lines)-1 && !busy {
			if failed {
				widget = g.Style().SetColor(g.StyleColorText, colorDanger).To(widget)
			} else {
				widget = g.Style().SetColor(g.StyleColorText, colorSuccess).To(widget)
			}
		} else {
			widget = muted(widget)
		}
		layout = append(layout, widget)
	}
	return layout
}

func logCard() g.Widget {
	return g.Custom(func() {
		_, available := g.GetAvailableRegion()
		height := available - (buttonHeight + 16)
		if height < 80 {
			height = 80
		}
		g.Layout{
			muted(g.Label(tr("activity"))),
			card(g.Child().ID("activity").Border(true).Size(-1, height-28).Layout(logLines())),
		}.Build()
	})
}

func footer() g.Widget {
	return g.Row(
		secondaryButton(tr("openFolder"), 0, 34, false, func() { openFolder(dataDir()) }),
		g.Tooltip(tr("downloadTo")+"\n"+distDir()),
		muted(g.Label("github.com/"+repository)),
	)
}

func loop() {
	applyWindowChrome()

	g.SingleWindow().Layout(
		header(),
		g.Dummy(0, 16),
		muted(g.Label(tr("selectDiscord"))),
		installCard(),
		g.Dummy(0, 6),
		actions(),
		g.Dummy(0, 10),
		logCard(),
		footer(),
	)
}

func main() {
	app.refresh()
	logo = appIcon()

	window := g.NewMasterWindow(tr("title"), 640, 600, 0)
	window.SetStyle(theme())
	window.SetBgColor(colorBg)
	if runtime.GOOS == "windows" {
		g.Context.FontAtlas.SetDefaultFont("segoeui.ttf")
	}
	g.Context.FontAtlas.SetDefaultFontSize(16)
	window.SetIcon(logo)
	window.Run(loop)
}
