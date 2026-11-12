/*
 * Majic — Windows locale lookup
 */

package main

import (
	"syscall"
	"unsafe"
)

func platformLocale() string {
	buffer := make([]uint16, 85)
	proc := syscall.NewLazyDLL("kernel32.dll").NewProc("GetUserDefaultLocaleName")
	if length, _, _ := proc.Call(uintptr(unsafe.Pointer(&buffer[0])), uintptr(len(buffer))); length > 0 {
		return syscall.UTF16ToString(buffer)
	}
	return ""
}
