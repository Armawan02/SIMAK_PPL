import React, { useState, useEffect } from "react";
import { User, UserRole, Group, OFFICIAL_TEAM_ROLES } from "../types";
import { checkAndAuthenticateUser, registerUser } from "../lib/pplService";
import { 
  FolderKanban, 
  Lock, 
  User as UserIcon, 
  GraduationCap, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Users,
  Eye,
  EyeOff,
  Database,
  Info,
  UserPlus
} from "lucide-react";

interface AuthScreenProps {
  onSuccess: (user: User) => void;
  allGroups: Group[];
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, allGroups }) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [selectedRole, setSelectedRole] = useState<UserRole>("mahasiswa");

  // Login Form
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register Form
  const [regName, setRegName] = useState("");
  const [regIdentifier, setRegIdentifier] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regGroupMode, setRegGroupMode] = useState<"join" | "create">("create");
  const [regGroupId, setRegGroupId] = useState(allGroups[0]?.id || "");
  const [regNewGroupName, setRegNewGroupName] = useState("");
  const [regNewProjectTitle, setRegNewProjectTitle] = useState("");
  const [regNewDescription, setRegNewDescription] = useState("");
  const [regRoleInGroup] = useState("Anggota Tim");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [unregisteredNotice, setUnregisteredNotice] = useState<{ id: string; role: UserRole } | null>(null);

  // Sync regGroupId if groups change
  useEffect(() => {
    if (allGroups.length > 0) {
      if (!regGroupId) setRegGroupId(allGroups[0].id);
      setRegGroupMode("join");
    } else {
      setRegGroupMode("join");
    }
  }, [allGroups.length]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setUnregisteredNotice(null);

    const cleanId = loginIdentifier.trim();
    const cleanPassword = loginPassword.trim();

    if (!cleanId) {
      setError(selectedRole === "dosen" ? "Silakan masukkan NIP Dosen" : selectedRole === "admin" ? "Silakan masukkan email administrator" : "Silakan masukkan NIM Mahasiswa");
      return;
    }
    if (!cleanPassword) {
      setError("Silakan masukkan kata sandi akun Anda");
      return;
    }

    setLoading(true);
    try {
      const result = await checkAndAuthenticateUser(cleanId, cleanPassword, selectedRole);
      if (result.success) {
        setSuccessNotice(`Berhasil masuk sebagai ${result.user.name}`);
        setTimeout(() => onSuccess(result.user), 300);
      } else if (result.reason === "not_found") {
        setUnregisteredNotice({ id: cleanId, role: selectedRole });
        setError(
          `${selectedRole === "dosen" ? "NIP" : selectedRole === "admin" ? "Email" : "NIM"} "${cleanId}" belum terhubung ke akun login. Silakan periksa akun Firebase Authentication.`
        );
      } else if (result.reason === "role_mismatch") {
        const correctRoleText = result.userRole === "mahasiswa" ? "Mahasiswa" : result.userRole === "admin" ? "Administrator" : "Dosen Pengampu";
        setError(
          `Akun ${cleanId} terdaftar sebagai ${correctRoleText}. Silakan pilih tombol peran '${correctRoleText}' di atas untuk masuk.`
        );
      } else if (result.reason === "wrong_password") {
        setError("Kata sandi yang dimasukkan salah. Silakan periksa kembali kata sandi akun Anda.");
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
    setSuccessNotice(null);

    const cleanName = regName.trim();
    const cleanId = regIdentifier.trim();

    if (!cleanName || !cleanId) {
      setError("Nama Lengkap dan NIM/NIP wajib diisi.");
      return;
    }

    if (selectedRole !== "mahasiswa") {
      setError("Pendaftaran akun ini dinonaktifkan. Akun dosen dan administrator dibuat secara manual oleh administrator sistem.");
      return;
    }

    if (!regPassword) {
      setError("Kata sandi wajib diisi.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok dengan kata sandi.");
      return;
    }

    // Validation for Mahasiswa
    if (selectedRole === "mahasiswa") {
      if (allGroups.length === 0) {
        setError("Belum ada kelompok yang dibuka untuk pendaftaran. Silakan tunggu dosen membuat kelompok.");
        return;
      }
      if (!regGroupId) {
        setError("Silakan pilih kelompok yang ingin Anda ikuti.");
        return;
      }
    }

    setLoading(true);
    try {
      const newUser = await registerUser(
        {
          name: cleanName,
          nim: cleanId,
          role: selectedRole,
          password: regPassword,
          groupId: regGroupId,
        },
        selectedRole === "mahasiswa"
          ? {
              isNewGroup: false,
              roleInGroup: regRoleInGroup,
              roleDescription: OFFICIAL_TEAM_ROLES.find((r) => r.role === regRoleInGroup)?.description || "",
            }
          : undefined
      );

      setSuccessNotice(`Pendaftaran berhasil! Selamat datang, ${newUser.name}`);
      setTimeout(() => onSuccess(newUser), 400);
    } catch (err: any) {
      setError(err?.message || "Gagal mendaftarkan akun. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-8 px-4">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Sistem Manajemen dan Monitoring Kelompok Proyek Perangkat Lunak</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          Portal SIMAK PPL
        </h1>
        <p className="text-sm text-slate-400 mt-1.5 max-w-md mx-auto">
          Masuk ke akun Anda atau daftarkan akun baru untuk mengelola tugas dan memonitor progres proyek PPL secara real-time.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-md relative overflow-hidden lg:grid lg:grid-cols-[0.85fr_1.15fr]">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-8 text-white">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border-[28px] border-white/10" />
          <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full border-[36px] border-white/10" />
          <div className="relative z-10">
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <FolderKanban className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">Portal Akademik</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">SIMAK PPL</h2>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-blue-100">
              Pantau progres proyek, kolaborasi tim, dan evaluasi pekerjaan dalam satu ruang kerja.
            </p>
          </div>
          <div className="relative z-10 space-y-3 text-xs text-blue-100">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-white" /> Monitoring progres realtime</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-white" /> Kolaborasi tugas kelompok</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-white" /> Ruang evaluasi dosen</div>
          </div>
        </aside>

        <div className="relative z-10 p-6 sm:p-8">

        {/* Tab Switcher: Login vs Register */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950/80 border border-slate-800 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mode === "login"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Masuk (Login)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setSelectedRole("mahasiswa");
              setError(null);
            }}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mode === "register"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Daftar Akun Baru
          </button>
        </div>

        {/* Role Selector Pill */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Pilih Peran Anda:
          </label>
          <div className={`grid gap-3 ${mode === "login" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
            <button
              type="button"
              onClick={() => {
                setSelectedRole("mahasiswa");
                setError(null);
              }}
              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                selectedRole === "mahasiswa"
                  ? "bg-blue-600/15 border-blue-500 text-white shadow-md shadow-blue-500/10"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                selectedRole === "mahasiswa" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
              }`}>
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Mahasiswa PPL</p>
                <p className="text-[11px] text-slate-400">Papan Kanban &amp; Tugas Tim</p>
              </div>
            </button>

            {mode === "login" && (
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("dosen");
                  setError(null);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  selectedRole === "dosen"
                    ? "bg-purple-600/15 border-purple-500 text-white shadow-md shadow-purple-500/10"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedRole === "dosen" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400"
                }`}>
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">Dosen Pengampu</p>
                  <p className="text-[11px] text-slate-400">Login akun yang dibuat admin</p>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Error and Success Notices */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col gap-2.5 text-xs text-rose-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
            {unregisteredNotice && (
              <div className="pt-2.5 border-t border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-[11px] text-slate-300">
                  {unregisteredNotice.role === "admin" ? "Akun administrator dibuat secara manual oleh administrator sistem." : `Daftarkan ${unregisteredNotice.role === "dosen" ? "NIP Dosen" : "NIM"} ${unregisteredNotice.id} melalui administrator.`}
                </span>
                {unregisteredNotice.role === "mahasiswa" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setSelectedRole("mahasiswa");
                      setRegIdentifier(unregisteredNotice.id);
                      setRegPassword(loginPassword.trim());
                      setRegConfirmPassword(loginPassword.trim());
                      setError(null);
                      setUnregisteredNotice(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-600/30 cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Daftar Akun Mahasiswa Ini &rarr;</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-amber-300 sm:max-w-52">
                    Akun ini dibuat oleh administrator sistem.
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {successNotice && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* ================= LOGIN FORM ================= */}
        {mode === "login" ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {selectedRole === "dosen" ? "NIP Dosen" : selectedRole === "admin" ? "Email Administrator" : "NIM Mahasiswa"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder={selectedRole === "dosen" ? "Contoh: 198503152010121002" : selectedRole === "admin" ? "armawanome47@gmail.com" : "Contoh: 2101001"}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Masukkan kata sandi akun Anda"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {loading ? (
                <span>Memproses Masuk...</span>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nama Lengkap
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder={selectedRole === "dosen" ? "Contoh: Dr. Budi Santoso, M.Kom." : "Contoh: Ahmad Rizky"}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {selectedRole === "dosen" ? "Nomor Induk Pegawai (NIP)" : "Nomor Induk Mahasiswa (NIM)"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={regIdentifier}
                  onChange={(e) => setRegIdentifier(e.target.value)}
                  placeholder={selectedRole === "dosen" ? "Contoh: 198503152010121002" : "Contoh: 2101001"}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
                <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showRegPassword ? "text" : "password"}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Buat kata sandi"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <button type="button" onClick={() => setShowRegPassword((value) => !value)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-200" title="Lihat password">
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Ulangi Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type={showRegConfirmPassword ? "text" : "password"}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Konfirmasi sandi"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <button type="button" onClick={() => setShowRegConfirmPassword((value) => !value)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-200" title="Lihat konfirmasi password">
                    {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Group selection: groups are created and PMs are assigned by dosen. */}
            {selectedRole === "mahasiswa" && (
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-200">Ajukan Keanggotaan Kelompok PPL</span>
                {allGroups.length > 0 ? (
                  <>
                    <p className="text-[11px] text-slate-400">Kelompok dan Project Manager ditetapkan oleh dosen. Permintaan Anda akan menunggu verifikasi.</p>
                    <select
                      value={regGroupId}
                      onChange={(e) => setRegGroupId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                    >
                      {allGroups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name} - {g.projectTitle}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <p className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/20 px-3 py-2 rounded-xl">
                    Belum ada kelompok yang tersedia. Silakan tunggu dosen membuat kelompok dan menetapkan Project Manager.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {loading ? (
                <span>Mendaftarkan Akun...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Daftar Akun Sekarang</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Informative Guidance Card */}
        <div className="mt-8 pt-5 border-t border-slate-800">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Info className="w-4 h-4 text-blue-400" />
              <span>Petunjuk Penggunaan Akun:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 pl-1">
              <li><strong>Mahasiswa</strong>: Masukkan NIM dan buat atau pilih kelompok Anda untuk mulai mengelola Kanban board tugas tim.</li>
              <li><strong>Dosen Pengampu</strong>: Masukkan NIP Anda untuk memonitor progres seluruh kelompok mahasiswa di kelas PPL Anda secara real-time.</li>
            </ul>
          </div>
        </div>

        {/* Service Status Indicator */}
        <div className="mt-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px]">Layanan sinkronisasi data siap digunakan</span>
          </div>
          <span className="text-[10px] text-slate-500">Data tersimpan secara aman</span>
        </div>

        </div>
      </div>
    </div>
  );
};
