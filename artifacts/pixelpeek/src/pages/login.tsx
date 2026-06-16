import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, Sparkles, ShieldCheck, RefreshCw, AlertCircle, ArrowLeft } from "lucide-react";
import { useLogin, useVerifyOtp, useSendOtp } from "@workspace/api-client-react";
import { useAuth } from "@/context/auth";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();

  // Step 1: credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  // Step 2: OTP
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [pendingToken, setPendingToken] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendDone, setResendDone] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        if (data.requiresOtp) {
          setPendingToken(data.pendingToken ?? "");
          if (data.devOtp) setDevOtp(data.devOtp);
          setStep("otp");
          setResendCooldown(60);
          setError("");
        }
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg ?? "Invalid email or password.");
      },
    },
  });

  const verifyMutation = useVerifyOtp({
    mutation: {
      onSuccess: (data) => {
        if (data.token && data.user) {
          login(data.token, data.user as any);
          setLocation("/dashboard");
        }
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg ?? "Incorrect code. Please try again.");
        setDigits(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      },
    },
  });

  const resendMutation = useSendOtp({
    mutation: {
      onSuccess: (data) => {
        if (data.devOtp) setDevOtp(data.devOtp);
        setResendDone(true);
        setResendCooldown(60);
        setTimeout(() => setResendDone(false), 3000);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg ?? "Could not resend OTP. Please try again later.");
      },
    },
  });

  const submitOtp = useCallback(
    (code: string) => {
      setError("");
      verifyMutation.mutate({
        data: { email, otp: code, purpose: "login", ...(pendingToken ? { pendingToken } : {}) },
      });
    },
    [email, pendingToken],
  );

  const handleDigitInput = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    if (val.length > 1) {
      const pasted = val.replace(/\D/g, "").slice(0, 6);
      const next = [...digits];
      pasted.split("").forEach((ch, i) => { if (idx + i < 6) next[idx + i] = ch; });
      setDigits(next);
      inputRefs.current[Math.min(5, idx + pasted.length - 1)]?.focus();
      if (next.every((d) => d !== "")) submitOtp(next.join(""));
      return;
    }
    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (next.every((d) => d !== "")) submitOtp(next.join(""));
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowLeft" && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = pasted.padEnd(6, "").split("").slice(0, 6);
    setDigits(next);
    inputRefs.current[Math.min(5, pasted.length - 1)]?.focus();
    if (next.every((d) => d !== "")) submitOtp(next.join(""));
  };

  const handleResend = () => {
    if (resendCooldown > 0 || resendMutation.isPending) return;
    resendMutation.mutate({ data: { email, purpose: "login" } });
  };

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
        {step === "credentials" && (
          <button
            type="button"
            onClick={fillDemo}
            className="text-xs font-bold text-muted-foreground border border-border rounded-full px-3 py-1 hover:bg-muted transition-colors"
          >
            Fill demo ↗
          </button>
        )}
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="bg-card rounded-[2rem] border-2 border-border shadow-[10px_10px_0_0_hsl(var(--border))] p-8">

            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-6">
              <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border-2 transition-all ${
                step === "credentials" ? "bg-[#FF6B6B] text-white border-[#FF6B6B]" : "bg-muted text-muted-foreground border-border"
              }`}>
                <span>1</span> Credentials
              </div>
              <div className="flex-1 h-0.5 bg-border rounded" />
              <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border-2 transition-all ${
                step === "otp" ? "bg-[#4ADE80] text-white border-[#4ADE80]" : "bg-muted text-muted-foreground border-border"
              }`}>
                <ShieldCheck className="w-3 h-3" /> Verify
              </div>
            </div>

            <AnimatePresence mode="wait">
              {step === "credentials" ? (
                <motion.div key="credentials" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <motion.div animate={{ rotate: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 2 }}>
                      <Sparkles className="w-6 h-6 text-[#FF6B6B]" />
                    </motion.div>
                    <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>Welcome back</h1>
                  </div>
                  <p className="text-muted-foreground font-medium mb-8 text-sm">
                    Sign in — a 6-digit code will be sent to your email.
                  </p>

                  {error && (
                    <div data-testid="login-error" className="mb-6 bg-destructive/10 border-2 border-destructive rounded-xl px-4 py-3 text-destructive font-bold text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
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
                      {loginMutation.isPending ? "Sending code…" : "Continue →"}
                    </button>
                  </form>

                  <p className="text-center text-sm font-medium text-muted-foreground mt-6">
                    New here?{" "}
                    <Link href="/register">
                      <span className="font-bold text-foreground underline underline-offset-4 decoration-[#FF6B6B] cursor-pointer hover:text-[#FF6B6B] transition-colors">Make an account</span>
                    </Link>
                  </p>
                </motion.div>
              ) : (
                <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <ShieldCheck className="w-6 h-6 text-[#4ADE80]" />
                    </motion.div>
                    <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>Enter code</h1>
                  </div>
                  <p className="text-muted-foreground font-medium mb-1 text-sm">
                    We sent a 6-digit code to <span className="font-black text-foreground">{email}</span>
                  </p>
                  <p className="text-muted-foreground/70 text-xs mb-6">Expires in 5 minutes.</p>

                  {/* Dev mode OTP — shown when no SMTP is configured */}
                  {devOtp && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mb-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 rounded-2xl px-5 py-4"
                    >
                      <div className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-2">
                        ⚠️ Dev Mode — Email not configured
                      </div>
                      <div className="text-3xl font-black font-mono tracking-[0.3em] text-amber-800 dark:text-amber-200 mb-1">{devOtp}</div>
                      <div className="text-xs text-amber-600 dark:text-amber-400">
                        No SMTP set up — your code appears here instead of email.
                        <br />Set <code className="font-mono">SMTP_USER</code> &amp; <code className="font-mono">SMTP_PASS</code> env vars to enable email delivery.
                      </div>
                    </motion.div>
                  )}

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="mb-6 bg-destructive/10 border-2 border-destructive rounded-xl px-4 py-3 flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                      <span className="text-destructive font-bold text-sm">{error}</span>
                    </motion.div>
                  )}

                  {/* Digit inputs */}
                  <div className="flex gap-3 justify-center mb-8" onPaste={handlePaste}>
                    {digits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { inputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleDigitInput(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        disabled={verifyMutation.isPending}
                        autoFocus={idx === 0}
                        className={`w-12 h-14 text-center text-2xl font-black rounded-xl border-2 outline-none transition-all bg-background text-foreground ${
                          digit
                            ? "border-[#4ADE80] shadow-[0_0_0_3px_rgba(74,222,128,0.2)]"
                            : "border-border shadow-[3px_3px_0_0_hsl(var(--border))] focus:border-[#4ADE80] focus:shadow-[0_0_0_3px_rgba(74,222,128,0.2)]"
                        } disabled:opacity-50`}
                      />
                    ))}
                  </div>

                  {verifyMutation.isPending && (
                    <div className="flex items-center justify-center gap-2 mb-6 text-sm text-muted-foreground font-medium">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-4 h-4 border-2 border-[#4ADE80] border-t-transparent rounded-full"
                      />
                      Verifying…
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-3">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendCooldown > 0 || resendMutation.isPending}
                      className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${resendMutation.isPending ? "animate-spin" : ""}`} />
                      {resendDone
                        ? "✓ Code resent!"
                        : resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : "Resend code"}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setStep("credentials"); setDigits(["", "", "", "", "", ""]); setError(""); }}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="w-3 h-3" /> Change email
                    </button>
                  </div>

                  <p className="text-center text-xs font-medium text-muted-foreground mt-6">
                    Remember it?{" "}
                    <button
                      type="button"
                      onClick={() => { setStep("credentials"); setDigits(["", "", "", "", "", ""]); setError(""); }}
                      className="font-bold text-foreground underline underline-offset-4 decoration-[#FF6B6B] hover:text-[#FF6B6B] transition-colors"
                    >
                      Back to sign in
                    </button>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
