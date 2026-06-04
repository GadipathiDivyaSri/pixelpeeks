/**
 * PixelPeek steganography library
 *
 * Image  : LSB embedding across R,G,B channels → output PNG via jimp
 * Audio  : WAV PCM 16-bit LSB embedding; non-WAV converted via FFmpeg
 * Video  : byte-tail append with magic markers PXP1 + 4-byte-length + payload + 1PXP
 *
 * Encryption: AES-256-GCM with PBKDF2-HMAC-SHA256 (200k iterations) when a
 * passphrase is supplied.
 */

import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "crypto";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// ── Encryption ─────────────────────────────────────────────────────────────

const ITER = 200_000;
const SALT_LEN = 16;
const NONCE_LEN = 12;
const TAG_LEN = 16;

export function encryptPayload(plain: Buffer, passphrase: string): Buffer {
  const salt = randomBytes(SALT_LEN);
  const key = pbkdf2Sync(passphrase, salt, ITER, 32, "sha256");
  const nonce = randomBytes(NONCE_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, nonce, tag, encrypted]);
}

export function decryptPayload(data: Buffer, passphrase: string): Buffer {
  if (data.length < SALT_LEN + NONCE_LEN + TAG_LEN + 1) {
    throw new Error("Wrong key or no hidden message.");
  }
  const salt = data.subarray(0, SALT_LEN);
  const nonce = data.subarray(SALT_LEN, SALT_LEN + NONCE_LEN);
  const tag = data.subarray(SALT_LEN + NONCE_LEN, SALT_LEN + NONCE_LEN + TAG_LEN);
  const ciphertext = data.subarray(SALT_LEN + NONCE_LEN + TAG_LEN);
  const key = pbkdf2Sync(passphrase, salt, ITER, 32, "sha256");
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error("Wrong key or no hidden message.");
  }
}

// ── Bit helpers ─────────────────────────────────────────────────────────────

/**
 * Embed `payload` bytes into the LSB of `carrier` bytes.
 * Uses 1 bit per carrier byte. Prepends a 4-byte big-endian length header.
 */
export function embedLSB(carrier: Buffer, payload: Buffer): Buffer {
  const total = payload.length + 4;
  if (carrier.length < total * 8) {
    throw new Error(
      `Carrier too small: need ${total * 8} bytes, have ${carrier.length}. ` +
      `Try a larger file or a shorter message.`
    );
  }
  const out = Buffer.from(carrier);
  const toEmbed = Buffer.allocUnsafe(total);
  toEmbed.writeUInt32BE(payload.length, 0);
  payload.copy(toEmbed, 4);

  let byteIdx = 0;
  for (let i = 0; i < total; i++) {
    for (let bit = 7; bit >= 0; bit--) {
      const b = (toEmbed[i] >> bit) & 1;
      out[byteIdx] = (out[byteIdx] & 0xfe) | b;
      byteIdx++;
    }
  }
  return out;
}

export function extractLSB(carrier: Buffer): Buffer {
  if (carrier.length < 32) throw new Error("Carrier too small to contain a message.");
  let byteIdx = 0;
  const lenBuf = Buffer.allocUnsafe(4);
  for (let i = 0; i < 4; i++) {
    let byte = 0;
    for (let bit = 7; bit >= 0; bit--) {
      byte |= (carrier[byteIdx] & 1) << bit;
      byteIdx++;
    }
    lenBuf[i] = byte;
  }
  const msgLen = lenBuf.readUInt32BE(0);
  if (msgLen === 0 || msgLen > 100_000_000 || carrier.length < (msgLen + 4) * 8) {
    throw new Error("No hidden message found (or wrong key).");
  }
  const msg = Buffer.allocUnsafe(msgLen);
  for (let i = 0; i < msgLen; i++) {
    let byte = 0;
    for (let bit = 7; bit >= 0; bit--) {
      byte |= (carrier[byteIdx] & 1) << bit;
      byteIdx++;
    }
    msg[i] = byte;
  }
  return msg;
}

// ── Image (PNG/JPG/WEBP/BMP/GIF/TIFF → PNG output) ─────────────────────────

