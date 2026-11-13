//go:build !cli

/*
 * Majic — graphical installer
 */

package main

import (
	"fmt"
	"image"
	"image/color"
	"math"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"sync"

	g "github.com/AllenDang/giu"
)

func rgb(hex uint32) color.RGBA {
	return color.RGBA{uint8(hex >> 16), uint8(hex >> 8), uint8(hex), 0xff}
}

func white(alpha float64) color.RGBA {
	return color.RGBA{0xff, 0xff, 0xff, uint8(math.Round(alpha * 255))}
}

var (
	colorInk         = rgb(0x000000)
	colorBg          = rgb(0x0a0a0a)
	colorSurface     = rgb(0x141414)
	colorSurface2    = rgb(0x1c1c1c)
	colorLine        = white(0.08)
	colorLineStrong  = white(0.16)
	colorText        = rgb(0xffffff)
	colorTextSoft    = white(0.85)
	colorMuted       = rgb(0xa1a1aa)
	colorAccent      = rgb(0xff005a)
	colorAccentDark  = rgb(0xd6004b)
	colorZinc        = rgb(0xd4d4d8)
	colorSuccess     = rgb(0x4ade80)
	colorDanger      = rgb(0xf87171)
	colorWarning     = rgb(0xfbbf24)
)

var skyStops = []struct {
	at  float64
	col color.RGBA
}{
	{0, rgb(0x000000)},
	{0.38, rgb(0x0b0006)},
	{0.68, rgb(0x2e0012)},
	{0.90, rgb(0x6e0027)},
	{1, rgb(0x9e0038)},
}

var stars = []struct{ x, y, r, alpha float64 }{
	{0.06, 0.12, 1.2, 1}, {0.14, 0.46, 0.8, 0.8}, {0.22, 0.20, 1, 0.9}, {0.31, 0.08, 0.8, 1},
	{0.38, 0.38, 1.2, 0.7}, {0.47, 0.16, 0.8, 0.9}, {0.58, 0.05, 1, 1}, {0.64, 0.30, 0.8, 0.8},
	{0.73, 0.14, 1.4, 0.7}, {0.81, 0.42, 0.8, 0.9}, {0.88, 0.09, 1, 1}, {0.95, 0.28, 1.2, 0.8},
	{0.10, 0.70, 0.8, 0.6}, {0.90, 0.66, 0.8, 0.6}, {0.52, 0.56, 1, 0.5},
}

const (
	windowWidth   = 600
	skyHeight     = 220
	skyRadius     = 40
	padding       = 28
	cardHeight    = 68
	cardGap       = 10
	cardRadius    = 18
	maxCards      = 3
	buttonHeight  = 48
	buttonGap     = 10
	buttonRadius  = 12
	footerHeight  = 40
	statusHeight  = 20
)

type fonts struct {
	display, bold, semibold, mono *g.FontInfo
}

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
	app       = &state{}
	logo      image.Image
	fontStyle fonts
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

func openURL(url string) {
	switch runtime.GOOS {
	case "windows":
		_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		_ = exec.Command("open", url).Start()
	default:
		_ = exec.Command("xdg-open", url).Start()
	}
}

func theme() *g.StyleSetter {
	return g.Style().
		SetStyle(g.StyleVarWindowPadding, 0, 0).
		SetStyle(g.StyleVarFramePadding, 16, 10).
		SetStyle(g.StyleVarItemSpacing, 10, 0).
		SetStyleFloat(g.StyleVarWindowRounding, 0).
		SetStyleFloat(g.StyleVarWindowBorderSize, 0).
		SetStyleFloat(g.StyleVarChildRounding, 20).
		SetStyleFloat(g.StyleVarChildBorderSize, 1).
		SetStyleFloat(g.StyleVarFrameRounding, buttonRadius).
		SetStyleFloat(g.StyleVarFrameBorderSize, 0).
		SetStyleFloat(g.StyleVarScrollbarSize, 6).
		SetStyleFloat(g.StyleVarScrollbarRounding, 6).
		SetStyleFloat(g.StyleVarDisabledAlpha, 0.4).
		SetColor(g.StyleColorText, colorText).
		SetColor(g.StyleColorTextDisabled, colorMuted).
		SetColor(g.StyleColorWindowBg, colorBg).
		SetColor(g.StyleColorChildBg, colorSurface).
		SetColor(g.StyleColorPopupBg, colorSurface2).
		SetColor(g.StyleColorBorder, colorLine).
		SetColor(g.StyleColorButton, colorSurface2).
		SetColor(g.StyleColorButtonHovered, colorLineStrong).
		SetColor(g.StyleColorButtonActive, colorLineStrong).
		SetColor(g.StyleColorScrollbarBg, color.RGBA{}).
		SetColor(g.StyleColorScrollbarGrab, colorLineStrong).
		SetColor(g.StyleColorScrollbarGrabHovered, colorMuted).
		SetColor(g.StyleColorScrollbarGrabActive, colorMuted).
		SetColor(g.StyleColorTextSelectedBg, colorAccentDark)
}

