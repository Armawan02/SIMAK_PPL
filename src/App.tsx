import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { User, Group } from "./types";
import { HeaderNav } from "./components/HeaderNav";
import { AuthScreen } from "./components/AuthScreen";
import { DosenDashboard } from "./components/DosenDashboard";
import { MahasiswaDashboard } from "./components/MahasiswaDashboard";
import { auth } from "./lib/firebase";
import { subscribeToGroups, subscribeToAuthenticatedUser, logoutUser, resubmitMembershipRequest } from "./lib/pplService";
import { ArrowLeft, Clock3, FolderKanban, XCircle } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Firestore Groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [dosenViewMode, setDosenViewMode] = useState<"overview" | "group_kanban">("overview");

  // Restore the Firebase Auth session and subscribe to public group metadata.
  useEffect(() => {
    let unsubscribeProfile: () => void = () => undefined;
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribeProfile();
      if (!firebaseUser) {
        setCurrentUser(null);
        return;
      }
      unsubscribeProfile = subscribeToAuthenticatedUser(setCurrentUser);
    });

    const unsub = subscribeToGroups((groupList) => {
      setGroups(groupList);
    });

    return () => {
      unsubAuth();
      unsubscribeProfile();
      unsub();
    };
  }, []);

  // Update selectedGroup whenever groups or currentUser changes
  useEffect(() => {
    if (!currentUser || groups.length === 0) {
      setSelectedGroup(null);
      return;
    }

    if (currentUser.role === "mahasiswa") {
      setSelectedGroup(groups.find((g) => g.id === currentUser.groupId) || null);
      return;
    }

    if (!selectedGroup) {
      if (currentUser.groupId) {
        const found = groups.find((g) => g.id === currentUser.groupId);
        setSelectedGroup(found || null);
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
    setDosenViewMode("overview");

    if (user.groupId) {
      const found = groups.find((g) => g.id === user.groupId);
      if (found) setSelectedGroup(found);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setSelectedGroup(null);
  };

  const handleResubmitMembership = async () => {
    if (!currentUser?.pendingGroupId) return;
    try {
      await resubmitMembershipRequest(currentUser.pendingGroupId, currentUser);
    } catch (error) {
      console.error("Failed to resubmit membership request:", error);
    }
  };

  const handleOpenGroupKanbanFromDosen = (group: Group) => {
    setSelectedGroup(group);
    setDosenViewMode("group_kanban");
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <HeaderNav
        currentUser={currentUser}
        groupId={selectedGroup?.id || currentUser?.pendingGroupId}
        onLogout={handleLogout}
        onSwitchUser={() => undefined}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!currentUser ? (
          /* Dedicated Registration & Login Screen */
          <AuthScreen
            onSuccess={handleLoginSuccess}
            allGroups={groups}
          />
        ) : currentUser.role === "dosen" || currentUser.role === "admin" ? (
          /* ================= DOSEN / ADMIN VIEW ================= */
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
          currentUser.membershipStatus === "pending" ? (
            <div className="p-10 text-center bg-slate-900/70 border border-amber-500/20 rounded-3xl max-w-xl mx-auto my-12">
              <Clock3 className="w-10 h-10 mx-auto mb-4 text-amber-400" />
              <h3 className="text-base font-bold text-slate-100 mb-2">Menunggu Verifikasi Kelompok</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Permintaan bergabung sudah dikirim. Tunggu Project Manager atau dosen menyetujui keanggotaan Anda.
              </p>
            </div>
          ) : currentUser.membershipStatus === "rejected" ? (
            <div className="p-10 text-center bg-slate-900/70 border border-rose-500/20 rounded-3xl max-w-xl mx-auto my-12">
              <XCircle className="w-10 h-10 mx-auto mb-4 text-rose-400" />
              <h3 className="text-base font-bold text-slate-100 mb-2">Permintaan Bergabung Ditolak</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Silakan hubungi dosen atau Project Manager untuk mengetahui alasannya dan mengajukan permintaan kembali.
              </p>
              <button
                type="button"
                onClick={handleResubmitMembership}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500"
              >
                Ajukan Kembali Permintaan
              </button>
            </div>
          ) : selectedGroup ? (
            <MahasiswaDashboard
              currentUser={currentUser}
              group={selectedGroup}
              allGroups={groups.filter((g) => g.id === currentUser.groupId)}
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
                Anda belum terhubung ke kelompok PPL. Pilih kelompok saat registrasi untuk mengajukan permintaan bergabung.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <span className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 text-center">
                  Tunggu dosen membuat kelompok dan menetapkan Project Manager
                </span>
              </div>
            </div>
          )
        )}
      </main>

      {/* Footer with product information */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">SIMAK PPL</span>
            <span>• Sinkronisasi data realtime</span>
          </div>
          <span className="text-slate-500">
            Manajemen &amp; Monitoring Kelompok Proyek Perangkat Lunak
          </span>
        </div>
      </footer>
    </div>
  );
}
