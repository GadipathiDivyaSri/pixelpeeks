/**
 * Cross-application steganography decoder.
 *
 * Attempts to extract hidden data from files encoded by third-party tools.
 * Supported methods:
 *   Images : LSB 1-4 bit from R/G/B/A/RGB/BGR/RGBA/ARGB channels (MSB & LSB packing),
 *            PNG tEXt/zTXt/iTXt chunk extraction, appended data after IEND/EOI.
 *   Audio  : WAV PCM LSB extraction per channel (1-4 bit, MSB & LSB packing),
 *            ID3/INFO metadata.
 *   Video  : PixelPeeks PXP1 markers, appended data scan, user-data atoms.
 *
 * Target tool compatibility: QuickStego, OpenStego, SilentEye, Xiao,
 *   OpenPuff, generic 1-bit LSB encoders, StegSolve-generated images.
 */

import { inflateSync } from "zlib";

// ── Public types ──────────────────────────────────────────────────────────────

export interface CrossAppCandidate {
  method: string;
  content: string;
  rawHex: string;
  confidence: number;
  byteCount: number;
  encoding: string;
}

export interface PngChunkInfo {
  type: string;
  size: number;
  suspicious: boolean;
  content?: string;
}

export interface AppendedDataInfo {
  byteCount: number;
  signature: string;
  hex: string;
  readable: boolean;
  content?: string;
}

export interface MetadataFinding {
  type: string;
  key: string;
  value: string;
}

