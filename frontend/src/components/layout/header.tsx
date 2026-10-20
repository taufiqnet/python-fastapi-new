"use client";

import React from "react";
import { useAuth } from "@/context/auth-context";
import {
  LogOut,
  User as UserIcon,
  ShieldAlert,
  Menu,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

interface HeaderProps {
  onToggleMobileMenu?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

export function Header({
  onToggleMobileMenu,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
}: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs z-30">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Collapse Toggle */}
        <button
          type="button"
          onClick={onToggleSidebarCollapse}
          className="hidden lg:flex p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          title={isSidebarCollapsed ? "Expand Sidebar (256px)" : "Collapse Sidebar (80px)"}
        >
          {isSidebarCollapsed ? (
            <PanelLeft className="w-5 h-5 text-indigo-600" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>

        <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
          Enterprise Control Center
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {user?.is_superuser && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Superadmin</span>
          </span>
        )}

        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs">
            {user?.first_name ? user.first_name[0] : user?.username?.[0]?.toUpperCase() || <UserIcon className="w-4 h-4" />}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-slate-800 leading-none">
              {user?.first_name ? `${user.first_name} ${user.last_name || ""}` : user?.username || "Guest User"}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{user?.email || "No email"}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Log out"
            className="p-2 ml-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
