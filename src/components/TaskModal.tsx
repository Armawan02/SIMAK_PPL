import React, { useState, useEffect } from "react";
import { Task, TaskPriority, TaskStatus, GroupMember } from "../types";
import { X, Calendar, Flag, User as UserIcon, Check } from "lucide-react";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<Task, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  initialTask?: Task | null;
  groupId: string;
  members: GroupMember[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
  groupId,
  members,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assignedToNim, setAssignedToNim] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || "");
      setDescription(initialTask.description || "");
      setStatus(initialTask.status || "todo");
      setPriority(initialTask.priority || "medium");
      setAssignedToNim(initialTask.assignedToNim || (members[0]?.nim ?? ""));
      setDueDate(initialTask.dueDate || new Date().toISOString().split("T")[0]);
    } else {
      setTitle("");
      setDescription("");
      setStatus("todo");
      setPriority("medium");
      setAssignedToNim(members[0]?.nim ?? "");
      setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]);
    }
  }, [initialTask, members, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const assignedMember = members.find((m) => m.nim === assignedToNim);

    setSaving(true);
    try {
      await onSave({
        groupId,
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assignedToNim: assignedToNim || undefined,
        assignedToName: assignedMember ? assignedMember.name : undefined,
        dueDate: dueDate || new Date().toISOString().split("T")[0],
      });
      onClose();
    } catch (err) {
      console.error("Save task error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-slate-100">
            {initialTask ? "Edit Tugas Kanban" : "Tambah Tugas Baru"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Judul Tugas / Fitur
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Implementasi REST API Login & Register"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Deskripsi Singkat / Kriteria Selesai
            </label>
            <textarea
              rows={3}
              placeholder="Jelaskan kebutuhan tugas, endpoint yang dipakai, atau checklist pengujian..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                Penerima Tugas (Assignee)
              </label>
              <select
                value={assignedToNim}
                onChange={(e) => setAssignedToNim(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {members.length === 0 ? (
                  <option value="">(Belum ada anggota terdaftar)</option>
                ) : (
                  members.map((m, idx) => (
                    <option key={`opt-assignee-${m.id || m.nim}-${idx}`} value={m.nim}>
                      {m.name} ({m.roleInGroup || "Anggota"})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Tenggat Waktu (Due Date)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-slate-400" />
                Prioritas
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(["low", "medium", "high"] as TaskPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-1.5 text-xs font-medium rounded-lg capitalize border transition-all ${
                      priority === p
                        ? p === "high"
                          ? "bg-rose-500/20 border-rose-500 text-rose-300"
                          : p === "medium"
                          ? "bg-amber-500/20 border-amber-500 text-amber-300"
                          : "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-950/60 border-slate-800 text-slate-400"
                    }`}
                  >
                    {p === "high" ? "Tinggi" : p === "medium" ? "Sedang" : "Rendah"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Kolom Status Awal
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="todo">To Do (Belum)</option>
                <option value="in_progress">In Progress (Dikerjakan)</option>
                <option value="review">Review (Pemeriksaan)</option>
                <option value="done">Done (Selesai)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : (
                <>
                  <Check className="w-4 h-4" />
                  {initialTask ? "Perbarui Tugas" : "Simpan Tugas"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
