import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, ShieldCheck, Check } from "lucide-react";
import { useResetPassword } from "@workspace/api-client-react";

function useSearchParam(name: string): string {
  return new URLSearchParams(window.location.search).get(name) ?? "";
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  const clamped = Math.min(4, score);
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "bg-[#FF6B6B]", "bg-amber-400", "bg-amber-400", "bg-[#4ADE80]"];
  return { score: clamped, label: labels[clamped] ?? "", color: colors[clamped] ?? "" };
}

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const token = useSearchParam("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const strength = getPasswordStrength(password);

  const mutation = useResetPassword({
    mutation: {
      onSuccess: () => {
        setDone(true);
        setTimeout(() => setLocation("/login"), 2500);
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
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    mutation.mutate({ data: { token, password } });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b-2 border-border px-6 py-3 flex items-center gap-2 bg-background">
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
            {done ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="w-16 h-16 bg-[#4ADE80] rounded-2xl border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] flex items-center justify-center"
                >
                  <ShieldCheck className="w-8 h-8 text-white" />
                </motion.div>
                <h1 className="text-2xl font-black text-foreground text-center" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Password updated!
                </h1>
                <p className="text-muted-foreground font-medium text-sm text-center">
                  Redirecting you to sign in…
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Lock className="w-6 h-6 text-[#4ADE80]" />
                  </motion.div>
                  <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                    New password
                  </h1>
                </div>
                <p className="text-muted-foreground font-medium mb-8 text-sm">
                  Choose a strong password for your account
                </p>

                {!token && (
                  <div className="mb-6 bg-destructive/10 border-2 border-destructive rounded-xl px-4 py-3 text-destructive font-bold text-sm">
                    Invalid reset link. Please request a new one.
                  </div>
                )}

                {error && (
                  <div className="mb-6 bg-destructive/10 border-2 border-destructive rounded-xl px-4 py-3 text-destructive font-bold text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-sm text-foreground">New password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
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
                            <div
                              key={n}
                              className={`flex-1 rounded-full transition-all duration-300 ${n <= strength.score ? strength.color : "bg-muted"}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-sm text-foreground">Confirm password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Repeat your password"
                        required
                        className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-border shadow-[3px_3px_0_0_hsl(var(--border))] focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] outline-none font-medium text-sm transition-all bg-background text-foreground"
                      />
                      {confirm.length > 0 && (
                        <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${confirm === password ? "text-[#4ADE80]" : "text-[#FF6B6B]"}`}>
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={mutation.isPending || !token}
                    className="w-full py-3.5 rounded-full border-2 border-border bg-[#4ADE80] text-foreground font-black text-base shadow-[4px_4px_0_0_hsl(var(--border))] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {mutation.isPending ? "Updating…" : "Set new password →"}
                  </button>
                </form>

                <p className="text-center text-sm font-medium text-muted-foreground mt-6">
                  <Link href="/forgot-password">
                    <span className="font-bold text-foreground underline underline-offset-4 decoration-[#A78BFA] cursor-pointer hover:text-[#A78BFA] transition-colors">
                      Request a new code
                    </span>
                  </Link>
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
