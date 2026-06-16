import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon, Music, Video, Lock, AlertCircle,
  Copy, Check, X, Eye, EyeOff, Search, Download, FileText,
  Info, ShieldAlert, AlertTriangle
} from "lucide-react";
import { useDecodeFile } from "@workspace/api-client-react";
import { Confetti } from "@/components/confetti";

const JPEG_EXTS = new Set([".jpg", ".jpeg"]);

function getFileExt(name: string) {
  return name.includes(".") ? "." + name.split(".").pop()!.toLowerCase() : "";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function Decode() {
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const decodeFile = useDecodeFile();

  const isJpeg = file ? JPEG_EXTS.has(getFileExt(file.name)) : false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      decodeFile.reset();
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
      decodeFile.reset();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    decodeFile.mutate({
      data: {
        file,
        ...(passphrase ? { key: passphrase } : {}),
      } as any,
    });
  };

  const handleCopy = () => {
    if (decodeFile.data?.message) {
      navigator.clipboard.writeText(decodeFile.data.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!decodeFile.data?.message) return;
    const blob = new Blob([decodeFile.data.message], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extracted-message.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const getErrorMessage = (error: unknown): { title: string; detail: string; hint?: string } => {
    const e = error as { response?: { data?: { error?: string } }; message?: string };
    const raw = e?.response?.data?.error ?? e?.message ?? "";

    if (raw.includes("Wrong key") || raw.includes("wrong key")) {
      return {
        title: "Wrong passphrase",
        detail: "The passphrase you entered is incorrect.",
        hint: "Make sure the passphrase exactly matches what was used to encode the message.",
      };
    }
    if (raw.includes("No hidden message")) {
      return {
        title: "No hidden message found",
        detail: isJpeg
          ? "JPEG files use lossy compression that destroys LSB data. This file likely has no hidden message, or it was encoded as a JPEG (which corrupts steganographic data)."
          : "This file does not appear to contain a hidden message. Try a different file or check if a passphrase is needed.",
        hint: isJpeg ? "💡 Always use PNG, BMP, or WEBP for steganography — never JPEG." : undefined,
      };
    }
    if (raw.includes("Carrier too small")) {
      return {
        title: "File too small",
        detail: "This file is too small to contain a meaningful hidden message.",
      };
    }
    if (raw.includes("No 'data' chunk")) {
      return {
        title: "Invalid audio file",
        detail: "The audio file format is not supported or the file is corrupted.",
      };
    }
    return {
      title: "Decoding failed",
      detail: raw || "Could not extract a hidden message from this file.",
      hint: "Make sure this is a file that was previously encoded with a steganography tool.",
    };
  };

  const tabs = [
    { id: "image" as const, label: "🖼 Image", color: "bg-[#2563EB]", accept: "image/*", formats: "PNG · WEBP · BMP · GIF" },
    { id: "audio" as const, label: "🎵 Audio", color: "bg-[#A855F7]", accept: "audio/*", formats: "WAV · MP3 · FLAC · OGG · M4A" },
    { id: "video" as const, label: "🎥 Video", color: "bg-[#0D9488]", accept: "video/*", formats: "MP4 · MOV · WEBM · AVI" },
  ];

  const [activeTab, setActiveTab] = useState<"image" | "audio" | "video">("image");
  const activeTabData = tabs.find(t => t.id === activeTab)!;

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto pb-24">
      <Confetti trigger={decodeFile.isSuccess} />

      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 border-2 border-border rounded-full px-4 py-1.5 mb-4 font-mono text-xs font-bold uppercase tracking-wider"
        >
          <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          Detective Mode
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black mb-3 text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
          🕵 Reveal the Secret
        </h1>
        <p className="text-lg font-medium text-muted-foreground">
          Upload a carrier file to expose what's hidden inside.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-card rounded-2xl p-1.5 border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] w-fit mx-auto gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-testid={`tab-${tab.id}`}
            onClick={() => { setActiveTab(tab.id); setFile(null); decodeFile.reset(); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm text-white border-2 border-border ${
              activeTab === tab.id
                ? `${tab.color} shadow-[3px_3px_0_0_hsl(var(--border))]`
                : `${tab.color} opacity-40 hover:opacity-70`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-4 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[200px] relative overflow-hidden ${
            isDragging
              ? "border-[#2563EB] bg-blue-200 dark:bg-blue-900/40 scale-[1.01]"
              : file
                ? "border-border bg-blue-100 dark:bg-muted"
                : "border-[#2563EB] bg-blue-100 dark:bg-muted hover:bg-blue-200 dark:hover:bg-muted/80"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={activeTabData.accept}
            onChange={handleFileChange}
          />

          {decodeFile.isPending && (
            <motion.div
              initial={{ top: "0%" }}
              animate={{ top: ["0%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent pointer-events-none z-10"
              style={{ position: "absolute" }}
            />
          )}

          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className={`p-4 rounded-2xl border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] ${activeTabData.color}`}>
                {activeTab === "image" && <ImageIcon className="w-8 h-8 text-white" />}
                {activeTab === "audio" && <Music className="w-8 h-8 text-white" />}
                {activeTab === "video" && <Video className="w-8 h-8 text-white" />}
              </div>
              <div className="font-bold text-lg text-foreground">{file.name}</div>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <span className="text-sm font-mono text-muted-foreground">{formatBytes(file.size)}</span>
                <span className="text-xs px-2 py-0.5 bg-muted rounded-full border border-border text-muted-foreground font-mono">{file.type || "unknown"}</span>
              </div>
              <button
                type="button"
                onClick={(ev) => { ev.stopPropagation(); setFile(null); decodeFile.reset(); }}
                className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" /> Remove file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <motion.div
                animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              >
                <span className="text-5xl">🔍</span>
              </motion.div>
              <div className="font-bold text-xl text-foreground">Drop your carrier file here</div>
              <div className="font-medium text-sm text-muted-foreground">{activeTabData.formats}</div>
              <div className="text-xs text-muted-foreground">or click to browse</div>
            </div>
          )}
        </div>

        {/* JPEG warning */}
        {isJpeg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600 rounded-2xl p-4 text-amber-800 dark:text-amber-200"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
            <div>
              <div className="font-black text-sm mb-0.5">JPEG detected — decoding may fail</div>
              <div className="text-xs font-medium opacity-80">JPEG compression destroys LSB data. Steganography works best with PNG, BMP, or WEBP files.</div>
            </div>
          </motion.div>
        )}

        {/* Compatibility info */}
        <div className="flex items-start gap-3 bg-muted/50 border-2 border-border rounded-2xl p-4">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            <span className="font-bold text-foreground">Compatibility:</span> Best results with files encoded by PixelPeek. Files from other LSB steganography tools (Stegano, OpenStego, SilentEye) may also work. JPEG and re-encoded files typically fail.
          </div>
        </div>

        {/* Passphrase */}
        <div className="bg-blue-50 dark:bg-card border-4 border-border shadow-[8px_8px_0_0_hsl(var(--border))] rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-col gap-2">
            <label className="font-black text-lg flex items-center gap-2 text-foreground">
              🔒 Passphrase
              <span className="text-muted-foreground text-sm font-medium">(if the message was encrypted)</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                data-testid="input-passphrase"
                type={showPass ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter decryption key..."
                className="w-full p-4 pl-12 pr-12 rounded-xl border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all font-medium text-base outline-none bg-background"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        <button
          data-testid="button-submit-decode"
          type="submit"
          disabled={!file || decodeFile.isPending}
          className="bg-[#2563EB] text-white text-2xl font-black py-5 rounded-2xl border-4 border-border shadow-[8px_8px_0_0_hsl(var(--border))] hover:translate-x-2 hover:translate-y-2 hover:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[8px_8px_0_0_hsl(var(--border))] transition-all flex justify-center items-center gap-3"
        >
          {decodeFile.isPending ? (
            <>
              <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                🔍
              </motion.span>
              Searching for hidden secrets…
            </>
          ) : (
            <>🕵 Reveal Secret →</>
          )}
        </button>

        {/* Error state */}
        {decodeFile.isError && (() => {
          const { title, detail, hint } = getErrorMessage(decodeFile.error);
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-destructive/10 border-2 border-destructive rounded-2xl p-6 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-7 h-7 text-destructive flex-shrink-0" />
                <div className="font-black text-xl text-destructive">{title}</div>
              </div>
              <p className="text-sm font-medium text-destructive/80">{detail}</p>
              {hint && (
                <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/20 rounded-xl p-3">
                  <Info className="w-4 h-4 text-destructive/60 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-destructive/70">{hint}</p>
                </div>
              )}
              {passphrase && (
                <button
                  type="button"
                  onClick={() => { setPassphrase(""); decodeFile.reset(); }}
                  className="self-start text-xs font-bold text-destructive underline underline-offset-2"
                >
                  Try without passphrase →
                </button>
              )}
            </motion.div>
          );
        })()}
      </form>

      {/* Success state */}
      <AnimatePresence>
        {decodeFile.isSuccess && decodeFile.data && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-green-50 dark:bg-green-900/10 p-8 rounded-[2rem] border-4 border-border shadow-[8px_8px_0_0_hsl(var(--border))] flex flex-col gap-6"
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <motion.span
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="text-3xl"
                >
                  ✨
                </motion.span>
                <h3 className="text-2xl font-black text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Secret Message Found!
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-card px-3 py-1 rounded-full border-2 border-border text-xs font-bold uppercase text-foreground">
                  {decodeFile.data.carrier}
                </span>
                {decodeFile.data.encrypted && (
                  <span className="bg-green-500 dark:bg-green-600 px-3 py-1 rounded-full border-2 border-border text-xs font-bold flex items-center gap-1 text-white">
                    <Lock className="w-3 h-3" /> AES-256 Decrypted
                  </span>
                )}
              </div>
            </div>

            <div className="bg-card p-6 rounded-2xl border-2 border-border font-mono text-base leading-relaxed whitespace-pre-wrap min-h-[100px] shadow-[inset_2px_2px_0_0_hsl(var(--border))] text-foreground">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {decodeFile.data.message}
              </motion.span>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Carrier", val: decodeFile.data.carrier },
                { label: "Characters", val: decodeFile.data.message.length.toLocaleString() },
                { label: "Encryption", val: decodeFile.data.encrypted ? "AES-256-GCM" : "None" },
              ].map(item => (
                <div key={item.label} className="bg-card p-3 rounded-xl border-2 border-border text-sm">
                  <div className="text-muted-foreground font-medium text-xs uppercase tracking-wider">{item.label}</div>
                  <div className="font-black font-mono text-foreground">{item.val}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                data-testid="button-copy"
                onClick={handleCopy}
                className="bg-foreground text-background text-base font-black px-6 py-3 rounded-full border-4 border-border shadow-[4px_4px_0_0_hsl(var(--border))] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2"
              >
                {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy message</>}
              </button>
              <button
                data-testid="button-download-message"
                onClick={handleDownload}
                className="bg-card text-foreground text-base font-black px-6 py-3 rounded-full border-4 border-border shadow-[4px_4px_0_0_hsl(var(--border))] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download .txt
              </button>
              <button
                onClick={() => { setFile(null); decodeFile.reset(); setPassphrase(""); }}
                className="text-muted-foreground text-base font-bold px-6 py-3 rounded-full border-2 border-border hover:bg-muted transition-all flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Decode another
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
