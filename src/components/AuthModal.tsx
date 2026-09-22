import React, { useState } from "react";
import { User, UserRole } from "../types";
import { authenticateUser, registerUser } from "../lib/pplService";
import { 
  Rocket, 
  Lock, 
  User as UserIcon, 
  GraduationCap, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface AuthModalProps {
  onSuccess: (user: User) => void;
  isOpen: boolean;
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess, isOpen, onClose }) => {
  const [tab, setTab] = useState<"login" | "register">("login");
  
  // Login Form State
  const [loginNim, setLoginNim] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Register Form State
  const [regNim, setRegNim] = useState("");
  const [regName, setRegName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<UserRole>("mahasiswa");
  const [regGroupId, setRegGroupId] = useState("kelompok-1");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginNim.trim()) {
      setError("Masukkan NIM / NIP terlebih dahulu");
      return;
    }

    setLoading(true);
    try {
      const user = await authenticateUser(loginNim, loginPassword || "123");
      if (user) {
        onSuccess(user);
        if (onClose) onClose();
      } else {
        setError("NIM/NIP atau password tidak cocok. Silakan coba salah satu akun demo di bawah.");
      }
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat masuk.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!regNim.trim() || !regName.trim()) {
      setError("NIM/NIP dan Nama Lengkap wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const newUser = await registerUser({
        nim: regNim.trim(),
        name: regName.trim(),
        password: regPassword || "123",
        role: regRole,
        groupId: regRole === "mahasiswa" ? regGroupId : undefined,
      });
      onSuccess(newUser);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err?.message || "Gagal mendaftarkan akun.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-purple-600/30 text-blue-400 mb-3 border border-blue-500/20 shadow-inner">
            <Rocket className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
            SIMAK PPL
          </h1>
          <p className="text-slate-400 mt-1 text-xs">
            Monitoring Progress Kelompok • Database Cloud Firestore
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950/60 p-1 rounded-xl mb-5 border border-slate-800/80">
          <button
            type="button"
            onClick={() => { setTab("login"); setError(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === "login"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Masuk Akun
          </button>
          <button
            type="button"
            onClick={() => { setTab("register"); setError(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === "register"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Daftar Baru
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* FORM LOGIN */}
        {tab === "login" ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 ml-1">
                NIM / NIP
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: 2101001 atau 19850315"
                  value={loginNim}
                  onChange={(e) => setLoginNim(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 ml-1">
                Password / PIN
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="password"
                  placeholder="Default password akun demo: 123"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* FORM REGISTER */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 ml-1">
                Peran / Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegRole("mahasiswa")}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                    regRole === "mahasiswa"
                      ? "bg-blue-600/20 border-blue-500 text-blue-300"
                      : "bg-slate-950/60 border-slate-800 text-slate-400"
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  Mahasiswa
                </button>
                <button
                  type="button"
                  onClick={() => setRegRole("dosen")}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                    regRole === "dosen"
                      ? "bg-purple-600/20 border-purple-500 text-purple-300"
                      : "bg-slate-950/60 border-slate-800 text-slate-400"
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  Dosen Pengampu
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 ml-1">
                {regRole === "dosen" ? "NIP" : "NIM"}
              </label>
              <input
                type="text"
                required
                placeholder={regRole === "dosen" ? "Contoh: 198503152010121002" : "Contoh: 2101009"}
                value={regNim}
                onChange={(e) => setRegNim(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 ml-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Rian Anggara"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {regRole === "mahasiswa" && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 ml-1">
                  Pilih Kelompok PPL
                </label>
                <select
                  value={regGroupId}
                  onChange={(e) => setRegGroupId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="kelompok-1">Kelompok 01 (SIMAK PPL)</option>
                  <option value="kelompok-2">Kelompok 02 (E-Presensi Mobile)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 ml-1">
                Password (Opsional)
              </label>
              <input
                type="password"
                placeholder="Default: 123"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-medium rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Daftar Akun Baru</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
