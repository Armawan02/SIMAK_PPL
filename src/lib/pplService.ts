import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, db, firebaseDatabaseId, firebaseProjectId } from "./firebase";
import { User, Group, GroupMember, Task, TaskStatus, UserRole } from "../types";

// Empty initializer - no dummy data for production
export async function seedInitialDataIfEmpty(): Promise<void> {
  // Production mode: All data is user-generated in Cloud Firestore
}

// Detailed authentication result
export type AuthResult = 
  | { success: true; user: User }
  | { success: false; reason: "not_found" | "wrong_password" | "role_mismatch"; userRole?: UserRole };

function authEmail(identifier: string): string {
  return `${identifier.trim().toLowerCase()}@simak.local`;
}

export async function getAuthenticatedUser(): Promise<User | null> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;
  const profileSnap = await getDoc(doc(db, "users", firebaseUser.uid));
  return profileSnap.exists()
    ? { ...(profileSnap.data() as Omit<User, "id">), id: profileSnap.id }
    : null;
}

export function logoutUser(): Promise<void> {
  return signOut(auth);
}

// Authenticate user with detailed diagnostics (not found vs wrong password vs role mismatch)
export async function checkAndAuthenticateUser(
  nim: string,
  password: string,
  expectedRole?: UserRole
): Promise<AuthResult> {
  try {
    const cleanNim = nim.trim();
    if (!cleanNim || !password) return { success: false, reason: "not_found" };

      const credential = await signInWithEmailAndPassword(auth, authEmail(cleanNim), password);
    const profileSnap = await getDoc(doc(db, "users", credential.user.uid));
    if (!profileSnap.exists()) {
      await signOut(auth);
      return { success: false, reason: "not_found" };
    }

    const user = { ...(profileSnap.data() as Omit<User, "id">), id: profileSnap.id };
    if (expectedRole && user.role !== expectedRole) {
      await signOut(auth);
      return { success: false, reason: "role_mismatch", userRole: user.role };
    }
    return { success: true, user };
  } catch (err) {
    const code = String(err && typeof err === "object" && "code" in err ? err.code : "");
    return { success: false, reason: code.includes("wrong-password") || code.includes("invalid-credential") ? "wrong_password" : "not_found" };
  }
}

// Authenticate user by NIM/NIP and password strictly from Cloud Firestore
export async function authenticateUser(nim: string, password: string): Promise<User | null> {
  const result = await checkAndAuthenticateUser(nim, password);
  return result.success ? result.user : null;
}

// Register a new user with optional group creation or joining
export async function registerUser(
  userData: Omit<User, "id" | "createdAt"> & { password: string },
  groupDetails?: {
    isNewGroup: boolean;
    groupName?: string;
    projectTitle?: string;
    projectDescription?: string;
    supervisorName?: string;
    supervisorNip?: string;
    roleInGroup?: string;
    roleDescription?: string;
  }
): Promise<User> {
  const cleanNim = userData.nim.trim();
  const credential = await createUserWithEmailAndPassword(auth, authEmail(cleanNim), userData.password);
  await updateProfile(credential.user, { displayName: userData.name.trim() });
  const userId = credential.user.uid;
  let assignedGroupId = userData.groupId;

  const newUser: User = {
    id: userId,
    nim: cleanNim,
    name: userData.name.trim(),
    role: userData.role,
    groupId: assignedGroupId,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, "users", userId), newUser);

  // If user is a student and wants to create a new group
  if (userData.role === "mahasiswa" && groupDetails?.isNewGroup && groupDetails.groupName) {
    try {
      const now = new Date().toISOString();
      const newGroupDoc = await addDoc(collection(db, "groups"), {
        name: groupDetails.groupName.trim(),
        projectTitle: (groupDetails.projectTitle || "Proyek PPL").trim(),
        description: (groupDetails.projectDescription || "Deskripsi proyek perangkat lunak").trim(),
        supervisorNip: (groupDetails.supervisorNip || "198503152010121002").trim(),
        supervisorName: (groupDetails.supervisorName || "Dosen Pengampu PPL").trim(),
        leaderNim: cleanNim,
        createdAt: now,
        updatedAt: now,
      });

      assignedGroupId = newGroupDoc.id;

      // Add student as member to this newly created group
      const memberRef = doc(db, "groups", assignedGroupId, "members", `member-${userData.nim}`);
      await setDoc(memberRef, {
        groupId: assignedGroupId,
        nim: cleanNim,
        name: newUser.name,
        roleInGroup: groupDetails.roleInGroup || "Project Manager",
        roleDescription: groupDetails.roleDescription || "",
        id: `member-${cleanNim}`,
      });
    } catch (e) {
      console.error("Failed to create group in Firestore:", e);
    }
  } else if (userData.role === "mahasiswa" && assignedGroupId) {
    // If student joined an existing group, register as member
    try {
      const memberRef = doc(db, "groups", assignedGroupId, "members", `member-${userData.nim}`);
      await setDoc(memberRef, {
        groupId: assignedGroupId,
        nim: cleanNim,
        name: newUser.name,
        roleInGroup: groupDetails?.roleInGroup || "Anggota Tim",
        roleDescription: groupDetails?.roleDescription || "",
        id: `member-${cleanNim}`,
      });
    } catch (e) {
      console.warn("Could not add member to group doc:", e);
    }
  }

  if (assignedGroupId !== newUser.groupId) {
    newUser.groupId = assignedGroupId;
    await updateDoc(doc(db, "users", userId), { groupId: assignedGroupId });
  }
  return newUser;
}

