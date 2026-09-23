import React from "react";
import { User } from "../types";
import { FirebaseStatusBadge } from "./FirebaseStatusBadge";
import { 
  FolderKanban, 
  LogOut, 
  GraduationCap, 
  UserCheck, 
  Sparkles,
  LogIn
} from "lucide-react";

interface HeaderNavProps {
  currentUser: User | null;
  onLogout: () => void;
  onSwitchUser: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentUser,
  onLogout,
  onSwitchUser,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 tracking-tight">
                SIMAK PPL
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Monitoring Progress Kelompok Mahasiswa &amp; Dosen
            </p>
          </div>
        </div>

        {/* Right side: Database Status Badge & User Profile */}
        <div className="flex items-center gap-3">
          {/* Live Firestore Connection Badge */}
          <FirebaseStatusBadge />

          {currentUser ? (
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-200 leading-tight">
                  {currentUser.name}
                </p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {currentUser.role === "dosen" ? `NIP: ${currentUser.nim}` : `NIM: ${currentUser.nim}`}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
                      currentUser.role === "dosen"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                    }`}
                  >
                    {currentUser.role === "dosen" ? "Dosen" : "Mahasiswa"}
                  </span>
                </div>
              </div>

              {/* Avatar Icon */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border shadow-sm ${
                  currentUser.role === "dosen"
                    ? "bg-purple-900/40 text-purple-200 border-purple-500/30"
                    : "bg-blue-900/40 text-blue-200 border-blue-500/30"
                }`}
              >
                {currentUser.role === "dosen" ? (
                  <GraduationCap className="w-5 h-5 text-purple-300" />
                ) : (
                  <UserCheck className="w-5 h-5 text-blue-300" />
                )}
              </div>

              {/* Logout button */}
              <button
                onClick={onLogout}
                title="Keluar"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onSwitchUser}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk / Daftar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
