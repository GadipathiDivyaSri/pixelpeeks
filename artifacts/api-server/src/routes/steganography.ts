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
  type EncryptAlgorithm,
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

const VALID_ALGOS = new Set<EncryptAlgorithm>(["aes-256-gcm", "aes-256-cbc", "chacha20-poly1305", "triple-des"]);

function detectCarrier(mimetype: string, originalname: string): Carrier {
  const ext = path.extname(originalname).toLowerCase();
  if (IMAGE_EXTS.has(ext) || mimetype.startsWith("image/")) return "image";
  if (AUDIO_EXTS.has(ext) || mimetype.startsWith("audio/")) return "audio";
  if (VIDEO_EXTS.has(ext) || mimetype.startsWith("video/")) return "video";
  return "image";
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
  const rawAlgo = req.body.algorithm as string | undefined;
  const algo: EncryptAlgorithm = (VALID_ALGOS.has(rawAlgo as EncryptAlgorithm) ? rawAlgo : "aes-256-gcm") as EncryptAlgorithm;
  const carrier = detectCarrier(file.mimetype, file.originalname);
  const start = Date.now();

  try {
    let payload: Buffer = Buffer.from(message, "utf-8");
    let algorithmUsed: string | null = null;

    if (key && key.trim().length > 0) {
      payload = encryptPayload(payload, key.trim(), algo);
      algorithmUsed = algo;
    }

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
      algorithmUsed,
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

    const unwrapped = tryUnwrapPxpkSignature(rawPayload);
    const innerPayload = unwrapped.valid ? unwrapped.payload : rawPayload;

    let message: string;
    let encrypted = false;
    let algorithmUsed: string | null = null;

    if (key && key.trim().length > 0) {
      encrypted = true;
      const { plain, algorithm } = decryptPayload(innerPayload, key.trim());
      message = plain.toString("utf-8");
      algorithmUsed = algorithm;
    } else {
      message = innerPayload.toString("utf-8");
    }

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

    res.json(DecodeFileResponse.parse({ message, carrier, encrypted, algorithmUsed }));
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

  let totalOps = 0, encodes = 0, decodes = 0, peeks = 0, stegoHits = 0;
  for (const row of rows) {
    totalOps += row.count;
    if (row.operation === "encode") encodes = row.count;
    if (row.operation === "decode") decodes = row.count;
    if (row.operation === "detect") { peeks = row.count; stegoHits = row.stegoHits; }
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