export interface CrossAppDecodeResult {
  candidates: CrossAppCandidate[];
  pngChunks: PngChunkInfo[];
  appendedData: AppendedDataInfo | null;
  metadata: MetadataFinding[];
  totalMethodsTried: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_EXTRACT_BYTES = 16_384;
const MIN_CONTENT = 3;
const MIN_CONFIDENCE = 42;

// ── Utility ───────────────────────────────────────────────────────────────────

function printabilityScore(buf: Buffer, limit = 512): number {
  const end = Math.min(buf.length, limit);
  if (end === 0) return 0;
  let p = 0;
  for (let i = 0; i < end; i++) {
    const b = buf[i]!;
    if (b === 0) break;
    if ((b >= 32 && b < 127) || b === 9 || b === 10 || b === 13) p++;
  }
  return p / end;
}

function tryNullTerminated(raw: Buffer, maxLen = MAX_EXTRACT_BYTES): string | null {
  const nullIdx = raw.indexOf(0);
  const end = nullIdx >= 0 && nullIdx <= maxLen ? nullIdx : Math.min(maxLen, raw.length);
  if (end < MIN_CONTENT) return null;
  const slice = raw.subarray(0, end);
  if (printabilityScore(slice) < 0.72) return null;
  try { return slice.toString("utf-8"); } catch { return slice.toString("latin1"); }
}

function tryLenPrefix(raw: Buffer, lenBytes: 2 | 4, be: boolean): Buffer | null {
  if (raw.length < lenBytes + MIN_CONTENT) return null;
  let len: number;
  if (lenBytes === 4) len = be ? raw.readUInt32BE(0) : raw.readUInt32LE(0);
  else len = be ? raw.readUInt16BE(0) : raw.readUInt16LE(0);
  if (len < MIN_CONTENT || len > 500_000 || lenBytes + len > raw.length) return null;
  return raw.subarray(lenBytes, lenBytes + len);
}

function tryZlib(raw: Buffer): Buffer | null {
  if (raw.length < 6) return null;
  try { return inflateSync(raw.length > 65536 ? raw.subarray(0, 65536) : raw); } catch { return null; }
}

function detectSig(buf: Buffer): string {
  if (buf.length < 4) return "unknown";
  const h = buf.subarray(0, 8).toString("hex");
  if (h.startsWith("504b0304")) return "ZIP";
  if (h.startsWith("25504446")) return "PDF";
  if (h.startsWith("ffd8ff"))   return "JPEG";
  if (h.startsWith("89504e47")) return "PNG";
  if (h.startsWith("47494638")) return "GIF";
  if (h.startsWith("52494646")) return "RIFF";
  if (h.startsWith("1f8b"))     return "GZIP";
  if (printabilityScore(buf, 128) > 0.8) return "TEXT";
  return "binary";
}

function analyzeRawBytes(method: string, raw: Buffer): CrossAppCandidate | null {
  if (raw.length < MIN_CONTENT) return null;

  const attempts: Array<{ content: string; enc: string; score: number }> = [];

  // 1. Null-terminated
  const ns = tryNullTerminated(raw);
  if (ns && ns.length >= MIN_CONTENT) {
    attempts.push({ content: ns, enc: "null-terminated", score: printabilityScore(Buffer.from(ns)) });
  }

  // 2. Length prefix variants
  for (const [lb, be] of [[4, true], [4, false], [2, true], [2, false]] as const) {
    const lp = tryLenPrefix(raw, lb as 2 | 4, be as boolean);
    if (!lp) continue;
    const sc = printabilityScore(lp);
    if (sc < 0.70) continue;
    try {
      const txt = lp.toString("utf-8");
      attempts.push({ content: txt, enc: `len${lb}${be ? "BE" : "LE"}`, score: sc });
    } catch {}
  }

  // 3. Zlib then null-terminated / length-prefix
  const zd = tryZlib(raw);
  if (zd) {
    const zs = tryNullTerminated(zd);
    if (zs && zs.length >= MIN_CONTENT) {
      attempts.push({ content: zs, enc: "zlib+null-terminated", score: printabilityScore(Buffer.from(zs)) * 0.9 });
    }
    const zl = tryLenPrefix(zd, 4, true);
    if (zl && printabilityScore(zl) > 0.70) {
      try { attempts.push({ content: zl.toString("utf-8"), enc: "zlib+len4BE", score: printabilityScore(zl) * 0.85 }); } catch {}
    }
  }

  if (attempts.length === 0) return null;
  attempts.sort((a, b) => b.score - a.score);
  const best = attempts[0]!;
  const confidence = Math.round(best.score * 90 + 5);
  if (confidence < MIN_CONFIDENCE) return null;

  return {
    method,
    content: best.content,
    rawHex: raw.subarray(0, 16).toString("hex"),
    confidence,
    byteCount: best.content.length,
    encoding: best.enc,
  };
}

// ── LSB bit extraction ────────────────────────────────────────────────────────

/**
 * Extract bits from a flat RGBA pixel buffer.
 * channelIndices: e.g. [0,1,2] for RGB, [0] for R-only (0=R,1=G,2=B,3=A)
 * bitDepth: 1-4 (how many LSBs per channel value to extract)
 * msbFirst: if true → MSB-first byte packing; if false → LSB-first
 */
function extractLsbPixels(
  pixels: Buffer,
  channelIndices: number[],
  bitDepth: 1 | 2 | 3 | 4,
  msbFirst: boolean,
  maxBytes: number,
): Buffer {
  const result: number[] = [];
  let bitBuf = 0;
  let bitsInBuf = 0;
  const pixelCount = Math.floor(pixels.length / 4);

  outer: for (let px = 0; px < pixelCount; px++) {
    for (const ch of channelIndices) {
      const val = pixels[px * 4 + ch] ?? 0;
      for (let b = 0; b < bitDepth; b++) {
        const bit = (val >> b) & 1;
        if (msbFirst) { bitBuf = ((bitBuf << 1) | bit) & 0xff; }
        else          { bitBuf = (bitBuf | (bit << bitsInBuf)) & 0xff; }
        bitsInBuf++;
        if (bitsInBuf === 8) {
          result.push(bitBuf);
          bitBuf = 0; bitsInBuf = 0;
          if (result.length >= maxBytes) break outer;
        }
      }
    }
  }
  return Buffer.from(result);
}

// ── PNG chunk parser ──────────────────────────────────────────────────────────

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const STD_CHUNKS = new Set([
  "IHDR","PLTE","IDAT","IEND","cHRM","gAMA","iCCP","sBIT","sRGB",
  "bKGD","hIST","tRNS","pHYs","sPLT","tIME","oFFs","vpAg","eXIf",
  // Text chunks are standard but worth reading
  "tEXt","zTXt","iTXt",
]);

function parsePngChunks(buf: Buffer): PngChunkInfo[] {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) return [];
  const chunks: PngChunkInfo[] = [];
  let off = 8;
  while (off + 12 <= buf.length) {
    const len = buf.readUInt32BE(off);
    if (len > 50_000_000) break;
    const type = buf.subarray(off + 4, off + 8).toString("ascii");
    const data = buf.subarray(off + 8, off + 8 + len);
    off += 12 + len;
    let content: string | undefined;

    if (type === "tEXt" && data.length > 1) {
      const ni = data.indexOf(0);
      if (ni >= 0) {
        const key = data.subarray(0, ni).toString("ascii");
        const val = data.subarray(ni + 1).toString("latin1");
        if (val.length > 0) content = `[${key}] ${val}`;
      }
    } else if (type === "zTXt" && data.length > 2) {
      const ni = data.indexOf(0);
      if (ni >= 0) {
        const key = data.subarray(0, ni).toString("ascii");
        try {
          const dec = inflateSync(data.subarray(ni + 2));
          const val = dec.toString("utf-8");
          if (val.length > 0) content = `[${key}] ${val}`;
        } catch {}
      }
    } else if (type === "iTXt" && data.length > 5) {
      const ni = data.indexOf(0);
      if (ni >= 0) {
        const key = data.subarray(0, ni).toString("ascii");
        let ts = ni + 3; // skip comprFlag + comprMethod
        const li = data.indexOf(0, ts);
        if (li >= 0) {
          ts = li + 1;
          const ki = data.indexOf(0, ts);
          if (ki >= 0) {
            ts = ki + 1;
            const val = data.subarray(ts).toString("utf-8");
            if (val.length > 0) content = `[${key}] ${val}`;
          }
        }
      }
    }

    chunks.push({ type, size: len, suspicious: !STD_CHUNKS.has(type), content });
  }
  return chunks;
}

