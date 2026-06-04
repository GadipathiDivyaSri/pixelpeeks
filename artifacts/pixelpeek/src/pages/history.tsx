import { useGetStats, useListEvents } from "@workspace/api-client-react";
import { RefreshCw, Lock, Unlock, Search, CheckCircle, AlertTriangle, Bug } from "lucide-react";
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

  const getVerdictColor = (verdict?: string | null) => {
    if (!verdict) return "bg-muted text-muted-foreground";
    switch (verdict) {
      case 'STEGO': return "bg-chart-1 text-white border-chart-1";
      case 'SUSPECT': return "bg-chart-2 text-foreground border-chart-2";
      case 'CLEAN': return "bg-chart-3 text-foreground border-chart-3";
      default: return "bg-muted text-foreground border-muted";
    }
  };

  const getOpIcon = (op: string) => {
    switch(op) {
      case 'encode': return <Lock className="w-5 h-5" />;
      case 'decode': return <Unlock className="w-5 h-5" />;
      case 'detect': return <Search className="w-5 h-5" />;
      default: return <CheckCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="flex flex-col gap-12 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black mb-2">History</h1>
          <p className="text-xl font-medium text-muted-foreground">Your recent steganography operations.</p>
        </div>
        <button 
          data-testid="button-refresh"
          onClick={handleRefresh}
          className="flex items-center gap-2 bg-white px-6 py-3 rounded-full border-2 border-border shadow-[4px_4px_0_0_#0F172A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold"
        >
          <RefreshCw className={`w-5 h-5 ${statsPending || eventsPending ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: "Total Ops", val: stats?.totalOps || 0, color: "bg-chart-2" },
          { label: "Encodes", val: stats?.encodes || 0, color: "bg-chart-1 text-white" },
          { label: "Peeks", val: stats?.peeks || 0, color: "bg-chart-4" },
          { label: "Stego Hits", val: stats?.stegoHits || 0, color: "bg-chart-5" },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-6 rounded-2xl border-4 border-border shadow-[6px_6px_0_0_#0F172A] flex flex-col gap-2 ${stat.color}`}
          >
            <span className="text-sm md:text-base font-bold uppercase tracking-wider opacity-90">{stat.label}</span>
            <span className="text-4xl md:text-5xl font-black">{stat.val}</span>
          </motion.div>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border-4 border-border shadow-[8px_8px_0_0_#0F172A] flex flex-col gap-6">
        <h2 className="text-2xl font-black border-b-2 border-border pb-4">Recent Activity</h2>

        {events && events.length > 0 ? (
          <div className="flex flex-col gap-4">
            {events.map((event, i) => (
              <motion.div 
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 rounded-xl border-2 border-border bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-[200px]">
                  <div className="p-3 bg-white rounded-xl border-2 border-border shadow-[2px_2px_0_0_#0F172A]">
                    {getOpIcon(event.operation)}
                  </div>
                  <div>
                    <div className="font-bold uppercase tracking-wider">{event.operation}</div>
                    <div className="text-xs text-muted-foreground font-mono">{format(new Date(event.createdAt), "MMM d, HH:mm")}</div>
                  </div>
                </div>

                <div className="flex-1 font-mono text-sm break-all font-bold opacity-80">
                  {event.filename}
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-white rounded-full border border-border text-xs font-bold uppercase">
                    {event.carrier}
                  </span>
                  {event.verdict && (
                    <span className={`px-3 py-1 rounded-full border-2 text-xs font-bold uppercase ${getVerdictColor(event.verdict)}`}>
                      {event.verdict}
                    </span>
                  )}
                  {event.failed && (
                    <span className="px-3 py-1 bg-chart-1 text-white rounded-full border-2 border-border text-xs font-bold uppercase flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Failed
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-6">
            <div className="w-24 h-24 bg-muted rounded-full border-4 border-border shadow-[4px_4px_0_0_#0F172A] flex items-center justify-center">
              <Clock className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-2xl font-black mb-2">No history yet</h3>
              <p className="text-muted-foreground font-medium max-w-sm mx-auto">Start hiding or peeking to build up your history.</p>
            </div>
            <div className="flex gap-4">
              <Link href="/encode">
                <button className="bg-chart-2 px-6 py-3 rounded-full border-2 border-border shadow-[4px_4px_0_0_#0F172A] font-bold hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                  Encode
                </button>
              </Link>
              <Link href="/peek">
                <button className="bg-chart-4 px-6 py-3 rounded-full border-2 border-border shadow-[4px_4px_0_0_#0F172A] font-bold hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                  Peek
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Just adding Clock since it was missing from imports
import { Clock } from "lucide-react";
