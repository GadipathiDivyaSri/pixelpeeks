import { motion } from "framer-motion";
import { Link } from "wouter";
import { Lock, Unlock, Search, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useGetStats } from "@workspace/api-client-react";
import { useInView } from "framer-motion";

function AnimatedCounter({ target, duration = 2 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || target === 0) { setCount(target); return; }
    let start = 0;
    const steps = duration * 60;
    const step = target / steps;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

export default function Home() {
  const [terminalText, setTerminalText] = useState("");
  const { data: stats } = useGetStats();

  useEffect(() => {
    const lines = [
      '$ pixelpeek encode --msg "meet at midnight"\n',
      "$ pixelpeek encode --media video.mp4\n",
      "✓ 17 chars hidden in 0.04s",
    ].join("");
    let i = 0;
    const iv = setInterval(() => {
      if (i < lines.length) setTerminalText(lines.slice(0, ++i));
      else clearInterval(iv);
    }, 45);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="flex flex-col gap-20 pb-24">
      {/* Hero */}
      <section className="relative pt-8 md:pt-16 flex flex-col items-center text-center gap-8">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-[hsl(var(--chart-1))/15] px-6 py-2 rounded-full border-2 border-border font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-foreground"
        >
          <span>✨</span>
          now hiding pixels, samples &amp; frames
        </motion.div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black max-w-4xl leading-[1.1]" style={{ fontFamily: "Outfit, sans-serif" }}>
          Hide{" "}
          <motion.span
            initial={{ rotate: -5, scale: 0.9 }}
            animate={{ rotate: -1, scale: 1 }}
            className="inline-block bg-[hsl(var(--chart-1))] px-4 py-2 rounded-2xl border-4 border-border shadow-[8px_8px_0_0_hsl(var(--border))] mx-2"
          >
            secrets
          </motion.span>{" "}
          inside{" "}
          <motion.span
            initial={{ rotate: 5, scale: 0.9 }}
            animate={{ rotate: 1, scale: 1 }}
            className="inline-block bg-[hsl(var(--chart-4))] px-4 py-2 rounded-2xl border-4 border-border shadow-[8px_8px_0_0_hsl(var(--border))] mx-2"
          >
            pixels.
          </motion.span>
        </h1>

        <p className="text-xl md:text-2xl font-medium text-muted-foreground max-w-2xl">
          Sneaky pixels. Cheerful detectives. Hide stuff. Find stuff. Have fun. 🔐
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
          <Link href="/encode">
            <button data-testid="button-start-hiding" className="bg-primary text-white text-lg font-bold px-8 py-4 rounded-full border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2">
              Start hiding <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <Link href="/decode">
            <button data-testid="button-already-peek" className="bg-[hsl(var(--chart-4))] text-foreground text-lg font-bold px-8 py-4 rounded-full border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
              Reveal a secret
            </button>
          </Link>
        </div>

        {/* Terminal */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-foreground text-[hsl(var(--chart-3))] p-6 rounded-2xl border-4 border-border shadow-[12px_12px_0_0_hsl(var(--border))] w-full max-w-2xl text-left font-mono text-sm leading-relaxed"
        >
          <div className="flex gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-[hsl(var(--chart-1))] border border-border" />
            <div className="w-3 h-3 rounded-full bg-[hsl(var(--chart-2))] border border-border" />
            <div className="w-3 h-3 rounded-full bg-[hsl(var(--chart-3))] border border-border" />
          </div>
          <pre className="whitespace-pre-wrap">
            {terminalText}
            <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }}>_</motion.span>
          </pre>
        </motion.div>

        {/* Floating decorations */}
        <motion.div
          animate={{ y: [0, -18, 0], rotate: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="absolute top-20 left-10 hidden lg:block text-3xl pointer-events-none"
        >
          ⭐
        </motion.div>
        <motion.div
          animate={{ y: [0, -18, 0], rotate: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 1 }}
          className="absolute top-40 right-10 hidden lg:block text-3xl pointer-events-none"
        >
          💖
        </motion.div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { emoji: "🔐", label: "Secrets Encoded", value: stats?.encodes ?? 0 },
          { emoji: "🕵", label: "Secrets Decoded", value: stats?.decodes ?? 0 },
          { emoji: "🔍", label: "Files Analyzed", value: stats?.peeks ?? 0 },
          { emoji: "🎯", label: "Stego Hits Found", value: stats?.stegoHits ?? 0 },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-card p-6 rounded-2xl border-4 border-border shadow-[6px_6px_0_0_hsl(var(--border))] text-center"
          >
            <div className="text-3xl mb-2">{stat.emoji}</div>
            <div className="text-4xl font-black text-foreground">
              <AnimatedCounter target={stat.value} />
            </div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </section>

      {/* Tools */}
      <section className="flex flex-col gap-10">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>Three tools, zero math.</h2>
          <p className="text-lg font-medium text-muted-foreground">no math degree required 🎓</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Encode", desc: "Hide secrets inside files using real LSB steganography", icon: Lock, color: "bg-[hsl(var(--chart-1))]", href: "/encode", emoji: "🔐" },
            { title: "Decode", desc: "Extract hidden messages from carrier files instantly", icon: Unlock, color: "bg-[hsl(var(--chart-4))]", href: "/decode", emoji: "🕵" },
            { title: "Peek", desc: "Analyze suspicious files for steganographic anomalies", icon: Search, color: "bg-[hsl(var(--chart-2))]", href: "/peek", emoji: "🔍" },
          ].map((tool, i) => (
            <motion.div
              key={tool.title}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-card p-8 rounded-2xl border-4 border-border shadow-[8px_8px_0_0_hsl(var(--border))] flex flex-col items-start gap-4"
            >
              <div className={`p-4 rounded-xl border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] ${tool.color} text-2xl`}>
                {tool.emoji}
              </div>
              <h3 className="text-2xl font-black text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>{tool.title}</h3>
              <p className="text-muted-foreground font-medium mb-4 flex-1">{tool.desc}</p>
              <Link href={tool.href} className="mt-auto">
                <button data-testid={`link-${tool.title.toLowerCase()}`} className="font-black underline underline-offset-4 decoration-2 decoration-primary hover:text-primary transition-colors">
                  Open {tool.title} &rarr;
                </button>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Carriers */}
      <section className="flex flex-col gap-10 bg-foreground text-background p-10 md:p-14 rounded-[3rem] border-4 border-border shadow-[12px_12px_0_0_hsl(var(--border))] overflow-hidden">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>All the carriers, one studio.</h2>
          <p className="text-lg font-medium opacity-70">every button works, every pixel listens ✨</p>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          {[
            { title: "🖼 Images", color: "bg-[hsl(var(--chart-2))]", desc: "LSB · PNG / JPG / WEBP / BMP" },
            { title: "🎵 Audio", color: "bg-[hsl(var(--chart-3))]", desc: "LSB · WAV (16-bit PCM)" },
            { title: "🎥 Video", color: "bg-[hsl(var(--chart-5))]", desc: "Append · MP4 / MOV / WEBM" },
          ].map((carrier, i) => (
            <motion.div
              key={carrier.title}
              animate={{ y: [0, -12, 0] }}
              transition={{ repeat: Infinity, duration: 3 + i * 0.4, ease: "easeInOut" }}
              className={`${carrier.color} text-foreground p-6 rounded-2xl border-4 border-background/30 shadow-[8px_8px_0_0_rgba(0,0,0,0.3)] w-64 text-center`}
            >
              <h3 className="text-2xl font-black mb-3" style={{ fontFamily: "Outfit, sans-serif" }}>{carrier.title}</h3>
              <div className="font-mono text-xs font-bold bg-black/20 px-3 py-1 rounded-full inline-block">
                {carrier.desc}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="flex flex-col gap-10">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>Three steps. Zero ceremony.</h2>
          <p className="text-lg font-medium text-muted-foreground">free to use · no email codes · your files stay private</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 bg-[hsl(var(--chart-5))] p-8 md:p-12 rounded-[3rem] border-4 border-border shadow-[12px_12px_0_0_hsl(var(--border))]">
          {[
            { num: "01", title: "Pick a file", desc: "Image, audio, or video — any size up to 500 MB", color: "bg-background" },
            { num: "02", title: "Type a secret", desc: "Your message, optional passphrase, AES-256 protection", color: "bg-card" },
            { num: "03", title: "Download & share", desc: "Looks identical. Hides everything. Perfectly covert.", color: "bg-[hsl(var(--chart-2))]" },
          ].map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`${step.color} flex-1 p-8 rounded-2xl border-4 border-border shadow-[8px_8px_0_0_hsl(var(--border))] relative overflow-hidden group`}
            >
              <div className="text-6xl font-black text-border/20 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform" style={{ fontFamily: "Outfit, sans-serif" }}>
                {step.num}
              </div>
              <h3 className="text-2xl font-black relative z-10 mb-2 text-foreground">{step.title}</h3>
              <p className="text-muted-foreground font-medium text-sm relative z-10">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-white p-12 rounded-[3rem] border-4 border-border shadow-[12px_12px_0_0_hsl(var(--border))] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          className="absolute -top-24 -left-24 w-64 h-64 bg-[hsl(var(--chart-2))] rounded-full border-4 border-border/30 opacity-50"
        />
        <div className="relative z-10 max-w-xl">
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>
            Got a secret? Let it ride inside a pixel. 🔐
          </h2>
          <p className="text-xl font-medium opacity-90">psst… secret inside ✨</p>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row gap-4">
          <Link href="/encode">
            <button data-testid="button-cta-encode" className="bg-white text-foreground text-xl font-black px-8 py-4 rounded-full border-4 border-border shadow-[6px_6px_0_0_hsl(var(--border))] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all whitespace-nowrap">
              Encode now →
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
