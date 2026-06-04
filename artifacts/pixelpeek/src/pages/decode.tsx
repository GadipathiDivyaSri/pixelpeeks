import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Image as ImageIcon, Music, Video, Lock, AlertCircle, Copy, Check } from "lucide-react";
import { useDecodeFile } from "@workspace/api-client-react";

export default function Decode() {
  const [activeTab, setActiveTab] = useState<"image" | "audio" | "video">("image");
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const decodeFile = useDecodeFile();

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

  const tabs = [
    { id: "image", label: "Image", icon: ImageIcon, color: "bg-chart-2" },
    { id: "audio", label: "Audio", icon: Music, color: "bg-chart-3" },
    { id: "video", label: "Video", icon: Video, color: "bg-[hsl(327,73%,81%)]" },
  ] as const;

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto pb-24">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-black mb-4">Decode</h1>
        <p className="text-xl font-medium text-muted-foreground">Extract a hidden message from a file.</p>
      </div>

      <div className="flex bg-white rounded-full p-2 border-2 border-border shadow-[4px_4px_0_0_#0F172A] w-fit mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-testid={`tab-${tab.id}`}
            onClick={() => { setActiveTab(tab.id); setFile(null); decodeFile.reset(); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${
              activeTab === tab.id 
                ? `${tab.color} border-2 border-border shadow-[2px_2px_0_0_#0F172A]` 
                : "hover:bg-muted"
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* Upload Zone */}
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
            accept={activeTab === 'image' ? 'image/*' : activeTab === 'audio' ? 'audio/*' : 'video/*'}
            onChange={handleFileChange}
          />
          {file ? (
            <div className="flex flex-col items-center gap-4">
              <div className={`p-4 rounded-2xl border-2 border-border shadow-[4px_4px_0_0_#0F172A] ${tabs.find(t => t.id === activeTab)?.color}`}>
                {activeTab === 'image' && <ImageIcon className="w-8 h-8" />}
                {activeTab === 'audio' && <Music className="w-8 h-8" />}
                {activeTab === 'video' && <Video className="w-8 h-8" />}
              </div>
              <div className="font-bold text-lg">{file.name}</div>
              <div className="text-sm font-mono text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <UploadCloud className="w-12 h-12" />
              <div className="font-bold text-xl text-foreground">Click or drag a file here</div>
              <div className="font-medium">Supported formats for {activeTab}</div>
            </div>
          )}
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[2rem] border-4 border-border shadow-[8px_8px_0_0_#0F172A]">
          <div className="flex flex-col gap-2">
            <label className="font-black text-xl flex items-center gap-2">
              Passphrase <span className="text-muted-foreground text-sm font-medium">(If encrypted)</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                data-testid="input-passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Key to decrypt..."
                className="w-full p-4 pl-12 rounded-xl border-2 border-border shadow-[4px_4px_0_0_#0F172A] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all font-medium text-lg outline-none"
              />
            </div>
          </div>
        </div>

        <button 
          data-testid="button-submit-decode"
          type="submit" 
          disabled={!file || decodeFile.isPending}
          className="bg-primary text-white text-2xl font-black py-6 rounded-2xl border-4 border-border shadow-[8px_8px_0_0_#0F172A] hover:translate-x-2 hover:translate-y-2 hover:shadow-none disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[8px_8px_0_0_#0F172A] transition-all flex justify-center items-center gap-3"
        >
          {decodeFile.isPending ? "Revealing..." : "Reveal →"}
        </button>

        {decodeFile.isError && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-chart-1 text-white p-6 rounded-xl border-4 border-border shadow-[4px_4px_0_0_#0F172A] flex flex-col items-center justify-center gap-3 font-bold text-center"
          >
            <AlertCircle className="w-8 h-8" />
            <span className="text-xl">No hidden message found (or wrong key)</span>
          </motion.div>
        )}
      </form>

      <AnimatePresence>
        {decodeFile.isSuccess && decodeFile.data && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-chart-4/20 p-8 rounded-[2rem] border-4 border-border shadow-[8px_8px_0_0_#0F172A] flex flex-col gap-6 mt-8"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-3xl font-black">Message Revealed!</h3>
              {decodeFile.data.encrypted && (
                <div className="bg-chart-2 px-3 py-1 rounded-full border-2 border-border font-bold text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Decrypted
                </div>
              )}
            </div>
            
            <div className="bg-white p-6 rounded-xl border-2 border-border font-mono text-lg whitespace-pre-wrap min-h-[120px]">
              {decodeFile.data.message}
            </div>

            <button 
              data-testid="button-copy"
              onClick={handleCopy}
              className="bg-background text-foreground text-lg font-black px-8 py-4 rounded-full border-4 border-border shadow-[4px_4px_0_0_#0F172A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-2 self-start"
            >
              {copied ? <><Check className="w-5 h-5" /> Copied!</> : <><Copy className="w-5 h-5" /> Copy to clipboard</>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
