/*
 * Majic — animated PNG parser
 * Adapted from Vencord, GPL-3.0-or-later
 */

export const ApngDisposeOp = {
    NONE: 0,
    BACKGROUND: 1,
    PREVIOUS: 2
} as const;

export const ApngBlendOp = {
    SOURCE: 0,
    OVER: 1
} as const;

type Bytes = Uint8Array<ArrayBuffer>;

export interface ApngFrame {
    width: number;
    height: number;
    left: number;
    top: number;
    delay: number;
    disposeOp: number;
    blendOp: number;
    dataParts?: Bytes[];
    img: HTMLImageElement;
}

export interface ApngAnimation {
    width: number;
    height: number;
    numPlays: number;
    playTime: number;
    frames: ApngFrame[];
}

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    CRC_TABLE[i] = c;
}

function crc32(bytes: Bytes, start = 0, length = bytes.length - start) {
    let crc = -1;
    for (let i = start, end = start + length; i < end; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xFF];
    return crc ^ -1;
}

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const readDWord = (bytes: Bytes, off: number) => ((bytes[off] << 24) >>> 0) + (bytes[off + 1] << 16) + (bytes[off + 2] << 8) + bytes[off + 3];
const readWord = (bytes: Bytes, off: number) => (bytes[off] << 8) + bytes[off + 1];
const readString = (bytes: Bytes, off: number, length: number) => String.fromCharCode(...bytes.subarray(off, off + length));
const dwordBytes = (x: number) => [(x >>> 24) & 0xff, (x >>> 16) & 0xff, (x >>> 8) & 0xff, x & 0xff];

function copyBytes(bytes: Bytes, start: number, length: number): Bytes {
    const copy = new Uint8Array(length);
    copy.set(bytes.subarray(start, start + length));
    return copy;
}

function makeChunk(type: string, data: Bytes): Bytes {
    const crcLength = type.length + data.length;
    const chunk = new Uint8Array(new ArrayBuffer(crcLength + 8));
    chunk.set(dwordBytes(data.length), 0);
    chunk.set(Array.from(type, char => char.charCodeAt(0)), 4);
    chunk.set(data, 8);
    chunk.set(dwordBytes(crc32(chunk, 4, crcLength)), crcLength + 4);
    return chunk;
}

function forEachChunk(bytes: Bytes, callback: (type: string, off: number, length: number) => boolean | void) {
    let off = 8;
    let type: string;
    let keepGoing: boolean | void;
    do {
        const length = readDWord(bytes, off);
        type = readString(bytes, off + 4, 4);
        keepGoing = callback(type, off, length);
        off += 12 + length;
    } while (keepGoing !== false && type !== "IEND" && off < bytes.length);
}

export function parseAPNG(buffer: ArrayBuffer): Promise<ApngAnimation> {
    const bytes = new Uint8Array(buffer);

    return new Promise((resolve, reject) => {
        if (PNG_SIGNATURE.some((byte, i) => bytes[i] !== byte)) return reject("Not a PNG file (invalid file signature)");

        let isAnimated = false;
        forEachChunk(bytes, type => {
            if (type !== "acTL") return true;
            isAnimated = true;
            return false;
        });
        if (!isAnimated) return reject("Not an animated PNG");

        const preDataParts: Bytes[] = [];
        const postDataParts: Bytes[] = [];
        let headerData: Bytes | null = null;
        let frame: ApngFrame | null = null;
        const animation: ApngAnimation = { width: 0, height: 0, numPlays: 0, playTime: 0, frames: [] };

        forEachChunk(bytes, (type, off, length) => {
            switch (type) {
                case "IHDR":
                    headerData = bytes.subarray(off + 8, off + 8 + length);
                    animation.width = readDWord(bytes, off + 8);
                    animation.height = readDWord(bytes, off + 12);
                    break;
                case "acTL":
                    animation.numPlays = readDWord(bytes, off + 12);
                    break;
                case "fcTL": {
                    if (frame) animation.frames.push(frame);
                    const delayNumerator = readWord(bytes, off + 28);
                    const delayDenominator = readWord(bytes, off + 30) || 100;
                    let delay = 1000 * delayNumerator / delayDenominator;
                    if (delay <= 10) delay = 100;
                    animation.playTime += delay;
                    frame = {
                        width: readDWord(bytes, off + 12),
                        height: readDWord(bytes, off + 16),
                        left: readDWord(bytes, off + 20),
                        top: readDWord(bytes, off + 24),
                        delay,
                        disposeOp: bytes[off + 32],
                        blendOp: bytes[off + 33],
                        dataParts: [],
                        img: null as unknown as HTMLImageElement
                    };
                    break;
                }
                case "fdAT":
                    frame?.dataParts!.push(bytes.subarray(off + 12, off + 8 + length));
                    break;
                case "IDAT":
                    frame?.dataParts!.push(bytes.subarray(off + 8, off + 8 + length));
                    break;
                case "IEND":
                    postDataParts.push(copyBytes(bytes, off, 12 + length));
                    break;
                default:
                    preDataParts.push(copyBytes(bytes, off, 12 + length));
            }
        });

        if (frame) animation.frames.push(frame);
        if (!animation.frames.length) return reject("Not an animated PNG");

        let loadedImages = 0;
        const preBlob = new Blob(preDataParts);
        const postBlob = new Blob(postDataParts);

        for (const current of animation.frames) {
            const header = headerData!;
            header.set(dwordBytes(current.width), 0);
            header.set(dwordBytes(current.height), 4);

            const parts: Array<Bytes | Blob> = [PNG_SIGNATURE, makeChunk("IHDR", header), preBlob];
            for (const part of current.dataParts!) parts.push(makeChunk("IDAT", part));
            parts.push(postBlob);
            delete current.dataParts;

            const img = current.img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(img.src);
                if (++loadedImages === animation.frames.length) resolve(animation);
            };
            img.onerror = () => reject("Image creation error");
            img.src = URL.createObjectURL(new Blob(parts, { type: "image/png" }));
        }
    });
}
