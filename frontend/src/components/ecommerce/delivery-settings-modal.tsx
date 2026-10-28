"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Truck,
  Plus,
  Trash2,
  Check,
  Edit2,
  AlertCircle,
  Loader2,
  Settings,
  DollarSign,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { DeliveryServiceSettingOut } from "@/types";

interface DeliverySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: number;
  onUpdated: () => void;
}

export function DeliverySettingsModal({
  isOpen,
  onClose,
  businessId,
  onUpdated,
}: DeliverySettingsModalProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<DeliveryServiceSettingOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  // New setting form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCharge, setNewCharge] = useState("");
  const [newRegion, setNewRegion] = useState("");
  const [newEstimatedDays, setNewEstimatedDays] = useState("");
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCharge, setEditCharge] = useState("");
  const [editEstimatedDays, setEditEstimatedDays] = useState("");
  const [editIsDefault, setEditIsDefault] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<DeliveryServiceSettingOut[]>(
        `/shipping/delivery-settings?business_id=${businessId}`
      );
      setSettings(res.data || []);
    } catch (err: any) {
      toast.error("Failed to load delivery settings", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen, businessId]);

  if (!isOpen) return null;

  const handleStartEdit = (s: DeliveryServiceSettingOut) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditCharge(s.charge.toString());
    setEditEstimatedDays(s.estimated_days || "");
    setEditIsDefault(s.is_default);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id: string) => {
    const chargeVal = parseFloat(editCharge);
    if (isNaN(chargeVal) || chargeVal < 0) {
      toast.error("Invalid Price", "Charge must be a non-negative number.");
      return;
    }
    if (!editName.trim()) {
      toast.error("Invalid Name", "Service name cannot be blank.");
      return;
    }

    try {
      setSavingId(id);
      await apiClient.put(`/shipping/delivery-settings/${id}?business_id=${businessId}`, {
        name: editName.trim(),
        charge: chargeVal,
        estimated_days: editEstimatedDays.trim() || null,
        is_default: editIsDefault,
      });
      toast.success("Updated", "Delivery rate updated successfully.");
      setEditingId(null);
      await fetchSettings();
      onUpdated();
    } catch (err: any) {
      toast.error("Update failed", err.response?.data?.detail || err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete delivery service "${name}"?`)) {
      return;
    }

    try {
      setSavingId(id);
      await apiClient.delete(`/shipping/delivery-settings/${id}?business_id=${businessId}`);
      toast.success("Deleted", `Delivery service "${name}" removed.`);
      await fetchSettings();
      onUpdated();
    } catch (err: any) {
      toast.error("Delete failed", err.response?.data?.detail || err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const chargeVal = parseFloat(newCharge);
    if (isNaN(chargeVal) || chargeVal < 0) {
      toast.error("Invalid Price", "Charge must be a valid amount (৳).");
      return;
    }
    if (!newName.trim()) {
      toast.error("Name Required", "Please enter a delivery service name.");
      return;
    }

    try {
      setIsSubmittingNew(true);
      await apiClient.post(`/shipping/delivery-settings`, {
        business_id: businessId,
        name: newName.trim(),
        charge: chargeVal,
        region: newRegion.trim() || null,
        estimated_days: newEstimatedDays.trim() || null,
        is_default: newIsDefault,
        is_active: true,
      });

      toast.success("Created", `Delivery service "${newName}" configured.`);
      setNewName("");
      setNewCharge("");
      setNewRegion("");
      setNewEstimatedDays("");
      setNewIsDefault(false);
      setShowAddForm(false);
      await fetchSettings();
      onUpdated();
    } catch (err: any) {
      toast.error("Creation failed", err.response?.data?.detail || err.message);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100/70 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Delivery & Courier Service Settings
              </h3>
              <p className="text-xs text-slate-500">
                Maintain regional delivery charges and rates for order creation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Configured Rates ({settings.length})
            </p>
            {!showAddForm && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Delivery Rate
              </button>
            )}
          </div>

          {/* New Rate Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreate}
              className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3"
            >
              <div className="flex items-center justify-between border-b border-indigo-100/60 pb-2">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  New Delivery Option
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Inside Dhaka City, Sub-Dhaka"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Delivery Charge (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 70.00"
                    value={newCharge}
                    onChange={(e) => setNewCharge(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Estimated Time / Days
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 24-48 Hours, 2-5 Days"
                    value={newEstimatedDays}
                    onChange={(e) => setNewEstimatedDays(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Coverage Region
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dhaka City, Nationwide"
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsDefault}
                    onChange={(e) => setNewIsDefault(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  Set as Default Selection
                </label>

                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5"
                >
                  {isSubmittingNew ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Save Delivery Rate
                </button>
              </div>
            </form>
          )}

          {/* List of Settings */}
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              Loading delivery settings...
            </div>
          ) : settings.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Truck className="w-8 h-8 text-slate-300 mx-auto mb-1" />
              <p className="text-xs font-bold text-slate-700">No Delivery Rates Configured</p>
              <p className="text-[11px] text-slate-400">
                Click "Add Delivery Rate" to add Inside Dhaka, Outside Dhaka, etc.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {settings.map((s) => {
                const isEditing = editingId === s.id;
                const isSaving = savingId === s.id;

                if (isEditing) {
                  return (
                    <div
                      key={s.id}
                      className="p-3.5 bg-slate-50 border border-indigo-200 rounded-xl space-y-2.5"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Name
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Price (৳)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editCharge}
                            onChange={(e) => setEditCharge(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Est. Days
                          </label>
                          <input
                            type="text"
                            value={editEstimatedDays}
                            onChange={(e) => setEditEstimatedDays(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editIsDefault}
                            onChange={(e) => setEditIsDefault(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          Default
                        </label>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleSaveEdit(s.id)}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                          >
                            {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={s.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{s.name}</span>
                          {s.is_default && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          {s.estimated_days && <span>{s.estimated_days}</span>}
                          {s.region && (
                            <>
                              <span>•</span>
                              <span>{s.region}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm font-extrabold text-indigo-700">
                        ৳{s.charge.toFixed(2)}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(s)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Edit Rate"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleDelete(s.id, s.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Rate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