func styled(font *g.FontInfo, size float32, widgets ...g.Widget) g.Widget {
	style := g.Style().SetFontSize(size)
	if font != nil {
		style.SetFont(font)
	}
	return style.To(widgets...)
}

func drawText(font *g.FontInfo, size float32, pos image.Point, col color.Color, text string) {
	styled(font, size, g.Custom(func() {
		g.GetCanvas().AddText(pos, col, text)
	})).Build()
}

func textWidth(font *g.FontInfo, size float32, text string) (width float32) {
	styled(font, size, g.Custom(func() {
		width, _ = g.CalcTextSize(text)
	})).Build()
	return width
}

func ellipsize(font *g.FontInfo, size float32, text string, max float32) string {
	if textWidth(font, size, text) <= max {
		return text
	}
	runes := []rune(text)
	for len(runes) > 1 {
		runes = runes[1:]
		candidate := "…" + string(runes)
		if textWidth(font, size, candidate) <= max {
			return candidate
		}
	}
	return text
}

func lerp(a, b uint8, t float64) uint8 {
	return uint8(math.Round(float64(a) + (float64(b)-float64(a))*t))
}

func skyColor(t float64) color.RGBA {
	for i := 1; i < len(skyStops); i++ {
		if t <= skyStops[i].at {
			from, to := skyStops[i-1], skyStops[i]
			k := (t - from.at) / (to.at - from.at)
			return color.RGBA{lerp(from.col.R, to.col.R, k), lerp(from.col.G, to.col.G, k), lerp(from.col.B, to.col.B, k), 0xff}
		}
	}
	return skyStops[len(skyStops)-1].col
}

func drawSky(origin image.Point, width int) {
	canvas := g.GetCanvas()
	for y := 0; y < skyHeight; y++ {
		inset := 0.0
		if dy := float64(y) + 0.5 - (skyHeight - skyRadius); dy > 0 {
			inset = skyRadius - math.Sqrt(math.Max(0, skyRadius*skyRadius-dy*dy))
		}
		left := origin.X + int(math.Round(inset))
		right := origin.X + width - int(math.Round(inset))
		canvas.AddRectFilled(image.Pt(left, origin.Y+y), image.Pt(right, origin.Y+y+1), skyColor(float64(y)/(skyHeight-1)), 0, 0)
	}

	for _, star := range stars {
		fade := math.Max(0, 1-math.Max(0, star.y-0.55)/0.45)
		center := image.Pt(origin.X+int(star.x*float64(width)), origin.Y+int(star.y*skyHeight))
		g.GetCanvas().AddCircleFilled(center, float32(star.r), white(0.7*star.alpha*fade))
	}
}

func centered(font *g.FontInfo, size float32, y int, col color.Color, text string) {
	origin := g.GetCursorScreenPos()
	width := textWidth(font, size, text)
	drawText(font, size, image.Pt(origin.X+int((windowWidth-width)/2), y), col, text)
}

func hero() g.Widget {
	return g.Custom(func() {
		origin := g.GetCursorScreenPos()
		drawSky(origin, windowWidth)

		bounds := logo.Bounds()
		logoWidth := 190
		logoHeight := logoWidth * bounds.Dy() / bounds.Dx()
		g.SetCursorScreenPos(image.Pt(origin.X+(windowWidth-logoWidth)/2, origin.Y+44))
		g.ImageWithRgba(logo).ID("majic-logo").Size(float32(logoWidth), float32(logoHeight)).Build()

		titleY := origin.Y + 44 + logoHeight + 22
		centered(fontStyle.display, 28, titleY, colorText, strings.ToUpper(tr("tagline")))
		centered(nil, 15, titleY+42, colorTextSoft, tr("subtitle"))

		g.SetCursorScreenPos(image.Pt(origin.X, origin.Y+skyHeight))
		g.Dummy(0, 0).Build()
	})
}

func sectionLabel(text string) g.Widget {
	return g.Custom(func() {
		pos := g.GetCursorScreenPos()
		drawText(fontStyle.bold, 12, image.Pt(pos.X+padding, pos.Y), colorMuted, strings.ToUpper(text))
		g.Dummy(0, 24).Build()
	})
}

func pill(right, centerY int, text string, background, foreground color.Color) {
	size := float32(11)
	width := int(textWidth(fontStyle.bold, size, text)) + 20
	height := 24
	left := right - width
	top := centerY - height/2
	g.GetCanvas().AddRectFilled(image.Pt(left, top), image.Pt(right, top+height), background, float32(height)/2, g.DrawFlagsRoundCornersAll)
	drawText(fontStyle.bold, size, image.Pt(left+10, top+5), foreground, text)
}

