"use client";

import React, { useMemo } from "react";
import { Permission, SystemModulesMap } from "@/types";
import {
  ShieldCheck,
  Users,
  Calculator,
  ShoppingCart,
  CheckSquare,
  Square,
  Layers,
  Sparkles,
  Car,
  Stethoscope,
} from "lucide-react";

interface PermissionsMatrixProps {
  permissions: Permission[];
  systemModules: SystemModulesMap;
  selectedPermissionIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}

const ACTIONS: ("view" | "create" | "update" | "delete")[] = [
  "view",
  "create",
  "update",
  "delete",
];

const MODULE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  general: ShieldCheck,
  hrm: Users,
  finance: Calculator,
  ecommerce: ShoppingCart,
  fleet: Car,
  healthcare: Stethoscope,
};

export function PermissionsMatrix({
  permissions,
  systemModules,
  selectedPermissionIds,
  onChange,
  disabled = false,
}: PermissionsMatrixProps) {
  const selectedSet = useMemo(
    () => new Set(selectedPermissionIds),
    [selectedPermissionIds]
  );

  // Map from permission code "module:feature:action" to Permission object
  const permCodeMap = useMemo(() => {
    const map = new Map<string, Permission>();
    for (const p of permissions) {
      map.set(p.code, p);
    }
    return map;
  }, [permissions]);

  // Global Check All / Clear All
  const handleCheckAllGlobal = () => {
    if (disabled) return;
    const allIds = permissions.map((p) => p.id);
    onChange(allIds);
  };

  const handleClearAllGlobal = () => {
    if (disabled) return;
    onChange([]);
  };

  // Module-level Check All / Clear All
  const handleModuleCheckAll = (moduleKey: string) => {
    if (disabled) return;
    const modPerms = permissions.filter((p) => p.module === moduleKey);
    const modIds = new Set(modPerms.map((p) => p.id));
    const next = new Set(selectedSet);
    for (const id of modIds) {
      next.add(id);
    }
    onChange(Array.from(next));
  };

  const handleModuleClearAll = (moduleKey: string) => {
    if (disabled) return;
    const modPerms = permissions.filter((p) => p.module === moduleKey);
    const modIds = new Set(modPerms.map((p) => p.id));
    const next = new Set(selectedSet);
    for (const id of modIds) {
      next.delete(id);
    }
    onChange(Array.from(next));
  };

  // Toggle single permission
  const handleToggleSingle = (permId: number) => {
    if (disabled) return;
    const next = new Set(selectedSet);
    if (next.has(permId)) {
      next.delete(permId);
    } else {
      next.add(permId);
    }
    onChange(Array.from(next));
  };

  // Toggle whole row (all actions for a feature)
  const handleToggleRow = (moduleKey: string, featureKey: string) => {
    if (disabled) return;
    const rowPerms: Permission[] = [];
    for (const act of ACTIONS) {
      const code = `${moduleKey}:${featureKey}:${act}`;
      const p = permCodeMap.get(code);
      if (p) rowPerms.push(p);
    }
    if (rowPerms.length === 0) return;

    // If all are selected, deselect them; otherwise, select all
    const allSelected = rowPerms.every((p) => selectedSet.has(p.id));
    const next = new Set(selectedSet);
    for (const p of rowPerms) {
      if (allSelected) {
        next.delete(p.id);
      } else {
        next.add(p.id);
      }
    }
    onChange(Array.from(next));
  };

  // Toggle column for a module (e.g. toggle all 'view' in hrm)
  const handleToggleColumn = (moduleKey: string, action: string) => {
    if (disabled) return;
    const colPerms = permissions.filter(
      (p) => p.module === moduleKey && p.action === action
    );
    if (colPerms.length === 0) return;

    const allSelected = colPerms.every((p) => selectedSet.has(p.id));
    const next = new Set(selectedSet);
    for (const p of colPerms) {
      if (allSelected) {
        next.delete(p.id);
      } else {
        next.add(p.id);
      }
    }
    onChange(Array.from(next));
  };

  const moduleEntries = Object.entries(systemModules);

  return (
    <div className="space-y-6">
      {/* Top Global Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Module Permissions Matrix
            </h3>
            <p className="text-xs text-slate-600">
              {selectedPermissionIds.length} of {permissions.length} total permissions enabled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCheckAllGlobal}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs transition disabled:opacity-50"
          >
            <CheckSquare className="w-3.5 h-3.5" /> Select All Permissions
          </button>
          <button
            type="button"
            onClick={handleClearAllGlobal}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition disabled:opacity-50"
          >
            <Square className="w-3.5 h-3.5" /> Clear All
          </button>
        </div>
      </div>

      {/* Module Matrix Cards */}
      {moduleEntries.map(([moduleKey, moduleInfo]) => {
        const IconComponent = MODULE_ICON_MAP[moduleKey] || ShieldCheck;
        const modulePerms = permissions.filter((p) => p.module === moduleKey);
        const moduleSelectedCount = modulePerms.filter((p) =>
          selectedSet.has(p.id)
        ).length;

        // Collect list of features: from categories or direct features
        const features: [string, string][] =
          moduleInfo.features && moduleInfo.features.length > 0
            ? moduleInfo.features
            : (moduleInfo.categories || []).flatMap((c) => c.features);

        return (
          <div
            key={moduleKey}
            className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all"
          >
            {/* Module Card Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-white border border-slate-200 text-indigo-600 shadow-xs">
                  <IconComponent className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                      {moduleInfo.title}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                      {moduleSelectedCount}/{modulePerms.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono capitalize">
                    module: {moduleKey}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleModuleCheckAll(moduleKey)}
                  disabled={disabled}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-medium transition disabled:opacity-50"
                >
                  Check All
                </button>
                <button
                  type="button"
                  onClick={() => handleModuleClearAll(moduleKey)}
                  disabled={disabled}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium transition disabled:opacity-50"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-5 w-2/5">Feature Name</th>
                    <th className="py-3 px-4 w-28 text-center">Row Toggle</th>
                    {ACTIONS.map((action) => (
                      <th key={action} className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleColumn(moduleKey, action)}
                          disabled={disabled}
                          title={`Toggle all ${action.toUpperCase()} permissions in this module`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition uppercase cursor-pointer"
                        >
                          {action}
                          <span className="text-[10px] text-indigo-400">▼</span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {features.map(([featureKey, featureName]) => {
                    const rowPerms = ACTIONS.map((act) =>
                      permCodeMap.get(`${moduleKey}:${featureKey}:${act}`)
                    ).filter(Boolean) as Permission[];

                    const isRowFull =
                      rowPerms.length > 0 &&
                      rowPerms.every((p) => selectedSet.has(p.id));

                    return (
                      <tr
                        key={featureKey}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3 px-5 font-medium text-slate-800">
                          <div className="font-semibold">{featureName}</div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {featureKey}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRow(moduleKey, featureKey)}
                            disabled={disabled || rowPerms.length === 0}
                            className={`px-2 py-1 rounded-md text-[11px] font-medium border transition ${
                              isRowFull
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                : "bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100"
                            } disabled:opacity-40`}
                          >
                            Toggle
                          </button>
                        </td>

                        {ACTIONS.map((action) => {
                          const code = `${moduleKey}:${featureKey}:${action}`;
                          const perm = permCodeMap.get(code);

                          if (!perm) {
                            return (
                              <td
                                key={action}
                                className="py-3 px-4 text-center text-slate-300"
                              >
                                —
                              </td>
                            );
                          }

                          const isChecked = selectedSet.has(perm.id);

                          return (
                            <td key={action} className="py-3 px-4 text-center">
                              <label
                                className={`inline-flex items-center justify-center p-1 rounded-md cursor-pointer transition ${
                                  disabled ? "cursor-not-allowed opacity-60" : "hover:bg-indigo-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleSingle(perm.id)}
                                  disabled={disabled}
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition cursor-pointer"
                                />
                              </label>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
