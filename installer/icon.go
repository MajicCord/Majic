//go:build !cli

/*
 * Majic — generated window icon
 */

package main

import (
	"image"
	"image/color"
	"math"
)

func distanceToSegment(px, py, ax, ay, bx, by float64) float64 {
	dx, dy := bx-ax, by-ay
	t := ((px-ax)*dx + (py-ay)*dy) / (dx*dx + dy*dy)
	t = math.Max(0, math.Min(1, t))
	return math.Hypot(px-(ax+t*dx), py-(ay+t*dy))
}

func appIcon() image.Image {
	const size = 64
	img := image.NewNRGBA(image.Rect(0, 0, size, size))
	radius := 14.0

	stroke := [][4]float64{
		{17, 46, 17, 18},
		{17, 18, 32, 36},
		{32, 36, 47, 18},
		{47, 18, 47, 46},
	}

	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			fx, fy := float64(x)+0.5, float64(y)+0.5
			cx := math.Max(radius, math.Min(size-radius, fx))
			cy := math.Max(radius, math.Min(size-radius, fy))
			if math.Hypot(fx-cx, fy-cy) > radius {
				continue
			}

			col := color.NRGBA{0xff, 0x2d, 0x55, 0xff}
			for _, s := range stroke {
				if distanceToSegment(fx, fy, s[0], s[1], s[2], s[3]) <= 3.2 {
					col = color.NRGBA{0xff, 0xff, 0xff, 0xff}
					break
				}
			}
			img.SetNRGBA(x, y, col)
		}
	}
	return img
}
