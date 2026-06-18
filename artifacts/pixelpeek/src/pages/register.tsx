import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, User, Star, Check, ArrowLeft, RotateCcw } from "lucide-react";
import { useRegister, useVerifyOtp, useSendOtp } from "@workspace/api-client-react";
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
  { label: "At least 6 characters",           test: (pw: string) => pw.length >= 6 },
  { label: "Contains a number",               test: (pw: string) => /[0-9]/.test(pw) },
  { label: "Contains uppercase + lowercase",  test: (pw: string) => /[A-Z]/.test(pw) && /[a-z]/.test(pw) },
  { label: "Contains a special character",    test: (pw: string) => /[^a-zA-Z0-9]/.test(pw) },
];

const OTP_LENGTH = 6;

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();

  // Step 1 fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Step 2 OTP fields
  const [step, setStep] = useState<1 | 2>(1);
  const [pendingToken, setPendingToken] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [error, setError] = useState("");
  const strength = getPasswordStrength(password);

  // Countdown timer for OTP
  useEffect(() => {
    if (step !== 2) return;
    setTimer(60);
    setCanResend(false);
    const id = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(id);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  const registerMutation = useRegister({
    mutation: {
      onSuccess: (data) => {
        if (data.requiresOtp) {
          setPendingToken(data.pendingToken);
          setStep(2);
          setError("");
        }
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg ?? "Something went wrong. Please try again.");
      },
    },
  });

  const verifyOtpMutation = useVerifyOtp({
    mutation: {
      onSuccess: (data) => {
        if (data.token && data.user) {
          login(data.token, data.user as Parameters<typeof login>[1]);
          setLocation("/dashboard");
        }
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg ?? "Invalid verification code. Please try again.");
        setOtp(Array(OTP_LENGTH).fill(""));
        otpRefs.current[0]?.focus();
      },
    },
  });

  const sendOtpMutation = useSendOtp({
    mutation: {
      onSuccess: () => {
        setTimer(60);
        setCanResend(false);
        setError("");
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg ?? "Failed to resend code.");
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

  function handleOtpChange(idx: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < OTP_LENGTH - 1) otpRefs.current[idx + 1]?.focus();
    if (next.every(d => d !== "") && next.join("").length === OTP_LENGTH) {
      submitOtp(next.join(""));
    }
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...otp];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]!;
    setOtp(next);
    if (next.every(d => d !== "")) submitOtp(next.join(""));
    else otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  }

  function submitOtp(code: string) {
    setError("");
    verifyOtpMutation.mutate({
      data: { email, otp: code, purpose: "register", pendingToken },
    });
  }

  function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== OTP_LENGTH) return;
    submitOtp(code);
  }

  function handleResend() {
    if (!canResend) return;
    sendOtpMutation.mutate({ data: { email, purpose: "register" } });
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

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2].map(n => (
                <div key={n} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full border-2 border-border flex items-center justify-center text-xs font-black transition-all ${
                    n === step ? "bg-[#7DD3FC] text-foreground" : n < step ? "bg-[#4ADE80] text-white border-green-500" : "bg-muted text-muted-foreground"
                  }`}>
                    {n < step ? <Check className="w-3.5 h-3.5" /> : n}
                  </div>
                  {n < 2 && <div className={`flex-1 h-0.5 w-8 transition-all ${step > n ? "bg-[#4ADE80]" : "bg-muted"}`} />}
                </div>
              ))}
              <span className="ml-2 text-xs font-bold text-muted-foreground">
                {step === 1 ? "Create account" : "Verify email"}
              </span>
            </div>

            <AnimatePresence mode="wait">

              {/* ── Step 1: Registration form ─── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
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
                                className={`flex-1 rounded-full transition-all duration-300 ${n <= strength.score ? strength.color : "bg-muted"}`}
                              />
                            ))}
                          </div>
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
                </motion.div>
              )}

              {/* ── Step 2: OTP verification ─── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col gap-6"
                >
                  <div>
                    <h1 className="text-3xl font-black text-foreground mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Check your email
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm">
                      We sent a 6-digit code to{" "}
                      <span className="font-bold text-foreground">{email}</span>
                    </p>
                  </div>

                  {error && (
                    <div className="bg-destructive/10 border-2 border-destructive rounded-xl px-4 py-3 text-destructive font-bold text-sm">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleVerifySubmit} className="flex flex-col gap-6">
                    {/* 6-digit OTP input */}
                    <div className="flex flex-col gap-3">
                      <label className="font-bold text-sm text-foreground">Verification code</label>
                      <div className="flex gap-2 justify-center">
                        {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                          <input
                            key={i}
                            ref={el => { otpRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={otp[i] ?? ""}
                            onChange={e => handleOtpChange(i, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(i, e)}
                            onPaste={i === 0 ? handleOtpPaste : undefined}
                            disabled={verifyOtpMutation.isPending}
                            className={`w-11 h-14 text-center text-xl font-black rounded-xl border-2 border-border shadow-[3px_3px_0_0_hsl(var(--border))] focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] outline-none transition-all bg-background text-foreground disabled:opacity-50 ${
                              otp[i] ? "border-[#7DD3FC] bg-blue-50 dark:bg-blue-900/20" : ""
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={otp.join("").length !== OTP_LENGTH || verifyOtpMutation.isPending}
                      className="w-full py-3.5 rounded-full border-2 border-border bg-[#7DD3FC] text-foreground font-black text-base shadow-[4px_4px_0_0_hsl(var(--border))] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {verifyOtpMutation.isPending ? (
                        <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                          Verifying…
                        </motion.span>
                      ) : (
                        "Verify & create account →"
                      )}
                    </button>
                  </form>

                  {/* Resend / timer */}
                  <div className="flex items-center justify-center gap-3 text-sm">
                    {canResend ? (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={sendOtpMutation.isPending}
                        className="flex items-center gap-1.5 font-bold text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors disabled:opacity-60"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {sendOtpMutation.isPending ? "Sending…" : "Resend code"}
                      </button>
                    ) : (
                      <span className="text-muted-foreground font-medium">
                        Resend in <span className="font-black text-foreground">{timer}s</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => { setStep(1); setOtp(Array(OTP_LENGTH).fill("")); setError(""); }}
                    className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors self-start"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to form
                  </button>
                </motion.div>
              )}

            </AnimatePresence>

            {step === 1 && (
              <p className="text-center text-sm font-medium text-muted-foreground mt-6">
                Already in?{" "}
                <Link href="/login">
                  <span className="font-bold text-foreground underline underline-offset-4 decoration-[#7DD3FC] cursor-pointer hover:text-[#7DD3FC] transition-colors">
                    Sign in
                  </span>
                </Link>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