// Live database diagnostic stats
export interface FirestoreStats {
  connected: boolean;
  databaseId: string;
  projectId: string;
  userCount: number;
  groupCount: number;
  lastChecked: string;
}

export async function fetchFirestoreStats(): Promise<FirestoreStats> {
  const stats: FirestoreStats = {
    connected: false,
    databaseId: firebaseDatabaseId,
    projectId: firebaseProjectId,
    userCount: -1,
    groupCount: 0,
    lastChecked: new Date().toLocaleTimeString(),
  };

  try {
    const groupsSnap = await getDocs(collection(db, "groups"));
    stats.groupCount = groupsSnap.size;
    stats.connected = true;
  } catch (err) {
    console.error("fetchFirestoreStats error:", err);
    stats.connected = false;
  }

  return stats;
}

// Realtime subscription for groups
export function subscribeToGroups(callback: (groups: Group[]) => void): Unsubscribe {
  const groupsRef = collection(db, "groups");
  return onSnapshot(
    groupsRef,
    (snapshot) => {
      if (snapshot.empty) {
        callback([]);
        return;
      }
      const groupsList: Group[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Group, "id">),
      }));
      callback(groupsList);
    },
    (error) => {
      console.warn("Groups snapshot error:", error);
      callback([]);
    }
  );
}

// Realtime subscription for tasks in a group
export function subscribeToTasks(groupId: string, callback: (tasks: Task[]) => void): Unsubscribe {
  const tasksRef = collection(db, "groups", groupId, "tasks");
  return onSnapshot(
    tasksRef,
    (snapshot) => {
      if (snapshot.empty) {
        callback([]);
        return;
      }
      const tasksList: Task[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Task, "id">),
      }));
      callback(tasksList);
    },
    (error) => {
      console.warn(`Tasks snapshot error for group ${groupId}:`, error);
      callback([]);
    }
  );
}

// Realtime subscription for members in a group
export function subscribeToMembers(groupId: string, callback: (members: GroupMember[]) => void): Unsubscribe {
  const membersRef = collection(db, "groups", groupId, "members");
  return onSnapshot(
    membersRef,
    (snapshot) => {
      if (snapshot.empty) {
        callback([]);
        return;
      }
      const rawList: GroupMember[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<GroupMember, "id">),
      }));

      // Deduplicate by NIM to guarantee unique keys in UI
      const seen = new Set<string>();
      const deduplicated: GroupMember[] = [];
      for (const m of rawList) {
        const key = m.nim || m.id;
        if (!seen.has(key)) {
          seen.add(key);
          deduplicated.push(m);
        }
      }

      callback(deduplicated);
    },
    (error) => {
      console.warn(`Members snapshot error for group ${groupId}:`, error);
      callback([]);
    }
  );
}

// Add a task
export async function addTask(groupId: string, task: Omit<Task, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const now = new Date().toISOString();
  const taskData = {
    ...task,
    createdAt: now,
    updatedAt: now,
  };
  const docRef = await addDoc(collection(db, "groups", groupId, "tasks"), taskData);
  return docRef.id;
}

// Update task status (Kanban movement)
export async function updateTaskStatus(groupId: string, taskId: string, newStatus: TaskStatus): Promise<void> {
  const taskRef = doc(db, "groups", groupId, "tasks", taskId);
  await updateDoc(taskRef, {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  });
}

