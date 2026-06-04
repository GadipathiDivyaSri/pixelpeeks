import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Search, ShieldCheck, AlertTriangle, Bug } from "lucide-react";
import { useDetectSteganography } from "@workspace/api-client-react";

export default function Peek() {
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detectStego = useDetectSteganography();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    detectStego.mutate({ data: formData as any });
  };

  const getVerdictDetails = (verdict: string) => {
    switch (verdict) {
      case 'STEGO':
        return { color: 'text-chart-1', bg: 'bg-chart-1/10', border: 'border-chart-1', text: 'STEGO DETECTED', icon: Bug, desc: 'High probability of hidden data' };
      case 'SUSPECT':
        return { color: 'text-chart-2', bg: 'bg-chart-2/10', border: 'border-chart-2', text: 'SUSPICIOUS', icon: AlertTriangle, desc: 'Anomalies detected, but inconclusive' };
      case 'CLEAN':
      default:
        return { color: 'text-chart-3', bg: 'bg-chart-3/10', border: 'border-chart-3', text: 'CLEAN', icon: ShieldCheck, desc: 'No obvious signs of tampering' };
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-24">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-black mb-4">Peek</h1>
        <p className="text-xl font-medium text-muted-foreground">Analyze a file for steganographic anomalies.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-4 border-dashed border-border rounded-3xl p-12 text-center cursor-pointer transition-all hover:bg-muted/50 flex flex-col items-center justify-center min-h-[240px] ${
            file ? 'bg-muted' : 'bg-white'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            onChange={handleFileChange}
          />
          {file ? (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-2xl border-2 border-border shadow-[4px_4px_0_0_#0F172A] bg-white">
                <Search className="w-8 h-8" />
              </div>
              <div className="font-bold text-lg">{file.name}</div>
              <div className="text-sm font-mono text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <UploadCloud className="w-12 h-12" />
              <div className="font-bold text-xl text-foreground">Drop any file to analyze</div>
              <div className="font-medium">Images, Audio, Video</div>
            </div>
          )}
        </div>

        <button 
          data-testid="button-submit-peek"
          type="submit" 
          disabled={!file || detectStego.isPending}
          className="bg-chart-4 text-foreground text-2xl font-black py-6 rounded-2xl border-4 border-border shadow-[8px_8px_0_0_#0F172A] hover:translate-x-2 hover:translate-y-2 hover:shadow-none disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[8px_8px_0_0_#0F172A] transition-all flex justify-center items-center gap-3"
        >
          {detectStego.isPending ? "Analyzing..." : "Analyze →"}
        </button>
      </form>

      <AnimatePresence>
        {detectStego.isSuccess && detectStego.data && (() => {
          const details = getVerdictDetails(detectStego.data.verdict);
          const probPerc = Math.round(detectStego.data.probability * 100);
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="mt-8 flex flex-col md:flex-row gap-8 items-start"
            >
              {/* Verdict Gauge Card */}
              <div className={`flex-1 w-full bg-white p-8 rounded-[2rem] border-4 border-border shadow-[8px_8px_0_0_#0F172A] flex flex-col items-center justify-center text-center gap-6 relative overflow-hidden`}>
                <div className={`absolute inset-0 ${details.bg} opacity-50`}></div>
                
                <div className="relative z-10 w-48 h-48">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted opacity-20" />
                    <motion.circle 
                      initial={{ strokeDasharray: "0 251.2" }}
                      animate={{ strokeDasharray: `${(probPerc / 100) * 251.2} 251.2` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="12" 
                      className={details.color}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black">{probPerc}%</span>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Prob</span>
                  </div>
                </div>

                <div className="relative z-10">
                  <h3 className={`text-4xl font-black mb-2 ${details.color}`}>{details.text}</h3>
                  <p className="text-lg font-medium">{details.desc}</p>
                </div>
              </div>

              {/* Feature Bars Card */}
              <div className="flex-1 w-full bg-sidebar-primary text-sidebar-primary-foreground p-8 rounded-[2rem] border-4 border-border shadow-[8px_8px_0_0_#0F172A] flex flex-col gap-6">
                <h3 className="text-2xl font-black">Raw Analysis</h3>
                
                <div className="flex flex-col gap-4">
                  {[
                    { label: "Entropy", val: detectStego.data.features.entropy, max: 8 },
                    { label: "LSB Ratio", val: detectStego.data.features.lsbRatio, max: 1 },
                    { label: "LSB Deviation", val: detectStego.data.features.lsbDeviation, max: 0.5 },
                    { label: "Chi-Square", val: detectStego.data.features.chiSquare, max: 1 },
                    { label: "Block LSB Stdev", val: detectStego.data.features.blockLsbStdev, max: 0.5 },
                  ].map((feat) => (
                    <div key={feat.label} className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono text-sm">
                        <span>{feat.label}</span>
                        <span className="opacity-70">{feat.val.toFixed(4)}</span>
                      </div>
                      <div className="h-4 bg-black/40 rounded-full border border-border/50 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.max(0, (feat.val / feat.max) * 100))}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className={`h-full ${details.color.replace('text-', 'bg-')}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
