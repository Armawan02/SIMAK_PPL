import React, { useState, useEffect } from "react";
import { User, UserRole, Group, OFFICIAL_TEAM_ROLES } from "../types";
import { authenticateUser, registerUser } from "../lib/pplService";
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
  Info
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
  const [regGroupMode, setRegGroupMode] = useState<"join" | "create">("create");
  const [regGroupId, setRegGroupId] = useState(allGroups[0]?.id || "");
  const [regNewGroupName, setRegNewGroupName] = useState("");
  const [regNewProjectTitle, setRegNewProjectTitle] = useState("");
  const [regNewDescription, setRegNewDescription] = useState("");
  const [regRoleInGroup, setRegRoleInGroup] = useState(OFFICIAL_TEAM_ROLES[0].role);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Sync regGroupId if groups change
  useEffect(() => {
    if (allGroups.length > 0) {
      if (!regGroupId) setRegGroupId(allGroups[0].id);
      setRegGroupMode("join");
    } else {
      setRegGroupMode("create");
    }
  }, [allGroups.length]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    const cleanId = loginIdentifier.trim();
    if (!cleanId) {
      setError(selectedRole === "dosen" ? "Silakan masukkan NIP Dosen" : "Silakan masukkan NIM Mahasiswa");
      return;
    }
    if (!loginPassword) {
      setError("Silakan masukkan password akun Anda");
      return;
    }

    setLoading(true);
    try {
      const user = await authenticateUser(cleanId, loginPassword);
      if (user) {
        setSuccessNotice(`Berhasil masuk sebagai ${user.name}`);
        setTimeout(() => onSuccess(user), 300);
      } else {
        setError(
          `NIM/NIP atau kata sandi tidak cocok. Belum punya akun? Silakan klik tab 'Daftar Akun Baru' di atas.`
        );
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
      if (regGroupMode === "create") {
        if (!regNewGroupName.trim()) {
          setError("Silakan masukkan Nama Kelompok yang ingin dibuat.");
          return;
        }
      } else {
        if (allGroups.length === 0) {
          setError("Belum ada kelompok yang terdaftar. Silakan pilih tab '+ Buat Kelompok Baru'.");
          return;
        }
        if (!regGroupId) {
          setError("Silakan pilih kelompok yang ingin Anda ikuti.");
          return;
        }
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
          groupId: selectedRole === "mahasiswa" && regGroupMode === "join" ? regGroupId : undefined,
        },
        selectedRole === "mahasiswa"
          ? {
              isNewGroup: regGroupMode === "create",
              groupName: regNewGroupName,
              projectTitle: regNewProjectTitle || `Proyek PPL ${regNewGroupName}`,
              projectDescription: regNewDescription || "Pengembangan aplikasi perangkat lunak",
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
          <span>Sistem Informasi Monitoring Kelompok PPL</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          Portal SIMAK PPL
        </h1>
        <p className="text-sm text-slate-400 mt-1.5 max-w-md mx-auto">
          Masuk ke akun Anda atau daftarkan akun baru untuk mengelola tugas dan memonitor progres proyek PPL secara real-time.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

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
          <div className="grid grid-cols-2 gap-3">
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
                <p className="text-xs font-bold text-slate-200">Dosen Pembimbing</p>
                <p className="text-[11px] text-slate-400">Evaluasi &amp; Monitoring</p>
              </div>
            </button>
          </div>
        </div>

        {/* Error and Success Notices */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="leading-relaxed">{error}</div>
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
                {selectedRole === "dosen" ? "NIP Dosen" : "NIM Mahasiswa"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder={selectedRole === "dosen" ? "Contoh: 198503152010121002" : "Contoh: 2101001"}
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
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Buat kata sandi"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Ulangi Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Konfirmasi sandi"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>
            </div>

            {/* Special fields for Mahasiswa: Group Selection or Creation */}
            {selectedRole === "mahasiswa" && (
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Keanggotaan Kelompok PPL:</span>
                  <div className="flex items-center gap-2 text-[11px]">
                    {allGroups.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setRegGroupMode("join")}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          regGroupMode === "join" ? "bg-blue-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Pilih Kelompok Ada
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setRegGroupMode("create")}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        regGroupMode === "create" ? "bg-blue-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      + Buat Kelompok Baru
                    </button>
                  </div>
                </div>

                {regGroupMode === "join" && allGroups.length > 0 ? (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Pilih Kelompok Yang Diikuti:</label>
                    <select
                      value={regGroupId}
                      onChange={(e) => setRegGroupId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                    >
                      {allGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} - {g.projectTitle}
                        </option>
                      ))}
                    </select>

                    <div className="mt-3">
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Peran Anda di Tim (Berdasarkan Struktur Resmi PPL):
                      </label>
                      <select
                        value={regRoleInGroup}
                        onChange={(e) => setRegRoleInGroup(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                      >
                        {OFFICIAL_TEAM_ROLES.map((r) => (
                          <option key={`join-role-${r.id}`} value={r.role}>
                            {r.role}
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const rDef = OFFICIAL_TEAM_ROLES.find((r) => r.role === regRoleInGroup);
                        return rDef ? (
                          <div className="mt-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300">
                            <span className="font-semibold text-blue-400">Deskripsi Tugas:</span>{" "}
                            {rDef.description}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allGroups.length === 0 && (
                      <p className="text-[11px] text-blue-300 bg-blue-950/40 border border-blue-500/20 px-3 py-1.5 rounded-xl">
                        Belum ada kelompok di database. Daftarkan kelompok pertama Anda di bawah ini:
                      </p>
                    )}
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Nama Kelompok Baru:</label>
                      <input
                        type="text"
                        value={regNewGroupName}
                        onChange={(e) => setRegNewGroupName(e.target.value)}
                        placeholder="Contoh: Kelompok 01"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Judul Proyek Perangkat Lunak:</label>
                      <input
                        type="text"
                        value={regNewProjectTitle}
                        onChange={(e) => setRegNewProjectTitle(e.target.value)}
                        placeholder="Contoh: SIMAK PPL - Sistem Informasi Monitoring"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Deskripsi Singkat Proyek:</label>
                      <textarea
                        rows={2}
                        value={regNewDescription}
                        onChange={(e) => setRegNewDescription(e.target.value)}
                        placeholder="Tuliskan tujuan dan cakupan proyek..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Peran Anda di Tim (Berdasarkan Struktur Resmi PPL):
                      </label>
                      <select
                        value={regRoleInGroup}
                        onChange={(e) => setRegRoleInGroup(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                      >
                        {OFFICIAL_TEAM_ROLES.map((r) => (
                          <option key={`create-role-${r.id}`} value={r.role}>
                            {r.role}
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const rDef = OFFICIAL_TEAM_ROLES.find((r) => r.role === regRoleInGroup);
                        return rDef ? (
                          <div className="mt-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300">
                            <span className="font-semibold text-blue-400">Deskripsi Tugas:</span>{" "}
                            {rDef.description}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
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
              <li><strong>Dosen Pembimbing</strong>: Masukkan NIP Anda untuk memonitor progres seluruh kelompok bimbingan secara real-time.</li>
            </ul>
          </div>
        </div>

        {/* Database Status Indicator & Note */}
        <div className="mt-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px]">Database Cloud Firestore Siap Digunakan</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">ai-studio-scriptfix-d56a26c7-384c-4750-b65d-614734d34386</span>
        </div>

      </div>
    </div>
  );
};
