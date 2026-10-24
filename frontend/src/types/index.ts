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

export interface LinkedEmployeeSummary {
  id: string;
  employee_id: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  work_email?: string | null;
  phone?: string | null;
  department_name?: string | null;
  designation_title?: string | null;
}

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
  employee?: LinkedEmployeeSummary | null;
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
  max_users?: number | null;
  max_employees?: number | null;
  tier_code?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  permission_ids: number[];
  permission_codes?: string[];
}

export interface SubscriptionPlanCreateInput {
  name: string;
  description?: string | null;
  is_active?: boolean;
  max_users?: number | null;
  max_employees?: number | null;
  tier_code?: string | null;
  permission_ids: number[];
}

export interface SubscriptionPlanUpdateInput {
  name?: string;
  description?: string | null;
  is_active?: boolean;
  max_users?: number | null;
  max_employees?: number | null;
  tier_code?: string | null;
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

export interface UnlinkedEmployee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name?: string | null;
  full_name: string;
  work_email?: string | null;
  personal_email?: string | null;
  phone?: string | null;
  department_name?: string | null;
  job_title_name?: string | null;
}

export interface UserCreateInput {
  username: string;
  email: string;
  password: string;
  phone?: string;
  business_id?: number | null;
  employee_id?: string | null;
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
  employee_id?: string | null;
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
  user_id?: number | null;
  user_username?: string | null;
  user_email?: string | null;
  user_roles?: string[];

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
  employee_name?: string | null;
  employee_code?: string | null;
  department_name?: string | null;
  date: string;
  status: AttendanceStatusEnum | string;
  check_in?: string | null;
  check_out?: string | null;
  work_hours: number;
  overtime_hours: number;
  source: AttendanceSourceEnum | string;
  note?: string | null;
  recorded_by_id?: string | number | null;
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
  is_held?: boolean;
  hold_reason?: string | null;
  hold_released_at?: string | null;
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
  is_held?: boolean;
  hold_reason?: string | null;
  hold_released_at?: string | null;
  note?: string | null;
}

export type PayrollRecordUpdatePayload = Partial<PayrollRecordCreatePayload>;

