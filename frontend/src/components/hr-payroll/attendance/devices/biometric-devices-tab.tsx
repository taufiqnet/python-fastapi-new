"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { BiometricDevice, AttendanceSettings } from "@/types";
import {
  Cpu,
  Plus,
  RefreshCw,
  Activity,
  Trash2,
  Edit2,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Server,
} from "lucide-react";

interface BiometricDevicesTabProps {
  currentBusinessId: number;
}

export function BiometricDevicesTab({ currentBusinessId }: BiometricDevicesTabProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Register / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDevice, setEditingDevice] = useState<BiometricDevice | null>(null);
  const [formData, setFormData] = useState({
    device_name: "",
    device_brand: "zkteco",
    device_type: "face_recognition",
    ip_address: "",
    port: 4370,
    comm_key: "0",
    serial_number: "",
    is_active: true,
  });

  // Ping Testing State
  const [pingingId, setPingingId] = useState<string | null>(null);

  const fetchSettingsAndDevices = useCallback(async (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    else setIsFetching(true);

    try {
      const [settingsRes, devicesRes] = await Promise.all([
        apiClient.get<AttendanceSettings>(`/attendance/settings?business_id=${currentBusinessId}`),
        apiClient.get<BiometricDevice[]>(`/attendance/devices?business_id=${currentBusinessId}`),
      ]);
      setSettings(settingsRes.data);
      setDevices(devicesRes.data || []);
    } catch (err: any) {
      toast.error("Error", err.response?.data?.detail || "Failed to load biometric settings and devices.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  }, [currentBusinessId, toast]);

  useEffect(() => {
    fetchSettingsAndDevices(true);
  }, [fetchSettingsAndDevices]);

  const handleToggleBiometric = async (enabled: boolean) => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const res = await apiClient.put<AttendanceSettings>(
        `/attendance/settings?business_id=${currentBusinessId}`,
        { enable_biometric_device: enabled, auto_sync_device_logs: enabled }
      );
      setSettings(res.data);
      toast.success(
        "Settings Updated",
        enabled
          ? "Biometric device auto-synchronization enabled."
          : "Biometric synchronization disabled. Salary process will operate manually."
      );
    } catch (err: any) {
      toast.error("Failed", err.response?.data?.detail || "Could not update settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    try {
      const res = await apiClient.put<AttendanceSettings>(
        `/attendance/settings?business_id=${currentBusinessId}`,
        {
          grace_period_minutes: settings.grace_period_minutes,
          half_day_late_minutes: settings.half_day_late_minutes,
          standard_daily_work_hours: settings.standard_daily_work_hours,
          minimum_work_hours_half_day: settings.minimum_work_hours_half_day,
          require_ot_pre_approval: settings.require_ot_pre_approval,
          require_attendance_approval_before_payroll: settings.require_attendance_approval_before_payroll,
        }
      );
      setSettings(res.data);
      toast.success("Saved", "Attendance and grace period policy updated.");
    } catch (err: any) {
      toast.error("Failed", err.response?.data?.detail || "Could not save policy.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenRegisterModal = (dev?: BiometricDevice) => {
    if (dev) {
      setEditingDevice(dev);
      setFormData({
        device_name: dev.device_name,
        device_brand: dev.device_brand,
        device_type: dev.device_type,
        ip_address: dev.ip_address,
        port: dev.port,
        comm_key: dev.comm_key || "0",
        serial_number: dev.serial_number || "",
        is_active: dev.is_active,
      });
    } else {
      setEditingDevice(null);
      setFormData({
        device_name: "",
        device_brand: "zkteco",
        device_type: "face_recognition",
        ip_address: "",
        port: 4370,
        comm_key: "0",
        serial_number: "",
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmitDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDevice) {
        await apiClient.put(`/attendance/devices/${editingDevice.id}`, formData);
        toast.success("Updated", "Biometric device terminal updated successfully.");
      } else {
        await apiClient.post("/attendance/devices", {
          ...formData,
          business_id: currentBusinessId,
        });
        toast.success("Registered", "New biometric terminal added successfully.");
      }
      setIsModalOpen(false);
      fetchSettingsAndDevices();
    } catch (err: any) {
      toast.error("Error", err.response?.data?.detail || "Failed to save biometric device.");
    }
  };

  const handlePingDevice = async (devId: string) => {
    setPingingId(devId);
    try {
      const res = await apiClient.post<any>(`/attendance/devices/${devId}/ping`);
      toast.success("Terminal Online", `${res.data.device_name} responded in ${res.data.latency_ms}ms.`);
      fetchSettingsAndDevices();
    } catch (err: any) {
      toast.error("Offline / Timeout", err.response?.data?.detail || "Device did not respond to socket ping.");
    } finally {
      setPingingId(null);
    }
  };

  const handleDeleteDevice = async (devId: string) => {
    if (!confirm("Are you sure you want to remove this biometric device?")) return;
    try {
      await apiClient.delete(`/attendance/devices/${devId}`);
      toast.success("Deleted", "Device terminal removed.");
      fetchSettingsAndDevices();
    } catch (err: any) {
      toast.error("Error", err.response?.data?.detail || "Failed to delete terminal.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Rim Loading Invariant */}
      {isFetching && <div className="h-0.5 bg-primary animate-pulse w-full rounded" />}

      {/* Hardware Integration Master Toggle */}
      <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary mt-0.5">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  Biometric Device Hardware Integration
                </h2>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    settings?.enable_biometric_device
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {settings?.enable_biometric_device ? "Hardware Enabled" : "Optional / Manual Mode"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                When enabled, daily punch streams are polled from connected ZKTeco or Hikvision terminals and consolidated into verified attendance records. When disabled, the entire payroll and timekeeping engine functions normally without requiring physical devices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={Boolean(settings?.enable_biometric_device)}
                onChange={(e) => handleToggleBiometric(e.target.checked)}
                disabled={savingSettings}
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
            <span className="text-sm font-medium">
              {settings?.enable_biometric_device ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>

        {/* Policy Configuration Fields */}
        {settings && (
          <form onSubmit={handleSaveSettings} className="pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Grace Period (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={settings.grace_period_minutes}
                onChange={(e) =>
                  setSettings({ ...settings, grace_period_minutes: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background focus:ring-1 focus:ring-primary"
              />
              <span className="text-[11px] text-muted-foreground">Punches after this are marked Late</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Half-Day Late Threshold (Mins)
              </label>
              <input
                type="number"
                min="0"
                max="360"
                value={settings.half_day_late_minutes}
                onChange={(e) =>
                  setSettings({ ...settings, half_day_late_minutes: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background focus:ring-1 focus:ring-primary"
              />
              <span className="text-[11px] text-muted-foreground">Punches after this count as Half-Day</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Standard Daily Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="24"
                value={settings.standard_daily_work_hours}
                onChange={(e) =>
                  setSettings({ ...settings, standard_daily_work_hours: parseFloat(e.target.value) || 8.0 })
                }
                className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background focus:ring-1 focus:ring-primary"
              />
              <span className="text-[11px] text-muted-foreground">BLA 2006 statutory norm: 8 hrs/day</span>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="w-full px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Sliders className="w-4 h-4" />
                {savingSettings ? "Saving..." : "Save Policies"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Devices Header & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Connected Biometric Terminals ({devices.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Manage physical fingerprint, facial recognition, and RFID card scanners on local networks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchSettingsAndDevices()}
            disabled={isFetching}
            className="p-2 border rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh Terminals"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => handleOpenRegisterModal()}
            className="flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Register Device
          </button>
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Terminal Name</th>
                <th className="py-3 px-4">Brand & Protocol</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">IP Address : Port</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Heartbeat</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initialLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" />
                    Loading biometric terminals...
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Server className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No biometric terminals registered. Click &quot;Register Device&quot; to connect a terminal.
                  </td>
                </tr>
              ) : (
                devices.map((dev) => (
                  <tr key={dev.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">
                      {dev.device_name}
                      {dev.serial_number && (
                        <span className="block text-xs text-muted-foreground font-normal">
                          S/N: {dev.serial_number}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 uppercase text-xs font-mono font-medium text-muted-foreground">
                      {dev.device_brand}
                    </td>
                    <td className="py-3 px-4 text-xs capitalize text-muted-foreground">
                      {dev.device_type.replace("_", " ")}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {dev.ip_address}:{dev.port}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          dev.status === "online"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            dev.status === "online" ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                          }`}
                        />
                        {dev.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {dev.last_heartbeat_at
                        ? new Date(dev.last_heartbeat_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            month: "short",
                            day: "numeric",
                          })
                        : "Never"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handlePingDevice(dev.id)}
                          disabled={pingingId === dev.id}
                          className="px-2.5 py-1 text-xs border rounded hover:bg-accent text-foreground flex items-center gap-1 transition-colors"
                          title="Send TCP ping test"
                        >
                          <Activity className={`w-3.5 h-3.5 ${pingingId === dev.id ? "animate-spin" : ""}`} />
                          Ping
                        </button>
                        <button
                          onClick={() => handleOpenRegisterModal(dev)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDevice(dev.id)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register / Edit Device Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-semibold text-foreground">
                {editingDevice ? "Edit Biometric Terminal" : "Register Biometric Terminal"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDevice} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Terminal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Factory Entrance Gate 1"
                  value={formData.device_name}
                  onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Brand *
                  </label>
                  <select
                    value={formData.device_brand}
                    onChange={(e) => setFormData({ ...formData, device_brand: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background"
                  >
                    <option value="zkteco">ZKTeco</option>
                    <option value="hikvision">Hikvision</option>
                    <option value="anviz">Anviz</option>
                    <option value="realtime">Realtime</option>
                    <option value="generic_webhook">Generic Push Webhook</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Biometric Type *
                  </label>
                  <select
                    value={formData.device_type}
                    onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background"
                  >
                    <option value="face_recognition">Face Recognition</option>
                    <option value="fingerprint">Fingerprint Scanner</option>
                    <option value="rfid_card">RFID Card Reader</option>
                    <option value="hybrid">Hybrid (Face + Finger)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    IP Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="192.168.1.201"
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Port *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 4370 })}
                    className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Comm Key / Password
                  </label>
                  <input
                    type="text"
                    placeholder="0"
                    value={formData.comm_key}
                    onChange={(e) => setFormData({ ...formData, comm_key: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ZK99824"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm hover:bg-accent text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {editingDevice ? "Save Changes" : "Register Device"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