// ── Appended data detection ───────────────────────────────────────────────────

function detectAppendedData(buf: Buffer): AppendedDataInfo | null {
  let endPos = -1;

  // PNG: after IEND (12 bytes)
  if (buf.length > 8 && buf.subarray(0, 8).equals(PNG_SIG)) {
    let off = 8;
    while (off + 12 <= buf.length) {
      const len = buf.readUInt32BE(off);
      if (len > 50_000_000) break;
      const type = buf.subarray(off + 4, off + 8).toString("ascii");
      off += 12 + len;
      if (type === "IEND") { endPos = off; break; }
    }
  }

  // JPEG: after last EOI (0xFF 0xD9)
  if (endPos === -1 && buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = buf.length - 2; i >= 2; i--) {
      if (buf[i] === 0xff && buf[i + 1] === 0xd9) { endPos = i + 2; break; }
    }
  }

  if (endPos > 0 && endPos < buf.length) {
    const appended = buf.subarray(endPos);
    const sig = detectSig(appended);
    const readable = printabilityScore(appended, 256) > 0.7;
    const content = readable ? tryNullTerminated(appended, 4096) ?? undefined : undefined;
    return {
      byteCount: appended.length,
      signature: sig,
      hex: appended.subarray(0, 32).toString("hex"),
      readable,
      content,
    };
  }
  return null;
}

// ── Image metadata ────────────────────────────────────────────────────────────

function extractImageMetadata(buf: Buffer): MetadataFinding[] {
  const findings: MetadataFinding[] = [];

  // PNG tEXt/zTXt/iTXt are handled in chunk parsing.
  // Also check for EXIF comment
  // JPEG COM marker (0xFF 0xFE)
  if (buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off + 4 < buf.length) {
      if (buf[off] !== 0xff) break;
      const marker = buf[off + 1]!;
      const len = buf.readUInt16BE(off + 2);
      if (marker === 0xfe) {
        // COM marker
        const comment = buf.subarray(off + 4, off + 2 + len).toString("latin1");
        if (comment.trim().length > 0) {
          findings.push({ type: "JPEG-COM", key: "Comment", value: comment.trim() });
        }
      }
      off += 2 + len;
    }
  }

  return findings;
}

// ── Main image cross-app decoder ──────────────────────────────────────────────

