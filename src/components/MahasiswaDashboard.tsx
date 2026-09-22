import React, { useState, useEffect } from "react";
import { Group, Task, TaskStatus, GroupMember, User } from "../types";
import { 
  subscribeToTasks, 
  subscribeToMembers, 
  updateTaskStatus, 
  deleteTask, 
  addTask, 
  updateTaskDetails,
  addMemberToGroup
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
  GraduationCap
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
  const [newMemberNim, setNewMemberNim] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Developer");

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

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberNim.trim() || !newMemberName.trim()) return;
    try {
      await addMemberToGroup(group.id, {
        nim: newMemberNim.trim(),
        name: newMemberName.trim(),
        roleInGroup: newMemberRole,
      });
      setNewMemberNim("");
      setNewMemberName("");
      setIsMemberModalOpen(false);
    } catch (err) {
      console.error("Failed to add member:", err);
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

            {/* Dosen Pembimbing Info */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 shrink-0 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Dosen Pembimbing</p>
                <p className="text-xs sm:text-sm font-bold text-slate-200">{group.supervisorName}</p>
                <p className="text-[11px] text-slate-500 font-mono">NIP: {group.supervisorNip}</p>
              </div>
            </div>
          </div>

          {/* Members Bar & Progress Indicator */}
          <div className="pt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Team Members */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mr-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span>Anggota ({members.length}):</span>
              </div>
              {members.map((m, idx) => (
                <div
                  key={`member-pill-${m.id || m.nim}-${idx}`}
                  className="px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="font-medium text-slate-200">{m.name}</span>
                  <span className="text-[10px] text-slate-500 font-normal">({m.roleInGroup})</span>
                </div>
              ))}
              <button
                onClick={() => setIsMemberModalOpen(true)}
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

      {/* Member Management Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Kelola Anggota {group.name}
            </h3>

            {/* Existing Members */}
            <div className="space-y-2 mb-5 max-h-52 overflow-y-auto pr-1">
              {members.map((m, idx) => (
                <div
                  key={`member-modal-row-${m.id || m.nim}-${idx}`}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-200">{m.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">NIM: {m.nim}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-500/20 text-[10px]">
                    {m.roleInGroup}
                  </span>
                </div>
              ))}
            </div>

            {/* Add New Member Form */}
            <form onSubmit={handleAddMemberSubmit} className="pt-4 border-t border-slate-800 space-y-3">
              <p className="text-xs font-semibold text-slate-300">Tambah Anggota Baru</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="NIM Mahasiswa"
                  value={newMemberNim}
                  onChange={(e) => setNewMemberNim(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="Ketua Tim">Ketua Tim</option>
                <option value="Frontend Developer">Frontend Developer</option>
                <option value="Backend Developer">Backend Developer</option>
                <option value="Fullstack Developer">Fullstack Developer</option>
                <option value="UI/UX Designer">UI/UX Designer</option>
                <option value="QA Tester">QA Tester</option>
                <option value="Technical Writer">Technical Writer</option>
              </select>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-lg"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                >
                  Simpan Anggota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
