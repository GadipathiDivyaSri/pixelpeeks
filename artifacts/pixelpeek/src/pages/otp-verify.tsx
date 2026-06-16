import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, ShieldCheck, RefreshCw, AlertCircle, ArrowLeft } from "lucide-react";
import { useVerifyOtp, useSendOtp } from "@workspace/api-client-react";
import { useAuth } from "@/context/auth";

function Logo() {
  return (
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
  );
}

export default function OtpVerify() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();

  const params = new URLSearchParams(window.location.search);
  const purpose = (params.get("purpose") ?? "login") as "login" | "forgot-password";
  const emailParam = params.get("email") ?? "";

  const pendingToken = sessionStorage.getItem("otp_pending_token") ?? "";
  const devOtp = sessionStorage.getItem("otp_dev_code") ?? "";
  const email = emailParam || (sessionStorage.getItem("otp_email") ?? "");

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendDone, setResendDone] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      setLocation(purpose === "forgot-password" ? "/forgot-password" : "/login");
    }
  }, [email, purpose]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const verifyMutation = useVerifyOtp({
    mutation: {
      onSuccess: (data) => {
        sessionStorage.removeItem("otp_pending_token");
        sessionStorage.removeItem("otp_dev_code");
        sessionStorage.removeItem("otp_email");

        if (purpose === "login" && data.token && data.user) {
          login(data.token, data.user as any);
          setLocation("/dashboard");
        } else if (purpose === "forgot-password" && data.resetToken) {
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

  const resendMutation = useSendOtp({
    mutation: {
      onSuccess: (data) => {
        setResendDone(true);
        setResendCooldown(60);
        if (data.devOtp) sessionStorage.setItem("otp_dev_code", data.devOtp);
        setTimeout(() => setResendDone(false), 3000);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg ?? "Could not resend OTP. Please try again later.");
      },
    },
  });

  const submitOtp = useCallback((code: string) => {
    setError("");
    verifyMutation.mutate({
      data: {
        email,
        otp: code,
        purpose,
        ...(pendingToken ? { pendingToken } : {}),
      },
    });
  }, [email, purpose, pendingToken]);

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
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newDigits = pasted.padEnd(6, "").split("").slice(0, 6);
    setDigits(newDigits);
    const lastFilledIdx = Math.min(5, pasted.length - 1);
    inputRefs.current[lastFilledIdx]?.focus();
    if (newDigits.every(d => d !== "")) submitOtp(newDigits.join(""));
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    resendMutation.mutate({ data: { email, purpose } });
    setResendCooldown(60);
  };

  const currentDevOtp = devOtp || sessionStorage.getItem("otp_dev_code") || "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Logo />

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card rounded-[2rem] border-2 border-border shadow-[10px_10px_0_0_hsl(var(--border))] p-8">
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                <ShieldCheck className="w-6 h-6 text-[#4ADE80]" />
              </motion.div>
              <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                {purpose === "forgot-password" ? "Reset code" : "Two-factor auth"}
              </h1>
            </div>
            <p className="text-muted-foreground font-medium mb-2 text-sm">
              Enter the 6-digit code sent to{" "}
              <span className="font-black text-foreground">{email}</span>
            </p>
            {purpose === "login" && (
              <p className="text-muted-foreground/70 font-medium mb-8 text-xs">
                This code expires in 5 minutes.
              </p>
            )}

            {/* Dev mode OTP hint */}
            {currentDevOtp && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 rounded-xl px-4 py-3"
              >
                <div className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1">⚠️ Dev Mode — No SMTP configured</div>
                <div className="text-2xl font-black font-mono tracking-widest text-amber-800 dark:text-amber-200">{currentDevOtp}</div>
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">Copy this code above ↑</div>
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

            {/* OTP digit inputs */}
            <div className="flex gap-3 justify-center mb-8" onPaste={handlePaste}>
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
                      ? "border-[#4ADE80] shadow-[0_0_0_3px_rgba(74,222,128,0.2)]"
                      : "border-border shadow-[3px_3px_0_0_hsl(var(--border))] focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.2)]"
                  } disabled:opacity-50`}
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            {verifyMutation.isPending && (
              <div className="flex items-center justify-center gap-2 mb-6 text-sm text-muted-foreground font-medium">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
                />
                Verifying…
              </div>
            )}

            {/* Resend */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || resendMutation.isPending}
                className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${resendMutation.isPending ? "animate-spin" : ""}`} />
                {resendDone ? "✓ Code resent!" : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
              </button>

              <Link href={purpose === "forgot-password" ? "/forgot-password" : "/login"}>
                <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-3 h-3" />
                  {purpose === "forgot-password" ? "Back to forgot password" : "Back to login"}
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