// ==========================================
// Payscale & Salary Structures
// ==========================================
export interface PayscaleStepOut {
  id: string;
  business_id: number;
  salary_grade_id: string;
  step_number: number;
  basic_amount: number;
  increment_amount: number;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayscaleStepCreatePayload {
  business_id: number;
  salary_grade_id: string;
  step_number: number;
  basic_amount: number;
  increment_amount?: number;
  description?: string | null;
  is_active?: boolean;
}

export type PayscaleStepUpdatePayload = Partial<PayscaleStepCreatePayload>;

export interface SalaryComponentOut {
  id: string;
  business_id: number;
  name: string;
  code: string;
  component_type: "earning" | "deduction" | "reimbursement" | "statutory";
  calculation_type: "fixed" | "percent_basic" | "percent_gross" | "formula";
  default_value: number;
  is_taxable: boolean;
  is_statutory: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SalaryComponentCreatePayload {
  business_id: number;
  name: string;
  code: string;
  component_type: "earning" | "deduction" | "reimbursement" | "statutory";
  calculation_type?: "fixed" | "percent_basic" | "percent_gross" | "formula";
  default_value?: number;
  is_taxable?: boolean;
  is_statutory?: boolean;
  is_active?: boolean;
}

export type SalaryComponentUpdatePayload = Partial<SalaryComponentCreatePayload>;

export interface SalaryStructureItemOut {
  id: string;
  structure_id: string;
  component_id: string;
  calculation_type: "fixed" | "percent_basic" | "percent_gross" | "formula";
  value: number;
  component?: SalaryComponentOut;
  created_at: string;
  updated_at: string;
}

export interface SalaryStructureOut {
  id: string;
  business_id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  items: SalaryStructureItemOut[];
  created_at: string;
  updated_at: string;
}

export interface SalaryStructureCreatePayload {
  business_id: number;
  name: string;
  description?: string | null;
  is_active?: boolean;
  items?: Array<{
    component_id: string;
    calculation_type: "fixed" | "percent_basic" | "percent_gross" | "formula";
    value: number;
  }>;
}

export type SalaryStructureUpdatePayload = Partial<SalaryStructureCreatePayload>;

// ==========================================
// Bank Accounts & Payments
// ==========================================
export interface CompanyBankAccountOut {
  id: string;
  business_id: number;
  bank_name: string;
  branch_name: string;
  account_title: string;
  account_number: string;
  routing_number: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyBankAccountCreatePayload {
  business_id: number;
  bank_name: string;
  branch_name: string;
  account_title: string;
  account_number: string;
  routing_number: string;
  is_default?: boolean;
  is_active?: boolean;
}

export type CompanyBankAccountUpdatePayload = Partial<CompanyBankAccountCreatePayload>;

// ==========================================
// Tax & Statutory Compliance
// ==========================================
export interface TaxSlabOut {
  id: string;
  business_id: number;
  fiscal_year: string;
  gender_category: "general_male" | "female_senior" | "disabled_freedom_fighter";
  slab_order: number;
  min_income: number;
  max_income?: number | null;
  tax_rate_percent: number;
  created_at: string;
  updated_at: string;
}

export interface TaxSlabCreatePayload {
  business_id: number;
  fiscal_year: string;
  gender_category?: "general_male" | "female_senior" | "disabled_freedom_fighter";
  slab_order: number;
  min_income: number;
  max_income?: number | null;
  tax_rate_percent: number;
}

export type TaxSlabUpdatePayload = Partial<TaxSlabCreatePayload>;

export interface StatutoryComplianceSettingOut {
  id: string;
  business_id: number;
  enable_provident_fund: boolean;
  pf_employee_percent: number;
  pf_employer_percent: number;
  enable_tax_auto_deduction: boolean;
  minimum_tax_amount: number;
  gratuity_qualifying_years: number;
  created_at: string;
  updated_at: string;
}

export interface StatutoryComplianceSettingUpdatePayload {
  enable_provident_fund?: boolean;
  pf_employee_percent?: number;
  pf_employer_percent?: number;
  enable_tax_auto_deduction?: boolean;
  minimum_tax_amount?: number;
  gratuity_qualifying_years?: number;
}

// ==========================================
// Salary Adjustments (Arrears / Deductions)
// ==========================================
export interface SalaryAdjustmentOut {
  id: string;
  business_id: number;
  employee_id: string;
  period_id?: string | null;
  adjustment_type: "arrear" | "bonus_special" | "incentive" | "penalty_deduction" | "damage_recovery" | "advance_adjustment";
  amount: number;
  title: string;
  reason?: string | null;
  status: "pending" | "approved" | "rejected" | "applied";
  approved_by_id?: number | null;
  applied_payroll_record_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryAdjustmentCreatePayload {
  business_id: number;
  employee_id: string;
  period_id?: string | null;
  adjustment_type: "arrear" | "bonus_special" | "incentive" | "penalty_deduction" | "damage_recovery" | "advance_adjustment";
  amount: number;
  title: string;
  reason?: string | null;
}

export type SalaryAdjustmentUpdatePayload = Partial<SalaryAdjustmentCreatePayload & { status: string }>;

// ==========================================
// Loan Repayment Schedules
// ==========================================
export interface LoanRepaymentScheduleOut {
  id: string;
  business_id: number;
  loan_id: string;
  installment_number: number;
  due_date: string;
  installment_amount: number;
  status: "pending" | "deducted" | "paid_manually" | "paused" | "waived";
  payroll_record_id?: string | null;
  paid_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanRepaymentScheduleUpdatePayload {
  status?: "pending" | "deducted" | "paid_manually" | "paused" | "waived";
  due_date?: string;
  notes?: string | null;
}

// ==========================================
// Bonus Policies & Runs
// ==========================================
export interface BonusPolicyOut {
  id: string;
  business_id: number;
  name: string;
  bonus_type: "festival" | "performance" | "attendance" | "special";
  calculation_basis: "percent_basic" | "percent_gross" | "flat_amount";
  percentage_or_amount: number;
  min_service_months: number;
  is_taxable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BonusPolicyCreatePayload {
  business_id: number;
  name: string;
  bonus_type: "festival" | "performance" | "attendance" | "special";
  calculation_basis: "percent_basic" | "percent_gross" | "flat_amount";
  percentage_or_amount: number;
  min_service_months?: number;
  is_taxable?: boolean;
  is_active?: boolean;
}

export type BonusPolicyUpdatePayload = Partial<BonusPolicyCreatePayload>;

export interface BonusRunOut {
  id: string;
  business_id: number;
  policy_id: string;
  payroll_period_id?: string | null;
  run_date: string;
  status: string;
  total_amount: number;
  headcount: number;
  created_at: string;
  updated_at: string;
}

export interface BonusRunCreatePayload {
  business_id: number;
  policy_id: string;
  payroll_period_id?: string | null;
  run_date: string;
}

// ==========================================
// Payroll Period Approvals
// ==========================================
export interface PayrollPeriodApprovalOut {
  id: string;
  business_id: number;
  period_id: string;
  stage: "hr_review" | "finance_review" | "management_sign_off";
  action: "approved" | "rejected" | "returned_for_revision";
  action_by_id: number;
  comments?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollPeriodApprovalCreatePayload {
  business_id: number;
  period_id: string;
  stage: "hr_review" | "finance_review" | "management_sign_off";
  action: "approved" | "rejected" | "returned_for_revision";
  comments?: string | null;
}


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

// ── Healthcare Module Types ──────────────────────────────────────────────
export type PatientGender = "male" | "female" | "other";
export type PatientBloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type DiagnosticDepartment =
  | "pathology"
  | "biochemistry"
  | "hematology"
  | "microbiology"
  | "radiology_imaging"
  | "cardiology_ecg"
  | "histopathology";
export type ReportTemplateType = "structured_parameters" | "radiology_text";
export type DiagnosticOrderStatus =
  | "ordered"
  | "sample_collected"
  | "in_lab"
  | "partially_reported"
  | "completed"
  | "cancelled";
export type SampleStatus = "pending" | "collected" | "received" | "rejected" | "analyzed";

export interface PatientOut {
  id: string;
  business_id: number;
  uhid: string;
  full_name: string;
  phone: string;
  email?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  gender: PatientGender;
  blood_group?: PatientBloodGroup | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  address?: string | null;
  national_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientCreatePayload {
  business_id: number;
  full_name: string;
  phone: string;
  email?: string | null;
  date_of_birth?: string | null;
  gender?: PatientGender;
  blood_group?: PatientBloodGroup | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  address?: string | null;
  national_id?: string | null;
  is_active?: boolean;
}

export interface DoctorProfileOut {
  id: string;
  business_id: number;
  employee_id?: string | null;
  full_name: string;
  specialization: string;
  medical_degrees: string;
  bmdc_reg_number?: string | null;
  chamber_name?: string | null;
  consultation_fee: number;
  follow_up_fee: number;
  contact_phone?: string | null;
  is_referral_doctor: boolean;
  referral_commission_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoctorProfileCreatePayload {
  business_id: number;
  full_name: string;
  specialization: string;
  medical_degrees: string;
  bmdc_reg_number?: string | null;
  chamber_name?: string | null;
  consultation_fee?: number;
  follow_up_fee?: number;
  contact_phone?: string | null;
  is_referral_doctor?: boolean;
  referral_commission_rate?: number;
  employee_id?: string | null;
  is_active?: boolean;
}

export interface DiagnosticTestParameterOut {
  id: string;
  test_id: string;
  parameter_name: string;
  unit?: string | null;
  male_ref_range?: string | null;
  female_ref_range?: string | null;
  child_ref_range?: string | null;
  default_formula?: string | null;
  default_value?: string | null;
  min_ref_value?: number | null;
  max_ref_value?: number | null;
  critical_low?: number | null;
  critical_high?: number | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type DiagnosticTestParameter = DiagnosticTestParameterOut;

export interface DiagnosticTestParameterCreatePayload {
  parameter_name: string;
  unit?: string | null;
  male_ref_range?: string | null;
  female_ref_range?: string | null;
  child_ref_range?: string | null;
  default_formula?: string | null;
  display_order?: number;
}

export interface DiagnosticTestOut {
  id: string;
  business_id: number;
  department: DiagnosticDepartment;
  test_code: string;
  name: string;
  test_name?: string;
  category_name?: string | null;
  sample_type?: string | null;
  cost_price: number;
  sale_price: number;
  default_turnaround_hours: number;
  requires_fasting: boolean;
  report_template_type: ReportTemplateType;
  is_active: boolean;
  parameters: DiagnosticTestParameterOut[];
  created_at: string;
  updated_at: string;
}

export interface DiagnosticTestCreatePayload {
  business_id: number;
  department: DiagnosticDepartment;
  test_code: string;
  name: string;
  category_name?: string | null;
  sample_type?: string | null;
  cost_price?: number;
  sale_price: number;
  default_turnaround_hours?: number;
  requires_fasting?: boolean;
  report_template_type?: ReportTemplateType;
  is_active?: boolean;
  parameters?: DiagnosticTestParameterCreatePayload[];
}

export interface DiagnosticOrderItemOut {
  id: string;
  order_id: string;
  test_id: string;
  test_name: string;
  test_code: string;
  unit_price: number;
  discount: number;
  net_price: number;
  status: string;
  created_at: string;
}

export interface DiagnosticSampleOut {
  id: string;
  business_id: number;
  order_id: string;
  barcode: string;
  sample_type: string;
  status: SampleStatus;
  collected_at?: string | null;
  collected_by_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface DiagnosticOrderOut {
  id: string;
  business_id: number;
  order_number: string;
  patient_id: string;
  referring_doctor_id?: string | null;
  order_date: string;
  status: DiagnosticOrderStatus;
  total_bill: number;
  discount_amount: number;
  net_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_method: string;
  notes?: string | null;
  patient?: PatientOut | null;
  referring_doctor?: DoctorProfileOut | null;
  items: DiagnosticOrderItemOut[];
  samples: DiagnosticSampleOut[];
  created_at: string;
  updated_at: string;
}

export interface DiagnosticCheckoutRequest {
  business_id: number;
  patient_id: string;
  referring_doctor_id?: string | null;
  items: { test_id: string; discount: number }[];
  paid_amount: number;
  payment_method?: string;
  notes?: string | null;
}

// ── Phase 2 Healthcare Types ─────────────────────────────────────────────
export type HealthcareAppointmentStatus =
  | "booked"
  | "checked_in"
  | "with_doctor"
  | "completed"
  | "cancelled"
  | "no_show";

export type VisitType = "new" | "follow_up" | "report_review";

export type DayOfWeek =
  | "saturday"
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

export type CommissionStatus = "accrued" | "paid" | "cancelled";

export type ResultStatus = "entered" | "verified" | "critical";

export interface DoctorScheduleSlotOut {
  id: string;
  business_id: number;
  doctor_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  max_patients: number;
  slot_duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface DoctorScheduleSlotCreatePayload {
  business_id: number;
  doctor_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  max_patients?: number;
  slot_duration_minutes?: number;
  is_active?: boolean;
}

export interface AppointmentOut {
  id: string;
  business_id: number;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  serial_number: number;
  scheduled_time?: string | null;
  status: HealthcareAppointmentStatus;
  visit_type: VisitType;
  consultation_fee: number;
  is_paid: boolean;
  chief_complaints?: string | null;
  notes?: string | null;
  patient?: PatientOut | null;
  doctor?: DoctorProfileOut | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentCreatePayload {
  business_id: number;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  scheduled_time?: string | null;
  visit_type?: VisitType;
  consultation_fee?: number;
  is_paid?: boolean;
  chief_complaints?: string | null;
  notes?: string | null;
}

export interface AppointmentUpdatePayload {
  status?: HealthcareAppointmentStatus;
  scheduled_time?: string | null;
  is_paid?: boolean;
  chief_complaints?: string | null;
  notes?: string | null;
}

export interface MedicineItem {
  drug_name: string;
  dosage_form: string;
  strength?: string | null;
  frequency: string;
  timing: string;
  duration: string;
  instructions?: string | null;
}

export interface VitalsData {
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  pulse?: number | null;
  temperature?: number | null;
  spo2?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  bmi?: number | null;
}

export interface PrescriptionOut {
  id: string;
  business_id: number;
  prescription_number: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string | null;
  vitals: VitalsData;
  clinical_findings?: string | null;
  provisional_diagnosis?: string | null;
  medicines: MedicineItem[];
  advised_investigations: string[];
  special_advice?: string | null;
  follow_up_date?: string | null;
  patient?: PatientOut | null;
  doctor?: DoctorProfileOut | null;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionCreatePayload {
  business_id: number;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string | null;
  vitals?: VitalsData;
  clinical_findings?: string | null;
  provisional_diagnosis?: string | null;
  medicines?: MedicineItem[];
  advised_investigations?: string[];
  special_advice?: string | null;
  follow_up_date?: string | null;
}

export interface LabResultBatchEntryItem {
  parameter_id?: string | null;
  parameter_name: string;
  observed_value: string;
  unit?: string | null;
  ref_range?: string | null;
  is_abnormal?: boolean;
  is_critical?: boolean;
  remarks?: string | null;
}

export interface LabResultBatchPayload {
  business_id: number;
  order_item_id: string;
  technician_name?: string | null;
  results: LabResultBatchEntryItem[];
}

export interface LabVerificationPayload {
  verified_by_name: string;
  remarks?: string | null;
}

export interface LabTestResultOut {
  id: string;
  business_id: number;
  order_id: string;
  order_item_id: string;
  parameter_id?: string | null;
  parameter_name: string;
  observed_value: string;
  unit?: string | null;
  ref_range?: string | null;
  is_abnormal: boolean;
  is_critical: boolean;
  result_status: ResultStatus;
  technician_name?: string | null;
  verified_by_name?: string | null;
  verified_at?: string | null;
  remarks?: string | null;
  created_at: string;
}

export interface RadiologyReportCreatePayload {
  business_id: number;
  order_id: string;
  order_item_id: string;
  clinical_history?: string | null;
  findings_text: string;
  impression_text: string;
  verified_by_name?: string | null;
  report_url?: string | null;
}

export interface RadiologyReportOut {
  id: string;
  business_id: number;
  order_id: string;
  order_item_id: string;
  clinical_history?: string | null;
  findings_text: string;
  impression_text: string;
  verified_by_name?: string | null;
  verified_at?: string | null;
  report_url?: string | null;
  created_at: string;
}

export interface ReferralDoctorCommissionOut {
  id: string;
  business_id: number;
  referring_doctor_id: string;
  order_id: string;
  bill_amount: number;
  commission_rate: number;
  commission_amount: number;
  payment_status: CommissionStatus;
  paid_at?: string | null;
  payment_reference?: string | null;
  notes?: string | null;
  referring_doctor?: DoctorProfileOut | null;
  created_at: string;
}

export interface ReferralPayoutPayload {
  payment_reference: string;
  notes?: string | null;
}

// ============================================================
// Roster Management Types
// ============================================================
export interface Shift {
  id: string;
  business_id: number;
  name: string;
  code: string;
  start_time?: string | null;
  end_time?: string | null;
  work_hours: number;
  break_duration_minutes: number;
  grace_in_minutes: number;
  grace_out_minutes: number;
  is_night_shift: boolean;
  is_off_day: boolean;
  color_code: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShiftCreatePayload {
  name: string;
  code: string;
  start_time?: string | null;
  end_time?: string | null;
  work_hours?: number;
  break_duration_minutes?: number;
  grace_in_minutes?: number;
  grace_out_minutes?: number;
  is_night_shift?: boolean;
  is_off_day?: boolean;
  color_code?: string;
  is_active?: boolean;
}

export interface ShiftUpdatePayload extends Partial<ShiftCreatePayload> {}

export interface DepartmentRosterStatus {
  id: string;
  name: string;
  code?: string | null;
  is_roster_enabled: boolean;
  employee_count: number;
}

export interface DutyAssignment {
  id: string;
  business_id: number;
  monthly_roster_id?: string | null;
  batch_id?: string | null;
  employee_id: string;
  department_id: string;
  date: string;
  shift_id: string;
  status: "draft" | "approved" | "cancelled";
  source: "monthly_roster" | "direct_assign" | "shift_change" | "shift_exchange";
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  employee_name?: string | null;
  employee_code?: string | null;
  department_name?: string | null;
  shift?: Shift | null;
}

export interface DutyAssignBatch {
  id: string;
  business_id: number;
  department_id: string;
  department_name?: string | null;
  title: string;
  start_date: string;
  end_date: string;
  assigned_count: number;
  status: "draft" | "pending_approval" | "approved" | "rejected";
  submitted_by_id?: string | null;
  submitted_by_name?: string | null;
  submitted_at: string;
  approved_by_id?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
}

export interface DutyAssignBatchCreatePayload {
  department_id: string;
  title: string;
  start_date: string;
  end_date: string;
  assignments: Array<{
    employee_id: string;
    date: string;
    shift_id: string;
    notes?: string;
  }>;
}

export interface MonthlyRoster {
  id: string;
  business_id: number;
  department_id: string;
  department_name?: string | null;
  year: number;
  month: number;
  status: "draft" | "submitted" | "approved" | "rejected";
  submitted_by_id?: string | null;
  submitted_by_name?: string | null;
  submitted_at?: string | null;
  approved_by_id?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  notes?: string | null;
  total_assignments: number;
  created_at?: string;
}

export interface RestDayViolation {
  employee_id: string;
  employee_name: string;
  consecutive_work_days: number;
  start_date: string;
  end_date: string;
  rule: string;
}

export interface EmployeeMatrixRow {
  employee_id: string;
  employee_name: string;
  employee_code?: string | null;
  job_title?: string | null;
  duties: Record<string, DutyAssignment>;
  total_shifts: number;
  total_off_days: number;
  total_work_hours: number;
}

export interface MonthlyRosterMatrix {
  monthly_roster?: MonthlyRoster | null;
  department_id: string;
  department_name: string;
  is_roster_enabled: boolean;
  year: number;
  month: number;
  days_in_month: number;
  shifts: Shift[];
  rows: EmployeeMatrixRow[];
  daily_shift_counts: Record<string, Record<string, number>>;
  rest_day_violations: RestDayViolation[];
}

export interface RosterChangeApplication {
  id: string;
  business_id: number;
  employee_id: string;
  employee_name?: string | null;
  employee_code?: string | null;
  duty_assignment_id?: string | null;
  date: string;
  current_shift_id: string;
  current_shift?: Shift | null;
  requested_shift_id: string;
  requested_shift?: Shift | null;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  applied_at: string;
  reviewed_by_id?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
}

export interface RosterExchangeApplication {
  id: string;
  business_id: number;
  requesting_employee_id: string;
  requesting_employee_name?: string | null;
  target_employee_id: string;
  target_employee_name?: string | null;
  requesting_date: string;
  requesting_shift_id: string;
  requesting_shift?: Shift | null;
  target_date: string;
  target_shift_id: string;
  target_shift?: Shift | null;
  reason: string;
  status:
    | "pending_peer_approval"
    | "pending_manager_approval"
    | "approved"
    | "rejected"
    | "cancelled";
  applied_at: string;
  peer_reviewed_at?: string | null;
  peer_note?: string | null;
  reviewed_by_id?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
}

export interface RosterChangeCreatePayload {
  employee_id: string;
  date: string;
  requested_shift_id: string;
  reason: string;
}

export interface RosterExchangeCreatePayload {
  requesting_employee_id: string;
  target_employee_id: string;
  requesting_date: string;
  target_date: string;
  reason: string;
}

// ===========================================================================
// Employee Self-Service (ESS) Portal Interfaces
// ===========================================================================
export interface PortalMe {
  id: string;
  business_id: number;
  user_id?: number | null;
  employee_id: string;
  first_name: string;
  last_name?: string | null;
  full_name: string;
  bangla_name?: string | null;
  work_email: string;
  personal_email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  national_id?: string | null;
  tin?: string | null;
  photo_url?: string | null;
  department_name?: string | null;
  job_title_name?: string | null;
  branch_name?: string | null;
  manager_name?: string | null;
  employment_type?: string | null;
  employee_category?: string | null;
  work_arrangement?: string | null;
  start_date?: string | null;
  confirmation_date?: string | null;
  is_active: boolean;
  disbursement_method?: string | null;
  bank_name?: string | null;
  bank_branch?: string | null;
  bank_account_no?: string | null;
  bank_routing_number?: string | null;
  mfs_provider?: string | null;
  mfs_number?: string | null;
  present_address?: string | null;
  permanent_address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_relation?: string | null;
  emergency_contact_phone?: string | null;
}

export interface PortalLeaveBalance {
  leave_type_id: string;
  leave_type_name: string;
  code: string;
  is_statutory: boolean;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
}

export interface PortalHoliday {
  name: string;
  holiday_type: string;
  start_date: string;
  end_date: string;
  is_paid: boolean;
}

export interface PortalRosterShift {
  duty_date: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  is_night_shift: boolean;
}

export interface PortalNotice {
  id: string;
  title: string;
  category: string;
  publish_date: string;
  is_pinned: boolean;
  is_acknowledged: boolean;
}

export interface PortalDashboard {
  profile: PortalMe;
  attendance_summary: {
    month: string;
    present_days: number;
    late_days: number;
    absent_days: number;
    leave_days: number;
    overtime_hours: number;
    today_status: string;
    today_punch_in?: string | null;
    today_punch_out?: string | null;
  };
  leave_balances: PortalLeaveBalance[];
  upcoming_holidays: PortalHoliday[];
  upcoming_shifts: PortalRosterShift[];
  recent_notices: PortalNotice[];
  unread_notices_count: number;
  pending_requests_count: number;
  active_tickets_count: number;
}

export interface ProfileUpdateRequest {
  id: string;
  business_id: number;
  employee_id: string;
  requested_changes: Record<string, any>;
  reason?: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by_id?: number | null;
  review_notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface AttendanceCorrectionRequest {
  id: string;
  business_id: number;
  employee_id: string;
  attendance_date: string;
  request_type: "missed_punch" | "late_excuse" | "work_on_holiday";
  requested_time_in?: string | null;
  requested_time_out?: string | null;
  reason: string;
  supporting_document_url?: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by_id?: number | null;
  review_notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface EmployeeLoan {
  id: string;
  business_id: number;
  employee_id: string;
  loan_type: "salary_advance" | "personal_loan" | "emergency_loan";
  principal_amount: number;
  monthly_installment_amount: number;
  total_installments: number;
  disbursed_amount: number;
  remaining_balance: number;
  repayment_start_date?: string | null;
  status: "pending" | "approved" | "disbursed" | "rejected" | "completed";
  approved_by_id?: number | null;
  disbursed_at?: string | null;
  reason: string;
  notes?: string | null;
  created_at: string;
}

export interface ExpenseClaimItem {
  id?: string;
  claim_id?: string;
  expense_date: string;
  category: "travel" | "meals" | "hotel" | "supplies" | "training" | "other";
  amount: number;
  description: string;
  receipt_url?: string | null;
}

export interface ExpenseClaim {
  id: string;
  business_id: number;
  employee_id: string;
  claim_number: string;
  title: string;
  claim_date: string;
  total_amount: number;
  status: "draft" | "submitted" | "approved" | "rejected" | "reimbursed";
  reviewer_id?: number | null;
  review_notes?: string | null;
  payment_reference?: string | null;
  reimbursed_at?: string | null;
  items: ExpenseClaimItem[];
  created_at: string;
}

export interface OfficialLetterRequest {
  id: string;
  business_id: number;
  employee_id: string;
  letter_type: "noc_visa" | "noc_travel" | "salary_certificate" | "experience_letter" | "job_confirmation";
  purpose: string;
  addressed_to?: string | null;
  travel_country?: string | null;
  travel_start_date?: string | null;
  travel_end_date?: string | null;
  status: "pending" | "approved" | "generated" | "rejected";
  generated_file_url?: string | null;
  reviewed_by_id?: number | null;
  review_notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface CompanyPolicy {
  id: string;
  business_id: number;
  title: string;
  category: "hr_policy" | "code_of_conduct" | "leave_rules" | "it_security" | "health_safety" | "benefits";
  version: string;
  effective_date: string;
  summary?: string | null;
  content?: string | null;
  attachment_url?: string | null;
  is_mandatory_acknowledgement: boolean;
  is_active: boolean;
  acknowledged_by_me: boolean;
  acknowledged_at?: string | null;
  created_at: string;
}

export interface HRTicketComment {
  id: string;
  ticket_id: string;
  author_user_id: number;
  is_hr_staff: boolean;
  message: string;
  attachment_url?: string | null;
  created_at: string;
}

export interface HRTicket {
  id: string;
  business_id: number;
  ticket_number: string;
  employee_id: string;
  category: "payroll" | "leave" | "benefits" | "workplace" | "it" | "general";
  priority: "low" | "medium" | "high" | "urgent";
  subject: string;
  description: string;
  attachment_url?: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  assigned_to_id?: number | null;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  comments?: HRTicketComment[];
  created_at: string;
  updated_at: string;
}

export interface TaxCardMonthlyRow {
  month_name: string;
  period_id: string;
  basic_salary: number;
  house_rent: number;
  medical_allowance: number;
  conveyance: number;
  other_allowance: number;
  gross_salary: number;
  tax_deducted: number;
}

export interface TaxCardSummary {
  employee_id: string;
  employee_name: string;
  tin?: string | null;
  designation?: string | null;
  department?: string | null;
  fiscal_year: string;
  assessment_year: string;
  total_basic: number;
  total_house_rent: number;
  total_medical: number;
  total_conveyance: number;
  total_bonus: number;
  total_gross_income: number;
  total_tax_exempted: number;
  taxable_income: number;
  total_tax_withheld: number;
  monthly_breakdown: TaxCardMonthlyRow[];
}

// ===========================================================================
// Asset Management Interfaces
// ===========================================================================
export interface AssetCategory {
  id: string;
  business_id: number;
  name: string;
  code: string;
  description?: string | null;
  depreciation_method?: string | null;
  useful_life_months?: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type AssetStatus = "available" | "assigned" | "under_maintenance" | "damaged" | "retired" | "lost";
export type AssetCondition = "new" | "good" | "fair" | "damaged";
export type AllocationStatus = "pending_acknowledgement" | "active" | "returned" | "disputed";
export type MaintenanceStatus = "reported" | "in_repair" | "repaired" | "irreparable";
export type MaintenanceType = "damage" | "preventive" | "breakdown" | "upgrade";

export interface CompanyAsset {
  id: string;
  business_id: number;
  category_id: string;
  category_name?: string | null;
  asset_tag: string;
  name: string;
  serial_number?: string | null;
  imei_or_reg_number?: string | null;
  brand?: string | null;
  model?: string | null;
  specifications?: string | null;
  purchase_date?: string | null;
  purchase_cost: number | string;
  warranty_expiry_date?: string | null;
  vendor_supplier?: string | null;
  invoice_number?: string | null;
  location?: string | null;
  current_status: AssetStatus;
  condition: AssetCondition;
  notes?: string | null;
  current_assigned_employee_id?: string | null;
  current_assigned_employee_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AssetAssignment {
  id: string;
  business_id: number;
  asset_id: string;
  employee_id: string;
  asset_tag?: string | null;
  asset_name?: string | null;
  employee_name?: string | null;
  employee_code?: string | null;
  assigned_date: string;
  expected_return_date?: string | null;
  actual_return_date?: string | null;
  issue_condition: AssetCondition;
  issue_notes?: string | null;
  return_condition?: AssetCondition | null;
  return_notes?: string | null;
  status: AllocationStatus;
  acknowledged_at?: string | null;
  created_at?: string;
}

export interface AssetMaintenanceLog {
  id: string;
  business_id: number;
  asset_id: string;
  asset_tag?: string | null;
  asset_name?: string | null;
  issue_type: MaintenanceType;
  reported_date: string;
  problem_description: string;
  vendor_service_center?: string | null;
  cost: number | string;
  start_date: string;
  completion_date?: string | null;
  status: MaintenanceStatus;
  resolution_notes?: string | null;
  invoice_or_receipt_url?: string | null;
  created_at?: string;
}

export interface AssetOverviewStats {
  total_assets: number;
  available_assets: number;
  assigned_assets: number;
  under_maintenance_assets: number;
  damaged_assets: number;
}

// ===========================================================================
// Travel & Expense Management Interfaces
// ===========================================================================
export type TravelStatus = "draft" | "pending_approval" | "approved" | "rejected" | "completed" | "cancelled";
export type TravelType = "domestic" | "international";
export type AdvanceStatus = "unsettled" | "partially_settled" | "fully_settled";
export type ClaimType = "travel_settlement" | "daily_conveyance" | "general_expense";
export type ClaimStatus = "draft" | "submitted" | "manager_approved" | "finance_approved" | "settled" | "rejected";
export type ExpenseCategory =
  | "travel_fare"
  | "hotel_lodging"
  | "daily_allowance"
  | "local_conveyance"
  | "meals"
  | "office_supplies"
  | "client_entertainment"
  | "communication"
  | "other";

export interface TravelRequest {
  id: string;
  business_id: number;
  employee_id: string;
  employee_name?: string | null;
  employee_code?: string | null;
  request_number: string;
  purpose: string;
  travel_type: TravelType;
  origin: string;
  destination: string;
  departure_date: string;
  return_date: string;
  estimated_cost: number | string;
  advance_required: boolean;
  advance_amount_requested: number | string;
  status: TravelStatus;
  approver_name?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  notes?: string | null;
  advance_id?: string | null;
  advance_settlement_status?: string | null;
  created_at?: string;
}

export interface TravelAdvance {
  id: string;
  business_id: number;
  travel_request_id: string;
  employee_id: string;
  advance_number: string;
  amount_approved: number | string;
  disbursed_at?: string | null;
  disbursement_method: string;
  payment_reference?: string | null;
  settlement_status: AdvanceStatus;
  created_at?: string;
}

export interface DAConveyancePolicy {
  id: string;
  business_id: number;
  grade_name: string;
  city_tier: string;
  daily_allowance_rate: number | string;
  hotel_limit_per_night: number | string;
  conveyance_rate_per_km: number | string;
  is_active: boolean;
  created_at?: string;
}

export interface ExpenseClaimLine {
  id: string;
  expense_date: string;
  category: ExpenseCategory;
  amount: number | string;
  conveyance_km?: number | null;
  conveyance_mode?: string | null;
  description: string;
  receipt_url?: string | null;
}

export interface ExpenseSettlementClaim {
  id: string;
  business_id: number;
  employee_id: string;
  employee_name?: string | null;
  employee_code?: string | null;
  travel_request_id?: string | null;
  claim_type: ClaimType;
  claim_number: string;
  title: string;
  claim_date: string;
  total_claim_amount: number | string;
  advance_deducted: number | string;
  net_payable_or_refundable: number | string;
  status: ClaimStatus;
  approval_notes?: string | null;
  settlement_channel?: string | null;
  payment_reference?: string | null;
  paid_at?: string | null;
  lines: ExpenseClaimLine[];
  created_at?: string;
}

export interface TravelExpenseStats {
  pending_travel_requests: number;
  active_travel_advances: number;
  total_advances_amount: number | string;
  pending_claims: number;
  total_claims_pending_amount: number | string;
  settled_claims_this_month: number;
}

// ===========================================================================
// Performance Management & Career Lifecycle
// ===========================================================================

export type CycleType = "annual" | "semi_annual" | "quarterly" | "probation";
export type CycleStatus = "draft" | "goal_setting" | "in_review" | "calibration" | "closed";

export interface AppraisalCycle {
  id: string;
  business_id: number;
  title: string;
  cycle_type: CycleType | string;
  start_date: string;
  end_date: string;
  self_review_deadline?: string | null;
  manager_review_deadline?: string | null;
  status: CycleStatus | string;
  created_at?: string;
}

export type GoalCategory = "strategic" | "operational" | "developmental" | "behavioral";
export type GoalMetric = "percentage" | "numeric" | "currency" | "boolean";
export type GoalStatus = "not_started" | "in_progress" | "achieved" | "partially_achieved" | "deferred";

export interface EmployeeGoal {
  id: string;
  business_id: number;
  employee_id: string;
  employee_name?: string | null;
  cycle_id: string;
  title: string;
  description?: string | null;
  category: GoalCategory | string;
  metric_type: GoalMetric | string;
  target_value: number;
  achieved_value: number;
  weightage: number;
  due_date?: string | null;
  status: GoalStatus | string;
  self_rating?: number | null;
  manager_rating?: number | null;
  self_comments?: string | null;
  manager_comments?: string | null;
  achievement_pct?: number | null;
  created_at?: string;
}

export type AppraisalStatus =
  | "draft"
  | "self_review_pending"
  | "manager_review_pending"
  | "calibration_pending"
  | "acknowledgement_pending"
  | "completed";

export interface PerformanceAppraisal {
  id: string;
  business_id: number;
  employee_id: string;
  employee_name?: string | null;
  cycle_id: string;
  cycle_title?: string | null;
  reviewer_id?: string | null;
  self_evaluation_text?: string | null;
  self_overall_score?: number | null;
  manager_evaluation_text?: string | null;
  manager_overall_score?: number | null;
  calibrated_score?: number | null;
  final_rating_label?: string | null;
  status: AppraisalStatus | string;
  promotion_recommended?: boolean;
  recommended_job_title_id?: string | null;
  increment_recommended?: boolean;
  recommended_increment_pct?: number | null;
  pip_recommended?: boolean;
  discussion_date?: string | null;
  employee_acknowledged_at?: string | null;
  created_at?: string;
}

export interface PerformanceStats {
  active_cycles: number;
  total_goals: number;
  appraisals_pending_self: number;
  appraisals_pending_manager: number;
  appraisals_pending_calibration: number;
  completed_appraisals: number;
}

// Probation
export interface ProbationDeskRow {
  employee_id: string;
  employee_name: string;
  employee_code?: string | null;
  department_name?: string | null;
  job_title_name?: string | null;
  start_date?: string | null;
  probation_end_date?: string | null;
  days_remaining?: number | null;
  confirmation_date?: string | null;
  is_overdue: boolean;
}

export interface ProbationReview {
  id: string;
  business_id: number;
  employee_id: string;
  employee_name?: string | null;
  reviewer_id?: string | null;
  review_number: string;
  due_date?: string | null;
  review_date: string;
  performance_rating: number;
  conduct_rating: number;
  punctuality_rating: number;
  recommendation: "confirm" | "extend_probation" | "terminate" | string;
  extension_months?: number | null;
  effective_confirmation_date?: string | null;
  comments?: string | null;
  status: "draft" | "submitted" | "approved" | "rejected" | string;
  decided_at?: string | null;
  letter_reference_no?: string | null;
  created_at?: string;
}

// Career Movements
export type MovementType = "promotion" | "increment" | "transfer" | "promotion_and_increment";
export type MovementStatus = "pending_approval" | "applied" | "rejected";

export interface CareerMovement {
  id: string;
  business_id: number;
  employee_id: string;
  employee_name?: string | null;
  movement_number: string;
  action_type: MovementType | string;
  status: MovementStatus | string;
  effective_date: string;
  reason_category: string;
  justification_notes?: string | null;
  previous_job_title_id?: string | null;
  new_job_title_id?: string | null;
  previous_job_title_name?: string | null;
  new_job_title_name?: string | null;
  previous_salary_grade_id?: string | null;
  new_salary_grade_id?: string | null;
  previous_branch_id?: string | null;
  new_branch_id?: string | null;
  previous_department_id?: string | null;
  new_department_id?: string | null;
  previous_manager_id?: string | null;
  new_manager_id?: string | null;
  increment_type?: "percentage" | "fixed_amount" | string | null;
  increment_value?: number | null;
  previous_basic_salary?: number | null;
  new_basic_salary?: number | null;
  previous_gross_salary?: number | null;
  new_gross_salary?: number | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  letter_reference_no?: string | null;
  created_at?: string;
}

export interface IncrementPreview {
  employee_id: string;
  previous_basic_salary: number;
  new_basic_salary: number;
  previous_gross_salary: number;
  new_gross_salary: number;
  previous_net_salary: number;
  new_net_salary: number;
}

// Disciplinary
export interface DisciplinaryNotice {
  id: string;
  notice_number: string;
  issue_date: string;
  response_deadline: string;
  notice_content?: string | null;
  employee_explanation?: string | null;
  explanation_received_date?: string | null;
  explanation_accepted?: boolean | null;
}

export interface DisciplinaryAction {
  id: string;
  sanction_type: string;
  effective_date: string;
  suspension_days?: number | null;
  subsistence_allowance_pct?: number | null;
  remarks?: string | null;
  letter_reference_no?: string | null;
}

export interface DisciplinaryCase {
  id: string;
  business_id: number;
  employee_id: string;
  employee_name?: string | null;
  case_number: string;
  incident_date: string;
  allegation_title: string;
  allegation_details?: string | null;
  allegation_category: string;
  statutory_clause?: string | null;
  severity_level: string;
  current_stage: "reported" | "show_cause_issued" | "explanation_received" | "inquiry_pending" | "closed" | string;
  notices: DisciplinaryNotice[];
  actions: DisciplinaryAction[];
  created_at?: string;
}

export interface LifecycleStats {
  on_probation: number;
  probation_due_30_days: number;
  probation_overdue: number;
  pending_movements: number;
  open_disciplinary_cases: number;
}

// ── Separation & Offboarding Types ─────────────────────────────────────
export type ResignationStatus = "submitted" | "under_review" | "approved" | "rejected" | "withdrawn";
export type ResignationReason =
  | "career_growth"
  | "better_compensation"
  | "relocation"
  | "higher_studies"
  | "health_personal"
  | "work_environment"
  | "other";

export type SeparationType =
  | "resignation"
  | "termination"
  | "dismissal"
  | "retirement"
  | "retrenchment"
  | "death";

export type SeparationStatus =
  | "initiated"
  | "clearance_in_progress"
  | "settlement_pending"
  | "completed"
  | "cancelled";

export type DepartmentClearanceType =
  | "line_manager"
  | "it_systems"
  | "finance_accounts"
  | "admin_facilities"
  | "human_resources";

export type ClearanceStatus = "pending" | "cleared" | "waived" | "issue_flagged";
export type SettlementPaymentStatus = "draft" | "verified" | "approved" | "disbursed";

export interface EmployeeSeparationSummary {
  id: string;
  employee_id: string;
  first_name: string;
  last_name?: string | null;
  work_email?: string | null;
  phone?: string | null;
  designation?: string | null;
  department?: string | null;
  start_date?: string | null;
}

export interface ResignationApplication {
  id: string;
  business_id: number;
  employee_id: string;
  resignation_number: string;
  notice_date: string;
  proposed_last_working_day: string;
  approved_last_working_day?: string | null;
  contractual_notice_days: number;
  served_notice_days: number;
  shortfall_notice_days: number;
  reason_category: ResignationReason | string;
  resignation_letter: string;
  handover_notes?: string | null;
  status: ResignationStatus;
  reviewed_by_id?: number | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  employee?: EmployeeSeparationSummary | null;
}

export interface DepartmentClearance {
  id: string;
  business_id: number;
  separation_id: string;
  employee_id: string;
  department_type: DepartmentClearanceType | string;
  status: ClearanceStatus;
  cleared_by_id?: number | null;
  cleared_at?: string | null;
  outstanding_amount: number | string;
  checklist_remarks?: string | null;
  created_at: string;
  updated_at: string;
  employee?: EmployeeSeparationSummary | null;
}

export interface ExitInterview {
  id: string;
  business_id: number;
  separation_id: string;
  employee_id: string;
  interview_date: string;
  interviewer_id?: number | null;
  primary_reason_for_leaving: string;
  rating_culture: number;
  rating_management: number;
  rating_growth_opportunities: number;
  rating_compensation: number;
  rating_work_life_balance: number;
  would_recommend: string;
  proudest_accomplishment?: string | null;
  improvement_suggestions?: string | null;
  confidential_hr_notes?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  employee?: EmployeeSeparationSummary | null;
}

export interface FinalSettlement {
  id: string;
  business_id: number;
  separation_id: string;
  employee_id: string;
  settlement_number: string;
  settlement_date: string;
  unpaid_salary_days: number;
  unpaid_salary_amount: number | string;
  leave_encashment_days: number;
  leave_encashment_amount: number | string;
  gratuity_years: number;
  gratuity_amount: number | string;
  provident_fund_amount: number | string;
  severance_pay_amount: number | string;
  bonus_arrears_amount: number | string;
  other_payable_amount: number | string;
  total_payable_amount: number | string;
  notice_shortfall_days: number;
  notice_shortfall_deduction: number | string;
  loan_advance_deduction: number | string;
  asset_damage_deduction: number | string;
  clearance_charge_deduction: number | string;
  tax_withholding_deduction: number | string;
  total_deduction_amount: number | string;
  net_payable_amount: number | string;
  payment_status: SettlementPaymentStatus;
  payment_method: string;
  payment_reference?: string | null;
  disbursed_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  employee?: EmployeeSeparationSummary | null;
}

export interface ReleaseLetter {
  id: string;
  business_id: number;
  separation_id: string;
  employee_id: string;
  letter_number: string;
  issue_date: string;
  effective_exit_date: string;
  designation: string;
  department?: string | null;
  status: string;
  letter_content: string;
  created_at: string;
  updated_at: string;
  employee?: EmployeeSeparationSummary | null;
}

export interface EmployeeSeparation {
  id: string;
  business_id: number;
  employee_id: string;
  separation_number: string;
  separation_type: SeparationType | string;
  resignation_id?: string | null;
  disciplinary_case_id?: string | null;
  order_date: string;
  last_working_date: string;
  reason?: string | null;
  status: SeparationStatus;
  severance_entitled: boolean;
  service_duration_days: number;
  service_duration_years: number;
  created_at: string;
  updated_at: string;
  employee?: EmployeeSeparationSummary | null;
  resignation?: ResignationApplication | null;
  clearances?: DepartmentClearance[];
  exit_interview?: ExitInterview | null;
  settlement?: FinalSettlement | null;
}

export interface AssetHandoverItem {
  assignment_id: string;
  asset_id: string;
  asset_name: string;
  asset_tag: string;
  category?: string | null;
  assigned_date?: string | null;
  status: string;
  condition_notes?: string | null;
}

// ===========================================================================
// Attendance & Time Tracking Types
// ===========================================================================
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';
export type AttendanceSource = 'manual' | 'biometric' | 'mobile_app' | 'web' | 'system';



export interface AttendanceSettings {
  id: string;
  business_id: number;
  enable_biometric_device: boolean;
  auto_sync_device_logs: boolean;
  sync_interval_minutes: number;
  grace_period_minutes: number;
  half_day_late_minutes: number;
  standard_daily_work_hours: number;
  minimum_work_hours_half_day: number;
  require_ot_pre_approval: boolean;
  require_attendance_approval_before_payroll: boolean;
  created_at: string;
  updated_at: string;
}

export interface BiometricDevice {
  id: string;
  business_id: number;
  device_name: string;
  device_brand: 'zkteco' | 'hikvision' | 'anviz' | 'realtime' | 'generic_webhook';
  device_type: 'fingerprint' | 'face_recognition' | 'rfid_card' | 'hybrid';
  ip_address: string;
  port: number;
  comm_key?: string | null;
  serial_number?: string | null;
  mac_address?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  status: 'online' | 'offline' | 'disabled';
  last_heartbeat_at?: string | null;
  last_synced_at?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RawAttendanceLog {
  id: string;
  business_id: number;
  device_id?: string | null;
  biometric_user_id: string;
  employee_id?: string | null;
  punch_time: string;
  punch_state: 'check_in' | 'check_out' | 'break_out' | 'break_in' | 'auto';
  verification_type: 'fingerprint' | 'face' | 'rfid' | 'password';
  device_ip?: string | null;
  is_processed: boolean;
  processed_at?: string | null;
  error_message?: string | null;
  employee_name?: string | null;
  employee_code?: string | null;
  device_name?: string | null;
  created_at: string;
}

export interface AttendanceRegularization {
  id: string;
  business_id: number;
  employee_id: string;
  attendance_date: string;
  request_type: 'missed_in' | 'missed_out' | 'both_punches' | 'late_excuse' | 'work_from_home';
  requested_check_in?: string | null;
  requested_check_out?: string | null;
  reason: string;
  supporting_doc_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by_id?: number | null;
  reviewed_at?: string | null;
  review_remarks?: string | null;
  employee_name?: string | null;
  employee_code?: string | null;
  department_name?: string | null;
  reviewer_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutdoorDutyApplication {
  id: string;
  business_id: number;
  employee_id: string;
  start_date: string;
  end_date: string;
  is_full_day: boolean;
  visit_type: 'client_meeting' | 'field_work' | 'customer_site' | 'training_seminar' | 'government_office' | 'other';
  destination_or_client: string;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by_id?: number | null;
  reviewed_at?: string | null;
  review_remarks?: string | null;
  employee_name?: string | null;
  employee_code?: string | null;
  department_name?: string | null;
  reviewer_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OvertimeApplication {
  id: string;
  business_id: number;
  employee_id: string;
  ot_date: string;
  start_time?: string | null;
  end_time?: string | null;
  claimed_hours: number;
  approved_hours: number;
  purpose: string;
  project_name_or_task?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by_id?: number | null;
  approved_at?: string | null;
  manager_remarks?: string | null;
  employee_name?: string | null;
  employee_code?: string | null;
  department_name?: string | null;
  approver_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendancePeriodApproval {
  id: string;
  business_id: number;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  total_employees: number;
  present_days_total: number;
  absent_days_total: number;
  leave_days_total: number;
  ot_hours_total: number;
  status: 'draft' | 'under_review' | 'approved' | 'locked';
  approved_by_id?: number | null;
  approved_at?: string | null;
  comments?: string | null;
  approver_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyAttendanceSummaryItem {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department_name?: string | null;
  job_title?: string | null;
  total_days: number;
  present_days: number;
  late_days: number;
  half_days: number;
  absent_days: number;
  leave_days: number;
  outdoor_duty_days: number;
  total_work_hours: number;
  overtime_hours: number;
}

export interface MonthlyAttendanceSummary {
  business_id: number;
  year: number;
  month: number;
  total_employees: number;
  items: MonthlyAttendanceSummaryItem[];
}











