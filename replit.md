# PixelPeek

A steganography studio that lets users hide, reveal, and detect secret messages inside images, audio, and video files — with real LSB embedding and AES-256 encryption.

## Run & Operate

- `pnpm --filter @workspace/api-server run build && PORT=8080 pnpm --filter @workspace/api-server run start` — build + run the API server (port 8080)
- `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/pixelpeek run dev` — run the frontend (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080)
- Frontend: React 19, Vite 7, Tailwind CSS 4, Framer Motion, Radix UI (port 5000)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Steganography: LSB image/audio, byte-tail video, AES-256-GCM encryption
- System: FFmpeg (for non-WAV audio format conversion)

## Where things live

- `artifacts/pixelpeek/` — React frontend
- `artifacts/api-server/src/lib/steg.ts` — all steganography logic (encode, decode, analyze)
- `artifacts/api-server/src/routes/steganography.ts` — `/encode`, `/decode`, `/detect` API routes
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/` — generated React Query hooks (run codegen to regenerate)
- `lib/api-zod/` — generated Zod schemas (run codegen to regenerate)
- `lib/db/src/schema/` — Drizzle DB schema

## Architecture decisions

- **OpenAPI-first**: All API types are generated from `openapi.yaml` via Orval. Don't edit generated files in `lib/api-client-react/` or `lib/api-zod/` — run codegen instead.
- **File uploads via multipart/form-data**: The frontend passes `{ file, message, key }` as a plain object to mutation hooks; the generated client builds the FormData. Always ensure the `file` field is in the OpenAPI schema for upload endpoints.
- **Audio conversion via FFmpeg**: Non-WAV audio (MP3, FLAC, OGG, M4A, AAC) is converted to 16-bit PCM WAV using FFmpeg before LSB embedding. Output is always WAV.
- **Video uses byte-tail append**: The payload is appended with magic markers (PXP1 / 1PXP). This is lossless and survives download/re-upload cycles but not re-encoding.
- **Steganalysis for video**: Checks for magic markers first (definitive STEGO), then falls back to LSB statistics.

## Product

- **Secret Sprinkle** — Embed a hidden message (with optional AES-256 passphrase) into an image, audio, or video file using real LSB steganography.
- **Secret Reveal** — Extract and decrypt a hidden message from a carrier file.
- **Pixel Peek** — Analyze any file for signs of hidden data using entropy, Chi-square, LSB deviation, and block variance analysis.
- **History** — View past encode/decode/peek operations with verdicts.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run codegen after changing `openapi.yaml`, then rebuild the API server.
- The `lib/api-zod/tsconfig.json` must include `"lib": ["es2022", "dom"]` — the generated Zod schemas use `zod.instanceof(File)` which requires the DOM `File` type.
- The API server must be **built** (esbuild) before starting — it runs from `dist/index.mjs`, not source.
- FFmpeg must be installed as a system dependency for non-WAV audio support.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
