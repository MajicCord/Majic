//go:build !cli

/*
 * Majic — dark window title bar on Windows
 */

package main

import (
	"sync"
	"syscall"
	"unsafe"
)

var chromeOnce sync.Once

func applyWindowChrome() {
	chromeOnce.Do(func() {
		title, err := syscall.UTF16PtrFromString(tr("title"))
		if err != nil {
			return
		}

		hwnd, _, _ := syscall.NewLazyDLL("user32.dll").NewProc("FindWindowW").Call(0, uintptr(unsafe.Pointer(title)))
		if hwnd == 0 {
			return
		}

		enabled := int32(1)
		setAttribute := syscall.NewLazyDLL("dwmapi.dll").NewProc("DwmSetWindowAttribute")
		for _, attribute := range []uintptr{20, 19} {
			if result, _, _ := setAttribute.Call(hwnd, attribute, uintptr(unsafe.Pointer(&enabled)), 4); result == 0 {
				break
			}
		}

	})
}
