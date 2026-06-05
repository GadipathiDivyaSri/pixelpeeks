import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Eye, Mail, KeyRound, Copy, Check } from "lucide-react";
import { useForgotPassword } from "@workspace/api-client-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [copied, setCopied] = useState(false);

  const mutation = useForgotPassword({
    mutation: {
      onSuccess: (data) => {
        if (data.resetToken) {
          setResetToken(data.resetToken);
        } else {
          setError("No account found with that email address.");
        }
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
    mutation.mutate({ data: { email } });
  }

  const resetUrl = `${window.location.origin}/reset-password?token=${resetToken}`;

  function copyLink() {
    navigator.clipboard.writeText(resetUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col">
      <nav className="border-b-2 border-[#0F172A] px-6 py-3 flex items-center gap-2">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 bg-[#FDE047] rounded-xl border-2 border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center">
              <Eye className="w-4 h-4 text-[#0F172A]" />
            </div>
            <span className="font-black text-lg text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>PixelPeek</span>
          </div>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-[2rem] border-2 border-[#0F172A] shadow-[10px_10px_0_0_#0F172A] p-8">
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                <KeyRound className="w-6 h-6 text-[#A78BFA]" />
              </motion.div>
              <h1 className="text-3xl font-black text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Reset password
              </h1>
            </div>
            <p className="text-[#0F172A]/60 font-medium mb-8 text-sm">
              Enter your email and we'll give you a reset link
            </p>

            {error && (
              <div className="mb-6 bg-[#FF6B6B]/10 border-2 border-[#FF6B6B] rounded-xl px-4 py-3 text-[#FF6B6B] font-bold text-sm">
                {error}
              </div>
            )}

            {resetToken ? (
              <div className="flex flex-col gap-4">
                <div className="bg-[#A78BFA]/10 border-2 border-[#A78BFA] rounded-xl px-4 py-4">
                  <p className="font-bold text-sm text-[#0F172A] mb-3">Your reset link is ready:</p>
                  <div className="bg-white border-2 border-[#0F172A] rounded-xl px-3 py-2 text-xs text-[#0F172A]/60 font-mono break-all mb-3">
                    {resetUrl}
                  </div>
                  <button
                    onClick={copyLink}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-[#0F172A] bg-[#A78BFA] text-white font-bold text-sm shadow-[3px_3px_0_0_#0F172A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy link"}
                  </button>
                </div>
                <Link href={`/reset-password?token=${resetToken}`}>
                  <button className="w-full py-3.5 rounded-full border-2 border-[#0F172A] bg-[#FF6B6B] text-white font-black text-base shadow-[4px_4px_0_0_#0F172A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                    Continue to reset →
                  </button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-sm text-[#0F172A]">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0F172A]/40" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] outline-none font-medium text-sm transition-all bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full py-3.5 rounded-full border-2 border-[#0F172A] bg-[#A78BFA] text-white font-black text-base shadow-[4px_4px_0_0_#0F172A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {mutation.isPending ? "Sending…" : "Get reset link →"}
                </button>
              </form>
            )}

            <p className="text-center text-sm font-medium text-[#0F172A]/60 mt-6">
              Remember it?{" "}
              <Link href="/login">
                <span className="font-bold text-[#0F172A] underline underline-offset-4 decoration-[#FF6B6B] cursor-pointer hover:text-[#FF6B6B] transition-colors">
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
