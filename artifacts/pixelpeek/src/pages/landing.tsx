import { motion } from "framer-motion";
import { Link } from "wouter";
import { Eye, Lock, Sparkles, Star, ArrowRight, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import heroImg from "@assets/hero-3d.png";
import carrierImageImg from "@assets/carrier-image.png";
import carrierAudioImg from "@assets/carrier-audio.png";
import carrierVideoImg from "@assets/carrier-video.png";


export default function Landing() {
  const [terminalText, setTerminalText] = useState("");
  const lines = [
    '$ pixelpeek encode --msg "meet at midnight"',
    "$ pixelpeek encode --media video.mp4",
    "✓ 17 chars hidden in 0.04s",
  ];

  useEffect(() => {
    const full = lines.join("\n");
    let i = 0;
    let cur = "";
    const iv = setInterval(() => {
      if (i < full.length) {
        cur += full[i++];
        setTerminalText(cur);
      } else {
        clearInterval(iv);
      }
    }, 38);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans">
      {/* ── Top Nav ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#FDFBF7] border-b-2 border-[#0F172A] flex items-center justify-between px-6 py-3">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer select-none">
            <div className="w-9 h-9 bg-[#FDE047] rounded-xl border-2 border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center">
              <Eye className="w-5 h-5 text-[#0F172A]" />
            </div>
            <span className="font-black text-xl text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>PixelPeek</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <button data-testid="nav-login" className="px-5 py-2 rounded-full border-2 border-[#0F172A] bg-white font-bold text-sm shadow-[3px_3px_0_0_#0F172A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
              Log in
            </button>
          </Link>
          <Link href="/register">
            <button data-testid="nav-register" className="px-5 py-2 rounded-full border-2 border-[#0F172A] bg-[#7DD3FC] font-bold text-sm shadow-[3px_3px_0_0_#0F172A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
              Get started
            </button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-16 flex flex-col lg:flex-row items-center gap-12">
        {/* Left */}
        <div className="flex-1 flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-white border-2 border-[#0F172A] rounded-full px-4 py-1.5 w-fit shadow-[3px_3px_0_0_#0F172A] font-mono text-xs font-bold uppercase tracking-wider"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FF6B6B]" />
            now hiding pixels, samples &amp; frames
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] text-[#0F172A]"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Hide{" "}
            <span
              className="inline-block bg-[#F9A8D4] px-3 py-1 rounded-xl border-[3px] border-[#0F172A] shadow-[5px_5px_0_0_#0F172A] mx-1"
              style={{ transform: "rotate(-1deg)" }}
            >
              secrets
            </span>
            <br />
            inside{" "}
            <span
              className="inline-block bg-[#86EFAC] px-3 py-1 rounded-xl border-[3px] border-[#0F172A] shadow-[5px_5px_0_0_#0F172A] mx-1"
              style={{ transform: "rotate(1deg)" }}
            >
              pixels.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-[#0F172A]/70 max-w-md leading-relaxed font-medium"
          >
            PixelPeek is a playful steganography studio. Tuck messages into{" "}
            <strong>images</strong>, <strong>audio</strong> and{" "}
            <strong>video</strong>, pull them back out, and sniff out anything
            suspicious — no math degree required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-3"
          >
            <Link href="/register">
              <button data-testid="hero-start-hiding" className="flex items-center gap-2 px-7 py-3.5 rounded-full border-2 border-[#0F172A] bg-[#FF6B6B] text-white font-bold shadow-[4px_4px_0_0_#0F172A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all text-base">
                Start hiding <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/login">
              <button data-testid="hero-already-peek" className="px-7 py-3.5 rounded-full border-2 border-[#0F172A] bg-white font-bold shadow-[4px_4px_0_0_#0F172A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all text-base">
                I already peek
              </button>
            </Link>
          </motion.div>

          <p className="text-sm text-[#0F172A]/50 font-medium font-mono">
            free to use · no email codes · your files never leave your account
          </p>
        </div>

        {/* Right — hero image card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 22 }}
          className="flex-1 max-w-lg w-full relative"
        >
          {/* Decorative blobs */}
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#C4B5FD] rounded-full opacity-60 blur-sm" />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-[#FDE047] rounded-full opacity-70 blur-sm" />

          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="relative z-10 bg-white rounded-[2rem] border-[3px] border-[#0F172A] shadow-[12px_12px_0_0_#0F172A] overflow-hidden"
          >
            <img
              src={heroImg}
              alt="PixelPeek 3D illustration"
              className="w-full object-cover"
              style={{ aspectRatio: "4/3" }}
            />
            {/* Terminal overlay */}
            <div className="bg-[#0F172A] px-5 py-3 font-mono text-xs text-green-400 leading-relaxed">
              <pre className="whitespace-pre-wrap">
                {terminalText}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.7 }}
                >
                  ▋
                </motion.span>
              </pre>
            </div>
          </motion.div>

          {/* psst badge */}
          <motion.div
            animate={{ rotate: [-2, 2, -2] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute -bottom-4 right-8 bg-[#0F172A] text-white px-4 py-2 rounded-full font-mono text-xs font-bold shadow-[3px_3px_0_0_#FF6B6B] z-20"
          >
            psst… secret inside
          </motion.div>
        </motion.div>
      </section>

      {/* ── Floating decorations ─────────────────────────────── */}
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ repeat: Infinity, ease: "easeInOut", duration: 3.8 }}
        className="fixed top-28 left-4 hidden xl:block pointer-events-none"
      >
        <Star className="w-10 h-10 text-[#FDE047] fill-[#FDE047]" />
      </motion.div>
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ repeat: Infinity, ease: "easeInOut", duration: 4.5, delay: 1 }}
        className="fixed top-40 right-4 hidden xl:block pointer-events-none"
      >
        <Sparkles className="w-12 h-12 text-[#FF6B6B]" />
      </motion.div>

      {/* ── Three tools ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-black mb-12 text-[#0F172A]"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Three tools, zero math.
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Lock,
              title: "Encode",
              desc: "Slip a secret into the LSBs of any image, the samples of a WAV, or the tail of a video. Optional password locks it with AES-256.",
              href: "/encode",
              cardBg: "#FF6B6B",
              iconBg: "#fff",
              btnBg: "#0F172A",
              btnText: "#fff",
              accent: "#0F172A",
            },
            {
              icon: Zap,
              title: "Decode",
              desc: "Got a file with a whisper inside? Drop it in. Reveal the hidden message in a single click.",
              href: "/decode",
              cardBg: "#7DD3FC",
              iconBg: "#fff",
              btnBg: "#0F172A",
              btnText: "#fff",
              accent: "#0F172A",
            },
            {
              icon: Eye,
              title: "Peek",
              desc: "Run a quick LSB analysis. Get a likelihood score and decide if a picture is hiding something.",
              href: "/peek",
              cardBg: "#FDE047",
              iconBg: "#fff",
              btnBg: "#0F172A",
              btnText: "#fff",
              accent: "#0F172A",
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
              className="p-8 rounded-3xl border-2 border-[#0F172A] shadow-[8px_8px_0_0_#0F172A] flex flex-col gap-5"
            >
              {/* Icon badge */}
              <div
                style={{ backgroundColor: tool.iconBg }}
                className="w-14 h-14 rounded-2xl border-2 border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center"
              >
                <tool.icon className="w-7 h-7 text-[#0F172A]" />
              </div>

              <div className="flex-1">
                <h3 className="text-3xl font-black text-[#0F172A] mb-3" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {tool.title}
                </h3>
                <p className="text-[#0F172A]/75 font-medium leading-relaxed text-[15px]">{tool.desc}</p>
              </div>

              <Link href={tool.href}>
                <button
                  data-testid={`tool-link-${tool.title.toLowerCase()}`}
                  style={{ backgroundColor: tool.btnBg, color: tool.btnText }}
                  className="w-full py-3.5 rounded-full border-2 border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] font-black text-base hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
                >
                  Open {tool.title} →
                </button>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Carriers ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex flex-col lg:flex-row lg:items-start gap-8 mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black text-[#0F172A] flex-1"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            All the carriers,<br />one studio.
          </motion.h2>
          <p className="text-[#0F172A]/60 font-medium max-w-xs leading-relaxed">
            PNG, BMP and JPG for images. WAV for sample-level LSB. MP4, MOV and WEBM via secure byte-tail. Optional AES-256 wrap.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Images", sub: "LSB · PNG / BMP / JPG", bg: "bg-[#FDE047]", delay: 0, img: carrierImageImg },
            { title: "Audio", sub: "LSB · WAV (16-bit PCM)", bg: "bg-[#86EFAC]", delay: 0.15, img: carrierAudioImg },
            { title: "Video", sub: "Append tail · MP4 / MOV / WEBM", bg: "bg-[#F9A8D4]", delay: 0.3, img: carrierVideoImg },
          ].map((c) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: c.delay }}
              className={`${c.bg} p-8 rounded-3xl border-2 border-[#0F172A] shadow-[8px_8px_0_0_#0F172A] flex flex-col gap-4 overflow-hidden relative`}
            >
              {/* cute illustration */}
              <motion.img
                src={c.img}
                alt={c.title}
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, ease: "easeInOut", duration: 3 + Math.random() }}
                className="w-36 h-36 object-contain mx-auto drop-shadow-lg"
              />
              <h3 className="text-2xl font-black text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>{c.title}</h3>
              <p className="font-mono text-sm font-bold text-[#0F172A]/70">{c.sub}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Three Steps ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-black mb-12 text-[#0F172A]"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Three steps. Zero ceremony.
        </motion.h2>

        <div className="bg-[#C4B5FD] p-8 md:p-12 rounded-[2.5rem] border-2 border-[#0F172A] shadow-[10px_10px_0_0_#0F172A]">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: "01", title: "Sign up with email", desc: "Drop your email and a password. No codes, no fuss. Done in 5s.", bg: "bg-[#FDFBF7]" },
              { num: "02", title: "Pick your carrier", desc: "Image, audio or video. Type a message, optionally password-lock it.", bg: "bg-white" },
              { num: "03", title: "Pop, hide, share", desc: "Download the new file — looks identical, hides your words.", bg: "bg-[#FDE047]" },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`${step.bg} p-8 rounded-2xl border-2 border-[#0F172A] shadow-[6px_6px_0_0_#0F172A]`}
              >
                <div className="text-5xl font-black text-[#0F172A] mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>{step.num}</div>
                <h3 className="text-xl font-black text-[#0F172A] mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>{step.title}</h3>
                <p className="text-[#0F172A]/60 font-medium text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="bg-[#FF6B6B] p-12 rounded-[2.5rem] border-2 border-[#0F172A] shadow-[10px_10px_0_0_#0F172A] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
            className="absolute -top-20 -left-20 w-56 h-56 bg-[#FDE047] rounded-full border-2 border-[#0F172A] opacity-50"
          />
          <div className="relative z-10">
            <h2 className="text-4xl font-black text-white mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
              Got a secret? Let it ride inside a pixel.
            </h2>
            <p className="text-white/80 font-medium">Sneaky pixels. Cheerful detectives.</p>
          </div>
          <div className="relative z-10 flex gap-3 flex-wrap">
            <Link href="/register">
              <button data-testid="cta-encode" className="px-8 py-4 bg-[#FDE047] rounded-full border-2 border-[#0F172A] font-black text-[#0F172A] shadow-[4px_4px_0_0_#0F172A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all whitespace-nowrap">
                Encode now
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t-2 border-[#0F172A]/10 py-8 text-center font-mono text-xs text-[#0F172A]/40">
        every button works, every pixel listens · PixelPeek 2025
      </footer>
    </div>
  );
}
