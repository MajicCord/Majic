/*
 * Majic — minimal asar archive reader and writer
 */

package main

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"strconv"
)

type asarIntegrity struct {
	Algorithm string   `json:"algorithm"`
	Hash      string   `json:"hash"`
	BlockSize int      `json:"blockSize"`
	Blocks    []string `json:"blocks"`
}

type asarEntry struct {
	Size      int           `json:"size"`
	Offset    string        `json:"offset"`
	Integrity asarIntegrity `json:"integrity"`
}

type asarHeader struct {
	Files map[string]asarEntry `json:"files"`
}

type asarFile struct {
	Name     string
	Contents []byte
}

const asarBlockSize = 4 * 1024 * 1024

func align4(n int) int {
	return (n + 3) &^ 3
}

func writeAsar(path string, files []asarFile) error {
	header := asarHeader{Files: map[string]asarEntry{}}
	var body []byte

	for _, file := range files {
		sum := sha256.Sum256(file.Contents)
		hash := hex.EncodeToString(sum[:])
		header.Files[file.Name] = asarEntry{
			Size:   len(file.Contents),
			Offset: strconv.Itoa(len(body)),
			Integrity: asarIntegrity{
				Algorithm: "SHA256",
				Hash:      hash,
				BlockSize: asarBlockSize,
				Blocks:    []string{hash},
			},
		}
		body = append(body, file.Contents...)
	}

	headerJSON, err := json.Marshal(header)
	if err != nil {
		return err
	}

	payloadSize := 4 + align4(len(headerJSON))
	out := make([]byte, 16+align4(len(headerJSON)))
	binary.LittleEndian.PutUint32(out[0:], 4)
	binary.LittleEndian.PutUint32(out[4:], uint32(payloadSize+4))
	binary.LittleEndian.PutUint32(out[8:], uint32(payloadSize))
	binary.LittleEndian.PutUint32(out[12:], uint32(len(headerJSON)))
	copy(out[16:], headerJSON)

	return os.WriteFile(path, append(out, body...), 0o644)
}

func readAsarFile(path, name string) ([]byte, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	if len(data) < 16 {
		return nil, errors.New("not an asar archive")
	}

	headerPickleSize := int(binary.LittleEndian.Uint32(data[4:]))
	jsonSize := int(binary.LittleEndian.Uint32(data[12:]))
	if 16+jsonSize > len(data) || 8+headerPickleSize > len(data) {
		return nil, errors.New("invalid asar header")
	}

	var header asarHeader
	if err := json.Unmarshal(data[16:16+jsonSize], &header); err != nil {
		return nil, err
	}

	entry, ok := header.Files[name]
	if !ok {
		return nil, errors.New("file not found in asar")
	}

	offset, err := strconv.Atoi(entry.Offset)
	if err != nil {
		return nil, err
	}

	start := 8 + headerPickleSize + offset
	if start+entry.Size > len(data) {
		return nil, errors.New("file out of bounds")
	}
	return data[start : start+entry.Size], nil
}
