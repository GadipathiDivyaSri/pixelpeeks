import { useGetStats, useListEvents } from "@workspace/api-client-react";
import { RefreshCw, Lock, Unlock, Search, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function History() {
  const { data: stats, refetch: refetchStats, isPending: statsPending } = useGetStats();
  const { data: events, refetch: refetchEvents, isPending: eventsPending } = useListEvents();

  const handleRefresh = () => {
    refetchStats();
    refetchEvents();
  };

  const getVerdictStyle = (verdict?: string | null) => {
    if (!verdict) return "bg-muted text-muted-foreground border-border";
    switch (verdict) {
      case "STEGO":     return "bg-destructive text-white border-destructive";
      case "SUSPECT":   return "bg-[hsl(var(--chart-2))] text-foreground border-[hsl(var(--chart-2))]";
      case "CLEAN":     return "bg-[hsl(var(--chart-3))] text-foreground border-[hsl(var(--chart-3))]";
      case "PIXELPEEK": return "bg-[hsl(var(--chart-4))] text-foreground border-[hsl(var(--chart-4))]";
      default:          return "bg-muted text-foreground border-muted";
    }
  };

  const getOpDetails = (op: string) => {
    switch (op) {
      case "encode": return { icon: Lock, emoji: "🔐", color: "bg-[hsl(var(--chart-1))]", label: "Peek In" };
      case "decode": return { icon: Unlock, emoji: "🕵", color: "bg-[hsl(var(--chart-4))]", label: "Peek Out" };
      case "detect": return { icon: Search, emoji: "🔍", color: "bg-[hsl(var(--chart-2))]", label: "Peek" };
      default:       return { icon: CheckCircle, emoji: "✓", color: "bg-muted", label: op };
    }
  };

  return (
    <div className="flex flex-col gap-10 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
            📜 History
          </h1>
          <p className="text-xl font-medium text-muted-foreground">Your recent steganography operations.</p>
        </div>
        <button
          data-testid="button-refresh"
          onClick={handleRefresh}
          className="flex items-center gap-2 bg-card px-6 py-3 rounded-full border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold text-foreground"
        >
          <RefreshCw className={`w-5 h-5 ${statsPending || eventsPending ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        {[
          { emoji: "🔢", label: "Total Ops", val: stats?.totalOps ?? 0, color: "bg-[hsl(var(--chart-5))]" },
          { emoji: "🔐", label: "Peek In", val: stats?.encodes ?? 0, color: "bg-[hsl(var(--chart-1))]" },
          { emoji: "🔍", label: "Peeks", val: stats?.peeks ?? 0, color: "bg-[hsl(var(--chart-2))]" },
          { emoji: "🎯", label: "Stego Hits", val: stats?.stegoHits ?? 0, color: "bg-[hsl(var(--chart-3))]" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-6 rounded-2xl border-4 border-border shadow-[6px_6px_0_0_hsl(var(--border))] flex flex-col gap-2 ${stat.color}`}
          >
            <span className="text-2xl">{stat.emoji}</span>
            <span className="text-4xl md:text-5xl font-black text-foreground">{stat.val}</span>
            <span className="text-xs font-bold uppercase tracking-wider text-foreground/70">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-card p-6 md:p-8 rounded-[2rem] border-4 border-border shadow-[8px_8px_0_0_hsl(var(--border))] flex flex-col gap-6">
        <h2 className="text-2xl font-black border-b-2 border-border pb-4 text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
          Recent Activity
        </h2>

        {events && events.length > 0 ? (
          <div className="flex flex-col gap-3">
            {events.map((event, i) => {
              const details = getOpDetails(event.operation);
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 rounded-xl border-2 border-border bg-background hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className={`p-3 ${details.color} rounded-xl border-2 border-border shadow-[2px_2px_0_0_hsl(var(--border))] text-lg`}>
                      {details.emoji}
                    </div>
                    <div>
                      <div className="font-black uppercase tracking-wider text-foreground text-sm">{details.label}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {format(new Date(event.createdAt), "MMM d, HH:mm")}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 font-mono text-sm break-all font-bold text-foreground/70 min-w-0">
                    {event.filename}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                    <span className="px-3 py-1 bg-card rounded-full border border-border text-xs font-bold uppercase text-foreground">
                      {event.carrier}
                    </span>
                    {event.verdict && (
                      <span className={`px-3 py-1 rounded-full border-2 text-xs font-bold uppercase ${getVerdictStyle(event.verdict)}`}>
                        {event.verdict}
                      </span>
                    )}
                    {event.failed && (
                      <span className="px-3 py-1 bg-destructive text-white rounded-full border-2 border-border text-xs font-bold uppercase flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Failed
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-6">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="text-6xl"
            >
              🕵
            </motion.div>
            <div>
              <h3 className="text-2xl font-black mb-2 text-foreground">No history yet</h3>
              <p className="text-muted-foreground font-medium max-w-sm mx-auto">
                Start hiding or peeking to build up your history.
              </p>
            </div>
            <div className="flex gap-4">
              <Link href="/encode">
                <button className="bg-[hsl(var(--chart-1))] px-6 py-3 rounded-full border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] font-bold hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all text-foreground">
                  🔐 Peek In
                </button>
              </Link>
              <Link href="/peek">
                <button className="bg-[hsl(var(--chart-2))] px-6 py-3 rounded-full border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] font-bold hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all text-foreground">
                  🔍 Peek
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
