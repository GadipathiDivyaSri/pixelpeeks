import { Link, useLocation } from "wouter";
import { Eye, FileLock, Search, Clock, Menu, X, Home, LogOut, ChevronRight, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/auth";

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("pp-theme") === "dark"; } catch { return false; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add("dark"); } else { root.classList.remove("dark"); }
    try { localStorage.setItem("pp-theme", dark ? "dark" : "light"); } catch {}
  }, [dark]);

  return [dark, setDark] as const;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const [dark, setDark] = useDarkMode();

  const navItems = [
    { href: "/dashboard", label: "Home", icon: Home, color: "bg-[hsl(270,60%,78%)]" },
    { href: "/encode", label: "Peek In", icon: FileLock, color: "bg-[hsl(330,80%,72%)]" },
    { href: "/decode", label: "Peek Out", icon: Eye, color: "bg-[hsl(200,80%,76%)]" },
    { href: "/peek", label: "Peek", icon: Search, color: "bg-[hsl(50,95%,75%)]" },
    { href: "/history", label: "History", icon: Clock, color: "bg-[hsl(142,60%,72%)]" },
  ];

  const isActive = (href: string) => location === href;

  return (
    <div className="min-h-screen bg-background flex">
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

      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed top-0 left-0 h-full w-68 bg-[#F3EEFF] dark:bg-sidebar border-r-2 border-border z-50 flex flex-col p-6 gap-6 shadow-[8px_0_0_0_hsl(var(--border))]"
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [-5, 5, -5] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  >
                    <Eye className="w-7 h-7 text-primary" />
                  </motion.div>
                  <span className="font-black text-xl text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                    PixelPeek
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold tracking-widest text-foreground/50 uppercase pl-9">
                  hide · seek · peek
                </span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg border-2 border-border bg-card shadow-[2px_2px_0_0_hsl(var(--border))] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex flex-col gap-2 flex-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div
                    data-testid={`nav-${item.label.toLowerCase()}`}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-full border-2 border-border font-bold cursor-pointer transition-all text-sm text-foreground ${
                      isActive(item.href)
                        ? `${item.color} shadow-[4px_4px_0_0_hsl(var(--border))] translate-x-0 translate-y-0`
                        : `${item.color} opacity-50 shadow-[3px_3px_0_0_hsl(var(--border))] hover:opacity-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_hsl(var(--border))]`
                    }`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                  </div>
                </Link>
              ))}
            </nav>

            <div className="flex flex-col gap-3 pt-4 border-t-2 border-border/30">
              {user && (
                <div className="bg-[#D1FAE5] dark:bg-muted border-2 border-border shadow-[2px_2px_0_0_hsl(var(--border))] px-4 py-2.5 rounded-xl">
                  <p className="font-black text-xs text-foreground truncate">{user.name}</p>
                  <p className="font-mono text-[10px] text-foreground/60 truncate">{user.email}</p>
                </div>
              )}

              <button
                onClick={() => setDark(!dark)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-border bg-[#FEF9C3] dark:bg-muted text-foreground font-bold text-sm shadow-[3px_3px_0_0_hsl(var(--border))] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_hsl(var(--border))] transition-all"
              >
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {dark ? "Light Mode" : "Dark Mode"}
              </button>

              <button
                data-testid="button-logout"
                onClick={() => { logout(); setSidebarOpen(false); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-border bg-[#FB7185] text-white font-bold text-sm shadow-[3px_3px_0_0_hsl(var(--border))] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_hsl(var(--border))] transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-background border-b-2 border-border px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              data-testid="button-toggle-sidebar"
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-border bg-muted font-bold text-sm shadow-[3px_3px_0_0_hsl(var(--border))] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_hsl(var(--border))] transition-all"
            >
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">Menu</span>
              <ChevronRight className="w-3 h-3" />
            </button>

            <div className="flex items-center gap-2 text-sm font-medium text-foreground/50">
              <Eye className="w-4 h-4 text-primary" />
              <span className="font-black text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>PixelPeek</span>
              <span>/</span>
              <span className="capitalize">{location.replace("/", "") || "home"}</span>
            </div>
          </div>

          <button
            onClick={() => setDark(!dark)}
            className="p-2 rounded-full border-2 border-border bg-card shadow-[3px_3px_0_0_hsl(var(--border))] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
