import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import { db, eventsTable } from "@workspace/db";
import { desc, sql, eq, and } from "drizzle-orm";
import {
  GetStatsResponse,
  ListEventsResponse,
  ListEventsQueryParams,
  EncodeFileResponse,
  DecodeFileResponse,
  DetectSteganographyResponse,
} from "@workspace/api-zod";
import {
  encryptPayload,
  decryptPayload,
  encodeImage,
  decodeImage,
  encodeAudio,
  decodeAudio,
  encodeVideo,
  decodeVideo,
  wrapWithPxpkSignature,
  tryUnwrapPxpkSignature,
  classifyImageDetailed,
  classifyAudioDetailed,
  classifyVideoDetailed,
} from "../lib/steg";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

// ── Carrier detection ─────────────────────────────────────────────────────────

type Carrier = "image" | "audio" | "video";

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tiff", ".tif"]);
const AUDIO_EXTS = new Set([".wav", ".mp3", ".aac", ".flac", ".ogg", ".m4a", ".opus", ".wma"]);
const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm", ".avi", ".mkv", ".mpeg", ".mpg", ".m4v", ".3gp"]);

function detectCarrier(mimetype: string, originalname: string): Carrier {
  const ext = path.extname(originalname).toLowerCase();
  if (IMAGE_EXTS.has(ext) || mimetype.startsWith("image/")) return "image";
  if (AUDIO_EXTS.has(ext) || mimetype.startsWith("audio/")) return "audio";
  if (VIDEO_EXTS.has(ext) || mimetype.startsWith("video/")) return "video";
  return "image"; // fallback
}

function outputMime(carrier: Carrier): string {
  if (carrier === "image") return "image/png";
  if (carrier === "audio") return "audio/wav";
  return "video/mp4";
}

function outputExt(carrier: Carrier): string {
  if (carrier === "image") return ".png";
  if (carrier === "audio") return ".wav";
  return ".mp4";
}

// ── POST /encode ──────────────────────────────────────────────────────────────

router.post("/encode", upload.single("file"), async (req, res): Promise<void> => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No file uploaded." });
    return;
  }
  const message = req.body.message as string | undefined;
  if (!message || typeof message !== "string" || message.length === 0) {
    res.status(400).json({ error: "Message is required." });
    return;
  }
  const key = req.body.key as string | undefined;
  const carrier = detectCarrier(file.mimetype, file.originalname);
  const start = Date.now();

  try {
    let payload: Buffer = Buffer.from(message, "utf-8");
    if (key && key.trim().length > 0) {
      payload = Buffer.from(encryptPayload(payload, key.trim()));
    }
    // Wrap with PXPK_V1 signature so detection can identify PixelPeek-origin files
    payload = wrapWithPxpkSignature(payload);

    const fileExt = path.extname(file.originalname).toLowerCase() || ".wav";
    let outBuf: Buffer;
    if (carrier === "image") {
      outBuf = await encodeImage(file.buffer, payload);
    } else if (carrier === "audio") {
      outBuf = encodeAudio(file.buffer, payload, fileExt);
    } else {
      outBuf = encodeVideo(file.buffer, payload);
    }

    const timeSec = (Date.now() - start) / 1000;
    const baseName = path.basename(file.originalname, path.extname(file.originalname));
    const filename = `${baseName}_encoded${outputExt(carrier)}`;

    // Store encoded file temporarily in memory — return as base64 download URL
    const b64 = outBuf.toString("base64");
    const dataUrl = `data:${outputMime(carrier)};base64,${b64}`;

    await db.insert(eventsTable).values({
      operation: "encode",
      carrier,
      filename: file.originalname,
      verdict: null,
      failed: false,
    });

    res.json(EncodeFileResponse.parse({
      downloadUrl: dataUrl,
      filename,
      carrier,
      bytesUsed: payload.length,
      totalBytes: outBuf.length,
      timeSec,
    }));
  } catch (err: unknown) {
    await db.insert(eventsTable).values({
      operation: "encode",
      carrier,
      filename: file.originalname,
      verdict: null,
      failed: true,
    });
    const msg = err instanceof Error ? err.message : "Encoding failed.";
    res.status(400).json({ error: msg });
  }
});

// ── POST /decode ──────────────────────────────────────────────────────────────

