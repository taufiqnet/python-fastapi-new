"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Building,
  Briefcase,
  Calendar,
  Phone,
  Shield,
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Hash,
  Home,
  CreditCard,
  Fingerprint,
  HeartHandshake,
  Users,
  Copy,
  AlertCircle,
  FileText,
  Clock,
  Layers,
  Award,
} from "lucide-react";
import {
  EmployeeOut,
  EmployeeCreateInput,
  DepartmentOut,
  JobTitleOut,
  BranchOut,
  SalaryGradeOut,
} from "@/types";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";
import { SearchableEmployeeCombobox } from "@/components/common/searchable-employee-combobox";

interface EmployeeFormProps {
  initialData?: EmployeeOut | null;
  isEdit?: boolean;
}

type TabKey =
  | "basic"
  | "family_address"
  | "organization"
  | "emergency_nominee"
  | "disbursement_biometrics";

const BD_DIVISIONS = [
  "Dhaka",
  "Chattogram",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const RELIGIONS = ["Islam", "Hinduism", "Buddhism", "Christianity", "Other"];

export function EmployeeForm({ initialData, isEdit = false }: EmployeeFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>("basic");

  // Organization Lookups
  const [departments, setDepartments] = useState<DepartmentOut[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitleOut[]>([]);
  const [branches, setBranches] = useState<BranchOut[]>([]);
  const [salaryGrades, setSalaryGrades] = useState<SalaryGradeOut[]>([]);
  const [managerCandidates, setManagerCandidates] = useState<EmployeeOut[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // 1. Basic Information (প্রাথমিক তথ্য)
  // ─────────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [banglaName, setBanglaName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [idPrefix, setIdPrefix] = useState("EMP-");
  const [loadingNextId, setLoadingNextId] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [gender, setGender] = useState("male");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("single");
  const [religion, setReligion] = useState("Islam");
  const [nationality, setNationality] = useState("Bangladeshi");
  const [nationalId, setNationalId] = useState("");
  const [tin, setTin] = useState("");
  const [passportNo, setPassportNo] = useState("");

  // ─────────────────────────────────────────────────────────────
  // 2. Family & Detailed Address (পারিবারিক ও ঠিকানা)
  // ─────────────────────────────────────────────────────────────
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [spouseName, setSpouseName] = useState("");

  // Contact
  const [workEmail, setWorkEmail] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");

  // Present Address
  const [presentAddress, setPresentAddress] = useState("");
  const [presentThana, setPresentThana] = useState("");
  const [presentDistrict, setPresentDistrict] = useState("");
  const [presentDivision, setPresentDivision] = useState("Dhaka");
  const [presentPostCode, setPresentPostCode] = useState("");

  // Permanent Address
  const [permanentAddress, setPermanentAddress] = useState("");
  const [permanentThana, setPermanentThana] = useState("");
  const [permanentDistrict, setPermanentDistrict] = useState("");
  const [permanentDivision, setPermanentDivision] = useState("Dhaka");
  const [permanentPostCode, setPermanentPostCode] = useState("");

  // ─────────────────────────────────────────────────────────────
  // 3. Organizational Placement & Terms (পদবী, বিভাগ ও গ্রেড)
  // ─────────────────────────────────────────────────────────────
  const [branchId, setBranchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [jobTitleId, setJobTitleId] = useState("");
  const [salaryGradeId, setSalaryGradeId] = useState("");
  const [directManagerId, setDirectManagerId] = useState("");
  const [team, setTeam] = useState("");
  const [isDepartmentHead, setIsDepartmentHead] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [employeeCategory, setEmployeeCategory] = useState("management");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [workArrangement, setWorkArrangement] = useState("onsite");

  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [confirmationDate, setConfirmationDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");
  const [probationPeriodMonths, setProbationPeriodMonths] = useState<number>(3);
  const [probationEndDate, setProbationEndDate] = useState("");
  const [noticePeriodDays, setNoticePeriodDays] = useState<number>(30);
  const [isOvertimeEligible, setIsOvertimeEligible] = useState(false);
  const [workingHours, setWorkingHours] = useState("40 hrs/week");
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState<number>(5);

  // ─────────────────────────────────────────────────────────────
  // 4. Emergency Contacts & Nominees (জরুরী যোগাযোগ ও নমিনী)
  // ─────────────────────────────────────────────────────────────
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactRelation, setEmergencyContactRelation] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  // ─────────────────────────────────────────────────────────────
  // 5. Salary Disbursement & Biometrics (ব্যাংকিং ও বায়োমেট্রিক)
  // ─────────────────────────────────────────────────────────────
  const [disbursementMethod, setDisbursementMethod] =
    useState("bank_transfer");
  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankAccountTitle, setBankAccountTitle] = useState("");
  const [bankRoutingNumber, setBankRoutingNumber] = useState("");
  const [mfsProvider, setMfsProvider] = useState("bkash");
  const [mfsNumber, setMfsNumber] = useState("");

  const [biometricUserId, setBiometricUserId] = useState("");
  const [rfidCardNumber, setRfidCardNumber] = useState("");
  const [skillsExpertise, setSkillsExpertise] = useState("");

  // Load Lookups
  useEffect(() => {
    async function loadLookups() {
      try {
        const [deptRes, titleRes, branchRes, gradeRes, empRes] =
          await Promise.allSettled([
            apiClient.get<DepartmentOut[]>("/departments"),
            apiClient.get<JobTitleOut[]>("/job-titles"),
            apiClient.get<BranchOut[]>("/branches"),
            apiClient.get<SalaryGradeOut[]>("/salary-grades"),
            apiClient.get<EmployeeOut[]>("/employees?limit=250"),
          ]);

        if (deptRes.status === "fulfilled") {
          setDepartments(deptRes.value.data || []);
        }
        if (titleRes.status === "fulfilled") {
          setJobTitles(titleRes.value.data || []);
        }
        if (branchRes.status === "fulfilled") {
          setBranches(branchRes.value.data || []);
        }
        if (gradeRes.status === "fulfilled") {
          setSalaryGrades(gradeRes.value.data || []);
        }
        if (empRes.status === "fulfilled") {
          const list = empRes.value.data || [];
          setManagerCandidates(
            initialData ? list.filter((e) => e.id !== initialData.id) : list
          );
        }
      } catch {
        toast.error("Warning", "Could not load all organizational lookups.");
      } finally {
        setLoadingLookups(false);
      }
    }

    loadLookups();
  }, [initialData, toast]);

  // Pre-fill initial data in edit mode
  useEffect(() => {
    if (initialData) {
      // Tab 1
      setFirstName(initialData.first_name || "");
      setMiddleName(initialData.middle_name || "");
      setLastName(initialData.last_name || "");
      setBanglaName(initialData.bangla_name || "");
      setEmployeeId(initialData.employee_id || "");
      setPhotoUrl(initialData.photo_url || "");
      setGender(initialData.gender || "male");
      setDateOfBirth(
        initialData.date_of_birth
          ? String(initialData.date_of_birth).split("T")[0]
          : ""
      );
      setBloodGroup(initialData.blood_group || "");
      setMaritalStatus(initialData.marital_status || "single");
      setReligion(initialData.religion || "Islam");
      setNationality(initialData.nationality || "Bangladeshi");
      setNationalId(initialData.national_id || "");
      setTin(initialData.tin || "");
      setPassportNo(initialData.passport_no || "");

      // Tab 2
      setFatherName(initialData.father_name || "");
      setMotherName(initialData.mother_name || "");
      setSpouseName(initialData.spouse_name || "");
      setWorkEmail(initialData.work_email || "");
      setPersonalEmail(initialData.personal_email || "");
      setPhone(initialData.phone || "");
      setLinkedin(initialData.linkedin || "");

      setPresentAddress(initialData.present_address || "");
      setPresentThana(initialData.present_thana || "");
      setPresentDistrict(initialData.present_district || "");
      setPresentDivision(initialData.present_division || "Dhaka");
      setPresentPostCode(initialData.present_post_code || "");

      setPermanentAddress(initialData.permanent_address || "");
      setPermanentThana(initialData.permanent_thana || "");
      setPermanentDistrict(initialData.permanent_district || "");
      setPermanentDivision(initialData.permanent_division || "Dhaka");
      setPermanentPostCode(initialData.permanent_post_code || "");

      // Tab 3
      setBranchId(initialData.branch_id || "");
      setDepartmentId(initialData.department_id || "");
      setJobTitleId(initialData.job_title_id || "");
      setSalaryGradeId(initialData.salary_grade_id || "");
      setDirectManagerId(initialData.direct_manager_id || "");
      setTeam(initialData.team || "");
      setIsDepartmentHead(Boolean(initialData.is_department_head));
      setIsActive(initialData.is_active !== false);

      setEmployeeCategory(initialData.employee_category || "management");
      setEmploymentType(initialData.employment_type || "full_time");
      setWorkArrangement(initialData.work_arrangement || "onsite");
      setStartDate(
        initialData.start_date
          ? String(initialData.start_date).split("T")[0]
          : ""
      );
      setConfirmationDate(
        initialData.confirmation_date
          ? String(initialData.confirmation_date).split("T")[0]
          : ""
      );
      setContractEndDate(
        initialData.contract_end_date
          ? String(initialData.contract_end_date).split("T")[0]
          : ""
      );
      setProbationPeriodMonths(
        initialData.probation_period_months !== null &&
          initialData.probation_period_months !== undefined
          ? initialData.probation_period_months
          : 3
      );
      setProbationEndDate(
        initialData.probation_end_date
          ? String(initialData.probation_end_date).split("T")[0]
          : ""
      );
      setNoticePeriodDays(
        initialData.notice_period_days !== null &&
          initialData.notice_period_days !== undefined
          ? initialData.notice_period_days
          : 30
      );
      setIsOvertimeEligible(Boolean(initialData.is_overtime_eligible));
      setWorkingHours(initialData.working_hours || "40 hrs/week");
      setWorkingDaysPerWeek(
        initialData.working_days_per_week !== null &&
          initialData.working_days_per_week !== undefined
          ? initialData.working_days_per_week
          : 5
      );

      // Tab 4
      setEmergencyContactName(initialData.emergency_contact_name || "");
      setEmergencyContactRelation(initialData.emergency_contact_relation || "");
      setEmergencyContactPhone(initialData.emergency_contact_phone || "");
      setEmergencyContact(
        initialData.emergency_contact ||
          initialData.residential_address ||
          ""
      );

      // Tab 5
      setDisbursementMethod(initialData.disbursement_method || "bank_transfer");
      setBankName(initialData.bank_name || "");
      setBankBranch(initialData.bank_branch || "");
      setBankAccountNo(initialData.bank_account_no || "");
      setBankAccountTitle(initialData.bank_account_title || "");
      setBankRoutingNumber(initialData.bank_routing_number || "");
      setMfsProvider(initialData.mfs_provider || "bkash");
      setMfsNumber(initialData.mfs_number || "");

      setBiometricUserId(initialData.biometric_user_id || "");
      setRfidCardNumber(initialData.rfid_card_number || "");
      setSkillsExpertise(initialData.skills_expertise || "");
    } else {
      fetchNextEmployeeId("EMP-");
    }
  }, [initialData]);

  const fetchNextEmployeeId = async (prefixVal: string = idPrefix) => {
    if (isEdit) return;
    setLoadingNextId(true);
    try {
      const res = await apiClient.get<{ next_employee_id: string }>(
        `/employees/next-id?prefix=${encodeURIComponent(prefixVal)}&padding=3`
      );
      if (res.data?.next_employee_id) {
        setEmployeeId(res.data.next_employee_id);
      }
    } catch {
      setEmployeeId(`${prefixVal}001`);
    } finally {
      setLoadingNextId(false);
    }
  };

  const handleCopyPresentAddress = () => {
    setPermanentAddress(presentAddress);
    setPermanentThana(presentThana);
    setPermanentDistrict(presentDistrict);
    setPermanentDivision(presentDivision);
    setPermanentPostCode(presentPostCode);
    toast.success(
      "Copied",
      "Present address copied to permanent address successfully."
    );
  };

  const tabs: { key: TabKey; label: string; bng: string; icon: React.ElementType }[] = [
    {
      key: "basic",
      label: "Basic Info",
      bng: "প্রাথমিক তথ্য",
      icon: User,
    },
    {
      key: "family_address",
      label: "Family & Address",
      bng: "পারিবারিক ও ঠিকানা",
      icon: Home,
    },
    {
      key: "organization",
      label: "Placement & Terms",
      bng: "পদবী, বিভাগ ও গ্রেড",
      icon: Briefcase,
    },
    {
      key: "emergency_nominee",
      label: "Emergency & Nominee",
      bng: "জরুরী ও নমিনী",
      icon: HeartHandshake,
    },
    {
      key: "disbursement_biometrics",
      label: "Payroll & Biometrics",
      bng: "ব্যাংকিং ও বায়োমেট্রিক",
      icon: CreditCard,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      setActiveTab("basic");
      toast.error("Validation Error", "First name is mandatory.");
      return;
    }

    if (!employeeId.trim()) {
      setActiveTab("basic");
      toast.error("Validation Error", "Employee ID is mandatory.");
      return;
    }

    if (!workEmail.trim() || !workEmail.includes("@")) {
      setActiveTab("family_address");
      toast.error(
        "Validation Error",
        "Please provide a valid official work email address."
      );
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        // Tab 1
        first_name: firstName.trim(),
        middle_name: middleName.trim() || null,
        last_name: lastName.trim() || null,
        bangla_name: banglaName.trim() || null,
        employee_id: employeeId.trim(),
        photo_url: photoUrl.trim() || null,
        gender,
        date_of_birth: dateOfBirth || null,
        blood_group: bloodGroup || null,
        marital_status: maritalStatus || null,
        religion: religion || null,
        nationality: nationality.trim() || null,
        national_id: nationalId.trim() || null,
        tin: tin.trim() || null,
        passport_no: passportNo.trim() || null,

        // Tab 2
        father_name: fatherName.trim() || null,
        mother_name: motherName.trim() || null,
        spouse_name: spouseName.trim() || null,
        work_email: workEmail.trim().toLowerCase(),
        personal_email: personalEmail.trim().toLowerCase() || null,
        phone: phone.trim() || null,
        linkedin: linkedin.trim() || null,
        present_address: presentAddress.trim() || null,
        present_thana: presentThana.trim() || null,
        present_district: presentDistrict.trim() || null,
        present_division: presentDivision || null,
        present_post_code: presentPostCode.trim() || null,
        permanent_address: permanentAddress.trim() || null,
        permanent_thana: permanentThana.trim() || null,
        permanent_district: permanentDistrict.trim() || null,
        permanent_division: permanentDivision || null,
        permanent_post_code: permanentPostCode.trim() || null,

        // Tab 3
        branch_id: branchId || null,
        department_id: departmentId || null,
        job_title_id: jobTitleId || null,
        salary_grade_id: salaryGradeId || null,
        direct_manager_id: directManagerId || null,
        team: team.trim() || null,
        is_department_head: isDepartmentHead,
        is_active: isActive,
        employee_category: employeeCategory || "management",
        employment_type: employmentType || "full_time",
        work_arrangement: workArrangement || "onsite",
        start_date: startDate || null,
        confirmation_date: confirmationDate || null,
        contract_end_date: contractEndDate || null,
        probation_period_months: probationPeriodMonths ?? 3,
        probation_end_date: probationEndDate || null,
        notice_period_days: noticePeriodDays ?? 30,
        is_overtime_eligible: isOvertimeEligible,
        working_hours: workingHours.trim() || null,
        working_days_per_week: workingDaysPerWeek ?? 5,

        // Tab 4
        emergency_contact_name: emergencyContactName.trim() || null,
        emergency_contact_relation: emergencyContactRelation.trim() || null,
        emergency_contact_phone: emergencyContactPhone.trim() || null,
        emergency_contact: emergencyContact.trim() || null,

        // Tab 5
        disbursement_method: disbursementMethod || "bank_transfer",
        bank_name: bankName.trim() || null,
        bank_branch: bankBranch.trim() || null,
        bank_account_no: bankAccountNo.trim() || null,
        bank_account_title: bankAccountTitle.trim() || null,
        bank_routing_number: bankRoutingNumber.trim() || null,
        mfs_provider: mfsProvider || null,
        mfs_number: mfsNumber.trim() || null,
        biometric_user_id: biometricUserId.trim() || null,
        rfid_card_number: rfidCardNumber.trim() || null,
        skills_expertise: skillsExpertise.trim() || null,
      };

      if (isEdit && initialData) {
        await apiClient.put(`/employees/${initialData.id}`, payload);
        toast.success(
          "Employee Updated",
          `${firstName} ${lastName || ""}'s profile was updated successfully.`
        );
      } else {
        payload.business_id = 1; // Backend auto-assigns scoped tenant business_id
        await apiClient.post("/employees", payload);
        toast.success(
          "Employee Onboarded",
          `${firstName} ${lastName || ""} has been added to the corporate roster.`
        );
      }

      router.push("/hr-payroll/employees");
    } catch (err: unknown) {
      let msg = "Failed to save employee profile.";
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        msg = axErr.response?.data?.detail || msg;
      }
      toast.error(isEdit ? "Update Failed" : "Creation Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const currentTabIndex = tabs.findIndex((t) => t.key === activeTab);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full">
      {/* 5-Tab Navigation Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold leading-tight truncate">
                    {idx + 1}. {tab.label}
                  </div>
                  <div
                    className={`text-[10px] truncate ${
                      isSelected ? "text-indigo-100" : "text-slate-400"
                    }`}
                  >
                    {tab.bng}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: Basic Information (প্রাথমিক তথ্য)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "basic" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Basic Identity Information (প্রাথমিক তথ্য)
                </h2>
                <p className="text-xs text-slate-500">
                  Official names, government IDs, photo, and statutory demographics
                </p>
              </div>
            </div>
            {photoUrl && (
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-200 shrink-0">
                <img
                  src={photoUrl}
                  alt="Employee"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mohammad"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Middle Name
              </label>
              <input
                type="text"
                placeholder="Optional"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                placeholder="e.g. Rahman"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name in Bengali (বাংলায় পূর্ণ নাম)
              </label>
              <input
                type="text"
                placeholder="যেমন: মোহাম্মদ আব্দুর রহমান"
                value={banglaName}
                onChange={(e) => setBanglaName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Employee ID <span className="text-rose-500">*</span>
                </label>
                {!isEdit && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={idPrefix}
                      onChange={(e) => {
                        setIdPrefix(e.target.value);
                        fetchNextEmployeeId(e.target.value);
                      }}
                      className="text-[10px] bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 font-semibold"
                    >
                      <option value="EMP-">EMP-</option>
                      <option value="STAFF-">STAFF-</option>
                      <option value="TECH-">TECH-</option>
                      <option value="CORP-">CORP-</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => fetchNextEmployeeId(idPrefix)}
                      disabled={loadingNextId}
                      className="text-[10px] text-indigo-600 font-semibold hover:underline flex items-center gap-0.5"
                    >
                      <RefreshCw
                        className={`w-2.5 h-2.5 ${
                          loadingNextId ? "animate-spin" : ""
                        }`}
                      />
                      Auto
                    </button>
                  </div>
                )}
              </div>
              <input
                type="text"
                required
                placeholder="EMP-001"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Photo URL (ছবি লিংক)
              </label>
              <input
                type="url"
                placeholder="https://example.com/photos/employee.jpg"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Gender <span className="text-rose-500">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition capitalize"
              >
                <option value="male">Male (পুরুষ)</option>
                <option value="female">Female (মহিলা)</option>
                <option value="other">Other (অন্যান্য)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Date of Birth (জন্ম তারিখ)
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Blood Group (রক্তের গ্রুপ)
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="">Select Blood Group</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Marital Status (বৈবাহিক অবস্থা)
              </label>
              <select
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="single">Single (অবিবাহিত)</option>
                <option value="married">Married (বিবাহিত)</option>
                <option value="divorced">Divorced (তালাকপ্রাপ্ত)</option>
                <option value="widowed">Widowed (বিধবা/বিপত্নীক)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Religion (ধর্ম)
              </label>
              <select
                value={religion}
                onChange={(e) => setReligion(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                {RELIGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nationality (জাতীয়তা)
              </label>
              <input
                type="text"
                placeholder="Bangladeshi"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                National ID / NID (জাতীয় পরিচয়পত্র)
              </label>
              <input
                type="text"
                placeholder="10, 13, or 17 digit NID"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                e-TIN Number (কর শনাক্তকরণ নম্বর)
              </label>
              <input
                type="text"
                placeholder="12 digit e-TIN"
                value={tin}
                onChange={(e) => setTin(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Passport No (পাসপোর্ট নম্বর)
              </label>
              <input
                type="text"
                placeholder="Optional"
                value={passportNo}
                onChange={(e) => setPassportNo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: Family & Detailed Address (পারিবারিক ও ঠিকানা)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "family_address" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Family Lineage & Contact Address (পারিবারিক ও ঠিকানা)
              </h2>
              <p className="text-xs text-slate-500">
                BLA 2006 statutory service book parentage, dual addresses, and contact methods
              </p>
            </div>
          </div>

          {/* Parents & Spouse */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Family Lineage (পারিবারিক তথ্য)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Father's Name (পিতার নাম)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Late Abdul Karim"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mother's Name (মাতার নাম)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fatima Begum"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Spouse's Name (স্বামী/স্ত্রীর নাম)
                </label>
                <input
                  type="text"
                  placeholder="Leave blank if unmarried"
                  value={spouseName}
                  onChange={(e) => setSpouseName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600" />
              Contact Channels (যোগাযোগ মাধ্যম)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Official Work Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="user@company.com"
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Personal Email
                </label>
                <input
                  type="email"
                  placeholder="user@gmail.com"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Primary Phone (মোবাইল নম্বর)
                </label>
                <input
                  type="tel"
                  placeholder="+880 1700-000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  LinkedIn Profile
                </label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Present Address */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-600" />
                Present Address (বর্তমান ঠিকানা)
              </h3>
              <button
                type="button"
                onClick={handleCopyPresentAddress}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold rounded-lg text-xs transition"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy to Permanent Address
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Road / House / Flat / Village (সড়ক ও বাসা)
                </label>
                <input
                  type="text"
                  placeholder="House 12, Road 4, Sector 7, Uttara"
                  value={presentAddress}
                  onChange={(e) => setPresentAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Thana / Upazila (থানা/উপজেলা)
                </label>
                <input
                  type="text"
                  placeholder="Uttara"
                  value={presentThana}
                  onChange={(e) => setPresentThana(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  District (জেলা)
                </label>
                <input
                  type="text"
                  placeholder="Dhaka"
                  value={presentDistrict}
                  onChange={(e) => setPresentDistrict(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Division (বিভাগ)
                </label>
                <select
                  value={presentDivision}
                  onChange={(e) => setPresentDivision(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  {BD_DIVISIONS.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Postal Code (পোস্ট কোড)
                </label>
                <input
                  type="text"
                  placeholder="1230"
                  value={presentPostCode}
                  onChange={(e) => setPresentPostCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Permanent Address */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Home className="w-4 h-4 text-emerald-600" />
              Permanent Address (স্থায়ী ঠিকানা)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Village / Post Office / Road (গ্রাম/ডাকঘর/সড়ক)
                </label>
                <input
                  type="text"
                  placeholder="Permanent residential address"
                  value={permanentAddress}
                  onChange={(e) => setPermanentAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Thana / Upazila (থানা/উপজেলা)
                </label>
                <input
                  type="text"
                  placeholder="Upazila name"
                  value={permanentThana}
                  onChange={(e) => setPermanentThana(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  District (জেলা)
                </label>
                <input
                  type="text"
                  placeholder="District name"
                  value={permanentDistrict}
                  onChange={(e) => setPermanentDistrict(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Division (বিভাগ)
                </label>
                <select
                  value={permanentDivision}
                  onChange={(e) => setPermanentDivision(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  {BD_DIVISIONS.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Postal Code (পোস্ট কোড)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3100"
                  value={permanentPostCode}
                  onChange={(e) => setPermanentPostCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: Organizational Placement & Terms (পদবী, বিভাগ ও গ্রেড)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "organization" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Organizational Placement & Terms (পদবী, বিভাগ ও গ্রেড)
              </h2>
              <p className="text-xs text-slate-500">
                Department assignments, salary scale grade, direct supervisor, and contractual rules
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Branch / Workplace Location
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="">Head Office / Unassigned</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Department (বিভাগ)
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="">No Department Assigned</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Designation / Job Title (পদবী)
              </label>
              <select
                value={jobTitleId}
                onChange={(e) => setJobTitleId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="">No Designation Assigned</option>
                {jobTitles.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name} {j.short_name ? `(${j.short_name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Salary Grade (বেতন গ্রেড)
              </label>
              <select
                value={salaryGradeId}
                onChange={(e) => setSalaryGradeId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="">No Salary Grade Assigned</option>
                {salaryGrades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Direct Reporting Manager (তত্ত্বাবধায়ক)
              </label>
              <SearchableEmployeeCombobox
                employees={managerCandidates}
                value={directManagerId}
                onChange={(empId) => setDirectManagerId(empId)}
                placeholder="Search & select direct reporting manager..."
                allowClear={true}
                emptyUnassignedLabel="No Reporting Manager (Self / Board)"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sub-Unit / Team
              </label>
              <input
                type="text"
                placeholder="e.g. Core Engineering"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Employment Classification & Terms */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Contractual Terms & Classification
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Employee Category
                </label>
                <select
                  value={employeeCategory}
                  onChange={(e) => setEmployeeCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition capitalize"
                >
                  <option value="management">Management Staff</option>
                  <option value="staff">General Staff</option>
                  <option value="worker">Factory / Production Worker</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Employment Type
                </label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition capitalize"
                >
                  <option value="full_time">Full Time (স্থায়ী)</option>
                  <option value="part_time">Part Time (অর্ধকালীন)</option>
                  <option value="contract">Contractual (চুক্তিভিত্তিক)</option>
                  <option value="intern">Intern / Trainee (প্রশিক্ষণার্থী)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Work Arrangement
                </label>
                <select
                  value={workArrangement}
                  onChange={(e) => setWorkArrangement(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition capitalize"
                >
                  <option value="onsite">On-site (অফিস)</option>
                  <option value="remote">Remote (রিমোট)</option>
                  <option value="hybrid">Hybrid (হাইব্রিড)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Joining Date (যোগদানের তারিখ)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirmation Date (স্থায়ীকরণের তারিখ)
                </label>
                <input
                  type="date"
                  value={confirmationDate}
                  onChange={(e) => setConfirmationDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Probation Period (Months)
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={probationPeriodMonths}
                  onChange={(e) =>
                    setProbationPeriodMonths(Number(e.target.value))
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Notice Period (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={noticePeriodDays}
                  onChange={(e) => setNoticePeriodDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Contract End Date (if contract)
                </label>
                <input
                  type="date"
                  value={contractEndDate}
                  onChange={(e) => setContractEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Working Schedule & Status */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Working Hours & Active Privileges
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Standard Working Hours
                </label>
                <input
                  type="text"
                  placeholder="e.g. 40 hrs/week (09:00 AM - 06:00 PM)"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Working Days Per Week
                </label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={workingDaysPerWeek}
                  onChange={(e) =>
                    setWorkingDaysPerWeek(Number(e.target.value))
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex flex-col justify-end space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOvertimeEligible}
                    onChange={(e) => setIsOvertimeEligible(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Overtime Eligible (ওভারটাইম প্রযোজ্য)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDepartmentHead}
                    onChange={(e) => setIsDepartmentHead(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Department Head Authority
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-emerald-700">
                    Account Status: Active Personnel
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: Emergency Contacts & Nominees (জরুরী যোগাযোগ ও নমিনী)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "emergency_nominee" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Emergency Contact & Nominees (জরুরী যোগাযোগ ও নমিনী)
              </h2>
              <p className="text-xs text-slate-500">
                Primary emergency notifier and statutory BLA 2006 Form 33 nominee management
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Emergency Contact Name (জরুরী যোগাযোগের ব্যক্তির নাম)
              </label>
              <input
                type="text"
                placeholder="e.g. Begum Rokeya"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Relationship (সম্পর্ক)
              </label>
              <input
                type="text"
                placeholder="e.g. Spouse / Brother / Father"
                value={emergencyContactRelation}
                onChange={(e) => setEmergencyContactRelation(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Emergency Phone Number (জরুরী ফোন নম্বর)
              </label>
              <input
                type="tel"
                placeholder="+880 1800-000000"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Emergency Contact Address / Special Instructions
              </label>
              <textarea
                rows={2}
                placeholder="Additional address, alternate contacts, or medical emergency notes..."
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Statutory Nominee Notice Box */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 flex items-start gap-3.5">
            <FileText className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <div className="font-bold">
                Bangladesh Labour Act (BLA 2006) - Form 33 Statutory Nominee Declaration
              </div>
              <p className="text-amber-800 leading-relaxed">
                Under Bangladesh Labour Law, every employee must declare one or more legal nominees entitled to receive provident fund, gratuity, and statutory death benefits.
                {isEdit && initialData && (
                  <span>
                    {" "}You can configure and manage Form 33 Nominees with distribution percentages directly from the employee profile view.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 5: Salary Disbursement & Biometrics (ব্যাংকিং ও বায়োমেট্রিক)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "disbursement_biometrics" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Salary Disbursement & Hardware Biometrics (ব্যাংকিং ও বায়োমেট্রিক)
              </h2>
              <p className="text-xs text-slate-500">
                BEFTN Bank transfer, bKash/Nagad MFS payroll routing, and timeclock sync keys
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              Payroll Disbursement Channel
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Disbursement Method
                </label>
                <select
                  value={disbursementMethod}
                  onChange={(e) => setDisbursementMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="bank_transfer">Bank Transfer (BEFTN / NPSB)</option>
                  <option value="mfs_bkash">bKash Payroll (MFS)</option>
                  <option value="mfs_nagad">Nagad Payroll (MFS)</option>
                  <option value="mfs_rocket">Rocket Payroll (MFS)</option>
                  <option value="cash">Cash in Envelope (ক্যাশ)</option>
                </select>
              </div>

              {disbursementMethod === "bank_transfer" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Bank Name (ব্যাংকের নাম)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dutch-Bangla Bank PLC"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Branch Name (শাখা)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Gulshan Branch"
                      value={bankBranch}
                      onChange={(e) => setBankBranch(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Account Number (হিসাব নম্বর)
                    </label>
                    <input
                      type="text"
                      placeholder="13-17 digit account number"
                      value={bankAccountNo}
                      onChange={(e) => setBankAccountNo(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Account Title (হিসাবধারীর নাম)
                    </label>
                    <input
                      type="text"
                      placeholder="Account name as in bank"
                      value={bankAccountTitle}
                      onChange={(e) => setBankAccountTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Bank Routing Number (রাউটিং নম্বর)
                    </label>
                    <input
                      type="text"
                      placeholder="9 digit routing number"
                      value={bankRoutingNumber}
                      onChange={(e) => setBankRoutingNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                  </div>
                </>
              )}

              {(disbursementMethod.startsWith("mfs_") ||
                disbursementMethod === "mfs_bkash" ||
                disbursementMethod === "mfs_nagad" ||
                disbursementMethod === "mfs_rocket") && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      MFS Wallet Provider
                    </label>
                    <select
                      value={mfsProvider}
                      onChange={(e) => setMfsProvider(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition capitalize"
                    >
                      <option value="bkash">bKash</option>
                      <option value="nagad">Nagad</option>
                      <option value="rocket">Rocket</option>
                      <option value="upay">Upay</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      MFS Wallet Number (মোবাইল নম্বর)
                    </label>
                    <input
                      type="tel"
                      placeholder="01700000000"
                      value={mfsNumber}
                      onChange={(e) => setMfsNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Biometrics & Access Control */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-indigo-600" />
              Biometrics & Time Attendance Hardware Sync
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Biometric Machine Device User ID (মেশিন আইডি)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1042 (ZKTeco / Hikvision / Realand ID)"
                  value={biometricUserId}
                  onChange={(e) => setBiometricUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Matches device attendance punches with employee records automatically
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  RFID / Proximity Smart Card Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0008432198"
                  value={rfidCardNumber}
                  onChange={(e) => setRfidCardNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  NFC / RFID access control card number for turnstiles and doors
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Skills, Certifications & Expertise
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Python, FastAPI, Docker, PostgreSQL, Bangladesh Labour Act 2006 compliance..."
                  value={skillsExpertise}
                  onChange={(e) => setSkillsExpertise(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation & Save Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <Link
            href="/hr-payroll/employees"
            className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition"
          >
            Cancel
          </Link>

          {currentTabIndex > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab(tabs[currentTabIndex - 1].key)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Previous Tab
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {currentTabIndex < tabs.length - 1 && (
            <button
              type="button"
              onClick={() => setActiveTab(tabs[currentTabIndex + 1].key)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition"
            >
              Next Tab
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Profile...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {isEdit ? "Update Employee Profile" : "Save & Onboard Employee"}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