func installCard(index int, width int) {
	install := app.installs[index]
	injected := app.injected[index]
	selected := app.selected == index

	pos := g.GetCursorScreenPos()
	g.InvisibleButton().ID(g.ID(fmt.Sprintf("install-%d", index))).Size(float32(width), cardHeight).OnClick(func() {
		if !app.busy {
			app.selected = index
		}
	}).Build()
	hovered := g.IsItemHovered() && !app.busy

	canvas := g.GetCanvas()
	min, max := pos, image.Pt(pos.X+width, pos.Y+cardHeight)
	background := colorSurface
	border := colorLine
	thickness := float32(1)
	if hovered {
		background = colorSurface2
		border = colorLineStrong
	}
	if selected {
		background = colorSurface2
		border = colorAccent
		thickness = 2
	}
	canvas.AddRectFilled(min, max, background, cardRadius, g.DrawFlagsRoundCornersAll)
	canvas.AddRect(min, max, border, cardRadius, g.DrawFlagsRoundCornersAll, thickness)

	dot := image.Pt(pos.X+24, pos.Y+cardHeight/2)
	if injected {
		canvas.AddCircleFilled(dot, 5, colorAccent)
	} else {
		canvas.AddCircle(dot, 5, colorLineStrong, 16, 2)
	}

	status, statusBg, statusFg := strings.ToUpper(tr("notInstalled")), color.Color(colorLine), color.Color(colorMuted)
	if injected {
		status, statusBg, statusFg = strings.ToUpper(tr("installed")), colorAccent, colorText
	}
	pill(max.X-18, pos.Y+cardHeight/2, status, statusBg, statusFg)

	textLeft := pos.X + 44
	textMax := float32(width - 44 - 150)
	drawText(fontStyle.bold, 17, image.Pt(textLeft, pos.Y+14), colorText, install.Branch.Name)
	drawText(nil, 13, image.Pt(textLeft, pos.Y+39), colorMuted, ellipsize(nil, 13, install.Resources, textMax))
}

func installList() g.Widget {
	return g.Custom(func() {
		origin := g.GetCursorScreenPos()
		width := windowWidth - padding*2

		if len(app.installs) == 0 {
			min, max := image.Pt(origin.X+padding, origin.Y), image.Pt(origin.X+padding+width, origin.Y+cardHeight)
			g.GetCanvas().AddRectFilled(min, max, colorSurface, cardRadius, g.DrawFlagsRoundCornersAll)
			g.GetCanvas().AddRect(min, max, colorLine, cardRadius, g.DrawFlagsRoundCornersAll, 1)
			drawText(fontStyle.semibold, 15, image.Pt(min.X+22, min.Y+24), colorWarning, tr("noDiscord"))
			g.Dummy(0, cardHeight).Build()
			return
		}

		visible := len(app.installs)
		if visible > maxCards {
			visible = maxCards
		}
		height := float32(visible*cardHeight + (visible-1)*cardGap)

		g.SetCursorScreenPos(image.Pt(origin.X+padding, origin.Y))
		g.Style().
			SetColor(g.StyleColorChildBg, color.RGBA{}).
			SetStyleFloat(g.StyleVarChildBorderSize, 0).
			SetStyle(g.StyleVarItemSpacing, 0, cardGap).
			To(g.Child().ID("installs").Border(false).Size(float32(width), height).Layout(g.Custom(func() {
				cardWidth := width
				if len(app.installs) > maxCards {
					cardWidth -= 12
				}
				for i := range app.installs {
					installCard(i, cardWidth)
				}
			}))).Build()
	})
}

func button(label string, width float32, disabled bool, background, hover, active, text color.Color, onClick func()) g.Widget {
	return styled(fontStyle.semibold, 15, g.Style().
		SetColor(g.StyleColorButton, background).
		SetColor(g.StyleColorButtonHovered, hover).
		SetColor(g.StyleColorButtonActive, active).
		SetColor(g.StyleColorText, text).
		To(g.Button(label).Size(width, buttonHeight).Disabled(disabled).OnClick(onClick)))
}

func ghostButton(label string, width, height float32, onClick func()) g.Widget {
	return styled(fontStyle.semibold, 14, g.Style().
		SetStyleFloat(g.StyleVarFrameBorderSize, 1).
		SetColor(g.StyleColorBorder, colorLineStrong).
		SetColor(g.StyleColorButton, color.RGBA{}).
		SetColor(g.StyleColorButtonHovered, white(0.1)).
		SetColor(g.StyleColorButtonActive, white(0.14)).
		SetColor(g.StyleColorText, colorTextSoft).
		To(g.Button(label).Size(width, height).OnClick(onClick)))
}

