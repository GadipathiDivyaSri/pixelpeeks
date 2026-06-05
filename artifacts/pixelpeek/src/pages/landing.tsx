import { motion } from "framer-motion";
import { Link } from "wouter";
import { Eye, Lock, Sparkles, ArrowRight, Zap, Search } from "lucide-react";
import { useState, useEffect } from "react";
import heroImg from "@assets/hero-3d.png";

function FloatingElement({ children, delay = 0, duration = 4, x = 0, y = -14 }: {
  children: React.ReactNode; delay?: number; duration?: number; x?: number; y?: number;
}) {
  return (
    <motion.div
      animate={{ y: [0, y, 0], x: [0, x, 0] }}
      transition={{ repeat: Infinity, ease: "easeInOut", duration, delay }}
    >
      {children}
    </motion.div>
  );
}

const typingPhrases = ["Hide Secrets...", "Protect Memories...", "Share Securely...", "Discover Hidden Data..."];

export default function Landing() {
  const [terminalText, setTerminalText] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [typedPhrase, setTypedPhrase] = useState("");

  const lines = [
    '$ pixelpeek encode --msg "meet at midnight"',
    "$ pixelpeek encode --media photo.png --key secret",
    "✓ 17 chars hidden in 0.04s · AES-256 applied",
  ];

  useEffect(() => {
    const full = lines.join("\n");
    let i = 0;
    const iv = setInterval(() => {
      if (i < full.length) { setTerminalText(full.slice(0, ++i)); }
      else clearInterval(iv);
    }, 35);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let charIdx = 0;
    let deleting = false;
    let phrase = typingPhrases[phraseIdx];

    const iv = setInterval(() => {
      if (!deleting) {
        setTypedPhrase(phrase.slice(0, ++charIdx));
        if (charIdx === phrase.length) {
          deleting = true;
          charIdx = phrase.length + 10;
        }
      } else {
        charIdx--;
        if (charIdx <= phrase.length) setTypedPhrase(phrase.slice(0, charIdx - 10));
        if (charIdx <= 0) {
          deleting = false;
          charIdx = 0;
          setPhraseIdx((p) => (p + 1) % typingPhrases.length);
          phrase = typingPhrases[(phraseIdx + 1) % typingPhrases.length];
        }
      }
    }, 60);
    return () => clearInterval(iv);
  }, [phraseIdx]);

  return (
    <div className="min-h-screen bg-background font-sans overflow-x-hidden">
      {/* Floating bg decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[hsl(var(--chart-1))/20] rounded-full blur-3xl" />
        <div className="absolute top-60 right-10 w-64 h-64 bg-[hsl(var(--chart-4))/20] rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-1/3 w-80 h-80 bg-[hsl(var(--chart-5))/15] rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b-2 border-border flex items-center justify-between px-6 py-3">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer select-none">
            <div className="w-9 h-9 bg-[hsl(var(--chart-1))] rounded-xl border-2 border-border shadow-[3px_3px_0_0_hsl(var(--border))] flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>PixelPeek</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <button data-testid="nav-login" className="px-5 py-2 rounded-full border-2 border-border bg-card font-bold text-sm shadow-[3px_3px_0_0_hsl(var(--border))] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all text-foreground">
              Log in
            </button>
          </Link>
          <Link href="/register">
            <button data-testid="nav-register" className="px-5 py-2 rounded-full border-2 border-border bg-[hsl(var(--chart-4))] font-bold text-sm shadow-[3px_3px_0_0_hsl(var(--border))] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all text-foreground">
              Get started
            </button>
          </Link>
        </div>
      </nav>

      <div className="relative z-10">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 py-16 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-card border-2 border-border rounded-full px-4 py-1.5 w-fit shadow-[3px_3px_0_0_hsl(var(--border))] font-mono text-xs font-bold uppercase tracking-wider"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              🔐 Hide Secrets. Peek Beyond Pixels.
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] text-foreground"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Hide{" "}
              <span className="inline-block bg-[hsl(var(--chart-1))] px-3 py-1 rounded-xl border-[3px] border-border shadow-[5px_5px_0_0_hsl(var(--border))] mx-1" style={{ transform: "rotate(-1deg)" }}>
                secrets
              </span>
              <br />
              inside{" "}
              <span className="inline-block bg-[hsl(var(--chart-3))] px-3 py-1 rounded-xl border-[3px] border-border shadow-[5px_5px_0_0_hsl(var(--border))] mx-1" style={{ transform: "rotate(1deg)" }}>
                pixels.
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-bold text-primary min-h-[2rem]"
            >
              {typedPhrase}
              <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.7 }}>|</motion.span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-lg text-foreground/70 max-w-md leading-relaxed font-medium"
            >
              Turn ordinary images, audio, and videos into secure secret message carriers using real LSB steganography and AES-256 encryption.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-3"
            >
              <Link href="/register">
                <button data-testid="hero-start-hiding" className="flex items-center gap-2 px-7 py-3.5 rounded-full border-2 border-border bg-primary text-white font-bold shadow-[4px_4px_0_0_hsl(var(--border))] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all text-base">
                  Start hiding <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/login">
                <button data-testid="hero-already-peek" className="px-7 py-3.5 rounded-full border-2 border-border bg-card font-bold shadow-[4px_4px_0_0_hsl(var(--border))] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all text-base text-foreground">
                  I already peek
                </button>
              </Link>
            </motion.div>

            <p className="text-sm text-foreground/50 font-medium font-mono">
              free to use · no email codes · your files never leave your account
            </p>
          </div>

          {/* Hero Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 22 }}
            className="flex-1 max-w-lg w-full relative"
          >
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-[hsl(var(--chart-5))] rounded-full opacity-40 blur-sm" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-[hsl(var(--chart-2))] rounded-full opacity-50 blur-sm" />

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="relative z-10 bg-card rounded-[2rem] border-[3px] border-border shadow-[12px_12px_0_0_hsl(var(--border))] overflow-hidden"
            >
              <img src={heroImg} alt="PixelPeek 3D illustration" className="w-full object-cover" style={{ aspectRatio: "4/3" }} />
              <div className="bg-foreground px-5 py-3 font-mono text-xs text-green-400 leading-relaxed">
                <pre className="whitespace-pre-wrap">
                  {terminalText}
                  <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.7 }}>▋</motion.span>
                </pre>
              </div>
            </motion.div>

            <motion.div
              animate={{ rotate: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="absolute -bottom-4 right-8 bg-foreground text-background px-4 py-2 rounded-full font-mono text-xs font-bold shadow-[3px_3px_0_0_hsl(var(--chart-1))] z-20"
            >
              psst… secret inside ✨
            </motion.div>
          </motion.div>
        </section>

        {/* Floating decorations */}
        <div className="fixed top-28 left-4 hidden xl:block pointer-events-none">
          <FloatingElement duration={3.8}><span className="text-3xl">⭐</span></FloatingElement>
        </div>
        <div className="fixed top-40 right-4 hidden xl:block pointer-events-none">
          <FloatingElement duration={4.5} delay={1}><span className="text-3xl">💖</span></FloatingElement>
        </div>
        <div className="fixed top-72 left-8 hidden xl:block pointer-events-none">
          <FloatingElement duration={5} delay={0.5}><span className="text-3xl">🔐</span></FloatingElement>
        </div>
        <div className="fixed bottom-40 right-8 hidden xl:block pointer-events-none">
          <FloatingElement duration={4} delay={2}><span className="text-3xl">✨</span></FloatingElement>
        </div>

        {/* Tools */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black mb-12 text-foreground"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Three tools, zero math.
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Lock,
                emoji: "🔐",
                title: "Peek In",
                desc: "Slip a secret into any image, audio, or video using LSB steganography. Optional AES-256 encryption wraps it tight.",
                href: "/encode",
                cardBg: "hsl(var(--chart-1))",
              },
              {
                icon: Zap,
                emoji: "🕵",
                title: "Peek Out",
                desc: "Got a carrier file? Drop it in. Reveal the hidden message in one click — with full detective mode.",
                href: "/decode",
                cardBg: "hsl(var(--chart-4))",
              },
              {
                icon: Eye,
                emoji: "🔍",
                title: "Peek",
                desc: "Run steganalysis. Get entropy, chi-square, and LSB deviation scores to detect hidden payloads.",
                href: "/peek",
                cardBg: "hsl(var(--chart-2))",
              },
            ].map((tool, i) => (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                style={{ backgroundColor: tool.cardBg }}
                className="p-8 rounded-3xl border-2 border-border shadow-[8px_8px_0_0_hsl(var(--border))] flex flex-col gap-5 group"
              >
                <div className="w-14 h-14 rounded-2xl border-2 border-border shadow-[3px_3px_0_0_hsl(var(--border))] bg-card flex items-center justify-center text-2xl">
                  {tool.emoji}
                </div>

                <div className="flex-1">
                  <h3 className="text-3xl font-black text-foreground mb-3" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {tool.title}
                  </h3>
                  <p className="text-foreground/75 font-medium leading-relaxed text-[15px]">{tool.desc}</p>
                </div>

                <Link href={tool.href}>
                  <button
                    data-testid={`tool-link-${tool.title.toLowerCase()}`}
                    className="w-full py-3.5 rounded-full border-2 border-border shadow-[3px_3px_0_0_hsl(var(--border))] font-black text-base hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all bg-foreground text-background"
                  >
                    Open {tool.title} →
                  </button>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Feature Cards */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black mb-12 text-foreground"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            All the carriers, one studio.
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { emoji: "🖼", title: "Image Steganography", sub: "LSB · PNG / JPG / WEBP / BMP", bg: "hsl(var(--chart-2))", detail: "Hides data in R,G,B channels. Supports AES-256 encryption. Output as lossless PNG." },
              { emoji: "🎵", title: "Audio Steganography", sub: "LSB · WAV (16-bit PCM)", bg: "hsl(var(--chart-3))", detail: "Embeds in low bytes of audio samples. Inaudible changes. Password protected." },
              { emoji: "🎥", title: "Video Steganography", sub: "Byte-tail · MP4 / MOV / WEBM", bg: "hsl(var(--chart-5))", detail: "Appends payload with magic markers. AES-256 encrypted. Original quality preserved." },
            ].map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                style={{ backgroundColor: c.bg }}
                className="p-8 rounded-3xl border-2 border-border shadow-[8px_8px_0_0_hsl(var(--border))] flex flex-col gap-4"
              >
                <div className="text-5xl">{c.emoji}</div>
                <h3 className="text-2xl font-black text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>{c.title}</h3>
                <p className="font-mono text-sm font-bold text-foreground/70">{c.sub}</p>
                <p className="text-sm text-foreground/60 font-medium leading-relaxed">{c.detail}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Extra features */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { emoji: "🔒", title: "AES-256 Encryption", desc: "PBKDF2 key derivation + GCM authentication. Bank-grade security on every secret." },
              { emoji: "📦", title: "Secure Downloads", desc: "Files are processed in memory and returned as secure base64 data — never stored on disk." },
              { emoji: "🕵", title: "Steganalysis Engine", desc: "Shannon entropy, chi-square pairs test, LSB deviation, and block stdev analysis." },
            ].map((f) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-card p-6 rounded-2xl border-2 border-border shadow-[6px_6px_0_0_hsl(var(--border))] flex flex-col gap-3"
              >
                <div className="text-3xl">{f.emoji}</div>
                <h3 className="text-xl font-black text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>{f.title}</h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black mb-12 text-foreground"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Three steps. Zero ceremony.
          </motion.h2>

          <div className="bg-[hsl(var(--chart-5))] p-8 md:p-12 rounded-[2.5rem] border-2 border-border shadow-[10px_10px_0_0_hsl(var(--border))]">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { num: "01", title: "Sign up with email", desc: "Drop your email and a password. No codes, no fuss. Done in 5 seconds.", bg: "bg-card" },
                { num: "02", title: "Pick your carrier", desc: "Image, audio, or video. Type a message and optionally password-lock it.", bg: "bg-[hsl(var(--background))]" },
                { num: "03", title: "Download & share", desc: "Download the encoded file — looks identical, hides your secret perfectly.", bg: "bg-[hsl(var(--chart-2))]" },
              ].map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`${step.bg} p-8 rounded-2xl border-2 border-border shadow-[6px_6px_0_0_hsl(var(--border))]`}
                >
                  <div className="text-5xl font-black text-foreground mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>{step.num}</div>
                  <h3 className="text-xl font-black text-foreground mb-2">{step.title}</h3>
                  <p className="text-foreground/60 font-medium text-sm leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="bg-primary p-12 rounded-[2.5rem] border-2 border-border shadow-[10px_10px_0_0_hsl(var(--border))] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
              className="absolute -top-20 -left-20 w-56 h-56 bg-[hsl(var(--chart-2))] rounded-full border-2 border-border opacity-40"
            />
            <div className="relative z-10">
              <h2 className="text-4xl font-black text-white mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                Got a secret? Let it ride inside a pixel. 🔐
              </h2>
              <p className="text-white/80 font-medium">Sneaky pixels. Cheerful detectives.</p>
            </div>
            <div className="relative z-10 flex gap-3 flex-wrap">
              <Link href="/register">
                <button data-testid="cta-encode" className="px-8 py-4 bg-[hsl(var(--chart-2))] rounded-full border-2 border-border font-black text-foreground shadow-[4px_4px_0_0_hsl(var(--border))] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all whitespace-nowrap">
                  Peek In now ✨
                </button>
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t-2 border-border/10 py-8 text-center font-mono text-xs text-foreground/40">
          every button works, every pixel listens · PixelPeek 2025 · 🔐 Hide Secrets. Peek Beyond Pixels.
        </footer>
      </div>
    </div>
  );
}
