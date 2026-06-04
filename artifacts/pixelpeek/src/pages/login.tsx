import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/context/auth";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user);
        setLocation("/dashboard");
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
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col">
      {/* Nav */}
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
          {/* Card */}
          <div className="bg-white rounded-[2rem] border-2 border-[#0F172A] shadow-[10px_10px_0_0_#0F172A] p-8">
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Sparkles className="w-6 h-6 text-[#FF6B6B]" />
              </motion.div>
              <h1 className="text-3xl font-black text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Welcome back
              </h1>
            </div>
            <p className="text-[#0F172A]/60 font-medium mb-8 text-sm">
              Sign in to your PixelPeek account
            </p>

            {error && (
              <div data-testid="login-error" className="mb-6 bg-[#FF6B6B]/10 border-2 border-[#FF6B6B] rounded-xl px-4 py-3 text-[#FF6B6B] font-bold text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-sm text-[#0F172A]">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0F172A]/40" />
                  <input
                    data-testid="input-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] outline-none font-medium text-sm transition-all bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-sm text-[#0F172A]">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0F172A]/40" />
                  <input
                    data-testid="input-password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-10 py-3 rounded-xl border-2 border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] outline-none font-medium text-sm transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0F172A]/40 hover:text-[#0F172A] transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                data-testid="button-login"
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full py-3.5 rounded-full border-2 border-[#0F172A] bg-[#FF6B6B] text-white font-black text-base shadow-[4px_4px_0_0_#0F172A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loginMutation.isPending ? "Signing in…" : "Sign in →"}
              </button>

              <button
                data-testid="button-demo"
                type="button"
                onClick={fillDemo}
                className="w-full py-3 rounded-full border-2 border-[#0F172A] bg-[#FDE047] text-[#0F172A] font-bold text-sm shadow-[3px_3px_0_0_#0F172A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              >
                Use demo credentials
              </button>
            </form>

            <p className="text-center text-sm font-medium text-[#0F172A]/60 mt-6">
              New here?{" "}
              <Link href="/register">
                <span className="font-bold text-[#0F172A] underline underline-offset-4 decoration-[#FF6B6B] cursor-pointer hover:text-[#FF6B6B] transition-colors">
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
