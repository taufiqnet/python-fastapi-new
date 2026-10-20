export interface BusinessProfile {
  id: number;
  legal_name: string;
  name_en?: string;
  name_ar?: string;
  cr_number?: string;
  vat_number?: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  business_id?: number | null;
  business?: BusinessProfile;
  roles?: Role[];
  permissions?: string[];
}

export interface Role {
  id: number;
  name: string;
  slug: string;
  description?: string;
  permissions?: Permission[];
}

export interface Permission {
  id: number;
  module: string;
  feature: string;
  action: string;
  code: string;
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
  country?: string | null;
  zip_code?: string | null;
  is_head_office?: boolean;
  is_active?: boolean;
  business_id?: number;
}

export interface DepartmentOut {
  id: string;
  name: string;
  code?: string | null;
  slug: string;
  description?: string | null;
  is_active: boolean;
  parent_department_id?: string | null;
  parent_department_name?: string | null;
  head_employee_id?: string | null;
  head_employee_name?: string | null;
  employee_count?: number;
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
  business_id: number;
}

export interface EmployeeOut {
  id: string;
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
  full_name: string;
  employee_id: string;
  date_of_birth?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  nationality?: string | null;
  national_id?: string | null;
  passport_no?: string | null;
  tin?: string | null;
  work_email: string;
  personal_email?: string | null;
  phone?: string | null;
  emergency_contact?: string | null;
  linkedin?: string | null;
  residential_address?: string | null;
  job_title_id?: string | null;
  job_title_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  team?: string | null;
  direct_manager_id?: string | null;
  manager_name?: string | null;
  employment_type?: "full_time" | "part_time" | "contract" | "intern" | string | null;
  start_date?: string | null;
  contract_end_date?: string | null;
  probation_end_date?: string | null;
  work_arrangement?: "onsite" | "remote" | "hybrid" | string | null;
  working_hours?: string | null;
  working_days_per_week?: number | null;
  skills_expertise?: string | null;
  is_department_head?: boolean;
  is_active: boolean;
  business_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeCreateInput {
  first_name: string;
  middle_name?: string;
  last_name?: string;
  employee_id: string;
  work_email: string;
  personal_email?: string;
  phone?: string;
  gender?: string;
  department_id?: string | null;
  branch_id?: string | null;
  job_title_id?: string | null;
  direct_manager_id?: string | null;
  team?: string;
  employment_type?: string;
  work_arrangement?: string;
  start_date?: string | null;
  skills_expertise?: string;
  is_department_head?: boolean;
  is_active?: boolean;
  business_id?: number;
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

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name?: string;
  date: string;
  status: string;
  check_in?: string;
  check_out?: string;
  work_hours?: number;
}
