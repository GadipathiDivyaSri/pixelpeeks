import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, User, Star, Check } from "lucide-react";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/context/auth";

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  const clamped = Math.min(4, score);
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "bg-[#FF6B6B]", "bg-amber-400", "bg-amber-400", "bg-[#4ADE80]"];
  return { score: clamped, label: labels[clamped] ?? "", color: colors[clamped] ?? "" };
}

const REQUIREMENTS = [
  { label: "At least 6 characters", test: (pw: string) => pw.length >= 6 },
  { label: "Contains a number", test: (pw: string) => /[0-9]/.test(pw) },
  { label: "Contains uppercase + lowercase", test: (pw: string) => /[A-Z]/.test(pw) && /[a-z]/.test(pw) },
  { label: "Contains a special character", test: (pw: string) => /[^a-zA-Z0-9]/.test(pw) },
];

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const strength = getPasswordStrength(password);

  const registerMutation = useRegister({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user);
        setLocation("/dashboard");
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg ?? "Something went wrong. Please try again.");
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    registerMutation.mutate({ data: { name, email, password } });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b-2 border-border px-6 py-3 flex items-center gap-2">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 bg-[#FDE047] rounded-xl border-2 border-border shadow-[2px_2px_0_0_hsl(var(--border))] flex items-center justify-center">
              <Eye className="w-4 h-4 text-foreground" />
            </div>
            <span className="font-black text-lg text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>PixelPeek</span>
          </div>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card rounded-[2rem] border-2 border-border shadow-[10px_10px_0_0_hsl(var(--border))] p-8">
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                animate={{ y: [0, -6, 0], rotate: [0, 15, 0] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
              >
                <Star className="w-6 h-6 text-[#FDE047] fill-[#FDE047]" />
              </motion.div>
              <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                Create account
              </h1>
            </div>
            <p className="text-muted-foreground font-medium mb-8 text-sm">
              Start hiding secrets in pixels today
            </p>

            {error && (
              <div data-testid="register-error" className="mb-6 bg-destructive/10 border-2 border-destructive rounded-xl px-4 py-3 text-destructive font-bold text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-sm text-foreground">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    data-testid="input-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-border shadow-[3px_3px_0_0_hsl(var(--border))] focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] outline-none font-medium text-sm transition-all bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-sm text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    data-testid="input-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-border shadow-[3px_3px_0_0_hsl(var(--border))] focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] outline-none font-medium text-sm transition-all bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-sm text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    data-testid="input-password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-10 py-3 rounded-xl border-2 border-border shadow-[3px_3px_0_0_hsl(var(--border))] focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] outline-none font-medium text-sm transition-all bg-background text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength bar */}
                {password.length > 0 && (
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-muted-foreground">Strength</span>
                      <span className={strength.score >= 3 ? "text-[#4ADE80]" : strength.score >= 2 ? "text-amber-500" : "text-[#FF6B6B]"}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="flex gap-1 h-2">
                      {[1, 2, 3, 4].map(n => (
                        <motion.div
                          key={n}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            n <= strength.score ? strength.color : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Requirements */}
                    <div className="flex flex-col gap-1 mt-1">
                      {REQUIREMENTS.map(req => {
                        const met = req.test(password);
                        return (
                          <div key={req.label} className={`flex items-center gap-1.5 text-xs transition-colors ${met ? "text-[#4ADE80]" : "text-muted-foreground"}`}>
                            <Check className={`w-3 h-3 flex-shrink-0 transition-all ${met ? "scale-100 opacity-100" : "scale-75 opacity-30"}`} />
                            {req.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button
                data-testid="button-register"
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full py-3.5 rounded-full border-2 border-border bg-[#7DD3FC] text-foreground font-black text-base shadow-[4px_4px_0_0_hsl(var(--border))] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {registerMutation.isPending ? "Creating account…" : "Get started →"}
              </button>
            </form>

            <p className="text-center text-sm font-medium text-muted-foreground mt-6">
              Already in?{" "}
              <Link href="/login">
                <span className="font-bold text-foreground underline underline-offset-4 decoration-[#7DD3FC] cursor-pointer hover:text-[#7DD3FC] transition-colors">
                  Sign in
                </span>
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
