import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud, Image as ImageIcon, Music, Video, Lock, Download,
  AlertCircle, CheckCircle, Sparkles, X, Eye, EyeOff
} from "lucide-react";
import { useEncodeFile } from "@workspace/api-client-react";
import { Confetti } from "@/components/confetti";

const MAX_CHARS = 5000;

function estimateCapacityBytes(file: File, type: "image" | "audio" | "video"): number | null {
  if (type === "image") {
    return Math.floor((file.size * 0.3) / 8) - 4;
  }
  if (type === "audio") {
    return Math.floor((file.size * 0.125) / 8) - 4;
  }
  return null;
}

export default function Encode() {
  const [activeTab, setActiveTab] = useState<"image" | "audio" | "video">("image");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const encodeFile = useEncodeFile();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      encodeFile.reset();
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      encodeFile.reset();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !message) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("message", message);
    if (passphrase) formData.append("key", passphrase);

    encodeFile.mutate({ data: formData as any });
  };

  const tabs = [
    { id: "image" as const, label: "🖼 Image", color: "bg-[hsl(var(--chart-1))]", formats: "PNG · JPG · WEBP · BMP · GIF" },
    { id: "audio" as const, label: "🎵 Audio", color: "bg-[hsl(var(--chart-3))]", formats: "WAV (PCM)" },
    { id: "video" as const, label: "🎥 Video", color: "bg-[hsl(var(--chart-4))]", formats: "MP4 · MOV · WEBM · AVI" },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab)!;
  const capacity = file ? estimateCapacityBytes(file, activeTab) : null;
  const msgBytes = new TextEncoder().encode(message).length;
  const capacityPct = capacity ? Math.min(100, (msgBytes / capacity) * 100) : 0;
  const charsLeft = MAX_CHARS - message.length;

  const getErrorMessage = (error: unknown): string => {
    if (!error) return "Failed to encode file. Please try again.";
    const e = error as { response?: { data?: { error?: string } }; message?: string };
    return e?.response?.data?.error ?? e?.message ?? "Failed to encode file. Please try again.";
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto pb-24">
      <Confetti trigger={encodeFile.isSuccess} />
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-[hsl(var(--chart-1))/20] border-2 border-border rounded-full px-4 py-1.5 mb-4 font-mono text-xs font-bold uppercase tracking-wider"
        >
          <Lock className="w-3.5 h-3.5 text-primary" />
          LSB Steganography + AES-256
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black mb-3" style={{ fontFamily: "Outfit, sans-serif" }}>
          🔐 Hide a Secret
        </h1>
        <p className="text-lg font-medium text-muted-foreground">Embed your message inside a file — invisible to the eye.</p>
      </div>

      <div className="flex bg-card rounded-2xl p-1.5 border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] w-fit mx-auto gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-testid={`tab-${tab.id}`}
            onClick={() => { setActiveTab(tab.id); setFile(null); encodeFile.reset(); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${
              activeTab === tab.id
                ? `${tab.color} border-2 border-border shadow-[2px_2px_0_0_hsl(var(--border))]`
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-4 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[200px] ${
            isDragging
              ? "border-primary bg-[hsl(var(--chart-1))/10] scale-[1.01]"
              : file ? "border-border bg-muted" : "border-border bg-card hover:bg-muted/50"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={activeTab === "image" ? "image/*" : activeTab === "audio" ? "audio/*" : "video/*"}
            onChange={handleFileChange}
          />
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className={`p-4 rounded-2xl border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] ${activeTabData.color}`}>
                {activeTab === "image" && <ImageIcon className="w-8 h-8 text-foreground" />}
                {activeTab === "audio" && <Music className="w-8 h-8 text-foreground" />}
                {activeTab === "video" && <Video className="w-8 h-8 text-foreground" />}
              </div>
              <div className="font-bold text-lg text-foreground">{file.name}</div>
              <div className="text-sm font-mono text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
              <button
                type="button"
                onClick={(ev) => { ev.stopPropagation(); setFile(null); encodeFile.reset(); }}
                className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" /> Remove file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}>
                <UploadCloud className="w-12 h-12" />
              </motion.div>
              <div className="font-bold text-xl text-foreground">Drop your {activeTab} file here</div>
              <div className="font-medium text-sm">{activeTabData.formats}</div>
              <div className="text-xs">or click to browse</div>
            </div>
          )}
        </div>

        {capacity !== null && file && (
          <div className="bg-card border-2 border-border rounded-2xl px-5 py-3 flex flex-col gap-1.5 shadow-[4px_4px_0_0_hsl(var(--border))]">
            <div className="flex justify-between text-xs font-bold font-mono">
              <span>Capacity</span>
              <span>{msgBytes} / {capacity} bytes ({capacityPct.toFixed(1)}%)</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden border border-border">
              <motion.div
                animate={{ width: `${capacityPct}%` }}
                transition={{ duration: 0.4 }}
                className={`h-full rounded-full ${
                  capacityPct > 90 ? "bg-destructive" : capacityPct > 60 ? "bg-[hsl(var(--chart-2))]" : "bg-[hsl(var(--chart-3))]"
                }`}
              />
            </div>
            {capacityPct > 90 && (
              <p className="text-xs text-destructive font-bold">⚠ Near capacity — message may be too long for this file.</p>
            )}
          </div>
        )}

        <div className="bg-card p-6 md:p-8 rounded-[2rem] border-4 border-border shadow-[8px_8px_0_0_hsl(var(--border))] flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="font-black text-lg flex items-center gap-2">
                💌 Secret Message <span className="text-primary">*</span>
              </label>
              <span className={`font-mono text-xs font-bold ${charsLeft < 200 ? "text-destructive" : "text-muted-foreground"}`}>
                {charsLeft} left
              </span>
            </div>
            <textarea
              data-testid="input-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Whisper something only your friend can hear…"
              className="w-full min-h-[140px] p-4 rounded-xl border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all resize-none font-medium text-base outline-none bg-background"
              required
            />
            <div className="flex flex-wrap gap-2">
              {["💌 Meet me at 7 PM", "🌸 Happy Birthday!", "🎂 Date night this Friday?", "☕ Coffee date tomorrow?"].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setMessage(s)}
                  className="text-xs font-bold px-3 py-1 bg-muted rounded-full border border-border hover:bg-[hsl(var(--chart-1))/20] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-black text-lg flex items-center gap-2">
              🔒 Passphrase <span className="text-muted-foreground text-sm font-medium">(Optional — AES-256)</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                data-testid="input-passphrase"
                type={showPass ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Add extra encryption..."
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
            {passphrase && (
              <div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--chart-3))]">
                <CheckCircle className="w-3.5 h-3.5" />
                AES-256-GCM encryption will be applied
              </div>
            )}
          </div>
        </div>

        <button
          data-testid="button-submit-encode"
          type="submit"
          disabled={!file || !message || encodeFile.isPending || capacityPct > 100}
          className="bg-primary text-white text-2xl font-black py-5 rounded-2xl border-4 border-border shadow-[8px_8px_0_0_hsl(var(--border))] hover:translate-x-2 hover:translate-y-2 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[8px_8px_0_0_hsl(var(--border))] transition-all flex justify-center items-center gap-3"
        >
          {encodeFile.isPending ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Sparkles className="w-6 h-6" />
              </motion.div>
              Hiding your secret…
            </>
          ) : (
            <>🔐 Hide it →</>
          )}
        </button>

        {encodeFile.isError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 text-destructive p-5 rounded-xl border-2 border-destructive flex items-start gap-3 font-bold"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-black mb-1">Encoding failed</div>
              <div className="font-medium text-sm">{getErrorMessage(encodeFile.error)}</div>
              {activeTab === "audio" && (
                <div className="mt-2 text-xs font-medium opacity-80">
                  💡 Tip: Audio steganography currently requires WAV format (PCM). Convert your file to WAV and try again.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </form>

      <AnimatePresence>
        {encodeFile.isSuccess && encodeFile.data && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[hsl(var(--chart-3))/15] p-8 rounded-[2rem] border-4 border-border shadow-[8px_8px_0_0_hsl(var(--border))] flex flex-col items-center gap-6 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="w-20 h-20 bg-[hsl(var(--chart-3))] rounded-full border-4 border-border shadow-[6px_6px_0_0_hsl(var(--border))] flex items-center justify-center text-3xl"
            >
              🎉
            </motion.div>
            <div>
              <h3 className="text-3xl font-black mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                Secret Successfully Hidden!
              </h3>
              <p className="text-lg font-medium text-muted-foreground">Your file is ready — it looks completely normal.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
              {[
                { label: "File type", val: encodeFile.data.carrier },
                { label: "Bytes used", val: `${(encodeFile.data.bytesUsed / 1024).toFixed(2)} KB` },
                { label: "Time", val: `${encodeFile.data.timeSec.toFixed(2)}s` },
                ...(passphrase ? [{ label: "Encryption", val: "AES-256-GCM" }] : []),
              ].map((item) => (
                <div key={item.label} className="bg-card p-3 rounded-xl border-2 border-border text-sm">
                  <div className="text-muted-foreground font-medium text-xs uppercase tracking-wider">{item.label}</div>
                  <div className="font-black font-mono">{item.val}</div>
                </div>
              ))}
            </div>
            <a
              data-testid="link-download"
              href={encodeFile.data.downloadUrl}
              download={encodeFile.data.filename}
              className="bg-foreground text-background text-xl font-black px-8 py-4 rounded-full border-4 border-border shadow-[4px_4px_0_0_hsl(var(--border))] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all w-full md:w-auto flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download {encodeFile.data.filename}
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
