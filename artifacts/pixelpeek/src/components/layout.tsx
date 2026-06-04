import { Link, useLocation } from "wouter";
import { Eye, FileLock, Search, Clock, Menu, X, Home, LogOut, ChevronRight } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/auth";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/encode", label: "Encode", icon: FileLock },
    { href: "/decode", label: "Decode", icon: Eye },
    { href: "/peek", label: "Peek", icon: Search },
    { href: "/history", label: "History", icon: Clock },
  ];

  const isActive = (href: string) => location === href;

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex">
      {/* ── Backdrop ─────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-40"
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar drawer ───────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed top-0 left-0 h-full w-64 bg-[#FEF08A] border-r-2 border-[#0F172A] z-50 flex flex-col p-6 gap-6 shadow-[8px_0_0_0_#0F172A]"
          >
            {/* Logo + close */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [-5, 5, -5] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  >
                    <Eye className="w-7 h-7 text-[#FF6B6B]" />
                  </motion.div>
                  <span className="font-black text-xl text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    PixelPeek
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold tracking-widest text-[#0F172A]/50 uppercase pl-9">
                  hide · seek · peek
                </span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg border-2 border-[#0F172A] bg-white shadow-[2px_2px_0_0_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-2 flex-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div
                    data-testid={`nav-${item.label.toLowerCase()}`}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-full border-2 border-[#0F172A] font-bold cursor-pointer transition-all text-sm ${
                      isActive(item.href)
                        ? "bg-[#FF6B6B] text-white shadow-[4px_4px_0_0_#0F172A]"
                        : "bg-white text-[#0F172A] shadow-[3px_3px_0_0_#0F172A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_#0F172A]"
                    }`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                  </div>
                </Link>
              ))}
            </nav>

            {/* User + Logout */}
            <div className="flex flex-col gap-3 pt-4 border-t-2 border-[#0F172A]/20">
              {user && (
                <div className="bg-[#FDE047] px-4 py-2.5 rounded-xl border-2 border-[#0F172A] shadow-[2px_2px_0_0_#0F172A]">
                  <p className="font-black text-xs text-[#0F172A] truncate">{user.name}</p>
                  <p className="font-mono text-[10px] text-[#0F172A]/60 truncate">{user.email}</p>
                </div>
              )}
              <button
                data-testid="button-logout"
                onClick={() => { logout(); setSidebarOpen(false); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-[#0F172A] bg-[#F9A8D4] font-bold text-sm shadow-[3px_3px_0_0_#0F172A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_#0F172A] transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main area ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#FDFBF7] border-b-2 border-[#0F172A] px-4 py-3 flex items-center gap-4">
          <button
            data-testid="button-toggle-sidebar"
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#0F172A] bg-[#FEF08A] font-bold text-sm shadow-[3px_3px_0_0_#0F172A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_#0F172A] transition-all"
          >
            <Menu className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
            <ChevronRight className="w-3 h-3" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm font-medium text-[#0F172A]/50">
            <Eye className="w-4 h-4 text-[#FF6B6B]" />
            <span className="font-black text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>PixelPeek</span>
            <span>/</span>
            <span className="capitalize">{location.replace("/", "") || "home"}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