export async function encodeImage(fileBuffer: Buffer, payload: Buffer): Promise<Buffer> {
  const { Jimp, intToRGBA, rgbaToInt } = await import("jimp");
  const img = await Jimp.fromBuffer(fileBuffer);
  const { width, height } = img.bitmap;
  const pixels: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { r, g, b } = intToRGBA(img.getPixelColor(x, y));
      pixels.push(r, g, b);
    }
  }
  const carrier = Buffer.from(pixels);
  const modified = embedLSB(carrier, payload);
  let pi = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const r = modified[pi++];
      const g = modified[pi++];
      const b = modified[pi++];
      img.setPixelColor(rgbaToInt(r, g, b, 255), x, y);
    }
  }
  return img.getBuffer("image/png");
}

export async function decodeImage(fileBuffer: Buffer): Promise<Buffer> {
  const { Jimp, intToRGBA } = await import("jimp");
  const img = await Jimp.fromBuffer(fileBuffer);
  const { width, height } = img.bitmap;
  const pixels: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { r, g, b } = intToRGBA(img.getPixelColor(x, y));
      pixels.push(r, g, b);
    }
  }
  return extractLSB(Buffer.from(pixels));
}

// ── Audio helpers ─────────────────────────────────────────────────────────────

/** Write buffer to a temp file, run a function on the path, clean up. */
function withTempFile<T>(ext: string, buf: Buffer, fn: (path: string) => T): T {
  const p = join(tmpdir(), `pxp_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  writeFileSync(p, buf);
  try {
    return fn(p);
  } finally {
    if (existsSync(p)) unlinkSync(p);
  }
}

/** Convert any audio buffer to 16-bit signed PCM WAV using FFmpeg. */
function convertToWav(inputBuf: Buffer, inputExt: string): Buffer {
  return withTempFile(inputExt, inputBuf, (inPath) => {
    const outPath = inPath.replace(inputExt, ".wav");
    try {
      execSync(
        `ffmpeg -y -i "${inPath}" -ar 44100 -ac 2 -sample_fmt s16 "${outPath}"`,
        { stdio: "pipe" }
      );
      const result = readFileSync(outPath);
      return result;
    } finally {
      if (existsSync(outPath)) unlinkSync(outPath);
    }
  });
}

function parseWavSamples(buf: Buffer): { header: Buffer; samples: Buffer } {
  let dataOffset = 12;
  while (dataOffset < buf.length - 8) {
    const chunkId = buf.toString("ascii", dataOffset, dataOffset + 4);
    const chunkSize = buf.readUInt32LE(dataOffset + 4);
    if (chunkId === "data") {
      return {
        header: buf.subarray(0, dataOffset + 8),
        samples: buf.subarray(dataOffset + 8, dataOffset + 8 + chunkSize),
      };
    }
    dataOffset += 8 + chunkSize;
  }
  throw new Error("No 'data' chunk found in WAV file.");
}

function isWav(buf: Buffer): boolean {
  return (
    buf.length > 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WAVE"
  );
}

// ── Audio encode/decode ───────────────────────────────────────────────────────

export function encodeAudioWav(wavBuffer: Buffer, payload: Buffer): Buffer {
  const { header, samples } = parseWavSamples(wavBuffer);
  const lowBytes = Buffer.allocUnsafe(Math.floor(samples.length / 2));
  for (let i = 0; i < lowBytes.length; i++) {
    lowBytes[i] = samples.readInt16LE(i * 2) & 0xff;
  }
  const modifiedLow = embedLSB(lowBytes, payload);
  const newSamples = Buffer.from(samples);
  for (let i = 0; i < lowBytes.length; i++) {
    const orig = samples.readInt16LE(i * 2);
    const newVal = (orig & 0xff00) | modifiedLow[i];
    newSamples.writeInt16LE(newVal, i * 2);
  }
  const tail = wavBuffer.subarray(header.length + samples.length);
  return Buffer.concat([header, newSamples, tail]);
}

/**
 * Encode audio: converts non-WAV to WAV first, then embeds payload.
 * Always returns a WAV buffer.
 */
export function encodeAudio(fileBuffer: Buffer, payload: Buffer, ext = ".wav"): Buffer {
  let wavBuf: Buffer;
  if (isWav(fileBuffer)) {
    wavBuf = fileBuffer;
  } else {
    wavBuf = convertToWav(fileBuffer, ext);
  }
  return encodeAudioWav(wavBuf, payload);
}

export function decodeAudioWav(wavBuffer: Buffer): Buffer {
  const { samples } = parseWavSamples(wavBuffer);
  const lowBytes = Buffer.allocUnsafe(Math.floor(samples.length / 2));
  for (let i = 0; i < lowBytes.length; i++) {
    lowBytes[i] = samples.readInt16LE(i * 2) & 0xff;
  }
  return extractLSB(lowBytes);
}

/**
 * Decode audio: converts non-WAV to WAV first, then extracts payload.
 */
export function decodeAudio(fileBuffer: Buffer, ext = ".wav"): Buffer {
  let wavBuf: Buffer;
  if (isWav(fileBuffer)) {
    wavBuf = fileBuffer;
  } else {
    wavBuf = convertToWav(fileBuffer, ext);
  }
  return decodeAudioWav(wavBuf);
}

// ── Video (byte-tail append) ──────────────────────────────────────────────────

const MAGIC_START = Buffer.from("PXP1");
const MAGIC_END = Buffer.from("1PXP");

export function encodeVideo(fileBuffer: Buffer, payload: Buffer): Buffer {
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(payload.length, 0);
  return Buffer.concat([fileBuffer, MAGIC_START, lenBuf, payload, MAGIC_END]);
}

export function decodeVideo(fileBuffer: Buffer): Buffer {
  const endIdx = fileBuffer.lastIndexOf(MAGIC_END);
  if (endIdx < 0) throw new Error("No hidden message found.");
  const startIdx = fileBuffer.lastIndexOf(MAGIC_START, endIdx);
  if (startIdx < 0) throw new Error("No hidden message found.");
  const lenBuf = fileBuffer.subarray(startIdx + 4, startIdx + 8);
  const payloadLen = lenBuf.readUInt32BE(0);
  const payload = fileBuffer.subarray(startIdx + 8, startIdx + 8 + payloadLen);
  if (payload.length !== payloadLen) throw new Error("No hidden message found.");
  return payload;
}

// ── Steganalysis features ────────────────────────────────────────────────────

export interface StegoFeatures {
  entropy: number;
  lsbRatio: number;
  lsbDeviation: number;
  chiSquare: number;
  blockLsbStdev: number;
}

function shannonEntropy(bytes: Uint8Array): number {
  const freq = new Float64Array(256);
  for (const b of bytes) freq[b]++;
  let h = 0;
  for (let i = 0; i < 256; i++) {
    if (freq[i] === 0) continue;
    const p = freq[i] / bytes.length;
    h -= p * Math.log2(p);
  }
  return h;
}

function lsbRatioOf(bytes: Uint8Array): number {
  let sum = 0;
  for (const b of bytes) sum += b & 1;
  return sum / bytes.length;
}

function chiSquarePairs(bytes: Uint8Array): number {
  const freq = new Float64Array(256);
  for (const b of bytes) freq[b]++;
  let chi = 0;
  for (let k = 0; k < 128; k++) {
    const expected = (freq[2 * k] + freq[2 * k + 1]) / 2;
    if (expected === 0) continue;
    const diff = freq[2 * k] - expected;
    chi += (diff * diff) / expected;
  }
  return Math.min(1, chi / (bytes.length * 0.5));
}

function blockLsbStdev(bytes: Uint8Array, blockSize = 64): number {
  const ratios: number[] = [];
  for (let i = 0; i + blockSize <= bytes.length; i += blockSize) {
    ratios.push(lsbRatioOf(bytes.subarray(i, i + blockSize)));
  }
  if (ratios.length === 0) return 0;
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const variance = ratios.reduce((s, r) => s + (r - mean) ** 2, 0) / ratios.length;
  return Math.sqrt(variance);
}

export async function analyzeImageFeatures(fileBuffer: Buffer): Promise<StegoFeatures> {
  const { Jimp, intToRGBA } = await import("jimp");
  const img = await Jimp.fromBuffer(fileBuffer);
  const { width, height } = img.bitmap;
  const pixels: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { r, g, b } = intToRGBA(img.getPixelColor(x, y));
      pixels.push(r, g, b);
    }
  }
  const bytes = new Uint8Array(pixels);
  const lsb = lsbRatioOf(bytes);
  return {
    entropy: shannonEntropy(bytes),
    lsbRatio: lsb,
    lsbDeviation: Math.abs(lsb - 0.5),
    chiSquare: chiSquarePairs(bytes),
    blockLsbStdev: blockLsbStdev(bytes),
  };
}

export function analyzeAudioFeatures(fileBuffer: Buffer, ext = ".wav"): StegoFeatures {
  let wavBuf: Buffer;
  try {
    if (isWav(fileBuffer)) {
      wavBuf = fileBuffer;
    } else {
      wavBuf = convertToWav(fileBuffer, ext);
    }
    const { samples } = parseWavSamples(wavBuf);
    const lowBytes = new Uint8Array(Math.floor(samples.length / 2));
    for (let i = 0; i < lowBytes.length; i++) {
      lowBytes[i] = samples.readInt16LE(i * 2) & 0xff;
    }
    const lsb = lsbRatioOf(lowBytes);
    return {
      entropy: shannonEntropy(lowBytes),
      lsbRatio: lsb,
      lsbDeviation: Math.abs(lsb - 0.5),
      chiSquare: chiSquarePairs(lowBytes),
      blockLsbStdev: blockLsbStdev(lowBytes),
    };
  } catch {
    // Fallback: analyze raw bytes
    const slice = new Uint8Array(fileBuffer.subarray(0, Math.min(65536, fileBuffer.length)));
    const lsb = lsbRatioOf(slice);
    return {
      entropy: shannonEntropy(slice),
      lsbRatio: lsb,
      lsbDeviation: Math.abs(lsb - 0.5),
      chiSquare: chiSquarePairs(slice),
      blockLsbStdev: blockLsbStdev(slice),
    };
  }
}

export function analyzeVideoFeatures(fileBuffer: Buffer): StegoFeatures {
  // If the file has our magic markers, it's definitely stego
  const hasMagic =
    fileBuffer.lastIndexOf(MAGIC_END) >= 0 &&
    fileBuffer.lastIndexOf(MAGIC_START) >= 0;

  if (hasMagic) {
    // Return features that will score as STEGO
    return {
      entropy: 7.9,
      lsbRatio: 0.5,
      lsbDeviation: 0.0,
      chiSquare: 0.95,
      blockLsbStdev: 0.01,
    };
  }

  // Sample a slice of bytes from the middle of the video for analysis
  const start = Math.floor(fileBuffer.length * 0.1);
  const end = Math.min(start + 65536, fileBuffer.length);
  const bytes = new Uint8Array(fileBuffer.subarray(start, end));
  const lsb = lsbRatioOf(bytes);
  return {
    entropy: shannonEntropy(bytes),
    lsbRatio: lsb,
    lsbDeviation: Math.abs(lsb - 0.5),
    chiSquare: chiSquarePairs(bytes),
    blockLsbStdev: blockLsbStdev(bytes),
  };
}

// ── Classifier ─────────────────────────────────────────────────────────────

export function classifySteganography(f: StegoFeatures): number {
  const deviationScore = 1 - Math.min(1, f.lsbDeviation / 0.3);
  const chiScore = Math.min(1, f.chiSquare);
  const blockScore = 1 - Math.min(1, f.blockLsbStdev / 0.2);
  const ratioScore = 1 - Math.min(1, Math.abs(f.lsbRatio - 0.5) / 0.3);
  const raw = 0.30 * deviationScore + 0.25 * chiScore + 0.25 * blockScore + 0.20 * ratioScore;
  return Math.max(0, Math.min(1, raw));
}
