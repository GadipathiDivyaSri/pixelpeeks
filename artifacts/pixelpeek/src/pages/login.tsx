import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, Sparkles, ShieldCheck } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        if (data.requiresOtp) {
          sessionStorage.setItem("otp_email", email);
          if (data.pendingToken) sessionStorage.setItem("otp_pending_token", data.pendingToken);
          if (data.devOtp) sessionStorage.setItem("otp_dev_code", data.devOtp);
          setLocation(`/otp-verify?purpose=login&email=${encodeURIComponent(email)}`);
        }
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg ?? "Invalid email or password.");
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ data: { email, password } });
  }

  function fillDemo() {
    setEmail("demo@pixelpeek.app");
    setPassword("demo1234");
    setError("");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b-2 border-border px-6 py-3 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 bg-[#FDE047] rounded-xl border-2 border-border shadow-[2px_2px_0_0_hsl(var(--border))] flex items-center justify-center">
              <Eye className="w-4 h-4 text-foreground" />
            </div>
            <span className="font-black text-lg text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>PixelPeek</span>
          </div>
        </Link>
        <button
          type="button"
          onClick={fillDemo}
          className="text-xs font-bold text-muted-foreground border border-border rounded-full px-3 py-1 hover:bg-muted transition-colors"
        >
          Fill demo ↗
        </button>
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
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Sparkles className="w-6 h-6 text-[#FF6B6B]" />
              </motion.div>
              <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                Welcome back
              </h1>
            </div>
            <p className="text-muted-foreground font-medium mb-2 text-sm">
              Sign in to your PixelPeek account
            </p>
            <div className="flex items-center gap-1.5 mb-8">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4ADE80]" />
              <span className="text-xs font-medium text-muted-foreground">Protected with two-factor auth</span>
            </div>

            {error && (
              <div data-testid="login-error" className="mb-6 bg-destructive/10 border-2 border-destructive rounded-xl px-4 py-3 text-destructive font-bold text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                <div className="flex items-center justify-between">
                  <label className="font-bold text-sm text-foreground">Password</label>
                  <Link href="/forgot-password">
                    <span className="text-xs font-bold text-muted-foreground hover:text-[#FF6B6B] underline underline-offset-2 cursor-pointer transition-colors">
                      Forgot password?
                    </span>
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    data-testid="input-password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
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
              </div>

              <button
                data-testid="button-login"
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full py-3.5 rounded-full border-2 border-border bg-[#FF6B6B] text-white font-black text-base shadow-[4px_4px_0_0_hsl(var(--border))] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loginMutation.isPending ? "Checking credentials…" : "Sign in →"}
              </button>
            </form>

            <div className="mt-6 p-3 bg-muted/50 rounded-xl border border-border">
              <div className="text-xs font-bold text-foreground mb-1">🔐 How 2FA works</div>
              <p className="text-xs text-muted-foreground">After entering your password, a 6-digit code is emailed to you. Enter it on the next screen to complete sign-in.</p>
            </div>

            <p className="text-center text-sm font-medium text-muted-foreground mt-6">
              New here?{" "}
              <Link href="/register">
                <span className="font-bold text-foreground underline underline-offset-4 decoration-[#FF6B6B] cursor-pointer hover:text-[#FF6B6B] transition-colors">
                  Make an account
                </span>
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
