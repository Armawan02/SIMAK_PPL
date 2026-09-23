import React, { useState, useEffect } from "react";
import { fetchFirestoreStats, FirestoreStats } from "../lib/pplService";
import { Database, AlertCircle, RefreshCw, HelpCircle, X } from "lucide-react";

export const FirebaseStatusBadge: React.FC = () => {
  const [stats, setStats] = useState<FirestoreStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadStats = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchFirestoreStats();
      setStats(data);
    } catch {
      // Ignored
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-emerald-500/50 text-xs text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm group"
        title="Lihat status sinkronisasi data"
      >
        <span className="relative flex h-2 w-2">
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${stats?.connected ? "animate-ping bg-emerald-400" : "bg-rose-400"}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${stats?.connected ? "bg-emerald-500" : "bg-rose-500"}`}></span>
        </span>
        <Database className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
        <span className="font-medium hidden md:inline text-slate-300">Data:</span>
        <span className={`font-mono text-[11px] font-semibold ${stats?.connected ? "text-emerald-400" : "text-rose-400"}`}>
          {stats?.connected ? `${stats.groupCount} Kelompok` : "Tidak terhubung"}
        </span>
        <HelpCircle className="w-3 h-3 text-slate-500 group-hover:text-slate-300 ml-0.5" />
      </button>

      {/* Connection Info Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Status Sinkronisasi Data</h3>
                  <p className="text-xs text-slate-400">Informasi koneksi layanan SIMAK PPL</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Safe operational status */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Status layanan:</span>
                  <span className={`font-semibold ${stats?.connected ? "text-emerald-400" : "text-rose-400"}`}>
                    {stats?.connected ? "Terhubung" : "Tidak terhubung"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Kelompok tersedia:</span>
                  <span className="font-semibold text-slate-200">{stats?.groupCount ?? "..."}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Terakhir Diperiksa:</span>
                  <span className="text-slate-400">{stats?.lastChecked || "Baru saja"}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
                <p className="leading-relaxed">
                  Data tugas dan kelompok akan diperbarui otomatis saat layanan terhubung. Jika status terputus, coba refresh beberapa saat lagi.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={loadStats}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>{isRefreshing ? "Memeriksa..." : "Refresh Data Sekarang"}</span>
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