// Update task details
export async function updateTaskDetails(
  groupId: string,
  taskId: string,
  updates: Partial<Omit<Task, "id" | "groupId">>
): Promise<void> {
  const taskRef = doc(db, "groups", groupId, "tasks", taskId);
  await updateDoc(taskRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

// Delete a task
export async function deleteTask(groupId: string, taskId: string): Promise<void> {
  const taskRef = doc(db, "groups", groupId, "tasks", taskId);
  await deleteDoc(taskRef);
}

// Update Dosen Pengampu / Supervisor information for a group
export async function updateGroupSupervisor(
  groupId: string,
  supervisorName: string,
  supervisorNip: string
): Promise<void> {
  const groupRef = doc(db, "groups", groupId);
  await updateDoc(groupRef, {
    supervisorName: supervisorName.trim(),
    supervisorNip: supervisorNip.trim(),
    updatedAt: new Date().toISOString(),
  });
}

// Add a new group
export async function createGroup(
  groupData: Omit<Group, "id" | "createdAt" | "updatedAt">,
  initialMembers?: Omit<GroupMember, "id" | "groupId">[]
): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, "groups"), {
    ...groupData,
    createdAt: now,
    updatedAt: now,
  });

  if (initialMembers && initialMembers.length > 0) {
    for (const mem of initialMembers) {
      await addMemberToGroup(docRef.id, mem);
    }
  }

  return docRef.id;
}

// Add a member to a group
export async function addMemberToGroup(
  groupId: string,
  member: Omit<GroupMember, "id" | "groupId">
): Promise<void> {
  const memberId = `member-${member.nim}`;
  const memberRef = doc(db, "groups", groupId, "members", memberId);
  await setDoc(memberRef, {
    ...member,
    groupId,
    id: memberId,
  });
}

// Update an existing member's role or details
export async function updateMemberInGroup(
  groupId: string,
  memberId: string,
  updates: Partial<Omit<GroupMember, "id" | "groupId">>
): Promise<void> {
  const memberRef = doc(db, "groups", groupId, "members", memberId);
  await updateDoc(memberRef, updates);
}

// Remove a member from a group
export async function removeMemberFromGroup(
  groupId: string,
  memberId: string
): Promise<void> {
  const memberRef = doc(db, "groups", groupId, "members", memberId);
  await deleteDoc(memberRef);
}

// Apply the official 8-role team structure into the group
export async function applyOfficialTeamStructure(
  groupId: string,
  currentUserNim?: string
): Promise<void> {
  const officialRoster = [
    {
      nim: currentUserNim || "ROLE-PM",
      name: "Project Manager",
      roleInGroup: "Project Manager",
      roleDescription:
        "Mengatur jalannya proyek, mengkoordinasikan anggota tim, memastikan pengerjaan sesuai jadwal, serta mengawasi keseluruhan proses pengembangan sistem.",
    },
    {
      nim: "ROLE-SA",
      name: "System Analyst",
      roleInGroup: "System Analyst",
      roleDescription:
        "Melakukan analisis kebutuhan sistem, mengidentifikasi kebutuhan pengguna, membuat dokumentasi kebutuhan, dan membantu penyusunan alur sistem.",
    },
    {
      nim: "ROLE-SD",
      name: "System Designer",
      roleInGroup: "System Designer",
      roleDescription:
        "Merancang desain sistem, membuat rancangan alur proses, serta membantu pembuatan diagram perancangan sistem.",
    },
    {
      nim: "ROLE-UIUX",
      name: "UI/UX Designer",
      roleInGroup: "UI/UX Designer",
      roleDescription:
        "Membuat rancangan tampilan aplikasi, menyusun desain antarmuka, serta memastikan tampilan sistem mudah digunakan oleh pengguna.",
    },
    {
      nim: "ROLE-DB",
      name: "Database Designer",
      roleInGroup: "Database Designer",
      roleDescription:
        "Merancang struktur database, membuat ERD, menentukan tabel dan relasi antar data yang digunakan dalam sistem.",
    },
    {
      nim: "ROLE-FE",
      name: "Frontend Programmer/Developer",
      roleInGroup: "Frontend Programmer/Developer",
      roleDescription:
        "Merancang struktur antarmuka/frontend aplikasi, mengimplementasikan desain UI/UX ke dalam kode interaktif, dan integrasi API client.",
    },
    {
      nim: "ROLE-BE",
      name: "Backend Programmer/Developer",
      roleInGroup: "Backend Programmer/Developer",
      roleDescription:
        "Mengembangkan logika sistem, membuat fitur backend menggunakan Laravel, mengelola database, serta melakukan integrasi antar fitur.",
    },
    {
      nim: "ROLE-QA",
      name: "Tester/QA",
      roleInGroup: "Tester/QA",
      roleDescription:
        "Melakukan pengujian sistem, memastikan fitur berjalan dengan baik, menemukan bug, dan membantu proses evaluasi serta perbaikan sistem.",
    },
  ];

  for (const person of officialRoster) {
    await addMemberToGroup(groupId, person);
  }
}

// DEMO_PRESET_USERS exported as empty array for production
export const DEMO_PRESET_USERS: User[] = [];
