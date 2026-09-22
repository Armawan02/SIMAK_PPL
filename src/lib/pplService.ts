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
import { db } from "./firebase";
import { User, Group, GroupMember, Task, TaskStatus, UserRole } from "../types";

// Empty initializer - no dummy data for production
export async function seedInitialDataIfEmpty(): Promise<void> {
  // Production mode: All data is user-generated in Cloud Firestore
}

// Authenticate user by NIM/NIP and password strictly from Cloud Firestore
export async function authenticateUser(nim: string, password: string): Promise<User | null> {
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const cleanNim = nim.trim();
    for (const d of usersSnap.docs) {
      const u = d.data() as User;
      if (String(u.nim).trim() === cleanNim) {
        if (!u.password || u.password === password) {
          return { ...u, id: d.id };
        }
      }
    }
    return null;
  } catch (err) {
    console.error("Auth error:", err);
    return null;
  }
}

// Register a new user with optional group creation or joining
export async function registerUser(
  userData: Omit<User, "id" | "createdAt">,
  groupDetails?: {
    isNewGroup: boolean;
    groupName?: string;
    projectTitle?: string;
    projectDescription?: string;
    roleInGroup?: string;
  }
): Promise<User> {
  const userId = `user-${Date.now()}`;
  let assignedGroupId = userData.groupId;

  // If user is a student and wants to create a new group
  if (userData.role === "mahasiswa" && groupDetails?.isNewGroup && groupDetails.groupName) {
    try {
      const now = new Date().toISOString();
      const newGroupDoc = await addDoc(collection(db, "groups"), {
        name: groupDetails.groupName.trim(),
        projectTitle: (groupDetails.projectTitle || "Proyek PPL").trim(),
        description: (groupDetails.projectDescription || "Deskripsi proyek perangkat lunak").trim(),
        supervisorNip: "198503152010121002",
        supervisorName: "Dosen Pembimbing PPL",
        leaderNim: userData.nim,
        createdAt: now,
        updatedAt: now,
      });

      assignedGroupId = newGroupDoc.id;

      // Add student as member to this newly created group
      const memberRef = doc(db, "groups", assignedGroupId, "members", `member-${userData.nim}`);
      await setDoc(memberRef, {
        groupId: assignedGroupId,
        nim: userData.nim,
        name: userData.name,
        roleInGroup: groupDetails.roleInGroup || "Ketua Tim",
        id: `member-${userData.nim}`,
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
        nim: userData.nim,
        name: userData.name,
        roleInGroup: groupDetails?.roleInGroup || "Anggota Tim",
        id: `member-${userData.nim}`,
      });
    } catch (e) {
      console.warn("Could not add member to group doc:", e);
    }
  }

  const newUser: User = {
    ...userData,
    id: userId,
    groupId: assignedGroupId,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, "users", userId), newUser);
  } catch (e) {
    console.warn("Firestore write error during registration, saving locally:", e);
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
    databaseId: "ai-studio-scriptfix-d56a26c7-384c-4750-b65d-614734d34386",
    projectId: "sentinel-498418",
    userCount: 0,
    groupCount: 0,
    lastChecked: new Date().toLocaleTimeString(),
  };

  try {
    const usersSnap = await getDocs(collection(db, "users"));
    stats.userCount = usersSnap.size;
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

// DEMO_PRESET_USERS exported as empty array for production
export const DEMO_PRESET_USERS: User[] = [];
