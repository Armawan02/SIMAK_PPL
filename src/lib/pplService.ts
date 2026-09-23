import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
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
import { Activity, User, Group, GroupMember, MembershipRequest, Task, TaskComment, TaskStatus, UserRole, OFFICIAL_TEAM_ROLES } from "../types";

// Empty initializer - no dummy data for production
export async function seedInitialDataIfEmpty(): Promise<void> {
  // Production mode: All data is user-generated in Cloud Firestore
}

// Detailed authentication result
export type AuthResult = 
  | { success: true; user: User }
  | { success: false; reason: "not_found" | "wrong_password" | "role_mismatch"; userRole?: UserRole };

function authEmail(identifier: string): string {
  const normalized = identifier.trim().toLowerCase();
  return normalized.includes("@") ? normalized : `${normalized}@simak.local`;
}

export async function getAuthenticatedUser(): Promise<User | null> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;
  const profileSnap = await getDoc(doc(db, "users", firebaseUser.uid));
  return profileSnap.exists()
    ? { ...(profileSnap.data() as Omit<User, "id">), id: profileSnap.id }
    : null;
}

export function subscribeToAuthenticatedUser(callback: (user: User | null) => void): Unsubscribe {
  if (!auth.currentUser) {
    callback(null);
    return () => undefined;
  }
  return onSnapshot(doc(db, "users", auth.currentUser.uid), (snapshot) => {
    callback(snapshot.exists() ? { ...(snapshot.data() as Omit<User, "id">), id: snapshot.id } : null);
  }, () => callback(null));
}

export function logoutUser(): Promise<void> {
  return signOut(auth);
}

export async function addActivity(groupId: string, message: string): Promise<void> {
  try {
    await addDoc(collection(db, "groups", groupId, "activities"), {
      groupId,
      message,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("Activity log unavailable:", error);
  }
}

export function subscribeToActivities(groupId: string, callback: (activities: Activity[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "groups", groupId, "activities"), (snapshot) => {
    const activities = snapshot.docs
      .map((item) => ({ id: item.id, ...(item.data() as Omit<Activity, "id">) }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 12);
    callback(activities);
  }, () => callback([]));
}

export function subscribeToTaskComments(groupId: string, taskId: string, callback: (comments: TaskComment[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "groups", groupId, "tasks", taskId, "comments"), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<TaskComment, "id">) }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }, () => callback([]));
}

export async function addTaskComment(groupId: string, taskId: string, author: User, message: string): Promise<void> {
  await addDoc(collection(db, "groups", groupId, "tasks", taskId, "comments"), {
    taskId,
    authorId: author.id,
    authorName: author.name,
    authorNim: author.nim,
    message: message.trim(),
    createdAt: new Date().toISOString(),
  });
  await addActivity(groupId, `${author.name} menambahkan komentar pada tugas.`);
}

export async function updateTaskComment(groupId: string, taskId: string, commentId: string, message: string): Promise<void> {
  await updateDoc(doc(db, "groups", groupId, "tasks", taskId, "comments", commentId), { message: message.trim() });
}

export async function deleteTaskComment(groupId: string, taskId: string, commentId: string): Promise<void> {
  await deleteDoc(doc(db, "groups", groupId, "tasks", taskId, "comments", commentId));
}

