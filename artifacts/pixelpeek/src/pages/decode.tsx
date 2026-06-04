import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud, Image as ImageIcon, Music, Video, Lock, AlertCircle,
  Copy, Check, X, Eye, EyeOff, Search
} from "lucide-react";
import { useDecodeFile } from "@workspace/api-client-react";
import { Confetti } from "@/components/confetti";

export default function Decode() {
  const [activeTab, setActiveTab] = useState<"image" | "audio" | "video">("image");
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const decodeFile = useDecodeFile();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      decodeFile.reset();
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      decodeFile.reset();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    if (passphrase) formData.append("key", passphrase);

    decodeFile.mutate({ data: formData as any });
  };

  const handleCopy = () => {
    if (decodeFile.data?.message) {
      navigator.clipboard.writeText(decodeFile.data.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getErrorMessage = (error: unknown): string => {
    if (!error) return "No hidden message found.";
    const e = error as { response?: { data?: { error?: string } }; message?: string };
    return e?.response?.data?.error ?? e?.message ?? "No hidden message found (or wrong key).";
  };

  const tabs = [
    { id: "image" as const, label: "🖼 Image", color: "bg-[hsl(var(--chart-1))]" },
    { id: "audio" as const, label: "🎵 Audio", color: "bg-[hsl(var(--chart-3))]" },
    { id: "video" as const, label: "🎥 Video", color: "bg-[hsl(var(--chart-4))]" },
  ];

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto pb-24">
      <Confetti trigger={decodeFile.isSuccess} />
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-[hsl(var(--chart-4))/20] border-2 border-border rounded-full px-4 py-1.5 mb-4 font-mono text-xs font-bold uppercase tracking-wider"
        >
          <Search className="w-3.5 h-3.5 text-[hsl(var(--chart-4))]" />
          Detective Mode
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black mb-3" style={{ fontFamily: "Outfit, sans-serif" }}>
          🕵 Reveal the Secret
        </h1>
        <p className="text-lg font-medium text-muted-foreground">Upload a carrier file to expose what's hidden inside.</p>
      </div>

      <div className="flex bg-card rounded-2xl p-1.5 border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] w-fit mx-auto gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-testid={`tab-${tab.id}`}
            onClick={() => { setActiveTab(tab.id); setFile(null); decodeFile.reset(); }}
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
          className={`border-4 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[200px] relative overflow-hidden ${
            isDragging
              ? "border-[#2563EB] bg-[#93C5FD] scale-[1.01]"
              : file ? "border-[#0F172A] bg-[#BFDBFE]" : "border-[#2563EB] bg-[#BFDBFE] hover:bg-[#93C5FD]"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={activeTab === "image" ? "image/*" : activeTab === "audio" ? "audio/*" : "video/*"}
            onChange={handleFileChange}
          />

          {decodeFile.isPending && (
            <motion.div
              initial={{ top: "0%" }}
              animate={{ top: ["0%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--chart-4))] to-transparent pointer-events-none z-10"
              style={{ position: "absolute" }}
            />
          )}

          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className={`p-4 rounded-2xl border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] ${tabs.find(t => t.id === activeTab)?.color}`}>
                {activeTab === "image" && <ImageIcon className="w-8 h-8 text-foreground" />}
                {activeTab === "audio" && <Music className="w-8 h-8 text-foreground" />}
                {activeTab === "video" && <Video className="w-8 h-8 text-foreground" />}
              </div>
              <div className="font-bold text-lg text-foreground">{file.name}</div>
              <div className="text-sm font-mono text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
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
              <div className="font-medium text-sm">Images · Audio · Video</div>
              <div className="text-xs">or click to browse</div>
            </div>
          )}
        </div>

        <div className="bg-[#BFDBFE] dark:bg-card border-4 border-[#0F172A] shadow-[8px_8px_0_0_#0F172A] rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-col gap-2">
            <label className="font-black text-lg flex items-center gap-2 text-[#0F172A] dark:text-foreground">
              🔒 Passphrase <span className="text-[#0F172A]/50 dark:text-muted-foreground text-sm font-medium">(If the message was encrypted)</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0F172A]/40 dark:text-muted-foreground" />
              <input
                data-testid="input-passphrase"
                type={showPass ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter decryption key..."
                className="w-full p-4 pl-12 pr-12 rounded-xl border-2 border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all font-medium text-base outline-none bg-white/80 dark:bg-background"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0F172A]/40 hover:text-[#0F172A] transition-colors dark:text-muted-foreground dark:hover:text-foreground"
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
          className="bg-[#2563EB] text-white text-2xl font-black py-5 rounded-2xl border-4 border-[#0F172A] shadow-[8px_8px_0_0_#0F172A] hover:translate-x-2 hover:translate-y-2 hover:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[8px_8px_0_0_#0F172A] transition-all flex justify-center items-center gap-3"
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

        {decodeFile.isError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 border-2 border-destructive text-destructive p-6 rounded-2xl flex flex-col items-center justify-center gap-3 font-bold text-center"
          >
            <AlertCircle className="w-8 h-8" />
            <span className="text-xl font-black">No Secret Found</span>
            <span className="text-sm font-medium">{getErrorMessage(decodeFile.error)}</span>
            {passphrase && (
              <span className="text-xs opacity-80">Make sure the passphrase is exactly correct, or try without one.</span>
            )}
          </motion.div>
        )}
      </form>

      <AnimatePresence>
        {decodeFile.isSuccess && decodeFile.data && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[hsl(var(--chart-5))/15] p-8 rounded-[2rem] border-4 border-border shadow-[8px_8px_0_0_hsl(var(--border))] flex flex-col gap-6"
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
                <h3 className="text-2xl font-black" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Secret Message Found!
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-card px-3 py-1 rounded-full border-2 border-border text-xs font-bold uppercase">
                  {decodeFile.data.carrier}
                </span>
                {decodeFile.data.encrypted && (
                  <span className="bg-[hsl(var(--chart-3))] px-3 py-1 rounded-full border-2 border-border text-xs font-bold flex items-center gap-1 text-foreground">
                    <Lock className="w-3 h-3" /> AES-256 Decrypted
                  </span>
                )}
              </div>
            </div>

            <div className="bg-card p-6 rounded-2xl border-2 border-border font-mono text-base leading-relaxed whitespace-pre-wrap min-h-[100px] shadow-[inset_2px_2px_0_0_hsl(var(--border))]">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {decodeFile.data.message}
              </motion.span>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                data-testid="button-copy"
                onClick={handleCopy}
                className="bg-foreground text-background text-base font-black px-6 py-3 rounded-full border-4 border-border shadow-[4px_4px_0_0_hsl(var(--border))] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2"
              >
                {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy message</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
