"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { Vehicle, VehicleType, VehicleFuelType, VehicleStatus } from "@/types";
import {
  X,
  Car,
  FileText,
  Calendar,
  Gauge,
  Fuel,
  Users,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (vehicle?: Vehicle) => void;
  vehicleToEdit?: Vehicle | null;
}

export function VehicleFormModal({
  isOpen,
  onClose,
  onSuccess,
  vehicleToEdit,
}: VehicleFormModalProps) {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("sedan");
  const [brandMake, setBrandMake] = useState("");
  const [modelName, setModelName] = useState("");
  const [modelYear, setModelYear] = useState<string>("");
  const [chassisNumber, setChassisNumber] = useState("");
  const [engineNumber, setEngineNumber] = useState("");
  const [seatingCapacity, setSeatingCapacity] = useState<number>(4);
  const [fuelType, setFuelType] = useState<VehicleFuelType>("octane");
  const [currentOdometerKm, setCurrentOdometerKm] = useState<string>("0");
  const [status, setStatus] = useState<VehicleStatus>("available");

  // BRTA Statutory renewals
  const [fitnessExpiry, setFitnessExpiry] = useState("");
  const [taxTokenExpiry, setTaxTokenExpiry] = useState("");
  const [cngTestExpiry, setCngTestExpiry] = useState("");
  const [insurancePolicy, setInsurancePolicy] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicleToEdit) {
      setVehicleNumber(vehicleToEdit.vehicle_number || "");
      setVehicleType(vehicleToEdit.vehicle_type || "sedan");
      setBrandMake(vehicleToEdit.brand_make || "");
      setModelName(vehicleToEdit.model_name || "");
      setModelYear(vehicleToEdit.model_year ? String(vehicleToEdit.model_year) : "");
      setChassisNumber(vehicleToEdit.chassis_number || "");
      setEngineNumber(vehicleToEdit.engine_number || "");
      setSeatingCapacity(vehicleToEdit.seating_capacity || 4);
      setFuelType(vehicleToEdit.fuel_type || "octane");
      setCurrentOdometerKm(String(vehicleToEdit.current_odometer_km || 0));
      setStatus(vehicleToEdit.status || "available");

      setFitnessExpiry(vehicleToEdit.brta_fitness_expiry_date ? vehicleToEdit.brta_fitness_expiry_date.slice(0, 10) : "");
      setTaxTokenExpiry(vehicleToEdit.brta_tax_token_expiry_date ? vehicleToEdit.brta_tax_token_expiry_date.slice(0, 10) : "");
      setCngTestExpiry(vehicleToEdit.cng_test_expiry_date ? vehicleToEdit.cng_test_expiry_date.slice(0, 10) : "");
      setInsurancePolicy(vehicleToEdit.insurance_policy_number || "");
      setInsuranceExpiry(vehicleToEdit.insurance_expiry_date ? vehicleToEdit.insurance_expiry_date.slice(0, 10) : "");
    } else {
      setVehicleNumber("");
      setVehicleType("sedan");
      setBrandMake("");
      setModelName("");
      setModelYear("");
      setChassisNumber("");
      setEngineNumber("");
      setSeatingCapacity(4);
      setFuelType("octane");
      setCurrentOdometerKm("0");
      setStatus("available");
      setFitnessExpiry("");
      setTaxTokenExpiry("");
      setCngTestExpiry("");
      setInsurancePolicy("");
      setInsuranceExpiry("");
    }
    setError(null);
  }, [vehicleToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!vehicleNumber.trim()) {
      setError("Vehicle registration number is required (e.g. Dhaka Metro-Ga 23-4567)");
      return;
    }
    if (!brandMake.trim() || !modelName.trim()) {
      setError("Brand / Make and Model name are required.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        vehicle_number: vehicleNumber.trim(),
        vehicle_type: vehicleType,
        brand_make: brandMake.trim(),
        model_name: modelName.trim(),
        model_year: modelYear ? parseInt(modelYear, 10) : null,
        chassis_number: chassisNumber.trim() || null,
        engine_number: engineNumber.trim() || null,
        seating_capacity: Number(seatingCapacity) || 4,
        fuel_type: fuelType,
        current_odometer_km: parseFloat(currentOdometerKm) || 0,
        status: status,
        brta_fitness_expiry_date: fitnessExpiry || null,
        brta_tax_token_expiry_date: taxTokenExpiry || null,
        cng_test_expiry_date: cngTestExpiry || null,
        insurance_policy_number: insurancePolicy.trim() || null,
        insurance_expiry_date: insuranceExpiry || null,
      };

      let response: { data?: Vehicle } | undefined;
      if (vehicleToEdit) {
        response = await apiClient.patch(`/fleet/vehicles/${vehicleToEdit.id}`, payload);
      } else {
        response = await apiClient.post("/fleet/vehicles", payload);
      }

      onSuccess(response?.data);
      onClose();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to save vehicle details.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {vehicleToEdit ? "Edit Fleet Vehicle" : "Register New Fleet Vehicle"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                BRTA registration format, vehicle specs, and statutory renewals
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Identification & Registration */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> BRTA Registration & Make
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  BRTA Registration Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dhaka Metro-Ga 23-4567"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Vehicle Type *
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                >
                  <option value="sedan">Sedan (Private Car - Ga)</option>
                  <option value="suv">SUV / Jeep (Bha)</option>
                  <option value="microbus">Microbus (Cha)</option>
                  <option value="pickup">Pickup (Na)</option>
                  <option value="covered_van">Covered Van (Ma)</option>
                  <option value="heavy_truck">Heavy Truck (Ta)</option>
                  <option value="prime_mover">Prime Mover (Sha)</option>
                  <option value="motorcycle">Motorcycle (Ha/La)</option>
                  <option value="electric_van">Electric Delivery Van</option>
                  <option value="ambulance">Ambulance (E)</option>
                  <option value="bus">Bus (Ba)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Brand / Make *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Toyota, Mitsubishi, Tata, Hino"
                  value={brandMake}
                  onChange={(e) => setBrandMake(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Model Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="HiAce Super GL, Corolla Axio"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Model Year
                </label>
                <input
                  type="number"
                  placeholder="2022"
                  value={modelYear}
                  onChange={(e) => setModelYear(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Chassis Number (VIN)
                </label>
                <input
                  type="text"
                  placeholder="NZE161-123456"
                  value={chassisNumber}
                  onChange={(e) => setChassisNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Fuel & Usage Specs */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Fuel className="w-3.5 h-3.5" /> Engine, Fuel & Odometer
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Fuel Type
                </label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value as VehicleFuelType)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                >
                  <option value="octane">Octane</option>
                  <option value="diesel">Diesel</option>
                  <option value="petrol">Petrol</option>
                  <option value="cng">CNG</option>
                  <option value="lpg">LPG</option>
                  <option value="hybrid_octane">Hybrid (Octane)</option>
                  <option value="electric">Electric (EV)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Current Odometer (km)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={currentOdometerKm}
                  onChange={(e) => setCurrentOdometerKm(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Seating Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={seatingCapacity}
                  onChange={(e) => setSeatingCapacity(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: BRTA Statutory Compliance & Renewals */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> BRTA Statutory Compliance & Expirations
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  BRTA Fitness Certificate Expiry
                </label>
                <input
                  type="date"
                  value={fitnessExpiry}
                  onChange={(e) => setFitnessExpiry(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  BRTA Tax Token Expiry
                </label>
                <input
                  type="date"
                  value={taxTokenExpiry}
                  onChange={(e) => setTaxTokenExpiry(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  5-Year CNG Cylinder Re-Test Expiry
                </label>
                <input
                  type="date"
                  value={cngTestExpiry}
                  onChange={(e) => setCngTestExpiry(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Insurance Expiry Date
                </label>
                <input
                  type="date"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition flex items-center gap-2 shadow-md shadow-indigo-600/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{vehicleToEdit ? "Update Vehicle" : "Register Vehicle"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
