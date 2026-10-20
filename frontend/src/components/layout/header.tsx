"use client";

import React from "react";
import { useAuth } from "@/context/auth-context";
import { LogOut, User as UserIcon, ShieldAlert } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-800 tracking-tight">
          Enterprise Control Center
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {user?.is_superuser && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5" />
            Superadmin
          </span>
        )}

        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-medium text-xs">
            {user?.first_name ? user.first_name[0] : user?.username?.[0]?.toUpperCase() || <UserIcon className="w-4 h-4" />}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-slate-800 leading-none">
              {user?.first_name ? `${user.first_name} ${user.last_name || ""}` : user?.username || "Guest User"}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{user?.email || "No email"}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Log out"
            className="p-2 ml-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
