import React, { useState, useEffect } from "react";
import { User, Group } from "./types";
import { HeaderNav } from "./components/HeaderNav";
import { AuthModal } from "./components/AuthModal";
import { AuthScreen } from "./components/AuthScreen";
import { DosenDashboard } from "./components/DosenDashboard";
import { MahasiswaDashboard } from "./components/MahasiswaDashboard";
import { subscribeToGroups, createGroup, addMemberToGroup } from "./lib/pplService";
import { ArrowLeft, FolderKanban, Plus } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Firestore Groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [dosenViewMode, setDosenViewMode] = useState<"overview" | "group_kanban">("overview");

  // Quick group creation modal for student with no group
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  // Initial Boot: Check session & subscribe to Firestore groups
  useEffect(() => {
    // Check if user has saved session
    const savedUserStr = localStorage.getItem("simak_user");
    if (savedUserStr) {
      try {
        const parsed = JSON.parse(savedUserStr);
        // Verify user object validity
        if (parsed && parsed.nim && parsed.name) {
          setCurrentUser(parsed);
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }

    // Subscribe to groups real-time from Firestore
    const unsub = subscribeToGroups((groupList) => {
      setGroups(groupList);
    });

    return () => unsub();
  }, []);

  // Update selectedGroup whenever groups or currentUser changes
  useEffect(() => {
    if (groups.length === 0) {
      setSelectedGroup(null);
      return;
    }

    if (!selectedGroup) {
      if (currentUser?.groupId) {
        const found = groups.find((g) => g.id === currentUser.groupId);
        setSelectedGroup(found || groups[0]);
      } else {
        setSelectedGroup(groups[0]);
      }
    } else {
      // Keep selectedGroup data in sync with Firestore updates
      const updated = groups.find((g) => g.id === selectedGroup.id);
      if (updated) setSelectedGroup(updated);
      else setSelectedGroup(groups[0]);
    }
  }, [groups, currentUser]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("simak_user", JSON.stringify(user));
    setIsAuthModalOpen(false);
    setDosenViewMode("overview");

    if (user.groupId) {
      const found = groups.find((g) => g.id === user.groupId);
      if (found) setSelectedGroup(found);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("simak_user");
    setCurrentUser(null);
    setSelectedGroup(null);
  };

  const handleOpenGroupKanbanFromDosen = (group: Group) => {
    setSelectedGroup(group);
    setDosenViewMode("group_kanban");
  };

  const handleCreateGroupForStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !currentUser) return;

    try {
      const now = new Date().toISOString();
      const groupId = await createGroup({
        name: newGroupName.trim(),
        projectTitle: newProjectTitle.trim() || "Proyek PPL",
        description: newGroupDesc.trim() || "Aplikasi proyek perangkat lunak",
        supervisorNip: "198503152010121002",
        supervisorName: "Dosen Pengampu PPL",
        leaderNim: currentUser.nim,
      });

      await addMemberToGroup(groupId, {
        nim: currentUser.nim,
        name: currentUser.name,
        roleInGroup: "Ketua Tim",
      });

      const updatedUser = { ...currentUser, groupId };
      setCurrentUser(updatedUser);
      localStorage.setItem("simak_user", JSON.stringify(updatedUser));
      setIsNewGroupModalOpen(false);
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <HeaderNav
        currentUser={currentUser}
        onLogout={handleLogout}
        onSwitchUser={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!currentUser ? (
          /* Dedicated Registration & Login Screen */
          <AuthScreen
            onSuccess={handleLoginSuccess}
            allGroups={groups}
          />
        ) : currentUser.role === "dosen" ? (
          /* ================= DOSEN VIEW ================= */
          dosenViewMode === "overview" ? (
            <DosenDashboard
              currentUser={currentUser}
              onOpenGroupKanban={handleOpenGroupKanbanFromDosen}
            />
          ) : (
            /* Dosen inspecting a specific group's Kanban Board */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <button
                  onClick={() => setDosenViewMode("overview")}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Ringkasan Semua Kelompok Bimbingan</span>
                </button>
                <div className="flex items-center gap-2 text-xs text-purple-300 bg-purple-950/40 border border-purple-500/30 px-3 py-1 rounded-xl">
                  <span>Mode Evaluasi &amp; Review Dosen Pengampu</span>
                </div>
              </div>

              {selectedGroup ? (
                <MahasiswaDashboard
                  currentUser={currentUser}
                  group={selectedGroup}
                  allGroups={groups}
                  onSelectGroup={(gid) => {
                    const found = groups.find((g) => g.id === gid);
                    if (found) setSelectedGroup(found);
                  }}
                />
              ) : (
                <div className="p-8 text-center text-slate-400 bg-slate-900/60 border border-slate-800 rounded-3xl">
                  Belum ada kelompok yang dipilih
                </div>
              )}
            </div>
          )
        ) : (
          /* ================= MAHASISWA VIEW ================= */
          selectedGroup ? (
            <MahasiswaDashboard
              currentUser={currentUser}
              group={selectedGroup}
              allGroups={groups}
              onSelectGroup={(gid) => {
                const found = groups.find((g) => g.id === gid);
                if (found) setSelectedGroup(found);
              }}
            />
          ) : (
            <div className="p-10 text-center text-slate-400 bg-slate-900/60 border border-slate-800 rounded-3xl max-w-xl mx-auto my-12">
              <div className="w-12 h-12 rounded-2xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400 mb-3">
                <FolderKanban className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-200 mb-1">
                Kelompok Belum Terdaftar
              </h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Anda belum terhubung ke kelompok PPL mana pun. Anda dapat membuat kelompok baru sekarang atau memilih kelompok yang sudah ada.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setIsNewGroupModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Kelompok Baru</span>
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {/* Quick Group Creation Modal for Student */}
      {isNewGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-100 mb-1 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-blue-400" />
              Buat Kelompok PPL Baru
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Daftarkan kelompok Anda untuk mengaktifkan papan Kanban tugas tim.
            </p>

            <form onSubmit={handleCreateGroupForStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Kelompok:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kelompok 01"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Judul Proyek Perangkat Lunak:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SIMAK PPL - Sistem Monitoring Progres"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Deskripsi Proyek:
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi singkat mengenai proyek yang dikembangkan..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewGroupModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-600/20"
                >
                  Simpan &amp; Masuk ke Kanban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal for Quick Switch */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* Footer with database & project info */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">SIMAK PPL</span>
            <span>• Cloud Firestore: <code className="font-mono text-emerald-400">ai-studio-scriptfix-d56a26c7-384c-4750-b65d-614734d34386</code></span>
          </div>
          <span className="text-slate-500">
            Realtime Kanban &amp; Monitoring Progres Kelompok Mahasiswa &amp; Dosen
          </span>
        </div>
      </footer>
    </div>
  );
}