export async function crossAppDecodeImage(fileBuffer: Buffer): Promise<CrossAppDecodeResult> {
  const candidates: CrossAppCandidate[] = [];
  let totalMethodsTried = 0;

  // Get RGBA pixel data via Jimp
  const { Jimp, intToRGBA } = await import("jimp");
  let pixels: Buffer;
  let width = 0;
  let height = 0;
  try {
    const img = await Jimp.fromBuffer(fileBuffer);
    width = img.bitmap.width;
    height = img.bitmap.height;
    pixels = Buffer.allocUnsafe(width * height * 4);
    let pi = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const { r, g, b, a } = intToRGBA(img.getPixelColor(x, y));
        pixels[pi++] = r; pixels[pi++] = g; pixels[pi++] = b; pixels[pi++] = a;
      }
    }
  } catch {
    // Can't decode image pixels — still do chunk/appended analysis
    pixels = Buffer.alloc(0);
  }

  if (pixels.length > 0) {
    // Channel configurations to try
    const channelSets: Array<{ name: string; idx: number[] }> = [
      { name: "RGB",  idx: [0, 1, 2] },
      { name: "BGR",  idx: [2, 1, 0] },
      { name: "RGBA", idx: [0, 1, 2, 3] },
      { name: "ARGB", idx: [3, 0, 1, 2] },
      { name: "R",    idx: [0] },
      { name: "G",    idx: [1] },
      { name: "B",    idx: [2] },
      { name: "A",    idx: [3] },
      { name: "RG",   idx: [0, 1] },
      { name: "RB",   idx: [0, 2] },
      { name: "GB",   idx: [1, 2] },
    ];

    // Bit depths and packing orders to try
    const bitDepths: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];
    const packings = [false, true]; // LSB-first (most common), MSB-first

    for (const { name, idx } of channelSets) {
      for (const depth of bitDepths) {
        for (const msb of packings) {
          totalMethodsTried++;
          const methodName = `LSB-${depth}bit-${name}-${msb ? "MSB" : "LSB"}-first`;
          try {
            const raw = extractLsbPixels(pixels, idx, depth, msb, MAX_EXTRACT_BYTES);
            const c = analyzeRawBytes(methodName, raw);
            if (c) candidates.push(c);
          } catch {}
          // Early exit if we have a very high-confidence result
          if (candidates.length > 0 && candidates[0]!.confidence >= 90) break;
        }
        if (candidates.length > 0 && candidates[0]!.confidence >= 90) break;
      }
    }
  }

  // PNG chunk analysis
  const pngChunks = parsePngChunks(fileBuffer);
  for (const chunk of pngChunks) {
    if (chunk.content && chunk.content.length >= MIN_CONTENT) {
      totalMethodsTried++;
      candidates.push({
        method: `PNG-${chunk.type}`,
        content: chunk.content,
        rawHex: Buffer.from(chunk.content).subarray(0, 16).toString("hex"),
        confidence: 92,
        byteCount: chunk.content.length,
        encoding: "png-chunk-text",
      });
    }
  }

  // Metadata analysis
  const metadata = extractImageMetadata(fileBuffer);
  for (const m of metadata) {
    if (m.value.length >= MIN_CONTENT) {
      totalMethodsTried++;
      candidates.push({
        method: `META-${m.type}`,
        content: m.value,
        rawHex: Buffer.from(m.value).subarray(0, 16).toString("hex"),
        confidence: 85,
        byteCount: m.value.length,
        encoding: "metadata",
      });
    }
  }

  // Appended data
  const appendedData = detectAppendedData(fileBuffer);
  if (appendedData?.content) {
    totalMethodsTried++;
    candidates.push({
      method: "APPENDED-DATA",
      content: appendedData.content,
      rawHex: appendedData.hex.slice(0, 32),
      confidence: 80,
      byteCount: appendedData.content.length,
      encoding: "appended",
    });
  }

  // Deduplicate and sort by confidence
  const seen = new Set<string>();
  const unique: CrossAppCandidate[] = [];
  candidates.sort((a, b) => b.confidence - a.confidence);
  for (const c of candidates) {
    const key = c.content.slice(0, 80);
    if (!seen.has(key)) { seen.add(key); unique.push(c); }
  }

  return { candidates: unique.slice(0, 10), pngChunks, appendedData, metadata, totalMethodsTried };
}

// ── Audio cross-app decoder ───────────────────────────────────────────────────

