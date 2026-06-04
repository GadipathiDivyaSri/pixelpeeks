import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Image as ImageIcon, Music, Video, Lock, Download, AlertCircle } from "lucide-react";
import { useEncodeFile } from "@workspace/api-client-react";

export default function Encode() {
  const [activeTab, setActiveTab] = useState<"image" | "audio" | "video">("image");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const encodeFile = useEncodeFile();

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
    if (!file || !message) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("message", message);
    if (passphrase) formData.append("key", passphrase);

    encodeFile.mutate({ data: formData as any });
  };

  const tabs = [
    { id: "image", label: "Image", icon: ImageIcon, color: "bg-chart-2" },
    { id: "audio", label: "Audio", icon: Music, color: "bg-chart-3" },
    { id: "video", label: "Video", icon: Video, color: "bg-[hsl(327,73%,81%)]" },
  ] as const;

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto pb-24">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-black mb-4">Encode</h1>
        <p className="text-xl font-medium text-muted-foreground">Hide a secret inside a file.</p>
      </div>

      <div className="flex bg-white rounded-full p-2 border-2 border-border shadow-[4px_4px_0_0_#0F172A] w-fit mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-testid={`tab-${tab.id}`}
            onClick={() => { setActiveTab(tab.id); setFile(null); encodeFile.reset(); }}
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

        {/* Message Input */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border-4 border-border shadow-[8px_8px_0_0_#0F172A] flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="font-black text-xl flex items-center gap-2">
              Secret Message <span className="text-primary">*</span>
            </label>
            <textarea 
              data-testid="input-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Whisper something only your friend can hear…"
              className="w-full min-h-[120px] p-4 rounded-xl border-2 border-border shadow-[4px_4px_0_0_#0F172A] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all resize-none font-medium text-lg outline-none"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-black text-xl flex items-center gap-2">
              Passphrase <span className="text-muted-foreground text-sm font-medium">(Optional)</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                data-testid="input-passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Extra security..."
                className="w-full p-4 pl-12 rounded-xl border-2 border-border shadow-[4px_4px_0_0_#0F172A] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all font-medium text-lg outline-none"
              />
            </div>
          </div>
        </div>

        <button 
          data-testid="button-submit-encode"
          type="submit" 
          disabled={!file || !message || encodeFile.isPending}
          className="bg-primary text-white text-2xl font-black py-6 rounded-2xl border-4 border-border shadow-[8px_8px_0_0_#0F172A] hover:translate-x-2 hover:translate-y-2 hover:shadow-none disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[8px_8px_0_0_#0F172A] transition-all flex justify-center items-center gap-3"
        >
          {encodeFile.isPending ? "Hiding..." : "Hide it →"}
        </button>

        {encodeFile.isError && (
          <div className="bg-red-100 text-red-900 p-4 rounded-xl border-2 border-red-900 flex items-center gap-3 font-bold">
            <AlertCircle className="w-5 h-5" />
            Failed to encode file. Please try again.
          </div>
        )}
      </form>

      <AnimatePresence>
        {encodeFile.isSuccess && encodeFile.data && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-chart-3/20 p-8 rounded-[2rem] border-4 border-border shadow-[8px_8px_0_0_#0F172A] flex flex-col items-center gap-6 mt-8 text-center"
          >
            <div className="w-16 h-16 bg-chart-3 rounded-full border-4 border-border flex items-center justify-center">
              <Download className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-3xl font-black mb-2">Success!</h3>
              <p className="text-lg font-medium">Your secret is now safely hidden.</p>
              <div className="font-mono mt-2 bg-white/50 px-3 py-1 rounded-full border border-border inline-block text-sm">
                {(encodeFile.data.bytesUsed / 1024).toFixed(2)} KB used · {encodeFile.data.timeSec.toFixed(2)}s
              </div>
            </div>
            <a 
              data-testid="link-download"
              href={encodeFile.data.downloadUrl} 
              download={encodeFile.data.filename}
              className="bg-background text-foreground text-xl font-black px-8 py-4 rounded-full border-4 border-border shadow-[4px_4px_0_0_#0F172A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all w-full md:w-auto"
            >
              Download {encodeFile.data.filename}
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
