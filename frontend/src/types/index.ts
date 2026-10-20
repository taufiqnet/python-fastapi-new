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
