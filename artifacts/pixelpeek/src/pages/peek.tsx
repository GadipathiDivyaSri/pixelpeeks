import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, ShieldCheck, AlertTriangle, Bug, X, Search, Info, FileSearch } from "lucide-react";
import { useDetectSteganography } from "@workspace/api-client-react";

const JPEG_EXTS = new Set([".jpg", ".jpeg"]);
function getFileExt(name: string) {
  return name.includes(".") ? "." + name.split(".").pop()!.toLowerCase() : "";
}
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function Peek() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detectStego = useDetectSteganography();

  const isJpeg = file ? JPEG_EXTS.has(getFileExt(file.name)) : false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      detectStego.reset();
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
      detectStego.reset();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    detectStego.mutate({ data: { file } as any });
  };

  const getVerdictDetails = (verdict: string, prob: number) => {
    switch (verdict) {
      case "PIXELPEEK":
        return {
          emoji: "🔵",
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-50 dark:bg-blue-900/20",
          border: "border-blue-500",
          gaugeBg: "#3B82F6",
          label: "PIXELPEEK PAYLOAD",
          icon: Bug,
          summary: `PixelPeek signature confirmed! This file contains a verified hidden payload with PXPK_V1 signature — encoded by PixelPeek.`,
        };
      case "STEGO":
        return {
          emoji: "🔴",
          color: "text-destructive",
          bg: "bg-destructive/10",
          border: "border-destructive",
          gaugeBg: "hsl(var(--destructive))",
          label: "STEGO DETECTED",
          icon: Bug,
          summary: `High probability of hidden data (${Math.round(prob * 100)}%). Multiple statistical indicators confirm steganographic embedding.`,
        };
      case "SUSPECT":
        return {
          emoji: "🟡",
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-50 dark:bg-amber-900/20",
          border: "border-amber-500",
          gaugeBg: "#F59E0B",
          label: "SUSPICIOUS",
          icon: AlertTriangle,
          summary: `Suspicious patterns detected (${Math.round(prob * 100)}%). Statistical anomalies are present but not conclusive. May be natural variation.`,
        };
      default:
        return {
          emoji: "🟢",
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-50 dark:bg-emerald-900/20",
          border: "border-emerald-500",
          gaugeBg: "#10B981",
          label: "CLEAN",
          icon: ShieldCheck,
          summary: `No hidden content detected (${Math.round(prob * 100)}% clean). The statistical profile matches unmodified media.`,
        };
    }
  };

  const featureDescriptions: Record<string, {
    label: string;
    explain: string;
    higherMeaning: string;
    max: number;
    stegoHigh: boolean;
  }> = {
    entropy:       { label: "Shannon Entropy",    explain: "Overall data randomness (max 8 bits/byte)", higherMeaning: "more random", max: 8,   stegoHigh: true },
    lsbRatio:      { label: "LSB Ratio",          explain: "Fraction of LSBs set to 1 (expect ~0.5)", higherMeaning: "biased LSBs", max: 1,   stegoHigh: false },
    lsbDeviation:  { label: "LSB Deviation",      explain: "Distance from 50% LSB ratio (lower = stego)", higherMeaning: "more suspicious", max: 0.5, stegoHigh: false },
    chiSquare:     { label: "Chi-Square Score",   explain: "Histogram pair equalization (higher = stego)", higherMeaning: "more suspicious", max: 1,   stegoHigh: true },
    blockLsbStdev: { label: "Block LSB Stdev",    explain: "LSB uniformity across blocks (lower = stego)", higherMeaning: "more suspicious", max: 0.5, stegoHigh: false },
  };

  const riskLevel = (prob: number) => {
    if (prob >= 0.8) return { label: "HIGH", color: "text-destructive" };
    if (prob >= 0.55) return { label: "MEDIUM", color: "text-amber-600 dark:text-amber-400" };
    return { label: "LOW", color: "text-emerald-600 dark:text-emerald-400" };
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 border-2 border-border rounded-full px-4 py-1.5 mb-4 font-mono text-xs font-bold uppercase tracking-wider"
        >
          <Search className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          Steganalysis Engine
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black mb-3 text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
          🔍 Pixel Peek
        </h1>
        <p className="text-lg font-medium text-muted-foreground">
          Analyze any file for steganographic anomalies using RS analysis, entropy, Chi-square, SPA, and histogram pair tests.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-4 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
            isDragging
              ? "border-amber-500 bg-amber-100 dark:bg-amber-900/20 scale-[1.01]"
              : file
                ? "border-border bg-amber-50 dark:bg-muted"
                : "border-amber-500 bg-amber-50 dark:bg-muted hover:bg-amber-100 dark:hover:bg-muted/80"
          }`}
        >
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-2xl border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] bg-amber-400">
                <FileSearch className="w-8 h-8 text-white" />
              </div>
              <div className="font-bold text-lg text-foreground">{file.name}</div>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <span className="text-sm font-mono text-muted-foreground">{formatBytes(file.size)}</span>
                <span className="text-xs px-2 py-0.5 bg-muted rounded-full border border-border text-muted-foreground font-mono">{file.type || "unknown"}</span>
              </div>
              <button
                type="button"
                onClick={(ev) => { ev.stopPropagation(); setFile(null); detectStego.reset(); }}
                className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" /> Remove file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              >
                <UploadCloud className="w-14 h-14" />
              </motion.div>
              <div className="font-bold text-xl text-foreground">Drop any file to analyze</div>
              <div className="font-medium text-sm">🖼 Images · 🎵 Audio · 🎥 Video</div>
              <div className="text-xs">or click to browse</div>
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
              <div className="font-black text-sm mb-0.5">JPEG files are unreliable for steganalysis</div>
              <div className="text-xs font-medium opacity-80">JPEG compression modifies pixel values, making LSB analysis inaccurate. Statistical results may show false positives.</div>
            </div>
          </motion.div>
        )}

        <button
          data-testid="button-submit-peek"
          type="submit"
          disabled={!file || detectStego.isPending}
          className="bg-amber-500 dark:bg-amber-600 text-white text-2xl font-black py-5 rounded-2xl border-4 border-border shadow-[8px_8px_0_0_hsl(var(--border))] hover:translate-x-2 hover:translate-y-2 hover:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[8px_8px_0_0_hsl(var(--border))] transition-all flex justify-center items-center gap-3"
        >
          {detectStego.isPending ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="inline-block"
              >
                🔍
              </motion.span>
              Analyzing with multiple detectors…
            </>
          ) : (
            <>🔍 Analyze File →</>
          )}
        </button>
      </form>

      <AnimatePresence>
        {detectStego.isSuccess && detectStego.data && (() => {
          const details = getVerdictDetails(detectStego.data.verdict, detectStego.data.probability);
          const probPerc = Math.round(detectStego.data.probability * 100);
          const circumference = 2 * Math.PI * 40;
          const risk = riskLevel(detectStego.data.probability);

          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6"
            >
              {/* Main verdict card */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className={`flex-1 bg-card p-8 rounded-[2rem] border-4 ${details.border} shadow-[8px_8px_0_0_hsl(var(--border))] flex flex-col items-center text-center gap-5 relative overflow-hidden`}>
                  <div className={`absolute inset-0 ${details.bg} pointer-events-none`} />

                  {/* Circular gauge */}
                  <div className="relative z-10 w-44 h-44">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted opacity-30" />
                      <motion.circle
                        initial={{ strokeDasharray: `0 ${circumference}` }}
                        animate={{ strokeDasharray: `${(probPerc / 100) * circumference} ${circumference}` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        cx="50" cy="50" r="40" fill="none"
                        stroke={details.gaugeBg}
                        strokeWidth="10"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black text-foreground">{probPerc}%</span>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">stego prob.</span>
                    </div>
                  </div>

                  <div className="relative z-10">
                    <div className="text-4xl mb-2">{details.emoji}</div>
                    <h3 className={`text-3xl font-black mb-2 ${details.color}`} style={{ fontFamily: "Outfit, sans-serif" }}>
                      {details.label}
                    </h3>
                    <p className="text-base font-medium text-muted-foreground max-w-xs">{details.summary}</p>
                  </div>
                </div>

                {/* Raw analysis panel */}
                <div className="flex-1 bg-foreground text-background p-8 rounded-[2rem] border-4 border-border shadow-[8px_8px_0_0_hsl(var(--border))] flex flex-col gap-5">
                  <h3 className="text-2xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>📊 Statistical Analysis</h3>

                  <div className="flex flex-col gap-4">
                    {(Object.entries(detectStego.data.features) as [string, number][]).map(([key, val], idx) => {
                      const info = featureDescriptions[key];
                      if (!info) return null;
                      const pct = Math.min(100, Math.max(0, (val / info.max) * 100));
                      return (
                        <div key={key}>
                          <div className="flex justify-between font-mono text-xs mb-1">
                            <span className="font-bold text-background">{info.label}</span>
                            <span className="opacity-70 text-background/70">{val.toFixed(4)}</span>
                          </div>
                          <div className="h-3 bg-white/20 rounded-full overflow-hidden border border-white/10">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 1, delay: 0.3 + idx * 0.1 }}
                              style={{ backgroundColor: details.gaugeBg }}
                              className="h-full rounded-full"
                            />
                          </div>
                          {info && (
                            <p className="text-[10px] opacity-50 mt-0.5 text-background/60">{info.explain}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Summary stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Risk Level",   val: risk.label,                        color: risk.color,      bg: "bg-card", border: "border-border" },
                  { label: "Probability",  val: `${probPerc}%`,                    color: details.color,   bg: details.bg, border: details.border },
                  { label: "Carrier",      val: detectStego.data.carrier.toUpperCase(), color: "text-foreground", bg: "bg-card", border: "border-border" },
                  { label: "Verdict",      val: detectStego.data.verdict,          color: details.color,   bg: details.bg, border: details.border },
                ].map((item) => (
                  <div key={item.label} className={`p-5 rounded-2xl border-2 ${item.border} ${item.bg} text-center`}>
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{item.label}</div>
                    <div className={`text-xl font-black ${item.color}`}>{item.val}</div>
                  </div>
                ))}
              </div>

              {/* What this means */}
              <div className="bg-card border-2 border-border rounded-[2rem] p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-muted-foreground" />
                  <h4 className="font-black text-lg text-foreground">Interpreting the results</h4>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  {[
                    { title: "RS Analysis", desc: "Measures Regular/Singular group ratio. Under LSB stego, groups converge to 0.5. Natural images show higher separation." },
                    { title: "SPA (Sample Pair)", desc: "Measures bias between ascending/descending pixel pairs. LSB replacement reduces this bias." },
                    { title: "Chi-Square Test", desc: "Tests equalization of histogram pairs (value, value+1). LSB stego equalizes these pairs." },
                    { title: "Entropy", desc: "High LSB plane entropy (≈1.0) means LSBs have been randomized — a strong stego indicator." },
                  ].map(item => (
                    <div key={item.title} className="bg-muted/50 rounded-xl p-3">
                      <div className="font-bold text-foreground text-xs uppercase tracking-wide mb-1">{item.title}</div>
                      <div className="text-muted-foreground text-xs">{item.desc}</div>
                    </div>
                  ))}
                </div>
                {isJpeg && (
                  <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 rounded-xl p-3 mt-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                      JPEG files are analyzed at the pixel level after decompression. Results may be inaccurate due to compression artifacts inflating false positives.
                    </p>
                  </div>
                )}
              </div>

              {/* Analyze another */}
              <button
                onClick={() => { setFile(null); detectStego.reset(); }}
                className="bg-card text-foreground font-bold px-6 py-3 rounded-full border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2 self-start"
              >
                <Search className="w-4 h-4" />
                Analyze another file
              </button>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
