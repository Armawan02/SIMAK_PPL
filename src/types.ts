export type UserRole = "mahasiswa" | "dosen";

export interface User {
  id: string;
  nim: string;
  name: string;
  role: UserRole;
  password?: string;
  groupId?: string;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  nim: string;
  name: string;
  roleInGroup: string; // e.g. "Ketua", "Frontend Developer", "Backend Developer", "UI/UX Designer", "QA Tester"
}

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  groupId: string;
  title: string;
  description: string;
  assignedToNim?: string;
  assignedToName?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string; // e.g. "Kelompok 01"
  projectTitle: string;
  description: string;
  supervisorNip: string;
  supervisorName: string;
  leaderNim?: string;
  createdAt: string;
  updatedAt: string;
  members?: GroupMember[];
  tasks?: Task[];
}

