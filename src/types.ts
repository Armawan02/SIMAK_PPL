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
  roleInGroup: string; // e.g. "Project Manager", "System Analyst", "UI/UX Designer", etc.
  roleDescription?: string; // Penjelasan tugas & tanggung jawab peran dalam tim
}

export interface TeamRoleDefinition {
  id: number;
  role: string;
  defaultMemberName: string;
  description: string;
}

export const OFFICIAL_TEAM_ROLES: TeamRoleDefinition[] = [
  {
    id: 1,
    role: "Project Manager",
    defaultMemberName: "Armawan",
    description:
      "Mengatur jalannya proyek, mengkoordinasikan anggota tim, memastikan pengerjaan sesuai jadwal, serta mengawasi keseluruhan proses pengembangan sistem.",
  },
  {
    id: 2,
    role: "System Analyst",
    defaultMemberName: "Nur Avika",
    description:
      "Melakukan analisis kebutuhan sistem, mengidentifikasi kebutuhan pengguna, membuat dokumentasi kebutuhan, dan membantu penyusunan alur sistem.",
  },
  {
    id: 3,
    role: "System Designer",
    defaultMemberName: "Ria Ramadani",
    description:
      "Merancang desain sistem, membuat rancangan alur proses, serta membantu pembuatan diagram perancangan sistem.",
  },
  {
    id: 4,
    role: "UI/UX Designer",
    defaultMemberName: "Ayudiah Cinta Putry",
    description:
      "Membuat rancangan tampilan aplikasi, menyusun desain antarmuka, serta memastikan tampilan sistem mudah digunakan oleh pengguna.",
  },
  {
    id: 5,
    role: "Database Designer",
    defaultMemberName: "Nur Indah Sari",
    description:
      "Merancang struktur database, membuat ERD, menentukan tabel dan relasi antar data yang digunakan dalam sistem.",
  },
  {
    id: 6,
    role: "Frontend Programmer/Developer",
    defaultMemberName: "Muh. Sugandi",
    description:
      "Merancang struktur antarmuka/frontend aplikasi, mengimplementasikan desain UI/UX ke dalam kode interaktif, dan integrasi API client.",
  },
  {
    id: 7,
    role: "Backend Programmer/Developer",
    defaultMemberName: "Muh. Sugandi",
    description:
      "Mengembangkan logika sistem, membuat fitur backend menggunakan Laravel, mengelola database, serta melakukan integrasi antar fitur.",
  },
  {
    id: 8,
    role: "Tester/QA",
    defaultMemberName: "Rindi",
    description:
      "Melakukan pengujian sistem, memastikan fitur berjalan dengan baik, menemukan bug, dan membantu proses evaluasi serta perbaikan sistem.",
  },
];

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

