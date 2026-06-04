import { Link, useLocation } from "wouter";
import { Eye, FileLock, Search, Clock, Menu, Shield } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Home", icon: Shield },
    { href: "/encode", label: "Encode", icon: FileLock },
    { href: "/decode", label: "Decode", icon: Eye },
    { href: "/peek", label: "Peek", icon: Search },
    { href: "/history", label: "History", icon: Clock },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background w-full">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b-2 border-border bg-sidebar z-50 relative">
        <div className="flex items-center gap-2 font-display font-bold text-xl">
          <Eye className="w-6 h-6" /> PixelPeek
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 border-2 border-border rounded-xl bg-white shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div 
        className={`fixed md:sticky top-0 left-0 h-[100dvh] w-64 bg-sidebar border-r-2 border-border p-6 flex flex-col gap-8 z-50 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-display font-bold text-2xl">
            <motion.div
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <Eye className="w-8 h-8 text-primary" />
            </motion.div>
            PixelPeek
          </div>
          <div className="font-mono text-xs text-muted-foreground font-bold tracking-widest uppercase">
            hide · seek · peek
          </div>
        </div>

        <nav className="flex flex-col gap-3 flex-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div 
                data-testid={`link-nav-${item.label.toLowerCase()}`}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-full border-2 border-border font-bold transition-all cursor-pointer ${
                  location === item.href 
                    ? "bg-primary text-white shadow-[4px_4px_0_0_#0F172A] translate-x-[-2px] translate-y-[-2px]" 
                    : "bg-white shadow-[3px_3px_0_0_#0F172A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_#0F172A]"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </div>
            </Link>
          ))}
        </nav>
      </motion.div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[100vw] overflow-x-hidden min-h-[100dvh]">
        <div className="p-4 md:p-8 w-full max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