func actions() g.Widget {
	return g.Custom(func() {
		noTarget := len(app.installs) == 0
		injected := !noTarget && app.injected[app.selected]
		width := float32(windowWidth-padding*2-buttonGap*2) / 3

		origin := g.GetCursorScreenPos()
		g.SetCursorScreenPos(image.Pt(origin.X+padding, origin.Y))
		g.Style().SetStyle(g.StyleVarItemSpacing, buttonGap, 0).To(g.Row(
			button(tr("install"), width, app.busy || noTarget || injected, colorText, colorZinc, colorMuted, colorInk, func() { app.run(installMajic) }),
			button(tr("repair"), width, app.busy || !injected, colorAccent, colorAccentDark, colorAccentDark, colorText, func() { app.run(installMajic) }),
			styled(fontStyle.semibold, 15, g.Style().
				SetStyleFloat(g.StyleVarFrameBorderSize, 1).
				SetColor(g.StyleColorBorder, colorLineStrong).
				SetColor(g.StyleColorButton, color.RGBA{}).
				SetColor(g.StyleColorButtonHovered, white(0.1)).
				SetColor(g.StyleColorButtonActive, white(0.14)).
				SetColor(g.StyleColorText, colorTextSoft).
				To(g.Button(tr("uninstall")).Size(width, buttonHeight).Disabled(app.busy || !injected).OnClick(func() { app.run(uninstallMajic) }))),
		)).Build()
	})
}

func status() g.Widget {
	return g.Custom(func() {
		app.mu.Lock()
		line := tr("idle")
		col := colorMuted
		if n := len(app.log); n > 0 {
			line = app.log[n-1]
			switch {
			case app.busy:
				col = colorTextSoft
			case app.failed:
				col = colorDanger
			default:
				col = colorSuccess
			}
		}
		app.mu.Unlock()

		origin := g.GetCursorScreenPos()
		drawText(nil, 14, image.Pt(origin.X+padding, origin.Y), col, ellipsize(nil, 14, line, windowWidth-padding*2))
		g.Dummy(0, statusHeight).Build()
	})
}

func footer() g.Widget {
	return g.Custom(func() {
		origin := g.GetCursorScreenPos()
		g.SetCursorScreenPos(image.Pt(origin.X+padding, origin.Y))
		ghostButton(tr("openFolder"), 0, footerHeight, func() { openFolder(dataDir()) }).Build()
		g.Tooltip(tr("downloadTo") + "\n" + distDir()).Build()

		link := "github.com/" + repository
		width := textWidth(nil, 13, link)
		linkPos := image.Pt(origin.X+windowWidth-padding-int(width), origin.Y+12)
		g.SetCursorScreenPos(linkPos)
		g.InvisibleButton().ID("repo-link").Size(width, 18).OnClick(func() { openURL("https://github.com/" + repository) }).Build()
		col := colorMuted
		if g.IsItemHovered() {
			col = colorText
		}
		drawText(nil, 13, linkPos, col, link)
	})
}

func windowHeight() int {
	cards := len(app.installs)
	if cards > maxCards {
		cards = maxCards
	}
	list := cardHeight
	if cards > 0 {
		list = cards*cardHeight + (cards-1)*cardGap
	}
	return skyHeight + 24 + 24 + list + 20 + buttonHeight + 18 + statusHeight + 22 + footerHeight + padding
}

func loop() {
	applyWindowChrome()

	g.SingleWindow().Layout(
		hero(),
		g.Dummy(0, 24),
		sectionLabel(tr("selectDiscord")),
		installList(),
		g.Dummy(0, 20),
		actions(),
		g.Dummy(0, 18),
		status(),
		g.Dummy(0, 22),
		footer(),
	)
}

func main() {
	app.refresh()
	logo = brandLogo()

	window := g.NewMasterWindow(tr("title"), windowWidth, windowHeight(), g.MasterWindowFlagsNotResizable)
	window.SetStyle(theme())
	window.SetBgColor(colorBg)
	if runtime.GOOS == "windows" {
		g.Context.FontAtlas.SetDefaultFont("segoeui.ttf")
		fontStyle = fonts{
			display:  g.Context.FontAtlas.AddFont("seguibl.ttf"),
			bold:     g.Context.FontAtlas.AddFont("segoeuib.ttf"),
			semibold: g.Context.FontAtlas.AddFont("seguisb.ttf"),
			mono:     g.Context.FontAtlas.AddFont("consola.ttf"),
		}
	}
	g.Context.FontAtlas.SetDefaultFontSize(15)
	window.SetIcon(appIcon())
	window.Run(loop)
}
