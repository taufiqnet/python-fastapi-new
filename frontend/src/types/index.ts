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
  sku: string;
  status: string;
  business_id: number;
  price?: number;
  created_at?: string;
}

export interface EmployeeListItem {
  id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  work_email?: string;
  department_name?: string;
  designation_name?: string;
  is_active: boolean;
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
