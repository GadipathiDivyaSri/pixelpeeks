import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const COLORS = [
  "#FDE047", "#FB7185", "#60A5FA", "#34D399",
  "#A78BFA", "#F97316", "#EC4899", "#14B8A6",
  "#FACC15", "#F472B6",
];

const EMOJIS = ["🎉", "✨", "🌟", "💖", "🎊", "🦋", "🌸", "⭐", "🍭", "🔮"];

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  emoji: string | null;
  rotate: number;
  scale: number;
  shape: "circle" | "square" | "emoji";
  vx: number;
  vy: number;
}

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const shape = Math.random() < 0.3 ? "emoji" : Math.random() < 0.5 ? "circle" : "square";
    return {
      id: i,
      x: randomBetween(20, 80),
      y: randomBetween(30, 60),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      emoji: shape === "emoji" ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)] : null,
      rotate: randomBetween(-180, 180),
      scale: randomBetween(0.6, 1.4),
      shape,
      vx: randomBetween(-40, 40),
      vy: randomBetween(-60, -20),
    };
  });
}

export function Confetti({ trigger }: { trigger: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setParticles(makeParticles(60));
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: 1,
            rotate: 0,
            scale: p.scale,
          }}
          animate={{
            left: `${p.x + p.vx}%`,
            top: `${p.y + p.vy + 80}%`,
            opacity: 0,
            rotate: p.rotate * 4,
            scale: p.scale * 0.3,
          }}
          transition={{
            duration: randomBetween(1.8, 3.0),
            ease: [0.25, 0.46, 0.45, 0.94],
            delay: randomBetween(0, 0.4),
          }}
          style={{ position: "absolute" }}
        >
          {p.shape === "emoji" ? (
            <span style={{ fontSize: `${p.scale * 1.5}rem` }}>{p.emoji}</span>
          ) : p.shape === "circle" ? (
            <div
              style={{
                width: `${p.scale * 12}px`,
                height: `${p.scale * 12}px`,
                borderRadius: "50%",
                backgroundColor: p.color,
              }}
            />
          ) : (
            <div
              style={{
                width: `${p.scale * 10}px`,
                height: `${p.scale * 10}px`,
                backgroundColor: p.color,
                borderRadius: "2px",
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}
