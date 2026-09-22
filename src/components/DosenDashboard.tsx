import React, { useState, useEffect } from "react";
import { Group, User, Task, GroupMember } from "../types";
import { subscribeToGroups, subscribeToTasks, subscribeToMembers, createGroup } from "../lib/pplService";
import { 
  GraduationCap, 
  Users, 
  FolderKanban, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  Plus, 
  Search,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp
} from "lucide-react";

interface DosenDashboardProps {
  currentUser: User;
  onOpenGroupKanban: (group: Group) => void;
}

export const DosenDashboard: React.FC<DosenDashboardProps> = ({
  currentUser,
  onOpenGroupKanban,
}) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupTasksMap, setGroupTasksMap] = useState<Record<string, Task[]>>({});
  const [groupMembersMap, setGroupMembersMap] = useState<Record<string, GroupMember[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Group Form State
  const [newGroupName, setNewGroupName] = useState("");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLeaderNim, setNewLeaderNim] = useState("");
  const [newLeaderName, setNewLeaderName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subscribe to all groups
  useEffect(() => {
    const unsubGroups = subscribeToGroups((groupList) => {
      setGroups(groupList);
    });
    return () => unsubGroups();
  }, []);

  // For each group, subscribe to their tasks and members to calculate live statistics
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    groups.forEach((g) => {
      const unsubT = subscribeToTasks(g.id, (taskList) => {
        setGroupTasksMap((prev) => ({ ...prev, [g.id]: taskList }));
      });
      const unsubM = subscribeToMembers(g.id, (memberList) => {
        setGroupMembersMap((prev) => ({ ...prev, [g.id]: memberList }));
      });
      unsubs.push(unsubT, unsubM);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [groups]);

  // Overall Statistics Calculations
  const totalGroups = groups.length;
  let totalTasksCount = 0;
  let totalDoneCount = 0;
  let totalReviewCount = 0;
  let totalInProgressCount = 0;

  groups.forEach((g) => {
    const gTasks = groupTasksMap[g.id] || [];
    totalTasksCount += gTasks.length;
    totalDoneCount += gTasks.filter((t) => t.status === "done").length;
    totalReviewCount += gTasks.filter((t) => t.status === "review").length;
    totalInProgressCount += gTasks.filter((t) => t.status === "in_progress").length;
  });

  const overallProgress = totalTasksCount > 0 ? Math.round((totalDoneCount / totalTasksCount) * 100) : 0;

  // Filter groups
  const filteredGroups = groups.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.projectTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newProjectTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await createGroup(
        {
          name: newGroupName.trim(),
          projectTitle: newProjectTitle.trim(),
          description: newDescription.trim() || "Proyek Rekayasa Perangkat Lunak Terapan.",
          supervisorNip: currentUser.nim,
          supervisorName: currentUser.name,
          leaderNim: newLeaderNim.trim() || undefined,
        },
        newLeaderNim.trim() && newLeaderName.trim()
          ? [
              {
                nim: newLeaderNim.trim(),
                name: newLeaderName.trim(),
                roleInGroup: "Ketua Tim",
              },
            ]
          : []
      );

      setNewGroupName("");
      setNewProjectTitle("");
      setNewDescription("");
      setNewLeaderNim("");
      setNewLeaderName("");
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error("Failed to create group:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-500/20 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" />
                Portal Dosen Pembimbing
              </span>
              <span className="text-xs text-slate-400 font-mono">NIP: {currentUser.nim}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
              Selamat Datang, {currentUser.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
              Pantau progres implementasi proyek perangkat lunak dari seluruh kelompok secara real-time melalui integrasi Cloud Firestore.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kelompok Baru</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Total Kelompok</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{totalGroups}</div>
          <p className="text-[11px] text-slate-500 mt-1">Kelompok PPL aktif dibimbing</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Rata-rata Progres</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{overallProgress}%</div>
          <p className="text-[11px] text-slate-500 mt-1">{totalDoneCount} dari {totalTasksCount} tugas selesai</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Dalam Pengerjaan</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-300">{totalInProgressCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Tugas aktif di In Progress</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Menunggu Review</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400">{totalReviewCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Siap diperiksa Dosen/Ketua</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 rounded-2xl p-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Cari nama kelompok atau judul proyek..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium whitespace-nowrap">
          Menampilkan {filteredGroups.length} Kelompok
        </div>
      </div>

      {/* Groups List */}
      {filteredGroups.length === 0 ? (
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto my-6">
          <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400 mb-3">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-200 mb-1">Belum Ada Kelompok Bimbingan</h3>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            Belum ada kelompok PPL yang terdaftar di database. Anda dapat mendaftarkan kelompok baru sekarang, atau menunggu mahasiswa membuat kelompok saat pendaftaran.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-lg shadow-purple-600/20 inline-flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kelompok Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredGroups.map((group) => {
            const gTasks = groupTasksMap[group.id] || [];
            const gMembers = groupMembersMap[group.id] || [];

          const done = gTasks.filter((t) => t.status === "done").length;
          const inProgress = gTasks.filter((t) => t.status === "in_progress").length;
          const review = gTasks.filter((t) => t.status === "review").length;
          const todo = gTasks.filter((t) => t.status === "todo").length;
          const pct = gTasks.length > 0 ? Math.round((done / gTasks.length) * 100) : 0;

          return (
            <div
              key={group.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 rounded-3xl p-6 shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header: Group Name & Status */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    {group.name}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="text-emerald-400 font-bold">{pct}%</span> Selesai
                  </div>
                </div>

                {/* Project Title & Description */}
                <h3 className="text-base font-bold text-slate-100 mb-1.5 line-clamp-1">
                  {group.projectTitle}
                </h3>
                <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                  {group.description}
                </p>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden mb-4 border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Tasks breakdown chips */}
                <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl py-1.5 px-2">
                    <div className="text-xs font-bold text-slate-300">{todo}</div>
                    <div className="text-[10px] text-slate-500">To Do</div>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl py-1.5 px-2">
                    <div className="text-xs font-bold text-blue-400">{inProgress}</div>
                    <div className="text-[10px] text-slate-500">In Progress</div>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl py-1.5 px-2">
                    <div className="text-xs font-bold text-amber-400">{review}</div>
                    <div className="text-[10px] text-slate-500">Review</div>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl py-1.5 px-2">
                    <div className="text-xs font-bold text-emerald-400">{done}</div>
                    <div className="text-[10px] text-slate-500">Done</div>
                  </div>
                </div>

                {/* Members list preview */}
                <div className="mb-4">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Anggota ({gMembers.length}):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {gMembers.slice(0, 4).map((m, idx) => (
                      <span
                        key={`dosen-member-${group.id}-${m.id || m.nim}-${idx}`}
                        className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-300"
                        title={m.roleInGroup}
                      >
                        {m.name} <span className="text-[9px] text-blue-400">({m.roleInGroup})</span>
                      </span>
                    ))}
                    {gMembers.length > 4 && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-500">
                        +{gMembers.length - 4} lainnya
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button: Open Kanban */}
              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => onOpenGroupKanban(group)}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Buka Papan Kanban &amp; Evaluasi</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Create Group Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-400" />
              Buat Kelompok PPL Baru
            </h3>

            <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nama Kelompok (Contoh: Kelompok 03)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Kelompok 03"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Judul Proyek PPL
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sistem Informasi Perpustakaan Terintegrasi"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Deskripsi Proyek
                </label>
                <textarea
                  rows={2}
                  placeholder="Tujuan, cakupan sistem, dan teknologi yang akan digunakan..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    NIM Ketua Kelompok
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 2101015"
                    value={newLeaderNim}
                    onChange={(e) => setNewLeaderNim(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nama Ketua Kelompok
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Rizky Kurniawan"
                    value={newLeaderName}
                    onChange={(e) => setNewLeaderName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Daftarkan Kelompok"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
