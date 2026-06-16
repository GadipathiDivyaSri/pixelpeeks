import { useState, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, Mail, KeyRound, AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { useForgotPassword, useVerifyOtp, useSendOtp } from "@workspace/api-client-react";

type Stage = "email" | "otp";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendDone, setResendDone] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const forgotMutation = useForgotPassword({
    mutation: {
      onSuccess: (data) => {
        if (data.devOtp) setDevOtp(data.devOtp);
        setResendCooldown(60);
        setStage("otp");
        setError("");
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg ?? "Something went wrong. Please try again.");
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
        const countdown = setInterval(() => {
          setResendCooldown(c => { if (c <= 1) { clearInterval(countdown); return 0; } return c - 1; });
        }, 1000);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg ?? "Could not resend code.");
      },
    },
  });

  const verifyMutation = useVerifyOtp({
    mutation: {
      onSuccess: (data) => {
        if (data.resetToken) {
          setLocation(`/reset-password?token=${data.resetToken}`);
        }
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg ?? "Incorrect code. Please try again.");
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      },
    },
  });

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    forgotMutation.mutate({ data: { email } });
  }

  const submitOtp = useCallback((code: string) => {
    setError("");
    verifyMutation.mutate({ data: { email, otp: code, purpose: "forgot-password" } });
  }, [email]);

  const handleDigitInput = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    if (val.length > 1) {
      const pasted = val.replace(/\D/g, "").slice(0, 6);
      const newDigits = [...digits];
      pasted.split("").forEach((ch, i) => {
        if (idx + i < 6) newDigits[idx + i] = ch;
      });
      setDigits(newDigits);
      const next = Math.min(5, idx + pasted.length - 1);
      inputRefs.current[next]?.focus();
      if (newDigits.every(d => d !== "")) submitOtp(newDigits.join(""));
      return;
    }
    const newDigits = [...digits];
    newDigits[idx] = val;
    setDigits(newDigits);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (newDigits.every(d => d !== "")) submitOtp(newDigits.join(""));
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newDigits = pasted.padEnd(6, "").split("").slice(0, 6);
    setDigits(newDigits);
    inputRefs.current[Math.min(5, pasted.length - 1)]?.focus();
    if (newDigits.every(d => d !== "")) submitOtp(newDigits.join(""));
  };

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
          key={stage}
          className="w-full max-w-md"
        >
          <div className="bg-card rounded-[2rem] border-2 border-border shadow-[10px_10px_0_0_hsl(var(--border))] p-8">
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                <KeyRound className="w-6 h-6 text-[#A78BFA]" />
              </motion.div>
              <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                {stage === "email" ? "Reset password" : "Enter code"}
              </h1>
            </div>
            <p className="text-muted-foreground font-medium mb-8 text-sm">
              {stage === "email"
                ? "Enter your email and we'll send a verification code"
                : `We sent a 6-digit code to ${email}`}
            </p>

            {error && (
              <div className="mb-6 bg-destructive/10 border-2 border-destructive rounded-xl px-4 py-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                <span className="text-destructive font-bold text-sm">{error}</span>
              </div>
            )}

            {stage === "email" ? (
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-sm text-foreground">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-border shadow-[3px_3px_0_0_hsl(var(--border))] focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] outline-none font-medium text-sm transition-all bg-background text-foreground"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotMutation.isPending}
                  className="w-full py-3.5 rounded-full border-2 border-border bg-[#A78BFA] text-white font-black text-base shadow-[4px_4px_0_0_hsl(var(--border))] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {forgotMutation.isPending ? "Sending code…" : "Send verification code →"}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Dev mode hint */}
                {devOtp && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 rounded-xl px-4 py-3">
                    <div className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1">⚠️ Dev Mode — code shown here</div>
                    <div className="text-2xl font-black font-mono tracking-widest text-amber-800 dark:text-amber-200">{devOtp}</div>
                  </div>
                )}

                {/* OTP inputs */}
                <div className="flex gap-3 justify-center" onPaste={handlePaste}>
                  {digits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => { inputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={6}
                      value={digit}
                      onChange={e => handleDigitInput(idx, e.target.value)}
                      onKeyDown={e => handleKeyDown(idx, e)}
                      disabled={verifyMutation.isPending}
                      className={`w-12 h-14 text-center text-2xl font-black rounded-xl border-2 outline-none transition-all bg-background text-foreground ${
                        digit
                          ? "border-[#A78BFA] shadow-[0_0_0_3px_rgba(167,139,250,0.2)]"
                          : "border-border shadow-[3px_3px_0_0_hsl(var(--border))] focus:border-[#A78BFA]"
                      } disabled:opacity-50`}
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>

                {verifyMutation.isPending && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-medium">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-4 h-4 border-2 border-[#A78BFA] border-t-transparent rounded-full"
                    />
                    Verifying…
                  </div>
                )}

                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (resendCooldown > 0) return;
                      resendMutation.mutate({ data: { email, purpose: "forgot-password" } });
                    }}
                    disabled={resendCooldown > 0 || resendMutation.isPending}
                    className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${resendMutation.isPending ? "animate-spin" : ""}`} />
                    {resendDone ? "✓ Code resent!" : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStage("email"); setDigits(["","","","","",""]); setError(""); }}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" /> Change email
                  </button>
                </div>
              </div>
            )}

            <p className="text-center text-sm font-medium text-muted-foreground mt-6">
              Remember it?{" "}
              <Link href="/login">
                <span className="font-bold text-foreground underline underline-offset-4 decoration-[#FF6B6B] cursor-pointer hover:text-[#FF6B6B] transition-colors">
                  Back to sign in
                </span>
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