router.post("/decode", upload.single("file"), async (req, res): Promise<void> => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No file uploaded." });
    return;
  }
  const key = req.body.key as string | undefined;
  const carrier = detectCarrier(file.mimetype, file.originalname);

  try {
    const fileExt = path.extname(file.originalname).toLowerCase() || ".wav";
    let rawPayload: Buffer;
    if (carrier === "image") {
      rawPayload = await decodeImage(file.buffer);
    } else if (carrier === "audio") {
      rawPayload = decodeAudio(file.buffer, fileExt);
    } else {
      rawPayload = decodeVideo(file.buffer);
    }

    // Strip PXPK_V1 signature if present
    const unwrapped = tryUnwrapPxpkSignature(rawPayload);
    const innerPayload = unwrapped.valid ? unwrapped.payload : rawPayload;

    let message: string;
    let encrypted = false;

    if (key && key.trim().length > 0) {
      encrypted = true;
      const plain = decryptPayload(innerPayload, key.trim());
      message = plain.toString("utf-8");
    } else {
      message = innerPayload.toString("utf-8");
    }

    // Sanity check — if the result isn't printable it's likely wrong key
    if (!message || message.length === 0) {
      throw new Error("No hidden message found (or wrong key).");
    }

    await db.insert(eventsTable).values({
      operation: "decode",
      carrier,
      filename: file.originalname,
      verdict: null,
      failed: false,
    });

    res.json(DecodeFileResponse.parse({ message, carrier, encrypted }));
  } catch (err: unknown) {
    await db.insert(eventsTable).values({
      operation: "decode",
      carrier,
      filename: file.originalname,
      verdict: null,
      failed: true,
    });
    const msg = err instanceof Error ? err.message : "Decoding failed.";
    res.status(400).json({ error: msg });
  }
});

// ── POST /detect ──────────────────────────────────────────────────────────────

router.post("/detect", upload.single("file"), async (req, res): Promise<void> => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No file uploaded." });
    return;
  }
  const carrier = detectCarrier(file.mimetype, file.originalname);

  try {
    const fileExt = path.extname(file.originalname).toLowerCase() || ".wav";
    let result;
    if (carrier === "image") {
      result = await classifyImageDetailed(file.buffer);
    } else if (carrier === "audio") {
      result = classifyAudioDetailed(file.buffer, fileExt);
    } else {
      result = classifyVideoDetailed(file.buffer);
    }

    const { features, verdict, probability } = result;

    // Store stego hits for STEGO + PIXELPEEK verdicts
    const dbVerdict = verdict === "PIXELPEEK" ? "STEGO" : verdict;

    await db.insert(eventsTable).values({
      operation: "detect",
      carrier,
      filename: file.originalname,
      verdict: dbVerdict,
      failed: false,
    });

    res.json(DetectSteganographyResponse.parse({ verdict, probability, carrier, features }));
  } catch (err: unknown) {
    await db.insert(eventsTable).values({
      operation: "detect",
      carrier,
      filename: file.originalname,
      verdict: null,
      failed: true,
    });
    const msg = err instanceof Error ? err.message : "Analysis failed.";
    res.status(400).json({ error: msg });
  }
});

// ── GET /stats ────────────────────────────────────────────────────────────────

router.get("/stats", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      operation: eventsTable.operation,
      count: sql<number>`count(*)::int`,
      stegoHits: sql<number>`count(*) filter (where verdict = 'STEGO')::int`,
    })
    .from(eventsTable)
    .groupBy(eventsTable.operation);

  let totalOps = 0;
  let encodes = 0;
  let decodes = 0;
  let peeks = 0;
  let stegoHits = 0;

  for (const row of rows) {
    totalOps += row.count;
    if (row.operation === "encode") encodes = row.count;
    if (row.operation === "decode") decodes = row.count;
    if (row.operation === "detect") {
      peeks = row.count;
      stegoHits = row.stegoHits;
    }
  }

  res.json(GetStatsResponse.parse({ totalOps, encodes, decodes, peeks, stegoHits }));
});

// ── GET /events ───────────────────────────────────────────────────────────────

router.get("/events", async (req, res): Promise<void> => {
  const parsed = ListEventsQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 50) : 50;

  const events = await db
    .select()
    .from(eventsTable)
    .orderBy(desc(eventsTable.createdAt))
    .limit(Math.min(limit, 200));

  res.json(ListEventsResponse.parse(events.map(e => ({
    id: e.id,
    operation: e.operation,
    carrier: e.carrier,
    filename: e.filename,
    verdict: e.verdict,
    failed: e.failed,
    createdAt: e.createdAt.toISOString(),
  }))));
});

export default router;
