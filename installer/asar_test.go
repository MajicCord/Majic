/*
 * Majic — asar round trip test
 */

package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestAsarRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "app.asar")
	if out := os.Getenv("MAJIC_ASAR_OUT"); out != "" {
		path = out
	}

	files := []asarFile{
		{Name: "index.js", Contents: []byte("require(\"x\");\n")},
		{Name: "package.json", Contents: []byte(`{"name":"discord","main":"index.js","majic":true}`)},
	}
	if err := writeAsar(path, files); err != nil {
		t.Fatal(err)
	}

	for _, file := range files {
		got, err := readAsarFile(path, file.Name)
		if err != nil {
			t.Fatal(err)
		}
		if string(got) != string(file.Contents) {
			t.Fatalf("%s: got %q, want %q", file.Name, got, file.Contents)
		}
	}

	if !isMajicStub(path) {
		t.Fatal("stub not recognised")
	}
}