export function updateAuthenticatedUserGroup(groupId: string): Promise<void> {
  if (!auth.currentUser) return Promise.reject(new Error("Pengguna belum login."));
  return updateDoc(doc(db, "users", auth.currentUser.uid), { groupId });
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
    if (expectedRole && user.role !== "admin" && user.role !== expectedRole) {
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

  const isJoiningExistingGroup = userData.role === "mahasiswa" && Boolean(assignedGroupId) && !groupDetails?.isNewGroup;
  const newUser: User = {
    id: userId,
    nim: cleanNim,
    name: userData.name.trim(),
    role: userData.role,
    createdAt: new Date().toISOString(),
    ...(isJoiningExistingGroup
      ? { pendingGroupId: assignedGroupId, membershipStatus: "pending" as const }
      : assignedGroupId
      ? { groupId: assignedGroupId, membershipStatus: "approved" as const }
      : {}),
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
  } else if (isJoiningExistingGroup && assignedGroupId) {
    // Existing-group membership is pending Project Manager approval.
    try {
      const requestRef = doc(db, "groups", assignedGroupId, "joinRequests", userId);
      await setDoc(requestRef, {
        groupId: assignedGroupId,
        userId,
        nim: cleanNim,
        name: newUser.name,
        roleInGroup: groupDetails?.roleInGroup || "Anggota Tim",
        roleDescription: groupDetails?.roleDescription || "",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      await addActivity(assignedGroupId, `${newUser.name} mengajukan permintaan bergabung.`);
    } catch (e) {
      console.warn("Could not add member to group doc:", e);
    }
  }

  if (!isJoiningExistingGroup && assignedGroupId !== newUser.groupId) {
    newUser.groupId = assignedGroupId;
    await updateDoc(doc(db, "users", userId), { groupId: assignedGroupId });
  }
  return newUser;
}

export function subscribeToMembershipRequests(
  groupId: string,
  callback: (requests: MembershipRequest[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, "groups", groupId, "joinRequests"), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<MembershipRequest, "id">) })));
  }, () => callback([]));
}

export async function approveMembershipRequest(request: MembershipRequest, roleInGroup: string): Promise<void> {
  const roleDescription = OFFICIAL_TEAM_ROLES.find((role) => role.role === roleInGroup)?.description || "Bertanggung jawab dalam pengerjaan dan koordinasi modul tim proyek perangkat lunak.";
  const memberId = `member-${request.nim}`;
  await setDoc(doc(db, "groups", request.groupId, "members", memberId), {
    groupId: request.groupId,
    nim: request.nim,
    name: request.name,
    roleInGroup,
    roleDescription,
    id: memberId,
    approvalRequestId: request.id,
  });
  await updateDoc(doc(db, "users", request.userId), {
    groupId: request.groupId,
    membershipStatus: "approved",
    pendingGroupId: deleteField(),
  });
  await updateDoc(doc(db, "groups", request.groupId, "joinRequests", request.id), { status: "approved", roleInGroup, roleDescription });
  await addActivity(request.groupId, `${request.name} diterima sebagai anggota kelompok.`);
}

export function rejectMembershipRequest(request: MembershipRequest): Promise<void> {
  return updateDoc(doc(db, "groups", request.groupId, "joinRequests", request.id), { status: "rejected" })
    .then(() => updateDoc(doc(db, "users", request.userId), { membershipStatus: "rejected" }))
    .then(() => addActivity(request.groupId, `Permintaan ${request.name} ditolak.`));
}

export async function resubmitMembershipRequest(groupId: string, user: User): Promise<void> {
  if (!auth.currentUser) throw new Error("Pengguna belum login.");
  const requestRef = doc(db, "groups", groupId, "joinRequests", auth.currentUser.uid);
  await updateDoc(requestRef, {
    status: "pending",
    roleInGroup: "Anggota Tim",
    roleDescription: "",
    createdAt: new Date().toISOString(),
  });
  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    membershipStatus: "pending",
    pendingGroupId: groupId,
  });
  await addActivity(groupId, `${user.name} mengajukan kembali permintaan bergabung.`);
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
  await addActivity(groupId, `Tugas "${task.title}" ditambahkan.`);
  return docRef.id;
}

// Update task status (Kanban movement)
export async function updateTaskStatus(groupId: string, taskId: string, newStatus: TaskStatus): Promise<void> {
  const taskRef = doc(db, "groups", groupId, "tasks", taskId);
  await updateDoc(taskRef, {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  });
  await addActivity(groupId, `Status tugas diubah menjadi ${newStatus}.`);
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
  await addActivity(groupId, "Detail tugas diperbarui.");
}

// Delete a task
export async function deleteTask(groupId: string, taskId: string): Promise<void> {
  const taskRef = doc(db, "groups", groupId, "tasks", taskId);
  await deleteDoc(taskRef);
  await addActivity(groupId, "Satu tugas dihapus.");
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
