//go:build !cli

/*
 * Majic — embedded installer images
 */

package main

import (
	"bytes"
	_ "embed"
	"image"
	"image/png"
)

//go:embed icon.png
var iconPNG []byte

//go:embed logo.png
var logoPNG []byte

func decodePNG(data []byte) image.Image {
	img, err := png.Decode(bytes.NewReader(data))
	if err != nil {
		return image.NewRGBA(image.Rect(0, 0, 1, 1))
	}
	return img
}

func appIcon() image.Image {
	return decodePNG(iconPNG)
}

func brandLogo() image.Image {
	return decodePNG(logoPNG)
}
