/*
 * Majic — animated PNG decoder
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

export interface ApngFrame {
    width: number;
    height: number;
    left: number;
    top: number;
    delay: number;
    disposeOp: number;
    blendOp: number;
    img: HTMLImageElement;
}

export interface ApngAnimation {
    width: number;
    height: number;
    numPlays: number;
    playTime: number;
    frames: ApngFrame[];
}

interface Chunk {
    type: string;
    data: Uint8Array<ArrayBuffer>;
    raw: Uint8Array<ArrayBuffer>;
}

interface PendingFrame extends Omit<ApngFrame, "img"> {
    data: Array<Uint8Array<ArrayBuffer>>;
}

const SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});

function crc32(bytes: Uint8Array) {
    let crc = 0xFFFFFFFF;
    for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function readChunks(buffer: ArrayBuffer): Chunk[] {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const chunks: Chunk[] = [];

    for (let offset = SIGNATURE.length; offset + 12 <= bytes.length;) {
        const length = view.getUint32(offset);
        const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
        const end = offset + 12 + length;

        chunks.push({
            type,
            data: bytes.slice(offset + 8, offset + 8 + length),
            raw: bytes.slice(offset, end)
        });

        offset = end;
        if (type === "IEND") break;
    }

    return chunks;
}

function buildChunk(type: string, data: Uint8Array): Uint8Array<ArrayBuffer> {
    const chunk = new Uint8Array(new ArrayBuffer(12 + data.length));
    const view = new DataView(chunk.buffer);

    view.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
    chunk.set(data, 8);
    view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));

    return chunk;
}

function readFrameControl(data: Uint8Array): Omit<PendingFrame, "data"> {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const numerator = view.getUint16(20);
    const denominator = view.getUint16(22) || 100;
    const delay = (1000 * numerator) / denominator;

    return {
        width: view.getUint32(4),
        height: view.getUint32(8),
        left: view.getUint32(12),
        top: view.getUint32(16),
        delay: delay <= 10 ? 100 : delay,
        disposeOp: data[24],
        blendOp: data[25]
    };
}

function loadImage(parts: BlobPart[]) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(img.src);
            resolve(img);
        };
        img.onerror = () => reject("Image creation error");
        img.src = URL.createObjectURL(new Blob(parts, { type: "image/png" }));
    });
}

export async function parseAPNG(buffer: ArrayBuffer): Promise<ApngAnimation> {
    const signature = new Uint8Array(buffer, 0, Math.min(SIGNATURE.length, buffer.byteLength));
    if (signature.length < SIGNATURE.length || SIGNATURE.some((byte, i) => signature[i] !== byte)) {
        throw "Not a PNG file (invalid file signature)";
    }

    const chunks = readChunks(buffer);
    if (!chunks.some(chunk => chunk.type === "acTL")) throw "Not an animated PNG";

    const animation: Omit<ApngAnimation, "frames"> = { width: 0, height: 0, numPlays: 0, playTime: 0 };
    const sharedChunks: Array<Uint8Array<ArrayBuffer>> = [];
    const trailingChunks: Array<Uint8Array<ArrayBuffer>> = [];
    const pending: PendingFrame[] = [];
    let header: Uint8Array<ArrayBuffer> | undefined;

    for (const chunk of chunks) {
        const current = pending[pending.length - 1];

        switch (chunk.type) {
            case "IHDR": {
                header = chunk.data;
                const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
                animation.width = view.getUint32(0);
                animation.height = view.getUint32(4);
                break;
            }
            case "acTL":
                animation.numPlays = new DataView(chunk.data.buffer, chunk.data.byteOffset).getUint32(4);
                break;
            case "fcTL": {
                const frame = { ...readFrameControl(chunk.data), data: [] };
                animation.playTime += frame.delay;
                pending.push(frame);
                break;
            }
            case "fdAT":
                current?.data.push(chunk.data.subarray(4));
                break;
            case "IDAT":
                current?.data.push(chunk.data);
                break;
            case "IEND":
                trailingChunks.push(chunk.raw);
                break;
            default:
                sharedChunks.push(chunk.raw);
        }
    }

    if (!header || !pending.length) throw "Not an animated PNG";

    const shared = new Blob(sharedChunks);
    const trailing = new Blob(trailingChunks);

    const frames = await Promise.all(pending.map(({ data, ...frame }) => {
        const frameHeader = header!.slice();
        const view = new DataView(frameHeader.buffer);
        view.setUint32(0, frame.width);
        view.setUint32(4, frame.height);

        const parts: BlobPart[] = [SIGNATURE, buildChunk("IHDR", frameHeader), shared, ...data.map(part => buildChunk("IDAT", part)), trailing];
        return loadImage(parts).then(img => ({ ...frame, img }));
    }));

    return { ...animation, frames };
}
