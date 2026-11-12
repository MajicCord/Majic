//go:build !windows

/*
 * Majic — locale lookup outside Windows
 */

package main

func platformLocale() string {
	return ""
}