function parseWavForCrossApp(buf: Buffer): { all: Buffer; left: Buffer; right: Buffer | null; channels: number } | null {
  if (!(buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WAVE")) return null;

  let channels = 1;
  let off = 12;
  while (off + 8 < buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    const sz = buf.readUInt32LE(off + 4);
    if (id === "fmt " && sz >= 16) {
      channels = buf.readUInt16LE(off + 10);
    }
    if (id === "data") {
      const samples = buf.subarray(off + 8, off + 8 + sz);
      const sampleCount = Math.floor(samples.length / 2);
      // Extract low byte of each 16-bit sample
      const all = Buffer.allocUnsafe(sampleCount);
      for (let i = 0; i < sampleCount; i++) all[i] = samples.readUInt16LE(i * 2) & 0xff;

      if (channels >= 2) {
        const half = Math.floor(sampleCount / channels);
        const left = Buffer.allocUnsafe(half);
        const right = Buffer.allocUnsafe(half);
        for (let i = 0; i < half; i++) {
          left[i] = samples.readUInt16LE(i * channels * 2) & 0xff;
          right[i] = samples.readUInt16LE((i * channels + 1) * 2) & 0xff;
        }
        return { all, left, right, channels };
      }
      return { all, left: all, right: null, channels };
    }
    off += 8 + sz;
  }
  return null;
}

function extractWavId3(buf: Buffer): MetadataFinding[] {
  const findings: MetadataFinding[] = [];
  // ID3v2: file starts with "ID3"
  if (buf.length > 10 && buf.subarray(0, 3).toString("ascii") === "ID3") {
    let off = 10;
    while (off + 10 < buf.length) {
      const id = buf.subarray(off, off + 4).toString("ascii");
      const len = buf.readUInt32BE(off + 4);
      if (len <= 0 || len > 100_000) break;
      const data = buf.subarray(off + 10, off + 10 + len);
      if (["TIT2","TALB","TPE1","TCOM","TCON","COMM","WXXX","TXXX"].includes(id)) {
        const val = data.subarray(1).toString("utf-8").replace(/\0/g, " ").trim();
        if (val.length > 0) findings.push({ type: "ID3", key: id, value: val });
      }
      off += 10 + len;
    }
  }
  return findings;
}

export function crossAppDecodeAudio(fileBuffer: Buffer): CrossAppDecodeResult {
  const candidates: CrossAppCandidate[] = [];
  let totalMethodsTried = 0;
  const metadata: MetadataFinding[] = extractWavId3(fileBuffer);

  const wav = parseWavForCrossApp(fileBuffer);
  if (wav) {
    const channelBuffers: Array<{ name: string; buf: Buffer }> = [
      { name: "ALL", buf: wav.all },
      { name: "LEFT", buf: wav.left },
    ];
    if (wav.right) channelBuffers.push({ name: "RIGHT", buf: wav.right });

    for (const { name, buf } of channelBuffers) {
      // Map sample low-bytes to "virtual" RGBA pixels (1 sample per pixel's R channel)
      const virtualPixels = Buffer.allocUnsafe(buf.length * 4);
      for (let i = 0; i < buf.length; i++) {
        virtualPixels[i * 4] = buf[i]!;
        virtualPixels[i * 4 + 1] = 0;
        virtualPixels[i * 4 + 2] = 0;
        virtualPixels[i * 4 + 3] = 255;
      }

      for (const depth of [1, 2, 3, 4] as const) {
        for (const msb of [false, true]) {
          totalMethodsTried++;
          const method = `WAV-${name}-${depth}bit-${msb ? "MSB" : "LSB"}`;
          try {
            const raw = extractLsbPixels(virtualPixels, [0], depth, msb, MAX_EXTRACT_BYTES);
            const c = analyzeRawBytes(method, raw);
            if (c) candidates.push(c);
          } catch {}
        }
      }
    }
  }

  // ID3 metadata as potential hidden content candidates
  for (const m of metadata) {
    if (m.value.length >= MIN_CONTENT && m.value.length < 2000) {
      candidates.push({
        method: `ID3-${m.key}`,
        content: m.value,
        rawHex: Buffer.from(m.value).subarray(0, 16).toString("hex"),
        confidence: 75,
        byteCount: m.value.length,
        encoding: "id3-metadata",
      });
    }
  }

  const seen = new Set<string>();
  const unique: CrossAppCandidate[] = [];
  candidates.sort((a, b) => b.confidence - a.confidence);
  for (const c of candidates) {
    const key = c.content.slice(0, 80);
    if (!seen.has(key)) { seen.add(key); unique.push(c); }
  }

  return { candidates: unique.slice(0, 10), pngChunks: [], appendedData: null, metadata, totalMethodsTried };
}

// ── Video cross-app decoder ───────────────────────────────────────────────────

const PXP1 = Buffer.from("PXP1");
const PXP1_END = Buffer.from("1PXP");

function tryVideoAppendedData(buf: Buffer): AppendedDataInfo | null {
  // Scan last 50KB for readable data or appended signatures
  const scanStart = Math.max(0, buf.length - 50_000);
  const tail = buf.subarray(scanStart);

  // Look for common text/file signatures in the tail
  for (let i = 0; i + 4 < tail.length; i++) {
    const sig = detectSig(tail.subarray(i));
    if (sig === "TEXT" || sig === "ZIP" || sig === "PDF") {
      const content = sig === "TEXT" ? tryNullTerminated(tail.subarray(i), 4096) ?? undefined : undefined;
      return {
        byteCount: tail.length - i,
        signature: sig,
        hex: tail.subarray(i, i + 32).toString("hex"),
        readable: sig === "TEXT",
        content,
      };
    }
  }
  return null;
}

function tryVideoMp4UserData(buf: Buffer): MetadataFinding[] {
  const findings: MetadataFinding[] = [];
  // Scan for MP4 udta/meta/©nam/©cmt/©aut atoms
  const atomTags = ["©nam", "©cmt", "©aut", "©alb", "©wrt", "desc", "cprt", "ldes"];
  for (const tag of atomTags) {
    const needle = Buffer.from(tag);
    let off = 0;
    while (off < buf.length - 12) {
      const idx = buf.indexOf(needle, off);
      if (idx < 0) break;
      // MP4 atom: 4-byte size, 4-byte tag, 4-byte version/flags, 4-byte language, then text
      const atomStart = idx - 4;
      if (atomStart >= 0) {
        const atomSize = buf.readUInt32BE(atomStart);
        if (atomSize > 8 && atomSize < 10_000 && atomStart + atomSize <= buf.length) {
          // Try to read text after 12-byte atom header
          const textBuf = buf.subarray(idx + 4 + 8, atomStart + atomSize);
          const text = textBuf.toString("utf-8").replace(/\0/g, "").trim();
          if (text.length >= MIN_CONTENT) {
            findings.push({ type: "MP4-atom", key: tag, value: text });
          }
        }
      }
      off = idx + 1;
    }
  }
  return findings;
}

export function crossAppDecodeVideo(fileBuffer: Buffer): CrossAppDecodeResult {
  const candidates: CrossAppCandidate[] = [];
  let totalMethodsTried = 0;

  // Try PixelPeeks PXP1/1PXP markers (may not have been found by primary decode)
  totalMethodsTried++;
  try {
    const endIdx = fileBuffer.lastIndexOf(PXP1_END);
    if (endIdx > 0) {
      const startIdx = fileBuffer.lastIndexOf(PXP1, endIdx);
      if (startIdx >= 0) {
        const lenBuf = fileBuffer.subarray(startIdx + 4, startIdx + 8);
        const payloadLen = lenBuf.readUInt32BE(0);
        const payload = fileBuffer.subarray(startIdx + 8, startIdx + 8 + payloadLen);
        if (payload.length === payloadLen && payloadLen > 0) {
          const content = tryNullTerminated(payload, payloadLen) ?? payload.toString("utf-8");
          if (content.length >= MIN_CONTENT) {
            candidates.push({ method: "PixelPeeks-PXP1", content, rawHex: payload.subarray(0, 16).toString("hex"), confidence: 98, byteCount: content.length, encoding: "pxp1-marker" });
          }
        }
      }
    }
  } catch {}

  // MP4 user-data atoms
  const metadata = tryVideoMp4UserData(fileBuffer);
  for (const m of metadata) {
    candidates.push({ method: `MP4-${m.key}`, content: m.value, rawHex: Buffer.from(m.value).subarray(0, 16).toString("hex"), confidence: 80, byteCount: m.value.length, encoding: "mp4-metadata" });
  }

  // Appended data
  const appendedData = tryVideoAppendedData(fileBuffer);
  if (appendedData?.content) {
    candidates.push({ method: "APPENDED-DATA", content: appendedData.content, rawHex: appendedData.hex.slice(0, 32), confidence: 70, byteCount: appendedData.content.length, encoding: "appended" });
  }

  candidates.sort((a, b) => b.confidence - a.confidence);

  return { candidates: candidates.slice(0, 10), pngChunks: [], appendedData, metadata, totalMethodsTried };
}
