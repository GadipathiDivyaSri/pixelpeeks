import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, ShieldCheck, AlertTriangle, Bug, X, Search } from "lucide-react";
import { useDetectSteganography } from "@workspace/api-client-react";

export default function Peek() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detectStego = useDetectSteganography();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      detectStego.reset();
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      detectStego.reset();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    detectStego.mutate({ data: formData as any });
  };

  const getVerdictDetails = (verdict: string, prob: number) => {
    switch (verdict) {
      case "STEGO":
        return {
          emoji: "🔴",
          color: "text-destructive",
          bg: "bg-destructive/10",
          border: "border-destructive",
          gaugeBg: "hsl(var(--destructive))",
          label: "STEGO DETECTED",
          icon: Bug,
          summary: `High probability of hidden data detected (${Math.round(prob * 100)}%). This file almost certainly contains a hidden message.`,
        };
      case "SUSPECT":
        return {
          emoji: "🟡",
          color: "text-[hsl(var(--chart-2))]",
          bg: "bg-[hsl(var(--chart-2))/15]",
          border: "border-[hsl(var(--chart-2))]",
          gaugeBg: "hsl(var(--chart-2))",
          label: "SUSPICIOUS",
          icon: AlertTriangle,
          summary: `Suspicious patterns detected (${Math.round(prob * 100)}%). Something unusual is present, but it could be natural variation.`,
        };
      default:
        return {
          emoji: "🟢",
          color: "text-[hsl(var(--chart-3))]",
          bg: "bg-[hsl(var(--chart-3))/15]",
          border: "border-[hsl(var(--chart-3))]",
          gaugeBg: "hsl(var(--chart-3))",
          label: "CLEAN",
          icon: ShieldCheck,
          summary: `No hidden content detected (${Math.round(prob * 100)}% probability). The file appears to be unmodified.`,
        };
    }
  };

  const featureDescriptions: Record<string, { label: string; explain: string; higherMeaning: string }> = {
    entropy:       { label: "Entropy", explain: "Randomness of data distribution", higherMeaning: "more random" },
    lsbRatio:      { label: "LSB Ratio", explain: "Fraction of LSBs set to 1", higherMeaning: "biased LSBs" },
    lsbDeviation:  { label: "LSB Deviation", explain: "Deviation from expected 50% LSB ratio", higherMeaning: "more deviation (clean)" },
    chiSquare:     { label: "Chi-Square", explain: "Statistical irregularity in byte pairs", higherMeaning: "more suspicious" },
    blockLsbStdev: { label: "Block LSB Stdev", explain: "Variance of LSB ratio across blocks", higherMeaning: "less uniform (clean)" },
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-24">
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-[hsl(var(--chart-2))/20] border-2 border-border rounded-full px-4 py-1.5 mb-4 font-mono text-xs font-bold uppercase tracking-wider"
        >
          <Search className="w-3.5 h-3.5 text-[hsl(var(--chart-2))]" />
          PixelPeek Analyzer
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black mb-3" style={{ fontFamily: "Outfit, sans-serif" }}>
          🔍 Peek Inside
        </h1>
        <p className="text-lg font-medium text-muted-foreground">
          Analyze any file for steganographic anomalies using LSB detection, entropy, and chi-square tests.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-4 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
            isDragging
              ? "border-[#FDE047] bg-[#FEFCE8] scale-[1.01]"
              : file ? "border-[#0F172A] bg-[#FEFCE8]" : "border-[#FDE047] bg-[#FEFCE8] hover:bg-[#FEF9C3]"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-2xl border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] bg-[hsl(var(--chart-2))]">
                <Search className="w-8 h-8 text-foreground" />
              </div>
              <div className="font-bold text-lg text-foreground">{file.name}</div>
              <div className="text-sm font-mono text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
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
              <div className="font-medium text-sm">🖼 Images · 🎵 Audio (WAV) · 🎥 Video</div>
              <div className="text-xs">or click to browse</div>
            </div>
          )}
        </div>

        <button
          data-testid="button-submit-peek"
          type="submit"
          disabled={!file || detectStego.isPending}
          className="bg-[#FDE047] text-[#0F172A] text-2xl font-black py-5 rounded-2xl border-4 border-[#0F172A] shadow-[8px_8px_0_0_#0F172A] hover:translate-x-2 hover:translate-y-2 hover:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[8px_8px_0_0_#0F172A] transition-all flex justify-center items-center gap-3"
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
              Analyzing…
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

          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col md:flex-row gap-6">
                <div className={`flex-1 bg-card p-8 rounded-[2rem] border-4 ${details.border} shadow-[8px_8px_0_0_hsl(var(--border))] flex flex-col items-center text-center gap-5 relative overflow-hidden`}>
                  <div className={`absolute inset-0 ${details.bg} pointer-events-none`} />

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
                      <span className="text-4xl font-black">{probPerc}%</span>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">probability</span>
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

                <div className="flex-1 bg-foreground text-background p-8 rounded-[2rem] border-4 border-border shadow-[8px_8px_0_0_hsl(var(--border))] flex flex-col gap-5">
                  <h3 className="text-2xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>📊 Raw Analysis</h3>

                  <div className="flex flex-col gap-4">
                    {(Object.entries(detectStego.data.features) as [string, number][]).map(([key, val], idx) => {
                      const info = featureDescriptions[key];
                      const maxMap: Record<string, number> = {
                        entropy: 8, lsbRatio: 1, lsbDeviation: 0.5, chiSquare: 1, blockLsbStdev: 0.5,
                      };
                      const max = maxMap[key] || 1;
                      const pct = Math.min(100, Math.max(0, (val / max) * 100));
                      return (
                        <div key={key}>
                          <div className="flex justify-between font-mono text-xs mb-1">
                            <span className="font-bold">{info?.label ?? key}</span>
                            <span className="opacity-70">{val.toFixed(4)}</span>
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
                            <p className="text-[10px] opacity-50 mt-0.5">{info.explain}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Risk Score", val: `${probPerc}%`, color: details.color, bg: details.bg, border: details.border },
                  { label: "Carrier", val: detectStego.data.carrier.toUpperCase(), color: "", bg: "bg-card", border: "border-border" },
                  { label: "Verdict", val: detectStego.data.verdict, color: details.color, bg: details.bg, border: details.border },
                ].map((item) => (
                  <div key={item.label} className={`p-5 rounded-2xl border-2 ${item.border} ${item.bg} text-center`}>
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{item.label}</div>
                    <div className={`text-2xl font-black ${item.color}`}>{item.val}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
