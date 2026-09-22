import React, { useState, useEffect } from "react";
import { Group, Task, TaskStatus, GroupMember, User, OFFICIAL_TEAM_ROLES } from "../types";
import { 
  subscribeToTasks, 
  subscribeToMembers, 
  updateTaskStatus, 
  deleteTask, 
  addTask, 
  updateTaskDetails,
  addMemberToGroup,
  removeMemberFromGroup,
  applyOfficialTeamStructure,
  updateGroupSupervisor
} from "../lib/pplService";
import { TaskModal } from "./TaskModal";
import { 
  FolderKanban, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  User as UserIcon, 
  ChevronRight, 
  ChevronLeft, 
  Trash2, 
  Edit3, 
  Users, 
  Filter, 
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  Check,
  Award,
  Layers,
  Info
} from "lucide-react";

interface MahasiswaDashboardProps {
  currentUser: User;
  group: Group;
  allGroups?: Group[];
  onSelectGroup?: (groupId: string) => void;
}

export const MahasiswaDashboard: React.FC<MahasiswaDashboardProps> = ({
  currentUser,
  group,
  allGroups,
  onSelectGroup,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberModalTab, setMemberModalTab] = useState<"official_roles" | "roster">("official_roles");
  const [newMemberNim, setNewMemberNim] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState(OFFICIAL_TEAM_ROLES[0].role);
  const [isApplyingRoles, setIsApplyingRoles] = useState(false);
  const [roleActionNotice, setRoleActionNotice] = useState<string | null>(null);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<GroupMember | null>(null);

  // Edit Dosen Pengampu Modal state
  const [isEditDosenModalOpen, setIsEditDosenModalOpen] = useState(false);
  const [editDosenName, setEditDosenName] = useState(group.supervisorName || "Dosen Pengampu PPL");
  const [editDosenNip, setEditDosenNip] = useState(group.supervisorNip || "198503152010121002");
  const [isSavingDosen, setIsSavingDosen] = useState(false);
  const [dosenSaveSuccess, setDosenSaveSuccess] = useState(false);

  useEffect(() => {
    setEditDosenName(group.supervisorName || "Dosen Pengampu PPL");
    setEditDosenNip(group.supervisorNip || "198503152010121002");
  }, [group.supervisorName, group.supervisorNip]);

  // Realtime subscription to tasks & members for current group
  useEffect(() => {
    setLoading(true);
    const unsubTasks = subscribeToTasks(group.id, (taskList) => {
      setTasks(taskList);
      setLoading(false);
    });

    const unsubMembers = subscribeToMembers(group.id, (memberList) => {
      setMembers(memberList);
    });

    return () => {
      unsubTasks();
      unsubMembers();
    };
  }, [group.id]);

  // Calculate Progress
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Filtered Tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.assignedToName && t.assignedToName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === "all" || t.assignedToNim === assigneeFilter;
    return matchesSearch && matchesPriority && matchesAssignee;
  });

  // Columns definition
  const columns: { status: TaskStatus; title: string; count: number; color: string; border: string }[] = [
    {
      status: "todo",
      title: "To Do",
      count: filteredTasks.filter((t) => t.status === "todo").length,
      color: "bg-slate-500/10 text-slate-300",
      border: "border-slate-700/60",
    },
    {
      status: "in_progress",
      title: "In Progress",
      count: filteredTasks.filter((t) => t.status === "in_progress").length,
      color: "bg-blue-500/10 text-blue-400",
      border: "border-blue-500/30",
    },
    {
      status: "review",
      title: "In Review",
      count: filteredTasks.filter((t) => t.status === "review").length,
      color: "bg-amber-500/10 text-amber-400",
      border: "border-amber-500/30",
    },
    {
      status: "done",
      title: "Done",
      count: filteredTasks.filter((t) => t.status === "done").length,
      color: "bg-emerald-500/10 text-emerald-400",
      border: "border-emerald-500/30",
    },
  ];

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateTaskStatus(group.id, taskId, newStatus);
    } catch (err) {
      console.error("Failed to move task:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus tugas ini?")) {
      try {
        await deleteTask(group.id, taskId);
      } catch (err) {
        console.error("Failed to delete task:", err);
      }
    }
  };

  const handleSaveTask = async (taskData: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
    if (editingTask) {
      await updateTaskDetails(group.id, editingTask.id, taskData);
    } else {
      await addTask(group.id, taskData);
    }
  };

  const handleRoleSelectChange = (roleName: string) => {
    setNewMemberRole(roleName);
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberNim.trim() || !newMemberName.trim()) return;
    try {
      const roleDef = OFFICIAL_TEAM_ROLES.find((r) => r.role === newMemberRole);
      await addMemberToGroup(group.id, {
        nim: newMemberNim.trim(),
        name: newMemberName.trim(),
        roleInGroup: newMemberRole,
        roleDescription: roleDef?.description || "",
      });
      setRoleActionNotice(`Anggota ${newMemberName.trim()} (${newMemberRole}) berhasil disimpan ke database!`);
      setNewMemberNim("");
      setNewMemberName("");
      setTimeout(() => setRoleActionNotice(null), 3500);
    } catch (err) {
      console.error("Failed to add member:", err);
    }
  };

  const handleApplyOfficialRoles = async () => {
    setIsApplyingRoles(true);
    try {
      await applyOfficialTeamStructure(group.id, currentUser.nim);
      setRoleActionNotice("8 Peran tim resmi berhasil diterapkan dan disimpan ke Firestore!");
      setTimeout(() => setRoleActionNotice(null), 4000);
    } catch (err) {
      console.error("Failed to apply official roles:", err);
    } finally {
      setIsApplyingRoles(false);
    }
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (window.confirm(`Hapus anggota ${memberName} dari kelompok?`)) {
      try {
        await removeMemberFromGroup(group.id, memberId);
        setRoleActionNotice(`Anggota ${memberName} telah dihapus.`);
        setTimeout(() => setRoleActionNotice(null), 3000);
      } catch (err) {
        console.error("Failed to delete member:", err);
      }
    }
  };

  const handleSaveDosen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDosenName.trim()) return;
    setIsSavingDosen(true);
    try {
      await updateGroupSupervisor(
        group.id,
        editDosenName.trim(),
        editDosenNip.trim() || "-"
      );
      setDosenSaveSuccess(true);
      setTimeout(() => {
        setDosenSaveSuccess(false);
        setIsEditDosenModalOpen(false);
      }, 1000);
    } catch (err) {
      console.error("Failed to update dosen pengampu:", err);
    } finally {
      setIsSavingDosen(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "high":
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">Tinggi</span>;
      case "medium":
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">Sedang</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Rendah</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Group Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-600/10 via-indigo-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5" />
                  {group.name}
                </span>

                {allGroups && allGroups.length > 1 && onSelectGroup && (
                  <select
                    value={group.id}
                    onChange={(e) => onSelectGroup(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    {allGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        Ganti: {g.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                {group.projectTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
                {group.description}
              </p>
            </div>

            {/* Dosen Pengampu Info */}
            <div className="bg-slate-950/70 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-4 shrink-0 flex items-center justify-between gap-3 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] text-purple-300 uppercase font-semibold tracking-wider">
                      Dosen Pengampu
                    </p>
                    <span className="text-[10px] text-slate-500 font-normal">| Matkul PPL</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-200 mt-0.5">
                    {group.supervisorName || "Dosen Pengampu PPL"}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    NIP: {group.supervisorNip || "-"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditDosenName(group.supervisorName || "Dosen Pengampu PPL");
                  setEditDosenNip(group.supervisorNip || "198503152010121002");
                  setIsEditDosenModalOpen(true);
                }}
                className="p-2 rounded-xl bg-slate-900 hover:bg-purple-950/60 border border-slate-800 hover:border-purple-500/40 text-slate-400 hover:text-purple-300 text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                title="Atur Nama & NIP Dosen Pengampu Mata Kuliah"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ubah Dosen</span>
              </button>
            </div>
          </div>

          {/* Members Bar & Progress Indicator */}
          <div className="pt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Team Members */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mr-1">
                <Users className="w-4 h-4 text-slate-400" />
                <span>Anggota ({members.length}):</span>
              </div>
              {members.map((m, idx) => (
                <button
                  key={`member-pill-${m.id || m.nim}-${idx}`}
                  onClick={() => {
                    setSelectedMemberDetail(m);
                    setMemberModalTab("roster");
                    setIsMemberModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs flex items-center gap-1.5 transition-all cursor-pointer group"
                  title="Klik untuk melihat detail tugas & peran"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-400 group-hover:scale-125 transition-transform" />
                  <span className="font-medium text-slate-200">{m.name}</span>
                  <span className="text-[10px] text-blue-400 font-normal">({m.roleInGroup})</span>
                </button>
              ))}
              <button
                onClick={() => {
                  setMemberModalTab("official_roles");
                  setIsMemberModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-xl bg-blue-900/30 hover:bg-blue-800/50 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-medium">8 Peran Tim</span>
              </button>
              <button
                onClick={() => {
                  setMemberModalTab("roster");
                  setIsMemberModalOpen(true);
                }}
                className="px-2 py-1 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Kelola Anggota</span>
              </button>
            </div>

            {/* Overall Progress Bar */}
            <div className="w-full lg:w-72 bg-slate-950/80 border border-slate-800 rounded-2xl p-3">
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                <span className="text-slate-300">Progress Proyek</span>
                <span className="text-blue-400 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>{doneTasks} Selesai</span>
                <span>{totalTasks} Total Tugas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Add Task */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Cari tugas atau nama anggota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Semua Prioritas</option>
            <option value="high">Prioritas Tinggi</option>
            <option value="medium">Prioritas Sedang</option>
            <option value="low">Prioritas Rendah</option>
          </select>

          {/* Assignee Filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Semua Anggota</option>
            {members.map((m, idx) => (
              <option key={`opt-filter-${m.id || m.nim}-${idx}`} value={m.nim}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Add Task Button */}
        <button
          onClick={() => {
            setEditingTask(null);
            setIsTaskModalOpen(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Tugas</span>
        </button>
      </div>

      {/* Real-time sync banner info */}
      <div className="flex items-center justify-between px-4 py-2 bg-blue-950/20 border border-blue-500/20 rounded-xl text-xs text-blue-300">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          Setiap pergeseran tugas tersinkronisasi otomatis ke Cloud Firestore secara instan.
        </span>
        <span className="text-[11px] text-slate-400 font-mono">
          {totalTasks} tugas tercatat
        </span>
      </div>

      {/* KANBAN BOARD (4 COLUMNS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.status);

          return (
            <div
              key={col.status}
              className={`bg-slate-900/80 border ${col.border} rounded-2xl p-4 flex flex-col min-h-[500px] shadow-sm`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-200">{col.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${col.color}`}
                  >
                    {colTasks.length}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setEditingTask(null);
                    setIsTaskModalOpen(true);
                  }}
                  title="Tambah tugas ke kolom ini"
                  className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Tasks List inside Column */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="h-32 border border-dashed border-slate-800/80 rounded-xl flex items-center justify-center text-xs text-slate-500 text-center p-4">
                    Belum ada tugas di kolom ini
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-slate-950/90 border border-slate-800/90 hover:border-slate-700/80 rounded-xl p-3.5 shadow-sm transition-all group"
                    >
                      {/* Priority & Actions */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        {getPriorityBadge(task.priority)}

                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingTask(task);
                              setIsTaskModalOpen(true);
                            }}
                            title="Edit Tugas"
                            className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            title="Hapus Tugas"
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-100 mb-1 leading-snug">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {/* Assignee & Due Date */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5 truncate mr-1">
                          <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-300">
                            {task.assignedToName ? task.assignedToName.charAt(0) : "A"}
                          </div>
                          <span className="truncate">{task.assignedToName || "Unassigned"}</span>
                        </div>

                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-slate-500 font-mono text-[10px] shrink-0">
                            <Calendar className="w-3 h-3" />
                            <span>{task.dueDate}</span>
                          </div>
                        )}
                      </div>

                      {/* Quick Move Status Arrows */}
                      <div className="mt-3 pt-2 border-t border-slate-900/80 flex items-center justify-between text-[11px]">
                        <span className="text-[10px] text-slate-500">Pindah Status:</span>
                        <div className="flex items-center gap-1">
                          {col.status !== "todo" && (
                            <button
                              onClick={() => {
                                const prevStatus: Record<TaskStatus, TaskStatus> = {
                                  todo: "todo",
                                  in_progress: "todo",
                                  review: "in_progress",
                                  done: "review",
                                };
                                handleStatusChange(task.id, prevStatus[col.status]);
                              }}
                              title="Pindahkan ke kolom sebelumnya"
                              className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-slate-200 flex items-center gap-0.5 cursor-pointer"
                            >
                              <ChevronLeft className="w-3 h-3" />
                              <span className="text-[10px]">Balik</span>
                            </button>
                          )}

                          {col.status !== "done" && (
                            <button
                              onClick={() => {
                                const nextStatus: Record<TaskStatus, TaskStatus> = {
                                  todo: "in_progress",
                                  in_progress: "review",
                                  review: "done",
                                  done: "done",
                                };
                                handleStatusChange(task.id, nextStatus[col.status]);
                              }}
                              title="Pindahkan ke kolom selanjutnya"
                              className="px-2 py-0.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 rounded text-blue-300 hover:text-white flex items-center gap-0.5 cursor-pointer font-medium"
                            >
                              <span className="text-[10px]">
                                {col.status === "todo"
                                  ? "Mulai"
                                  : col.status === "in_progress"
                                  ? "Review"
                                  : "Selesai"}
                              </span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Modal for Add / Edit */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        initialTask={editingTask}
        groupId={group.id}
        members={members}
      />

      {/* Member Management & Official Roles Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                    Struktur Peran Tim &amp; Anggota
                  </h3>
                  <p className="text-xs text-slate-400">
                    Kelompok: <span className="text-blue-400 font-semibold">{group.name}</span> &bull; {group.projectTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsMemberModalOpen(false);
                  setSelectedMemberDetail(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Notification Banner */}
            {roleActionNotice && (
              <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{roleActionNotice}</span>
              </div>
            )}

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-800 mt-4 gap-2">
              <button
                onClick={() => setMemberModalTab("official_roles")}
                className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                  memberModalTab === "official_roles"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>8 Peran &amp; Tanggung Jawab Resmi</span>
              </button>
              <button
                onClick={() => setMemberModalTab("roster")}
                className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                  memberModalTab === "roster"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Daftar Anggota ({members.length})</span>
              </button>
            </div>

            {/* Tab 1: 8 Official Roles & Sync */}
            {memberModalTab === "official_roles" && (
              <div className="flex-1 overflow-y-auto pt-4 pr-1 space-y-4">
                <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      Terapkan Struktur 8 Peran ke Tim Ini
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Menyimpan seluruh 8 struktur peran standar beserta job description ke Cloud Firestore.
                    </p>
                  </div>
                  <button
                    onClick={handleApplyOfficialRoles}
                    disabled={isApplyingRoles}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shrink-0 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isApplyingRoles ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Menerapkan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Terapkan 8 Peran ke Database</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                  {OFFICIAL_TEAM_ROLES.map((rDef) => {
                    // Check if member already registered with this role
                    const matchedMember = members.find(
                      (m) => m.roleInGroup.toLowerCase() === rDef.role.toLowerCase()
                    );

                    return (
                      <div
                        key={`official-role-card-${rDef.id}`}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          matchedMember
                            ? "bg-slate-950/80 border-blue-500/40"
                            : "bg-slate-950/40 border-slate-800/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-900/40 border border-blue-500/30 text-blue-300 flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-100">{rDef.role}</h5>
                            </div>
                          </div>
                          {matchedMember ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium shrink-0">
                              {matchedMember.name}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-500 text-[10px] font-medium shrink-0">
                              Belum terisi
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed mt-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                          {rDef.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Roster & Add Form */}
            {memberModalTab === "roster" && (
              <div className="flex-1 overflow-y-auto pt-4 pr-1 space-y-4">
                {/* Highlighted Detail if Clicked from Dashboard */}
                {selectedMemberDetail && (
                  <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-blue-400" />
                        <span className="font-bold text-slate-100">{selectedMemberDetail.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({selectedMemberDetail.nim})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold text-[10px]">
                        {selectedMemberDetail.roleInGroup}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
                      {selectedMemberDetail.roleDescription ||
                        OFFICIAL_TEAM_ROLES.find(
                          (r) => r.role.toLowerCase() === selectedMemberDetail.roleInGroup.toLowerCase()
                        )?.description ||
                        "Bertanggung jawab dalam pengerjaan dan koordinasi modul tim proyek perangkat lunak."}
                    </p>
                  </div>
                )}

                {/* Existing Members List */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                    <span>Anggota Terdaftar di Database ({members.length})</span>
                    {members.length === 0 && (
                      <span className="text-[10px] text-amber-400 font-normal">Belum ada anggota di Firestore</span>
                    )}
                  </h4>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {members.map((m, idx) => {
                      const desc =
                        m.roleDescription ||
                        OFFICIAL_TEAM_ROLES.find((r) => r.role.toLowerCase() === m.roleInGroup.toLowerCase())
                          ?.description;

                      return (
                        <div
                          key={`member-modal-row-${m.id || m.nim}-${idx}`}
                          className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-100">{m.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">NIM: {m.nim}</span>
                              </div>
                              <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-blue-900/30 text-blue-300 border border-blue-500/20 text-[10px] font-medium">
                                {m.roleInGroup}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(m.id || `member-${m.nim}`, m.name)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Hapus dari kelompok"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {desc && (
                            <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-900 line-clamp-2">
                              {desc}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add New Member Form */}
                <form onSubmit={handleAddMemberSubmit} className="pt-4 border-t border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-blue-400" />
                    Tambah Anggota Manual
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">NIM Mahasiswa:</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 220101001"
                        value={newMemberNim}
                        onChange={(e) => setNewMemberNim(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Nama Mahasiswa:</label>
                      <input
                        type="text"
                        required
                        placeholder="Nama Lengkap"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Peran dalam Tim:</label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => handleRoleSelectChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      {OFFICIAL_TEAM_ROLES.map((r) => (
                        <option key={`add-opt-role-${r.id}`} value={r.role}>
                          {r.role}
                        </option>
                      ))}
                    </select>
                    {(() => {
                      const def = OFFICIAL_TEAM_ROLES.find((r) => r.role === newMemberRole);
                      return def ? (
                        <p className="text-[10px] text-slate-400 mt-1 italic">{def.description}</p>
                      ) : null;
                    })()}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/30 cursor-pointer"
                    >
                      Simpan Anggota
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-800 flex justify-end mt-3">
              <button
                type="button"
                onClick={() => {
                  setIsMemberModalOpen(false);
                  setSelectedMemberDetail(null);
                }}
                className="px-4 py-2 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT DOSEN PENGAMPU MODAL ================= */}
      {isEditDosenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Dosen Pengampu Mata Kuliah
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Kelompok: {group.name} &bull; Matkul PPL
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditDosenModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {dosenSaveSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Data Dosen Pengampu berhasil disimpan ke Cloud Firestore!</span>
              </div>
            )}

            <form onSubmit={handleSaveDosen} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nama Dosen Pengampu Mata Kuliah:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dr. Budi Santoso, M.Kom."
                  value={editDosenName}
                  onChange={(e) => setEditDosenName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Dosen yang mengajar dan mengevaluasi proyek PPL kelompok Anda di kelas.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  NIP Dosen (Opsional / Nomor Induk Pegawai):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 198503152010121002"
                  value={editDosenNip}
                  onChange={(e) => setEditDosenNip(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditDosenModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingDosen}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingDosen ? "Menyimpan..." : "Simpan Dosen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
