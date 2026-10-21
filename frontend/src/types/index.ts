export interface BusinessProfile {
  id: number;
  name_en: string;
  short_name?: string | null;
  legal_name?: string | null;
  company_tagline?: string | null;
  description?: string | null;
  logo?: string | null;
  favicon?: string | null;

  cr_number?: string | null;
  vat_number?: string | null;
  tax_number?: string | null;
  license_number?: string | null;
  license_expiry_date?: string | null;
  chamber_of_commerce_no?: string | null;
  national_address?: string | null;

  building_no?: string | null;
  street?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip_code?: string | null;
  po_box?: string | null;
  address_no?: string | null;
  address_en?: string | null;

  phone?: string | null;
  mobile?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  support_email?: string | null;
  sales_email?: string | null;
  invoice_email?: string | null;
  website?: string | null;

  contact_person?: string | null;
  contact_designation?: string | null;
  contact_mobile?: string | null;

  bank_name?: string | null;
  bank_branch?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_swift_code?: string | null;
  bank_iban?: string | null;

  facebook_url?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  twitter_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;

  currency_code: string;
  currency_symbol: string;

  invoice_prefix: string;
  quotation_prefix: string;
  credit_note_prefix: string;
  purchase_order_prefix: string;
  invoice_sequence_start: number;
  vat_rate: number | string;
  payment_terms?: string | null;
  invoice_terms?: string | null;
  invoice_footer?: string | null;

  zatca_enabled: boolean;
  e_invoice_enabled: boolean;

  timezone: string;
  language: string;

  is_active: boolean;
  subscription_plan_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type BusinessProfileInput = Omit<
  BusinessProfile,
  "id" | "created_at" | "updated_at" | "logo" | "favicon"
> & {
  logo?: string | null;
  favicon?: string | null;
};

export interface User {
  id: number;
  email: string;
  username: string;
  phone?: string | null;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified?: boolean;
  can_use_offline_mode?: boolean;
  is_offline_sync_enabled?: boolean;
  created_at?: string;
  business_id?: number | null;
  business?: BusinessProfile;
  roles?: Role[];
  direct_permissions?: Permission[];
  permissions?: string[];
}

export interface Role {
  id: number;
  name: string;
  slug?: string;
  description?: string | null;
  business_id?: number | null;
  permissions?: Permission[];
}

export interface Permission {
  id: number;
  module: string;
  feature: string;
  action: string;
  code: string;
  name?: string | null;
}

export interface SystemModuleCategory {
  category: string;
  features: [string, string][];
}

export interface SystemModule {
  title: string;
  icon: string;
  categories?: SystemModuleCategory[];
  features?: [string, string][];
}

export type SystemModulesMap = Record<string, SystemModule>;

export interface RoleCreateInput {
  name: string;
  description?: string;
  business_id?: number | null;
  permission_ids: number[];
}

export interface RoleUpdateInput {
  name?: string;
  description?: string;
  business_id?: number | null;
  permission_ids?: number[];
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  permission_ids: number[];
  permission_codes?: string[];
}

export interface SubscriptionPlanCreateInput {
  name: string;
  description?: string | null;
  is_active?: boolean;
  permission_ids: number[];
}

export interface SubscriptionPlanUpdateInput {
  name?: string;
  description?: string | null;
  is_active?: boolean;
  permission_ids?: number[];
}

export interface TenantPlanStatus {
  auth_strategy: string;
  subscription_required: boolean;
  has_business: boolean;
  business_name?: string | null;
  business_slug?: string | null;
  plan_id?: number | null;
  plan_name: string;
  plan_description?: string | null;
  permissions_count: number;
  is_active: boolean;
}

export interface UserCreateInput {
  username: string;
  email: string;
  password: string;
  phone?: string;
  business_id?: number | null;
  is_active?: boolean;
  is_superuser?: boolean;
  can_use_offline_mode?: boolean;
  role_ids?: number[];
  permission_ids?: number[];
}

export interface UserUpdateInput {
  username?: string;
  email?: string;
  password?: string;
  phone?: string;
  business_id?: number | null;
  is_active?: boolean;
  is_superuser?: boolean;
  can_use_offline_mode?: boolean;
  role_ids?: number[];
  permission_ids?: number[];
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
}

export interface ProductListItem {
  id: string;
  title: string;
  slug: string;
  brand?: string | null;
  brand_id?: string | null;
  model_id?: string | null;
  status: "draft" | "active" | "archived" | "inactive" | string;
  thumbnail_url?: string | null;
  min_price?: number | string | null;
  business_id?: number | null;
  is_featured?: boolean;
  average_rating?: number | string;
  sku?: string;
  created_at?: string;
}

export interface ProductImage {
  id?: string;
  url: string;
  position?: number;
  alt_text?: string | null;
  is_primary?: boolean;
}

export interface ProductVariant {
  id?: string;
  sku: string;
  barcode?: string | null;
  price: number;
  compare_at_price?: number | null;
  currency?: string;
  stock_qty?: number;
  low_stock_threshold?: number;
  is_default?: boolean;
}

export interface ProductDetailOut {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  brand?: string | null;
  status: "draft" | "active" | "archived" | "inactive" | string;
  condition?: "new" | "used" | "refurbished" | string;
  product_type?: "physical" | "digital" | "service" | string;
  requires_shipping?: boolean;
  category_id?: string | null;
  brand_id?: string | null;
  business_id?: number | null;
  is_featured?: boolean;
  average_rating?: number | string;
  sold_count?: number;
  review_count?: number;
  variants: ProductVariant[];
  images: ProductImage[];
  created_at?: string;
  updated_at?: string;
}

export interface ProductCreateInput {
  title: string;
  slug: string;
  description?: string;
  brand?: string;
  status: string;
  condition?: string;
  product_type?: string;
  requires_shipping?: boolean;
  category_id?: string | null;
  brand_id?: string | null;
  business_id?: number | null;
  is_featured?: boolean;
  variants?: Array<{
    sku: string;
    price: number;
    compare_at_price?: number;
    currency?: string;
    is_default?: boolean;
  }>;
  images?: Array<{
    url: string;
    position?: number;
    alt_text?: string;
    is_primary?: boolean;
  }>;
}

export interface CategoryOut {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parent_id?: string | null;
  business_id?: number | null;
}

export interface BrandOut {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  business_id?: number | null;
}

export interface BranchOut {
  id: string;
  name: string;
  code: string;
  branch_type: string;
  manager_employee_id?: string | null;
  manager_name?: string | null;
  employee_count?: number;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip_code?: string | null;
  is_head_office: boolean;
  is_active: boolean;
  business_id: number;
}

export interface BranchCreateInput {
  name: string;
  code: string;
  branch_type: string;
  manager_employee_id?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip_code?: string | null;
  is_head_office?: boolean;
  is_active?: boolean;
  business_id?: number;
}

export interface BranchUpdateInput {
  name?: string | null;
  code?: string | null;
  branch_type?: string | null;
  manager_employee_id?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip_code?: string | null;
  is_head_office?: boolean | null;
  is_active?: boolean | null;
  business_id?: number | null;
}

export interface DepartmentOut {
  id: string;
  name: string;
  code?: string | null;
  slug: string;
  description?: string | null;
  is_active: boolean;
  multiple_heads_allowed?: boolean;
  parent_department_id?: string | null;
  parent_department_name?: string | null;
  head_employee_id?: string | null;
  head_employee_name?: string | null;
  employee_count?: number;
  business_id?: number | null;
  created_at?: string;
}

export interface DepartmentCreateInput {
  name: string;
  code?: string | null;
  slug: string;
  description?: string | null;
  is_active?: boolean;
  multiple_heads_allowed?: boolean;
  parent_department_id?: string | null;
  head_employee_id?: string | null;
  business_id?: number | null;
}

export interface DepartmentUpdateInput {
  name?: string | null;
  code?: string | null;
  slug?: string | null;
  description?: string | null;
  is_active?: boolean | null;
  multiple_heads_allowed?: boolean | null;
  parent_department_id?: string | null;
  head_employee_id?: string | null;
  business_id?: number | null;
}

export interface JobTitleOut {
  id: string;
  name: string;
  short_name?: string | null;
  description?: string | null;
  level_rank?: number;
  is_active: boolean;
  department_id?: string | null;
  department_name?: string | null;
  salary_grade_id?: string | null;
  salary_grade_name?: string | null;
  salary_grade_code?: string | null;
  employee_count?: number;
  business_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface JobTitleCreateInput {
  name: string;
  short_name?: string | null;
  description?: string | null;
  level_rank?: number;
  is_active?: boolean;
  department_id?: string | null;
  salary_grade_id?: string | null;
  business_id?: number;
}

export interface JobTitleUpdateInput {
  name?: string | null;
  short_name?: string | null;
  description?: string | null;
  level_rank?: number | null;
  is_active?: boolean | null;
  department_id?: string | null;
  salary_grade_id?: string | null;
  business_id?: number | null;
}

export interface SalaryGradeOut {
  id: string;
  name: string;
  code: string;
  level_rank: number;
  description?: string | null;
  min_gross_salary?: number | null;
  max_gross_salary?: number | null;
  default_basic_percent?: number | null;
  is_active: boolean;
  business_id: number;
  job_title_count?: number;
  employee_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SalaryGradeCreateInput {
  name: string;
  code: string;
  level_rank: number;
  description?: string | null;
  min_gross_salary?: number | null;
  max_gross_salary?: number | null;
  default_basic_percent?: number | null;
  is_active?: boolean;
  business_id: number;
}

export interface SalaryGradeUpdateInput {
  name?: string | null;
  code?: string | null;
  level_rank?: number | null;
  description?: string | null;
  min_gross_salary?: number | null;
  max_gross_salary?: number | null;
  default_basic_percent?: number | null;
  is_active?: boolean | null;
  business_id?: number | null;
}

export interface EmployeeNomineeOut {
  id: string;
  employee_id: string;
  business_id: number;
  nominee_name: string;
  nominee_name_bangla?: string | null;
  relation: string;
  nid_or_birth_cert?: string | null;
  dob?: string | null;
  share_percentage: number;
  phone?: string | null;
  address?: string | null;
  photo_url?: string | null;
  is_minor: boolean;
  guardian_name?: string | null;
  guardian_relation?: string | null;
  guardian_nid?: string | null;
  guardian_phone?: string | null;
  guardian_address?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeNomineeInput {
  nominee_name: string;
  nominee_name_bangla?: string;
  relation: string;
  nid_or_birth_cert?: string;
  dob?: string | null;
  share_percentage: number;
  phone?: string;
  address?: string;
  photo_url?: string;
  is_minor?: boolean;
  guardian_name?: string;
  guardian_relation?: string;
  guardian_nid?: string;
  guardian_phone?: string;
  guardian_address?: string;
}

export interface EmployeeOut {
  id: string;
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
  full_name: string;
  bangla_name?: string | null;
  employee_id: string;
  date_of_birth?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  religion?: string | null;
  blood_group?: string | null;
  nationality?: string | null;
  national_id?: string | null;
  passport_no?: string | null;
  tin?: string | null;
  photo_url?: string | null;

  father_name?: string | null;
  mother_name?: string | null;
  spouse_name?: string | null;

  work_email: string;
  personal_email?: string | null;
  phone?: string | null;
  emergency_contact?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_relation?: string | null;
  emergency_contact_phone?: string | null;
  linkedin?: string | null;

  residential_address?: string | null;
  present_address?: string | null;
  present_thana?: string | null;
  present_district?: string | null;
  present_division?: string | null;
  present_post_code?: string | null;

  permanent_address?: string | null;
  permanent_thana?: string | null;
  permanent_district?: string | null;
  permanent_division?: string | null;
  permanent_post_code?: string | null;

  disbursement_method?: "bank_transfer" | "mfs_bkash" | "mfs_nagad" | "mfs_rocket" | "cash" | string | null;
  bank_name?: string | null;
  bank_branch?: string | null;
  bank_account_no?: string | null;
  bank_account_title?: string | null;
  bank_routing_number?: string | null;
  mfs_provider?: "bkash" | "nagad" | "rocket" | string | null;
  mfs_number?: string | null;

  job_title_id?: string | null;
  job_title_name?: string | null;
  job_title?: JobTitleOut | null;
  department_id?: string | null;
  department_name?: string | null;
  department?: DepartmentOut | null;
  branch_id?: string | null;
  branch_name?: string | null;
  branch?: BranchOut | null;
  salary_grade_id?: string | null;
  salary_grade_name?: string | null;
  salary_grade?: SalaryGradeOut | null;
  team?: string | null;
  direct_manager_id?: string | null;
  manager_name?: string | null;


  employee_category?: "management" | "staff" | "worker" | string | null;
  employment_type?: "full_time" | "part_time" | "contract" | "intern" | string | null;
  start_date?: string | null;
  confirmation_date?: string | null;
  contract_end_date?: string | null;
  probation_period_months?: number | null;
  probation_end_date?: string | null;
  notice_period_days?: number | null;
  is_overtime_eligible?: boolean;
  work_arrangement?: "onsite" | "remote" | "hybrid" | string | null;
  working_hours?: string | null;
  working_days_per_week?: number | null;

  biometric_user_id?: string | null;
  rfid_card_number?: string | null;

  skills_expertise?: string | null;
  is_department_head?: boolean;
  is_active: boolean;
  business_id: number;
  nominees?: EmployeeNomineeOut[];
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeCreateInput {
  first_name: string;
  middle_name?: string;
  last_name?: string;
  bangla_name?: string;
  employee_id: string;
  work_email: string;
  personal_email?: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string | null;
  religion?: string;
  blood_group?: string;
  national_id?: string;
  tin?: string;
  father_name?: string;
  mother_name?: string;
  spouse_name?: string;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;
  present_address?: string;
  present_thana?: string;
  present_district?: string;
  present_division?: string;
  present_post_code?: string;
  permanent_address?: string;
  permanent_thana?: string;
  permanent_district?: string;
  permanent_division?: string;
  permanent_post_code?: string;
  disbursement_method?: string;
  bank_name?: string;
  bank_branch?: string;
  bank_account_no?: string;
  bank_account_title?: string;
  bank_routing_number?: string;
  mfs_provider?: string;
  mfs_number?: string;
  department_id?: string | null;
  branch_id?: string | null;
  job_title_id?: string | null;
  salary_grade_id?: string | null;
  direct_manager_id?: string | null;
  team?: string;
  employee_category?: string;
  employment_type?: string;
  work_arrangement?: string;
  start_date?: string | null;
  probation_period_months?: number;
  is_overtime_eligible?: boolean;
  biometric_user_id?: string;
  rfid_card_number?: string;
  skills_expertise?: string;
  is_department_head?: boolean;
  is_active?: boolean;
  business_id?: number;
}

export interface OrgChartNodeOut {
  id: string;
  employee_id: string;
  name: string;
  bangla_name?: string | null;
  job_title?: string | null;
  department?: string | null;
  branch?: string | null;
  salary_grade?: string | null;
  photo_url?: string | null;
  email: string;
  phone?: string | null;
  direct_manager_id?: string | null;
  reports: OrgChartNodeOut[];
}

export interface IDCardDataOut {
  employee_id: string;
  full_name: string;
  bangla_name?: string | null;
  photo_url?: string | null;
  job_title?: string | null;
  department?: string | null;
  branch?: string | null;
  blood_group?: string | null;
  emergency_contact_phone?: string | null;
  joining_date?: string | null;
  biometric_user_id?: string | null;
  rfid_card_number?: string | null;
  company_name: string;
  company_address?: string | null;
  company_logo_url?: string | null;
  verification_url: string;
}

export interface OrganogramEmployeeNode {
  id: string;
  employee_id: string;
  name: string;
  work_email: string;
  phone?: string | null;
  job_title?: string | null;
  level_rank: number;
  department?: string | null;
  department_id?: string | null;
  branch?: string | null;
  branch_id?: string | null;
  is_department_head: boolean;
  is_active: boolean;
  avatar_url?: string | null;
  direct_manager_id?: string | null;
  subordinate_count: number;
  subordinates: OrganogramEmployeeNode[];
}

export interface BranchStructureNode {
  branch_id: string;
  branch_name: string;
  branch_code: string;
  branch_type: string;
  is_head_office: boolean;
  city?: string | null;
  manager_name?: string | null;
  employee_count: number;
  employees: OrganogramEmployeeNode[];
}

export interface OrganogramStructureTree {
  business_id: number;
  company_name: string;
  total_branches: number;
  total_departments: number;
  total_employees: number;
  branches: BranchStructureNode[];
}

export type AttendanceStatusEnum =
  | "present"
  | "absent"
  | "late"
  | "half_day"
  | "on_leave"
  | "holiday"
  | "weekend";

export type AttendanceSourceEnum =
  | "manual"
  | "web"
  | "biometric"
  | "mobile"
  | "excel";

export interface AttendanceRecord {
  id: string;
  business_id: number;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  date: string;
  status: AttendanceStatusEnum | string;
  check_in?: string | null;
  check_out?: string | null;
  work_hours: number;
  overtime_hours: number;
  source: AttendanceSourceEnum | string;
  note?: string | null;
  recorded_by_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceCreatePayload {
  business_id: number;
  employee_id: string;
  date: string;
  status: AttendanceStatusEnum | string;
  check_in?: string | null;
  check_out?: string | null;
  work_hours?: number;
  overtime_hours?: number;
  source?: AttendanceSourceEnum | string;
  note?: string | null;
  recorded_by_id?: string | null;
}

export interface AttendanceUpdatePayload {
  business_id?: number;
  employee_id?: string;
  date?: string;
  status?: AttendanceStatusEnum | string;
  check_in?: string | null;
  check_out?: string | null;
  work_hours?: number;
  overtime_hours?: number;
  source?: AttendanceSourceEnum | string;
  note?: string | null;
  recorded_by_id?: string | null;
}

export interface ImportJobStatus {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  total_rows: number;
  processed: number;
  success_count: number;
  error_count: number;
  errors: Array<{ row?: number; message?: string; error?: string }>;
  cancelled: boolean;
  created_by?: string;
}


// ── Leave Management Types ─────────────────────────────────────────────
export type GenderApplicabilityEnum = "all" | "male" | "female";
export type LeaveStatusEnum = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveTypeOut {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  max_days_per_year: number;
  is_paid: boolean;
  requires_document: boolean;
  applicable_gender: GenderApplicabilityEnum;
  carry_forward: boolean;
  is_active: boolean;
  business_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface LeaveAllocationOut {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  allocated_days: number;
  used_days: number;
  carried_forward: number;
  encashed_days?: number;
  remaining_days: number;
  business_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface LeaveApplicationOut {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  document_url?: string | null;
  status: LeaveStatusEnum;
  reviewed_by_id?: string | null;
  review_note?: string | null;
  applied_at?: string | null;
  reviewed_at?: string | null;
  rolled_back_at?: string | null;
  rolled_back_by_id?: string | null;
  rollback_reason?: string | null;
  business_id: number;
  created_at?: string;
  updated_at?: string;
}

export type LeaveEncashmentStatus = "pending" | "approved" | "rejected" | "paid" | "cancelled";

export interface LeaveEncashmentOut {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  encashable_days: number;
  daily_rate: number;
  total_amount: number;
  status: LeaveEncashmentStatus;
  reason?: string | null;
  payroll_period_id?: string | null;
  reviewed_by_id?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
  payment_date?: string | null;
  payment_reference?: string | null;
  business_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface LeaveCarryForwardPreviewItem {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department_name: string;
  leave_type_id: string;
  leave_type_name: string;
  leave_type_code: string;
  carry_forward_allowed: boolean;
  from_year_balance: number;
  proposed_carry_forward: number;
  proposed_lapsed: number;
  new_annual_allocation: number;
  projected_starting_balance: number;
}

export interface LeaveCarryForwardPreviewResponse {
  from_year: number;
  to_year: number;
  total_employees: number;
  total_carried_days: number;
  total_lapsed_days: number;
  items: LeaveCarryForwardPreviewItem[];
}

export interface LeaveCarryForwardExecuteResponse {
  from_year: number;
  to_year: number;
  total_employees: number;
  total_carried_days: number;
  total_lapsed_days: number;
  allocations_created_or_updated: number;
  message: string;
}

// ── Payroll Types ───────────────────────────────────────────────────────
export type PayrollPeriodStatusEnum = "draft" | "processing" | "locked" | "paid";

export interface PayrollPeriodOut {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: PayrollPeriodStatusEnum | string;
  payment_date?: string | null;
  notes?: string | null;
  business_id: number;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayrollPeriodCreatePayload {
  name: string;
  start_date: string;
  end_date: string;
  status?: PayrollPeriodStatusEnum | string;
  payment_date?: string | null;
  notes?: string | null;
  business_id: number;
}

export interface PayrollPeriodUpdatePayload {
  name?: string;
  start_date?: string;
  end_date?: string;
  status?: PayrollPeriodStatusEnum | string;
  payment_date?: string | null;
  notes?: string | null;
  business_id?: number;
}

export interface PayrollSettingsOut {
  id: string;
  business_id: number;
  include_attendance: boolean;
  include_leave: boolean;
  include_holidays: boolean;
  include_overtime: boolean;
  deduct_absent_days: boolean;
  standard_hours_per_day: number;
  created_at: string;
  updated_at: string;
}

export interface PayrollSettingsUpdatePayload {
  include_attendance?: boolean;
  include_leave?: boolean;
  include_holidays?: boolean;
  include_overtime?: boolean;
  deduct_absent_days?: boolean;
  standard_hours_per_day?: number;
}

export interface PayrollRecordOut {
  id: string;
  period_id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  working_days: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  holiday_days: number;
  overtime_hours: number;
  basic_salary: number;
  house_rent: number;
  transport_allowance: number;
  medical_allowance: number;
  food_allowance: number;
  other_allowance: number;
  overtime_pay: number;
  bonus: number;
  tax: number;
  gross_salary: number;
  total_deduction: number;
  net_salary: number;
  payment_method?: string | null;
  bank_account?: string | null;
  is_paid: boolean;
  paid_at?: string | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
  business_id: number;
  provident_fund?: number;
  unpaid_leave_deduction?: number;
  loan_installment?: number;
  other_deduction?: number;
  employee?: EmployeeOut;
  period?: PayrollPeriodOut;
}

export interface PayrollRecordCreatePayload {
  business_id: number;
  period_id: string;
  employee_id: string;
  working_days?: number;
  present_days?: number;
  absent_days?: number;
  leave_days?: number;
  holiday_days?: number;
  overtime_hours?: number;
  basic_salary?: number;
  house_rent?: number;
  transport_allowance?: number;
  medical_allowance?: number;
  food_allowance?: number;
  other_allowance?: number;
  overtime_pay?: number;
  bonus?: number;
  tax?: number;
  provident_fund?: number;
  unpaid_leave_deduction?: number;
  loan_installment?: number;
  other_deduction?: number;
  payment_method?: string;
  bank_account?: string | null;
  is_paid?: boolean;
  paid_at?: string | null;
  note?: string | null;
}

export type PayrollRecordUpdatePayload = Partial<PayrollRecordCreatePayload>;

// ==========================================
// HR Letters & Certificates
// ==========================================

export type OfferLetterStatus = "draft" | "issued" | "revoked";

export interface OfferLetterOut {
  id: string;
  business_id: number;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string | null;
  job_title: string;
  department?: string | null;
  offered_salary: number;
  joining_date: string;
  issue_date: string;
  valid_until?: string | null;
  status: OfferLetterStatus;
  terms?: string | null;
  notes?: string | null;
  letter_no: string;
  created_at: string;
  updated_at: string;
}

export interface OfferLetterCreatePayload {
  business_id: number;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string | null;
  job_title: string;
  department?: string | null;
  offered_salary: number;
  joining_date: string;
  issue_date: string;
  valid_until?: string | null;
  terms?: string | null;
  notes?: string | null;
}

export type OfferLetterUpdatePayload = Partial<OfferLetterCreatePayload> & {
  status?: OfferLetterStatus;
};

export type AppointmentStatus = "draft" | "sent" | "accepted";

export interface AppointmentLetterOut {
  id: string;
  business_id: number;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string | null;
  job_title_id?: string | null;
  department_id?: string | null;
  job_title?: JobTitleOut | null;
  department?: DepartmentOut | null;
  offered_joining_date: string;
  probation_period_months: number;
  employment_type: string;
  offered_basic_salary: number;
  offered_gross_salary: number;
  allowance_details?: string | null;
  issue_date: string;
  valid_until: string;
  terms_and_conditions?: string | null;
  status: AppointmentStatus;
  employee_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentLetterCreatePayload {
  business_id: number;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string | null;
  job_title_id?: string | null;
  department_id?: string | null;
  offered_joining_date: string;
  probation_period_months?: number;
  employment_type?: string;
  offered_basic_salary: number;
  offered_gross_salary: number;
  allowance_details?: string | null;
  issue_date: string;
  valid_until: string;
  terms_and_conditions?: string | null;
}

export type AppointmentLetterUpdatePayload = Partial<AppointmentLetterCreatePayload> & {
  status?: AppointmentStatus;
};

export type SalaryCertificatePurpose =
  | "general"
  | "bank_loan"
  | "visa"
  | "tax"
  | "credit_card"
  | "embassy";

export type SalaryCertificateStatus = "draft" | "issued" | "revoked";

export interface SalaryCertificateOut {
  id: string;
  business_id: number;
  employee_id: string;
  employee?: EmployeeOut | null;
  certificate_no: string;
  issue_date: string;
  fiscal_year: string;
  assessment_year?: string | null;
  purpose: SalaryCertificatePurpose;
  addressed_to?: string | null;
  include_breakdown: boolean;
  status: SalaryCertificateStatus;
  basic_salary: number;
  gross_salary: number;
  net_salary: number;
  house_rent?: number | null;
  medical_allowance?: number | null;
  conveyance?: number | null;
  others_allowance?: number | null;
  bonus?: number | null;
  tax_deducted?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryCertificateCreatePayload {
  business_id: number;
  employee_id: string;
  issue_date: string;
  fiscal_year?: string;
  assessment_year?: string | null;
  purpose?: SalaryCertificatePurpose;
  addressed_to?: string | null;
  include_breakdown?: boolean;
  notes?: string | null;
  basic_salary?: number;
  gross_salary?: number;
  net_salary?: number;
  house_rent?: number;
  medical_allowance?: number;
  conveyance?: number;
  others_allowance?: number;
  bonus?: number;
  tax_deducted?: number;
}

export type SalaryCertificateUpdatePayload = Partial<SalaryCertificateCreatePayload> & {
  status?: SalaryCertificateStatus;
};

export type ExperienceLetterStatus = "draft" | "issued" | "revoked";

export interface ExperienceLetterOut {
  id: string;
  business_id: number;
  employee_id: string;
  employee?: EmployeeOut | null;
  letter_no: string;
  designation: string;
  department?: string | null;
  joining_date: string;
  relieving_date: string;
  issue_date: string;
  addressed_to?: string | null;
  conduct_and_character: string;
  duties_summary?: string | null;
  status: ExperienceLetterStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExperienceLetterCreatePayload {
  business_id: number;
  employee_id: string;
  designation: string;
  department?: string | null;
  joining_date: string;
  relieving_date: string;
  issue_date: string;
  addressed_to?: string | null;
  conduct_and_character?: string;
  duties_summary?: string | null;
  notes?: string | null;
}

export type ExperienceLetterUpdatePayload = Partial<ExperienceLetterCreatePayload> & {
  status?: ExperienceLetterStatus;
};




