import React, { useState, useEffect } from "react";
import { fetchFirestoreStats, FirestoreStats } from "../lib/pplService";
import { Database, CheckCircle2, AlertCircle, RefreshCw, HelpCircle, ExternalLink, X } from "lucide-react";

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
        title="Klik untuk melihat detail koneksi Google Cloud Firestore"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Database className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
        <span className="font-medium hidden md:inline text-slate-300">Firestore:</span>
        <span className="font-mono text-emerald-400 text-[11px] font-semibold">
          {stats ? `${stats.userCount} User • ${stats.groupCount} Kelompok` : "Terhubung"}
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
                  <h3 className="text-base font-bold text-slate-100">Status Google Cloud Firestore</h3>
                  <p className="text-xs text-slate-400">Pusat Data Realtime SIMAK PPL</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Database IDs */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Project ID:</span>
                  <span className="font-mono font-bold text-slate-200">sentinel-498418</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Database ID:</span>
                  <span className="font-mono font-bold text-amber-400 select-all bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20">
                    ai-studio-scriptfix-d56a26c7-384c-4750-b65d-614734d34386
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Koleksi Aktif:</span>
                  <span className="font-mono text-emerald-400">
                    /users ({stats?.userCount ?? "..."}), /groups ({stats?.groupCount ?? "..."})
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Terakhir Diperiksa:</span>
                  <span className="text-slate-400">{stats?.lastChecked || "Baru saja"}</span>
                </div>
              </div>

              {/* Crucial guidance for user looking at Firebase Console */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Mengapa Data Belum Muncul di Firebase Console Anda?</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Firebase secara default menampilkan database bernama <strong className="text-white">"(default)"</strong>.
                  Karena sistem ini terhubung ke database bernama:
                </p>
                <div className="p-2 rounded-lg bg-slate-950/80 font-mono text-[11px] text-amber-300 border border-amber-500/20 select-all">
                  ai-studio-scriptfix-d56a26c7-384c-4750-b65d-614734d34386
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Silakan buka <strong className="text-white">Cloud Firestore</strong> di Firebase Console, lalu pada bagian atas pilih <strong>Dropdown Database</strong> dan alihkan dari <em>(default)</em> ke database tersebut. Seluruh dokumen <code className="text-emerald-400 font-mono">users</code> dan <code className="text-emerald-400 font-mono">groups</code> akan langsung terlihat.
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
