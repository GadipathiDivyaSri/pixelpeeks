import { motion } from "framer-motion";
import { Link } from "wouter";
import { Terminal, Lock, Unlock, Search, ArrowRight, Sparkles, Star } from "lucide-react";
import { useState, useEffect } from "react";

export default function Home() {
  const [terminalText, setTerminalText] = useState("");
  const fullText1 = "$ pixelpeek encode --msg \"meet at midnight\"\n";
  const fullText2 = "$ pixelpeek encode --media video.mp4\n";
  const fullText3 = "✓ 17 chars hidden in 0.04s";

  useEffect(() => {
    let currentText = "";
    let i = 0;
    
    const typeWriter = setInterval(() => {
      const full = fullText1 + fullText2 + fullText3;
      if (i < full.length) {
        currentText += full.charAt(i);
        setTerminalText(currentText);
        i++;
      } else {
        clearInterval(typeWriter);
      }
    }, 50);

    return () => clearInterval(typeWriter);
  }, []);

  return (
    <div className="flex flex-col gap-24 pb-24">
      {/* Hero Section */}
      <section className="relative pt-12 md:pt-24 flex flex-col items-center text-center gap-8">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white px-6 py-2 rounded-full border-2 border-border shadow-[4px_4px_0_0_#0F172A] font-bold text-sm uppercase tracking-wider flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          now hiding pixels, samples & frames
        </motion.div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black max-w-4xl leading-[1.1]">
          Hide{" "}
          <motion.span 
            initial={{ rotate: -5, scale: 0.9 }}
            animate={{ rotate: -1, scale: 1 }}
            className="inline-block bg-chart-2 px-4 py-2 rounded-2xl border-4 border-border shadow-[8px_8px_0_0_#0F172A] mx-2"
          >
            secrets
          </motion.span>{" "}
          inside{" "}
          <motion.span 
            initial={{ rotate: 5, scale: 0.9 }}
            animate={{ rotate: 1, scale: 1 }}
            className="inline-block bg-chart-4 px-4 py-2 rounded-2xl border-4 border-border shadow-[8px_8px_0_0_#0F172A] mx-2"
          >
            pixels.
          </motion.span>
        </h1>

        <p className="text-xl md:text-2xl font-medium text-muted-foreground max-w-2xl">
          Sneaky pixels. Cheerful detectives. Hide stuff. Find stuff. Have fun.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
          <Link href="/encode">
            <button data-testid="button-start-hiding" className="bg-primary text-white text-lg font-bold px-8 py-4 rounded-full border-2 border-border shadow-[4px_4px_0_0_#0F172A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2">
              Start hiding <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <Link href="/decode">
            <button data-testid="button-already-peek" className="bg-chart-4 text-foreground text-lg font-bold px-8 py-4 rounded-full border-2 border-border shadow-[4px_4px_0_0_#0F172A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
              I already peek
            </button>
          </Link>
        </div>

        {/* Terminal Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-12 bg-sidebar-primary text-sidebar-primary-foreground p-6 rounded-2xl border-4 border-border shadow-[12px_12px_0_0_#0F172A] w-full max-w-2xl text-left font-mono text-sm md:text-base leading-relaxed overflow-hidden relative"
        >
          <div className="flex gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-primary border border-border"></div>
            <div className="w-3 h-3 rounded-full bg-chart-2 border border-border"></div>
            <div className="w-3 h-3 rounded-full bg-chart-3 border border-border"></div>
          </div>
          <pre className="whitespace-pre-wrap">
            {terminalText}
            <motion.span 
              animate={{ opacity: [1, 0] }} 
              transition={{ repeat: Infinity, duration: 0.8 }}
            >
              _
            </motion.span>
          </pre>
        </motion.div>

        {/* Floating Shapes */}
        <motion.div 
          animate={{ y: [0, -18, 0], rotate: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="absolute top-20 left-10 hidden lg:block"
        >
          <Star className="w-12 h-12 text-chart-2 fill-chart-2" />
        </motion.div>
        <motion.div 
          animate={{ y: [0, -18, 0], rotate: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 1 }}
          className="absolute top-40 right-10 hidden lg:block"
        >
          <Sparkles className="w-16 h-16 text-primary" />
        </motion.div>
      </section>

      {/* Tools Section */}
      <section className="flex flex-col gap-12">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-4">Three tools, zero math.</h2>
          <p className="text-lg font-medium text-muted-foreground">no math degree required</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Encode", desc: "Hide secrets inside files", icon: Lock, color: "bg-chart-2", href: "/encode" },
            { title: "Decode", desc: "Extract hidden messages", icon: Unlock, color: "bg-primary", href: "/decode", text: "text-white" },
            { title: "Peek", desc: "Analyze suspicious files", icon: Search, color: "bg-chart-4", href: "/peek" }
          ].map((tool, i) => (
            <motion.div 
              key={tool.title}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`bg-white p-8 rounded-2xl border-4 border-border shadow-[8px_8px_0_0_#0F172A] flex flex-col items-start gap-4`}
            >
              <div className={`p-4 rounded-xl border-2 border-border shadow-[4px_4px_0_0_#0F172A] ${tool.color} ${tool.text || ''}`}>
                <tool.icon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black">{tool.title}</h3>
              <p className="text-muted-foreground font-medium mb-4">{tool.desc}</p>
              <Link href={tool.href} className="mt-auto">
                <button data-testid={`link-${tool.title.toLowerCase()}`} className="font-bold underline underline-offset-4 decoration-2 decoration-primary hover:text-primary transition-colors">
                  Open {tool.title} &rarr;
                </button>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Carriers Section */}
      <section className="flex flex-col gap-12 bg-foreground text-background p-12 rounded-[3rem] border-4 border-border shadow-[12px_12px_0_0_#0F172A] overflow-hidden">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-4">All the carriers, one studio.</h2>
          <p className="text-lg font-medium opacity-80">every button works, every pixel listens</p>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          {[
            { title: "Images", color: "bg-chart-2 text-foreground", desc: "LSB · PNG / BMP / JPG" },
            { title: "Audio", color: "bg-chart-3 text-foreground", desc: "LSB · WAV / FLAC" },
            { title: "Video", color: "bg-[hsl(327,73%,81%)] text-foreground", desc: "LSB · MP4 / WEBM" }
          ].map((carrier, i) => (
            <motion.div
              key={carrier.title}
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, delay: i * 0.4, ease: "easeInOut" }}
              className={`${carrier.color} p-6 rounded-2xl border-4 border-border shadow-[8px_8px_0_0_#0F172A] w-64 text-center transform rotate-${i === 1 ? '3' : '-3'}`}
            >
              <h3 className="text-3xl font-black mb-2">{carrier.title}</h3>
              <div className="font-mono text-sm font-bold bg-white/50 px-3 py-1 rounded-full border border-border inline-block">
                {carrier.desc}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Steps Section */}
      <section className="flex flex-col gap-12">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-4">Three steps. Zero ceremony.</h2>
          <p className="text-lg font-medium text-muted-foreground">free to use · no email codes · your files never leave your account</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 bg-[#C4B5FD] p-8 md:p-12 rounded-[3rem] border-4 border-border shadow-[12px_12px_0_0_#0F172A]">
          {[
            { num: "01", title: "Pick a file", color: "bg-background" },
            { num: "02", title: "Type a secret", color: "bg-white" },
            { num: "03", title: "Download", color: "bg-chart-2" }
          ].map((step, i) => (
            <div key={step.num} className={`${step.color} flex-1 p-8 rounded-2xl border-4 border-border shadow-[8px_8px_0_0_#0F172A] relative overflow-hidden group`}>
              <div className="text-6xl font-black text-border opacity-20 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform">
                {step.num}
              </div>
              <h3 className="text-2xl font-black relative z-10">{step.title}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary text-white p-12 rounded-[3rem] border-4 border-border shadow-[12px_12px_0_0_#0F172A] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          className="absolute -top-24 -left-24 w-64 h-64 bg-chart-2 rounded-full border-4 border-border shadow-[8px_8px_0_0_#0F172A] opacity-50"
        />
        
        <div className="relative z-10 max-w-xl">
          <h2 className="text-4xl md:text-5xl font-black mb-4">Got a secret? Let it ride inside a pixel.</h2>
          <p className="text-xl font-medium opacity-90">psst… secret inside</p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-4">
          <Link href="/encode">
            <button data-testid="button-cta-encode" className="bg-white text-foreground text-xl font-black px-8 py-4 rounded-full border-4 border-border shadow-[6px_6px_0_0_#0F172A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all whitespace-nowrap">
              Encode →
            </button>
          </Link>
        </div>
      </section>

    </div>
  );
}
