# Business Profile API — Postman Collection Documentation

> **Postman Collection:** `Business Profile API`  

> **Schema:** `https://schema.getpostman.com/json/collection/v2.1.0/collection.json`  

> **Description:** Endpoints for SaaS Platform (Core Identity & Tenancy, E-Commerce Catalog, Inventory, Pricing, Cart, Orders, Payments, Shipping, Reviews, Notifications, and Search).

---

## Environment & Collection Variables

| Variable Key | Default / Sample Value | Description |
|---|---|---|
| `base_url` | `http://localhost:8000` | Target API gateway or backend instance |
| `token` | `eyJhbGciOi...` | Bearer JWT access token obtained via `/auth/login` |
| `business_id` | `1` | Multi-tenant tenant identifier |
| `user_id` | `1` | Auto-populated ID from creation requests |
| `address_id` | `1` | Auto-populated ID from creation requests |
| `category_id` | `—` | Auto-populated ID from creation requests |
| `tag_id` | `—` | Auto-populated ID from creation requests |
| `product_id` | `—` | Auto-populated ID from creation requests |
| `variant_id` | `—` | Auto-populated ID from creation requests |
| `image_id` | `—` | Auto-populated ID from creation requests |
| `warehouse_id` | `—` | Auto-populated ID from creation requests |
| `inventory_item_id` | `—` | Auto-populated ID from creation requests |
| `reservation_id` | `—` | Auto-populated ID from creation requests |
| `cart_id` | `—` | Auto-populated ID from creation requests |
| `tax_rule_id` | `—` | Auto-populated ID from creation requests |
| `order_id` | `—` | Auto-populated ID from creation requests |
| `payment_id` | `—` | Auto-populated ID from creation requests |
| `shipment_id` | `—` | Auto-populated ID from creation requests |
| `zone_id` | `—` | Auto-populated ID from creation requests |
| `brand_id` | `—` | Auto-populated ID from creation requests |
| `model_id` | `—` | Auto-populated ID from creation requests |
| `attendance_id` | `—` | Auto-populated ID from creation requests |
| `salary_id` | `—` | Auto-populated ID from creation requests |
| `holiday_id` | `—` | Auto-populated ID from creation requests |
| `period_id` | `—` | Auto-populated ID from creation requests |
| `record_id` | `—` | Auto-populated ID from creation requests |
| `department_id` | `—` | Auto-populated ID from creation requests |
| `job_title_id` | `—` | Auto-populated ID from creation requests |
| `employee_id` | `—` | Auto-populated ID from creation requests |
| `leave_type_id` | `—` | Auto-populated ID from creation requests |
| `leave_allocation_id` | `—` | Auto-populated ID from creation requests |
| `leave_application_id` | `—` | Auto-populated ID from creation requests |
| `branch_id` | `—` | Auto-populated ID from creation requests |
| `salary_grade_id` | `—` | Auto-populated ID from creation requests |
| `offer_letter_id` | `—` | Auto-populated ID from creation requests |
| `experience_letter_id` | `—` | Auto-populated ID from creation requests |
| `encashment_id` | `—` | Auto-populated ID from creation requests |
| `shift_id` | `—` | Auto-populated ID from creation requests |
| `roster_id` | `—` | Auto-populated ID from creation requests |
| `batch_id` | `—` | Auto-populated ID from creation requests |
| `change_request_id` | `—` | Auto-populated ID from creation requests |
| `exchange_request_id` | `—` | Auto-populated ID from creation requests |

---

## Authentication & Header Standard

All authenticated endpoints require the standard `Authorization` header:

```http
Authorization: Bearer {{token}}
Content-Type: application/json
```

Tenant scoping is automatically resolved via the user's JWT claims and validated against `business_id`.


---


## Auth

### `POST` Register

- **URL:** `{{base_url}}/auth/register`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`

**Request Body (JSON):**
```json
{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123"
}
```


---

### `POST` Login (get admin token)

- **URL:** `{{base_url}}/auth/login`
- **Method:** `POST`
- **Collection Variable Hook:** `pm.collectionVariables.set('token', json.access_token);`

---

### `GET` Get Current User

- **URL:** `{{base_url}}/auth/me`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `POST` Create Vendor Profile

- **URL:** `{{base_url}}/auth/me/vendor-profile`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_profile_id": 1
}
```


---

### `POST` Add Address

- **URL:** `{{base_url}}/auth/me/addresses`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "type": "shipping",
  "is_default": true,
  "recipient_name": "John Doe",
  "phone": "+8801700000000",
  "building_no": "123",
  "street": "Main Street",
  "city": "Dhaka",
  "state": "Dhaka",
  "country": "Bangladesh",
  "zip_code": "1200"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('address_id', json.id);`

---

### `DELETE` Delete Address

- **URL:** `{{base_url}}/auth/me/addresses/{{address_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---


## Business Profile

### `POST` Create Business

- **URL:** `{{base_url}}/business/`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "name_en": "Onoda Inc",
  "short_name": "Onoda",
  "legal_name": "Onoda Incorporated",
  "cr_number": "CR-100123",
  "vat_number": "VAT-123123",
  "city": "Dhaka",
  "country": "Bangladesh",
  "email": "info@onoda.com",
  "phone": "+8801700000000",
  "currency_code": "BDT",
  "currency_symbol": "৳",
  "invoice_prefix": "INV",
  "vat_rate": 0.15,
  "is_active": true
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('business_id', json.id);`

---

### `GET` Get Business

- **URL:** `{{base_url}}/business/{{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `GET` List Businesses

- **URL:** `{{base_url}}/business/?skip=0&limit=100`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`

---

### `PUT` Update Business

- **URL:** `{{base_url}}/business/{{business_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "name_en": "Onoda Inc (Updated)",
  "short_name": "Onoda",
  "legal_name": "Onoda Incorporated",
  "cr_number": "CR-100234",
  "vat_number": "VAT-559812",
  "city": "Dhaka",
  "country": "Bangladesh",
  "email": "info@onoda.com",
  "phone": "+8801700000000",
  "currency_code": "BDT",
  "currency_symbol": "৳",
  "invoice_prefix": "INV",
  "vat_rate": 0.15,
  "is_active": true
}
```


---

### `DELETE` Delete Business

- **URL:** `{{base_url}}/business/{{business_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---


## Ecommerce


### Categories

### `POST` Create Category

- **URL:** `{{base_url}}/categories/`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "name": "Electronics",
  "slug": "electronics",
  "icon": "electronics.png",
  "description": "Consumer electronics and gadgets",
  "is_active": true,
  "attribute_templates": [
    {
      "attribute_name": "Brand",
      "attribute_type": "text",
      "is_required": true
    }
  ],
  "business_id": 1
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('category_id', json.id);`

---

### `GET` List Categories

- **URL:** `{{base_url}}/categories/?skip=0&limit=100&business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`

---

### `GET` Get Category Tree

- **URL:** `{{base_url}}/categories/tree?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `GET` Get Category

- **URL:** `{{base_url}}/categories/{{category_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

---

### `PUT` Update Category

- **URL:** `{{base_url}}/categories/{{category_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "name": "Electronics & Gadgets",
  "is_active": true
}
```


---

### `DELETE` Delete Category

- **URL:** `{{base_url}}/categories/{{category_id}}`
- **Method:** `DELETE`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

---


### Brands & Models

### `POST` Create Brand

- **URL:** `{{base_url}}/brands/`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "name": "Apple",
  "slug": "apple",
  "logo_url": "https://example.com/apple.png",
  "description": "Consumer electronics and software",
  "is_active": true,
  "business_id": 1
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("brand_id", json.id);`

---

### `GET` List Brands

- **URL:** `{{base_url}}/brands/?skip=0&limit=100&business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`

---

### `GET` Get Brand Dropdown

- **URL:** `{{base_url}}/brands/dropdown?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `GET` Get Brand

- **URL:** `{{base_url}}/brands/{{brand_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Brand

- **URL:** `{{base_url}}/brands/{{brand_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "name": "Apple Inc.",
  "is_active": true
}
```


---

### `POST` Create Product Model

- **URL:** `{{base_url}}/brands/{{brand_id}}/models`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "name": "iPhone 15 Pro",
  "slug": "iphone-15-pro",
  "description": "Apple flagship smartphone",
  "is_active": true
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("model_id", json.id);`

---

### `GET` List Brand Models

- **URL:** `{{base_url}}/brands/{{brand_id}}/models`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Product Model

- **URL:** `{{base_url}}/brands/models/{{model_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "name": "iPhone 15 Pro Max",
  "is_active": true
}
```


---

### `DELETE` Delete Product Model

- **URL:** `{{base_url}}/brands/models/{{model_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `DELETE` Delete Brand

- **URL:** `{{base_url}}/brands/{{brand_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---


### Products

### `POST` Create Product Tag

- **URL:** `{{base_url}}/products/tags`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "name": "Wireless",
  "slug": "wireless",
  "business_id": 1
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('tag_id', json.id);`

---

### `GET` List Product Tags

- **URL:** `{{base_url}}/products/tags?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Create Product

- **URL:** `{{base_url}}/products/`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "title": "Wireless Noise-Canceling Headphones",
  "slug": "wireless-noise-canceling-headphones",
  "brand": "SoundPro",
  "status": "active",
  "condition": "new",
  "product_type": "physical",
  "requires_shipping": true,
  "meta_title": "Buy SoundPro Wireless Headphones",
  "meta_description": "High quality wireless noise canceling headphones",
  "is_featured": true,
  "tag_ids": [
    "{{tag_id}}"
  ],
  "variants": [
    {
      "sku": "SOUNDPRO-BLK",
      "barcode": "1234567890123",
      "price": "199.99",
      "compare_at_price": "249.99",
      "cost_price": "100.00",
      "currency": "USD",
      "stock_qty": 50,
      "low_stock_threshold": 5,
      "is_default": true,
      "weight": 0.35,
      "weight_unit": "kg"
    }
  ],
  "images": [
    {
      "url": "https://example.com/headphones-black.jpg",
      "position": 0,
      "alt_text": "Black Headphones Front View",
      "is_primary": true,
      "media_type": "image"
    }
  ],
  "attributes": [
    {
      "name": "Color",
      "values": [
        {
          "value": "Black"
        },
        {
          "value": "Silver"
        }
      ]
    }
  ],
  "business_id": 1,
  "category_id": "{{category_id}}",
  "brand_id": "{{brand_id}}",
  "model_id": "{{model_id}}"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('product_id', json.id);`

---

### `GET` List Products

- **URL:** `{{base_url}}/products/?skip=0&limit=100&business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`

---

### `GET` Get Product Detail

- **URL:** `{{base_url}}/products/{{product_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

---

### `PUT` Update Product

- **URL:** `{{base_url}}/products/{{product_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "title": "SoundPro Wireless Noise-Canceling Headphones v2",
  "is_featured": true
}
```


---

### `POST` Add Product Variant

- **URL:** `{{base_url}}/products/{{product_id}}/variants`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "sku": "SOUNDPRO-SLV",
  "price": "219.99",
  "stock_qty": 30,
  "is_default": false
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('variant_id', json.id);`

---

### `PUT` Update Product Variant

- **URL:** `{{base_url}}/products/variants/{{variant_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "price": "209.99",
  "stock_qty": 25
}
```


---

### `DELETE` Delete Product Variant

- **URL:** `{{base_url}}/products/variants/{{variant_id}}`
- **Method:** `DELETE`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

---

### `POST` Add Product Image

- **URL:** `{{base_url}}/products/{{product_id}}/images`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "url": "https://example.com/headphones-side.jpg",
  "position": 1,
  "alt_text": "Side View",
  "is_primary": false,
  "media_type": "image"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('image_id', json.id);`

---

### `DELETE` Delete Product Image

- **URL:** `{{base_url}}/products/images/{{image_id}}`
- **Method:** `DELETE`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

---

### `DELETE` Delete Product

- **URL:** `{{base_url}}/products/{{product_id}}`
- **Method:** `DELETE`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

---


### Inventory

### `POST` Create Warehouse

- **URL:** `{{base_url}}/inventory/warehouses`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "name": "Main Fulfillment Center",
  "code": "WH-MAIN-01",
  "address_line1": "123 Logistics Way",
  "address_line2": "Industrial Zone",
  "city": "Dhaka",
  "state": "Dhaka",
  "postal_code": "1200",
  "country": "BD",
  "region": "Dhaka",
  "is_active": true,
  "is_default": true,
  "business_id": 1
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('warehouse_id', json.id);`

---

### `GET` List Warehouses

- **URL:** `{{base_url}}/inventory/warehouses?skip=0&limit=100&business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`

---

### `GET` Get Warehouse

- **URL:** `{{base_url}}/inventory/warehouses/{{warehouse_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

---

### `PUT` Update Warehouse

- **URL:** `{{base_url}}/inventory/warehouses/{{warehouse_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "name": "Central Fulfillment Hub",
  "is_active": true
}
```


---

### `DELETE` Delete Warehouse

- **URL:** `{{base_url}}/inventory/warehouses/{{warehouse_id}}`
- **Method:** `DELETE`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

---

### `POST` Create Inventory Item

- **URL:** `{{base_url}}/inventory/items`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "variant_id": "{{variant_id}}",
  "warehouse_id": "{{warehouse_id}}",
  "quantity_on_hand": 100,
  "quantity_reserved": 5,
  "quantity_incoming": 20,
  "reorder_point": 10,
  "reorder_quantity": 50,
  "aisle": "A-1",
  "bin_code": "BIN-101"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('inventory_item_id', json.id);`

---

### `GET` List Inventory Items

- **URL:** `{{base_url}}/inventory/items?skip=0&limit=100`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`

---

### `GET` Get Inventory Item

- **URL:** `{{base_url}}/inventory/items/{{inventory_item_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

---

### `PUT` Update Inventory Item

- **URL:** `{{base_url}}/inventory/items/{{inventory_item_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "reorder_point": 15,
  "reorder_quantity": 60,
  "aisle": "A-2"
}
```


---

### `POST` Adjust Stock

- **URL:** `{{base_url}}/inventory/adjustments`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "inventory_item_id": "{{inventory_item_id}}",
  "delta": 25,
  "reason": "restock",
  "reference_id": "PO-99182",
  "notes": "Restocked 25 units from supplier"
}
```


---

### `GET` Get Stock Movements

- **URL:** `{{base_url}}/inventory/movements?inventory_item_id={{inventory_item_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `inventory_item_id`: `{{inventory_item_id}}`

---

### `POST` Create Stock Reservation

- **URL:** `{{base_url}}/inventory/reservations`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "inventory_item_id": "{{inventory_item_id}}",
  "quantity": 2,
  "status": "active",
  "expires_at": "2026-12-31T23:59:59Z"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('reservation_id', json.id);`

---

### `GET` List Stock Reservations

- **URL:** `{{base_url}}/inventory/reservations?skip=0&limit=100&inventory_item_id={{inventory_item_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `inventory_item_id`: `{{inventory_item_id}}`

---

### `PUT` Update Stock Reservation

- **URL:** `{{base_url}}/inventory/reservations/{{reservation_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "status": "committed"
}
```


---

### `POST` Create Item Master

- **URL:** `{{base_url}}/inventory/items-master`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "sku": "RAW-STEEL-001",
  "name": "Raw Steel Sheet",
  "barcode": "123456789012",
  "item_type": "raw_material",
  "tracking_type": "lot",
  "default_cost": "45.00",
  "is_active": true
}
```


---

### `GET` List Item Master

- **URL:** `{{base_url}}/inventory/items-master?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Create Unit of Measure

- **URL:** `{{base_url}}/inventory/uom/units`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "code": "KG",
  "name": "Kilogram",
  "precision": 2
}
```


---

### `GET` List Units of Measure

- **URL:** `{{base_url}}/inventory/uom/units?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Create UoM Conversion

- **URL:** `{{base_url}}/inventory/uom/conversions`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "from_uom_id": "{{from_uom_id}}",
  "to_uom_id": "{{to_uom_id}}",
  "factor": "1000.00"
}
```


---

### `POST` Convert UoM Quantity

- **URL:** `{{base_url}}/inventory/uom/convert`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "from_uom_id": "{{from_uom_id}}",
  "to_uom_id": "{{to_uom_id}}",
  "quantity": "2.5"
}
```


---

### `GET` Get Stock Availability

- **URL:** `{{base_url}}/inventory/availability?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `GET` Get Expiring Lots

- **URL:** `{{base_url}}/inventory/lots/expiring?business_id={{business_id}}&days=30`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`
  - `days`: `30`

---

### `GET` Get Inventory Valuation

- **URL:** `{{base_url}}/inventory/valuation?business_id={{business_id}}&costing_method=FIFO`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`
  - `costing_method`: `FIFO`

---

### `POST` Create Stock Transfer

- **URL:** `{{base_url}}/inventory/transfers`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "transfer_number": "TR-1001",
  "source_warehouse_id": "{{source_warehouse_id}}",
  "destination_warehouse_id": "{{destination_warehouse_id}}",
  "lines": [
    {
      "item_id": "{{item_id}}",
      "quantity": 10
    }
  ],
  "notes": "Inter-warehouse replenishment"
}
```


---

### `GET` List Stock Transfers

- **URL:** `{{base_url}}/inventory/transfers?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Create Stock Count

- **URL:** `{{base_url}}/inventory/counts`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "warehouse_id": "{{warehouse_id}}",
  "scheduled_date": "2025-01-15T00:00:00Z",
  "counted_by": "John Inspector"
}
```


---

### `GET` Get Reorder Alerts

- **URL:** `{{base_url}}/inventory/reorder-alerts?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---


### Pricing

### `POST` Create Price History

- **URL:** `{{base_url}}/pricing/price-history`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "variant_id": "{{variant_id}}",
  "old_price": 199.99,
  "new_price": 179.99,
  "reason": "Seasonal Discount"
}
```


---

### `GET` Get Price History

- **URL:** `{{base_url}}/pricing/price-history?variant_id={{variant_id}}&business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `variant_id`: `{{variant_id}}`
  - `business_id`: `{{business_id}}`

---

### `POST` Create Tax Rule

- **URL:** `{{base_url}}/pricing/tax-rules`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "region": "Dhaka",
  "tax_percentage": 15.0,
  "is_active": true
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('tax_rule_id', json.id);`

---

### `GET` List Tax Rules

- **URL:** `{{base_url}}/pricing/tax-rules?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `PUT` Update Tax Rule

- **URL:** `{{base_url}}/pricing/tax-rules/{{tax_rule_id}}?business_id={{business_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

**Request Body (JSON):**
```json
{
  "tax_percentage": 12.5,
  "is_active": true
}
```


---

### `POST` Calculate Tax

- **URL:** `{{base_url}}/pricing/calculate-tax`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "region": "Dhaka",
  "amount": 100.0
}
```


---

### `POST` Create Currency Rate

- **URL:** `{{base_url}}/pricing/currency-rates`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "currency_code": "BDT",
  "rate": 110.5
}
```


---

### `GET` List Currency Rates

- **URL:** `{{base_url}}/pricing/currency-rates?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---


### Cart

### `GET` Get or Create Cart

- **URL:** `{{base_url}}/cart?business_id={{business_id}}&session_id=guest_session_123`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`
  - `session_id`: `guest_session_123`
- **Collection Variable Hook:** `pm.collectionVariables.set('cart_id', json.id);`

---

### `POST` Add Item to Cart

- **URL:** `{{base_url}}/cart/items?cart_id={{cart_id}}&business_id={{business_id}}`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `cart_id`: `{{cart_id}}`
  - `business_id`: `{{business_id}}`

**Request Body (JSON):**
```json
{
  "variant_id": "{{variant_id}}",
  "quantity": 2
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('cart_item_id', json.id);`

---

### `PUT` Update Cart Item

- **URL:** `{{base_url}}/cart/items/{{cart_item_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "quantity": 5
}
```


---

### `DELETE` Remove Cart Item

- **URL:** `{{base_url}}/cart/items/{{cart_item_id}}`
- **Method:** `DELETE`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

---

### `POST` Merge Carts

- **URL:** `{{base_url}}/cart/merge`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "guest_session_id": "guest_session_123",
  "user_id": "{{user_id}}",
  "business_id": 1
}
```


---


### Orders

### `POST` Create Order

- **URL:** `{{base_url}}/orders`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "user_id": "{{user_id}}",
  "items": [
    {
      "variant_id": "{{variant_id}}",
      "quantity": 2
    }
  ],
  "shipping_address": {
    "recipient_name": "John Doe",
    "phone": "+8801700000000",
    "street": "123 Main Street",
    "city": "Dhaka",
    "state": "Dhaka",
    "zip_code": "1200",
    "country": "Bangladesh"
  },
  "currency": "USD"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('order_id', json.id);`

---

### `GET` List Orders

- **URL:** `{{base_url}}/orders?business_id={{business_id}}&skip=0&limit=100`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`
  - `skip`: `0`
  - `limit`: `100`

---

### `GET` Get Order Detail

- **URL:** `{{base_url}}/orders/{{order_id}}?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `PUT` Update Order Status

- **URL:** `{{base_url}}/orders/{{order_id}}/status?business_id={{business_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

**Request Body (JSON):**
```json
{
  "status": "processing",
  "note": "Order confirmed and paid"
}
```


---


### Payments

### `POST` Create Payment Intent

- **URL:** `{{base_url}}/payments`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "order_id": "{{order_id}}",
  "provider": "stripe",
  "amount": 399.98,
  "currency": "USD"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('payment_id', json.id);`

---

### `GET` Get Payment

- **URL:** `{{base_url}}/payments/{{payment_id}}?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Capture Payment

- **URL:** `{{base_url}}/payments/{{payment_id}}/capture?business_id={{business_id}}`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Refund Payment

- **URL:** `{{base_url}}/payments/{{payment_id}}/refund?business_id={{business_id}}`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

**Request Body (JSON):**
```json
{
  "amount": 399.98,
  "reason": "Customer requested cancellation"
}
```


---

### `POST` Create Payment Method

- **URL:** `{{base_url}}/payments/methods`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "provider": "stripe",
  "method_type": "credit_card",
  "is_active": true
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('payment_method_id', json.id);`

---

### `GET` Get Payment Methods

- **URL:** `{{base_url}}/payments/methods?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---


### Shipping

### `POST` Create Shipping Zone

- **URL:** `{{base_url}}/shipping/zones`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "name": "Domestic Zone",
  "region": "BD",
  "rates": [
    {
      "min_weight": 0.0,
      "max_weight": 5.0,
      "base_cost": 60.0
    }
  ]
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('shipping_zone_id', json.id);`

---

### `GET` List Shipping Zones

- **URL:** `{{base_url}}/shipping/zones?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Quote Shipping Rate

- **URL:** `{{base_url}}/shipping/quote`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "region": "BD",
  "weight": 1.5
}
```


---

### `POST` Create Shipment

- **URL:** `{{base_url}}/shipping/shipments`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "order_id": "{{order_id}}",
  "carrier": "FedEx",
  "tracking_number": "FDX-998811"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('shipment_id', json.id);`

---

### `GET` Get Shipment Detail

- **URL:** `{{base_url}}/shipping/shipments/{{shipment_id}}?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `PUT` Update Shipment Tracking

- **URL:** `{{base_url}}/shipping/shipments/{{shipment_id}}/tracking?business_id={{business_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

**Request Body (JSON):**
```json
{
  "status": "shipped",
  "tracking_number": "FDX-998811"
}
```


---


### Reviews

### `POST` Create Review

- **URL:** `{{base_url}}/reviews`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "product_id": "{{product_id}}",
  "user_id": "{{user_id}}",
  "order_item_id": null,
  "rating": 5,
  "title": "Excellent Quality!",
  "comment": "The sound quality and noise cancellation are top notch.",
  "images": [
    "https://example.com/review-photo.jpg"
  ]
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('review_id', json.id);`

---

### `GET` List Reviews by Product

- **URL:** `{{base_url}}/reviews/product/{{product_id}}?rating=5&skip=0&limit=100`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `rating`: `5`
  - `skip`: `0`
  - `limit`: `100`

---

### `GET` Get Review Summary

- **URL:** `{{base_url}}/reviews/product/{{product_id}}/summary`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

---

### `GET` Get Review

- **URL:** `{{base_url}}/reviews/{{review_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

---

### `PUT` Update Review

- **URL:** `{{base_url}}/reviews/{{review_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "rating": 5,
  "title": "Updated Review: Still Amazing!",
  "comment": "After 2 months of use, battery life is excellent.",
  "status": "approved"
}
```


---

### `DELETE` Delete Review

- **URL:** `{{base_url}}/reviews/{{review_id}}`
- **Method:** `DELETE`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

---

### `POST` Vote Review

- **URL:** `{{base_url}}/reviews/{{review_id}}/vote`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "user_id": "{{user_id}}",
  "is_helpful": true
}
```


---


### Notifications

### `POST` Create Notification

- **URL:** `{{base_url}}/notifications`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "user_id": "{{user_id}}",
  "type": "order_update",
  "title": "Order Shipped",
  "body": "Your order #101 has been shipped via FedEx.",
  "data": {
    "order_id": "{{order_id}}",
    "tracking_number": "FDX-998811"
  }
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set('notification_id', json.id);`

---

### `GET` List Notifications

- **URL:** `{{base_url}}/notifications?business_id={{business_id}}&user_id={{user_id}}&unread_only=false`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`
  - `user_id`: `{{user_id}}`
  - `unread_only`: `false`

---

### `PUT` Mark Notification as Read

- **URL:** `{{base_url}}/notifications/{{notification_id}}/read`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

---

### `PUT` Mark All Notifications as Read

- **URL:** `{{base_url}}/notifications/read-all?business_id={{business_id}}&user_id={{user_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`
  - `user_id`: `{{user_id}}`

---

### `POST` Set Notification Preference

- **URL:** `{{base_url}}/notifications/preferences`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "user_id": "{{user_id}}",
  "channel": "email",
  "event_type": "order_shipped",
  "enabled": true
}
```


---

### `GET` Get Notification Preferences

- **URL:** `{{base_url}}/notifications/preferences?business_id={{business_id}}&user_id={{user_id}}`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`
  - `user_id`: `{{user_id}}`

---


### Search

### `GET` Search Products GET

- **URL:** `{{base_url}}/search?q=Headphones&business_id={{business_id}}&page=1&page_size=20&sort_by=relevance&sort_order=desc`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `q`: `Headphones`
  - `business_id`: `{{business_id}}`
  - `page`: `1`
  - `page_size`: `20`
  - `sort_by`: `relevance`
  - `sort_order`: `desc`

---

### `POST` Search Products POST

- **URL:** `{{base_url}}/search`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "q": "Headphones",
  "business_id": 1,
  "category_id": null,
  "brand": "SoundPro",
  "min_price": 50.0,
  "max_price": 300.0,
  "status": "active",
  "rating_min": 4.0,
  "is_featured": true,
  "sort_by": "relevance",
  "sort_order": "desc",
  "page": 1,
  "page_size": 20
}
```


---


## HR & Payroll


### Organization

### `GET` Export Departments to Excel

- **URL:** `{{base_url}}/departments/export-excel?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `GET` Download Departments Excel Template

- **URL:** `{{base_url}}/departments/template-excel?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Import Departments via Excel

- **URL:** `{{base_url}}/departments/import-excel?business_id={{business_id}}`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

**Request Body (Multipart Form-Data):**
- `file`: `(file)`


---

### `GET` List Departments

- **URL:** `{{base_url}}/departments?skip=0&limit=100&business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`

---

### `POST` Create Department

- **URL:** `{{base_url}}/departments`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "name": "Engineering",
  "slug": "engineering",
  "description": "Software development and engineering team",
  "is_active": true,
  "multiple_heads_allowed": false
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("department_id", json.id);`

---

### `GET` Get Department

- **URL:** `{{base_url}}/departments/{{department_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Department

- **URL:** `{{base_url}}/departments/{{department_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "name": "Software Engineering",
  "description": "Software development, QA, and DevOps engineering team"
}
```


---

### `DELETE` Delete Department

- **URL:** `{{base_url}}/departments/{{department_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `GET` Download Job Titles Excel Template

- **URL:** `{{base_url}}/job-titles/template-excel?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Import Job Titles via Excel

- **URL:** `{{base_url}}/job-titles/import-excel?business_id={{business_id}}`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

**Request Body (Multipart Form-Data):**
- `file`: `(file)`


---

### `GET` Export Job Titles to Excel

- **URL:** `{{base_url}}/job-titles/export-excel?business_id={{business_id}}&department_id={{department_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`
  - `department_id`: `{{department_id}}`

---

### `GET` List Job Titles

- **URL:** `{{base_url}}/job-titles?skip=0&limit=100&business_id={{business_id}}&department_id={{department_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`
  - `department_id`: `{{department_id}}`

---

### `POST` Create Job Title

- **URL:** `{{base_url}}/job-titles`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "department_id": "{{department_id}}",
  "name": "Senior Software Engineer",
  "short_name": "SSE",
  "description": "Senior level software engineer responsible for core application architecture",
  "is_active": true
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("job_title_id", json.id);`

---

### `GET` Get Job Title

- **URL:** `{{base_url}}/job-titles/{{job_title_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Job Title

- **URL:** `{{base_url}}/job-titles/{{job_title_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "name": "Lead Software Engineer",
  "short_name": "LSE"
}
```


---

### `DELETE` Delete Job Title

- **URL:** `{{base_url}}/job-titles/{{job_title_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `GET` Export Branches to Excel

- **URL:** `{{base_url}}/branches/export-excel?business_id={{business_id}}`
- **Method:** `GET`
- **Summary:** Export branch offices to an Excel spreadsheet.
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `GET` List Branches

- **URL:** `{{base_url}}/branches?skip=0&limit=100&business_id={{business_id}}`
- **Method:** `GET`
- **Summary:** List all active branch offices for the business.
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`

---

### `POST` Create Branch

- **URL:** `{{base_url}}/branches`
- **Method:** `POST`
- **Summary:** Create a new physical branch office.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "name": "Chittagong Regional Office",
  "code": "CTG-01",
  "address": "Agrabad Commercial Area, Chittagong",
  "phone": "+8801812345678",
  "email": "ctg.branch@proerp.com",
  "is_head_office": false,
  "is_active": true
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("branch_id", json.id);`

---

### `GET` Get Branch

- **URL:** `{{base_url}}/branches/{{branch_id}}`
- **Method:** `GET`
- **Summary:** Get branch office details by ID.
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Branch

- **URL:** `{{base_url}}/branches/{{branch_id}}`
- **Method:** `PUT`
- **Summary:** Update branch office details.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "phone": "+8801899998888",
  "is_active": true
}
```


---

### `DELETE` Delete Branch

- **URL:** `{{base_url}}/branches/{{branch_id}}`
- **Method:** `DELETE`
- **Summary:** Delete branch office record.
- **Headers:** `Authorization: Bearer {{token}}`

---

### `GET` Export Salary Grades to Excel

- **URL:** `{{base_url}}/salary-grades/export-excel?business_id={{business_id}}`
- **Method:** `GET`
- **Summary:** Export salary pay grades to Excel.
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `GET` List Salary Grades

- **URL:** `{{base_url}}/salary-grades?skip=0&limit=100&business_id={{business_id}}`
- **Method:** `GET`
- **Summary:** List all structured salary grades.
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`

---

### `POST` Apply Bangladesh National Pay Scale 2015 Presets

- **URL:** `{{base_url}}/salary-grades/presets/bangladesh_national_pay_scale_2015?business_id={{business_id}}`
- **Method:** `POST`
- **Summary:** Seed all 20 standard Bangladesh Government Pay Scale grades.
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Create Salary Grade

- **URL:** `{{base_url}}/salary-grades`
- **Method:** `POST`
- **Summary:** Define custom pay grade tier.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "grade_name": "Grade 9 - Senior Officer",
  "grade_level": 9,
  "min_basic_salary": 22000.0,
  "max_basic_salary": 53060.0,
  "yearly_increment_pct": 5.0,
  "is_active": true
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("salary_grade_id", json.id);`

---

### `GET` Get Salary Grade

- **URL:** `{{base_url}}/salary-grades/{{salary_grade_id}}`
- **Method:** `GET`
- **Summary:** Get salary grade details.
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Salary Grade

- **URL:** `{{base_url}}/salary-grades/{{salary_grade_id}}`
- **Method:** `PUT`
- **Summary:** Update pay grade rules.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "yearly_increment_pct": 6.0
}
```


---

### `DELETE` Delete Salary Grade

- **URL:** `{{base_url}}/salary-grades/{{salary_grade_id}}`
- **Method:** `DELETE`
- **Summary:** Delete custom salary grade.
- **Headers:** `Authorization: Bearer {{token}}`

---

### `GET` Get Reporting Organogram

- **URL:** `{{base_url}}/organization/organogram/reporting?business_id={{business_id}}`
- **Method:** `GET`
- **Summary:** Get employee hierarchical reporting tree (Supervisor -> Subordinates).
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `GET` Get Structural Organogram

- **URL:** `{{base_url}}/organization/organogram/structure?business_id={{business_id}}`
- **Method:** `GET`
- **Summary:** Get department and branch architectural hierarchy tree.
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---


### Employees

### `GET` Export Employees to Excel

- **URL:** `{{base_url}}/employees/export-excel?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `GET` Download Employees Excel Template

- **URL:** `{{base_url}}/employees/template-excel?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Import Employees via Excel

- **URL:** `{{base_url}}/employees/import-excel?business_id={{business_id}}`
- **Method:** `POST`
- **Summary:** Upload employee directory Excel file (.xlsx) for asynchronous background import. Returns HTTP 202 with job_id for status polling.
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

**Request Body (Multipart Form-Data):**
- `file`: `(file)`


---

### `GET` List Employees

- **URL:** `{{base_url}}/employees?skip=0&limit=100&business_id={{business_id}}&department_id={{department_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`
  - `department_id`: `{{department_id}}`

---

### `POST` Create Employee

- **URL:** `{{base_url}}/employees`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "employee_id": "EMP-2025-001",
  "first_name": "John",
  "middle_name": "M.",
  "last_name": "Doe",
  "gender": "male",
  "date_of_birth": "1990-05-15",
  "marital_status": "single",
  "nationality": "American",
  "national_id": "NID-987654321",
  "passport_no": "A12345678",
  "work_email": "john.doe@example.com",
  "personal_email": "john.personal@example.com",
  "phone": "+1234567890",
  "emergency_contact": "+10987654321",
  "linkedin": "https://linkedin.com/in/johndoe",
  "residential_address": "123 Main Street, Tech City",
  "department_id": "{{department_id}}",
  "job_title_id": "{{job_title_id}}",
  "team": "Backend Core",
  "employment_type": "full_time",
  "start_date": "2025-01-01",
  "work_arrangement": "hybrid",
  "working_hours": 8.0,
  "working_days_per_week": 5,
  "working_days": "Mon,Tue,Wed,Thu,Fri",
  "skills_expertise": "Python, FastAPI, PostgreSQL, Docker",
  "is_department_head": false,
  "is_active": true
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("employee_id", json.id);`

---

### `GET` Get Employee

- **URL:** `{{base_url}}/employees/{{employee_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Employee

- **URL:** `{{base_url}}/employees/{{employee_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "first_name": "Johnathan",
  "phone": "+19998887777",
  "team": "Platform Engineering"
}
```


---

### `DELETE` Delete Employee

- **URL:** `{{base_url}}/employees/{{employee_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `GET` Get Employee Import Job Status

- **URL:** `{{base_url}}/employees/import/{{job_id}}/status`
- **Method:** `GET`
- **Summary:** Poll status, progress counters, and row validation error log for a background employee import job.
- **Headers:** `Authorization: Bearer {{access_token}}`

---

### `POST` Cancel Employee Import Job

- **URL:** `{{base_url}}/employees/import/{{job_id}}/cancel`
- **Method:** `POST`
- **Summary:** Request cancellation of an active employee background import job.
- **Headers:** `Authorization: Bearer {{access_token}}`

---

### `GET` Download Employee Import Errors CSV

- **URL:** `{{base_url}}/employees/import/{{job_id}}/errors-csv`
- **Method:** `GET`
- **Summary:** Download a CSV file containing failed rows and their error reasons for a completed or cancelled import job.
- **Headers:** `Authorization: Bearer {{access_token}}`

---


### Leave Management

### `GET` Export Leave Types to Excel

- **URL:** `{{base_url}}/leave/types/export-excel?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `GET` Download Leave Types Excel Template

- **URL:** `{{base_url}}/leave/types/template-excel?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Import Leave Types via Excel

- **URL:** `{{base_url}}/leave/types/import-excel?business_id={{business_id}}`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

**Request Body (Multipart Form-Data):**
- `file`: `(file)`


---

### `GET` List Leave Types

- **URL:** `{{base_url}}/leave-types?skip=0&limit=100&business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`

---

### `POST` Create Leave Type

- **URL:** `{{base_url}}/leave-types`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "name": "Casual Leave",
  "code": "CL",
  "description": "Paid casual leave entitlement per year",
  "max_days_per_year": 14.0,
  "is_paid": true,
  "requires_document": false,
  "applicable_gender": "all",
  "carry_forward": false,
  "is_active": true
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("leave_type_id", json.id);`

---

### `GET` Get Leave Type

- **URL:** `{{base_url}}/leave-types/{{leave_type_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Leave Type

- **URL:** `{{base_url}}/leave-types/{{leave_type_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "description": "Updated casual leave entitlement with documentation rules"
}
```


---

### `DELETE` Delete Leave Type

- **URL:** `{{base_url}}/leave-types/{{leave_type_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `GET` Export Leave Allocations to Excel

- **URL:** `{{base_url}}/leave/allocations/export-excel?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `GET` List Leave Allocations

- **URL:** `{{base_url}}/leave-allocations?skip=0&limit=100&business_id={{business_id}}&employee_id={{employee_id}}&year=2025`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`
  - `employee_id`: `{{employee_id}}`
  - `year`: `2025`

---

### `POST` Create Leave Allocation

- **URL:** `{{base_url}}/leave-allocations`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "employee_id": "{{employee_id}}",
  "leave_type_id": "{{leave_type_id}}",
  "year": 2025,
  "allocated_days": 14.0,
  "used_days": 0.0,
  "carried_forward": 0.0
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("leave_allocation_id", json.id);`

---

### `GET` Get Leave Allocation

- **URL:** `{{base_url}}/leave-allocations/{{leave_allocation_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Leave Allocation

- **URL:** `{{base_url}}/leave-allocations/{{leave_allocation_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "allocated_days": 16.0,
  "used_days": 1.0,
  "carried_forward": 2.0
}
```


---

### `DELETE` Delete Leave Allocation

- **URL:** `{{base_url}}/leave-allocations/{{leave_allocation_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `GET` Export Leave Applications to Excel

- **URL:** `{{base_url}}/leave/applications/export-excel?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `GET` List Leave Applications

- **URL:** `{{base_url}}/leave-applications?skip=0&limit=100&business_id={{business_id}}&employee_id={{employee_id}}&status=pending`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`
  - `employee_id`: `{{employee_id}}`
  - `status`: `pending`

---

### `POST` Create Leave Application

- **URL:** `{{base_url}}/leave-applications`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "employee_id": "{{employee_id}}",
  "leave_type_id": "{{leave_type_id}}",
  "start_date": "2025-06-01",
  "end_date": "2025-06-03",
  "total_days": 3.0,
  "reason": "Personal family emergency",
  "document_url": "https://example.com/medical_cert.pdf"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("leave_application_id", json.id);`

---

### `GET` Get Leave Application

- **URL:** `{{base_url}}/leave-applications/{{leave_application_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Leave Application

- **URL:** `{{base_url}}/leave-applications/{{leave_application_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "start_date": "2025-06-01",
  "end_date": "2025-06-02",
  "total_days": 2.0,
  "reason": "Personal family emergency (adjusted dates)"
}
```


---

### `POST` Review Leave Application (Approve/Reject)

- **URL:** `{{base_url}}/leave-applications/{{leave_application_id}}/review`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "status": "approved",
  "reviewed_by_id": "00000000-0000-0000-0000-000000000000",
  "review_note": "Approved by HR manager"
}
```


---

### `POST` Cancel Leave Application

- **URL:** `{{base_url}}/leave-applications/{{leave_application_id}}/cancel`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "reason": "Plans changed, cancelling leave application"
}
```


---

### `DELETE` Delete Leave Application

- **URL:** `{{base_url}}/leave-applications/{{leave_application_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `POST` Rollback Leave Application Approval

- **URL:** `{{base_url}}/leave-applications/{{leave_application_id}}/rollback`
- **Method:** `POST`
- **Summary:** Rollback APPROVED application to PENDING. Restores employee leave allocation quota and reverts attendance days. Guards against locked/paid payroll periods.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "rollback_reason": "Correction required by HR supervisor. Reverting deducted balance.",
  "force_override": false
}
```


---

### `POST` Preview Yearly Leave Carry Forward

- **URL:** `{{base_url}}/leave-allocations/carry-forward/preview`
- **Method:** `POST`
- **Summary:** Dry-run simulation of yearly carry-forward rules without altering database balances.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "source_year": 2025,
  "target_year": 2026,
  "leave_type_id": "{{leave_type_id}}"
}
```


---

### `POST` Execute Yearly Leave Carry Forward

- **URL:** `{{base_url}}/leave-allocations/carry-forward/execute`
- **Method:** `POST`
- **Summary:** Execute batch carry forward from source year to target year enforcing max carry limits.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "source_year": 2025,
  "target_year": 2026,
  "leave_type_id": "{{leave_type_id}}"
}
```


---

### `GET` Get Leave Carry Forward Logs

- **URL:** `{{base_url}}/leave-allocations/carry-forward/logs?skip=0&limit=100&business_id={{business_id}}`
- **Method:** `GET`
- **Summary:** Audit logs of executed yearly carry-forward batches.
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`

---

### `GET` List Leave Encashments

- **URL:** `{{base_url}}/leave-encashments?skip=0&limit=100&business_id={{business_id}}&year=2025`
- **Method:** `GET`
- **Summary:** List employee earned leave encashment requests pursuant to BLA 2006 Section 117.
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`
  - `year`: `2025`

---

### `POST` Create Leave Encashment Application

- **URL:** `{{base_url}}/leave-encashments`
- **Method:** `POST`
- **Summary:** Apply for leave encashment payout. Validates earned leave balance.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "employee_id": "{{employee_id}}",
  "leave_type_id": "{{leave_type_id}}",
  "year": 2025,
  "days_to_encash": 10.0,
  "note": "Annual earned leave encashment application"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("encashment_id", json.id);`

---

### `GET` Get Leave Encashment Details

- **URL:** `{{base_url}}/leave-encashments/{{encashment_id}}`
- **Method:** `GET`
- **Summary:** Get detailed leave encashment record with computed amount.
- **Headers:** `Authorization: Bearer {{token}}`

---

### `POST` Review Leave Encashment (Approve/Reject)

- **URL:** `{{base_url}}/leave-encashments/{{encashment_id}}/review`
- **Method:** `POST`
- **Summary:** Approve or reject leave encashment.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "status": "approved",
  "review_note": "Approved by Head of HR"
}
```


---

### `POST` Disburse Leave Encashment Payment

- **URL:** `{{base_url}}/leave-encashments/{{encashment_id}}/disburse`
- **Method:** `POST`
- **Summary:** Disburse approved encashment amount.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "payment_method": "bank_transfer",
  "disbursement_reference": "EFT-ENCASH-2025-001",
  "disbursement_note": "Disbursed along with month-end payroll"
}
```


---

### `DELETE` Delete Leave Encashment

- **URL:** `{{base_url}}/leave-encashments/{{encashment_id}}`
- **Method:** `DELETE`
- **Summary:** Delete pending leave encashment application.
- **Headers:** `Authorization: Bearer {{token}}`

---


### Attendance

### `GET` Export Attendance Records to Excel

- **URL:** `{{base_url}}/attendance/export-excel?business_id={{business_id}}&employee_id={{employee_id}}&start_date=2025-01-01&end_date=2025-01-31&status=present`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`
  - `employee_id`: `{{employee_id}}`
  - `start_date`: `2025-01-01`
  - `end_date`: `2025-01-31`
  - `status`: `present`

---

### `GET` Download Attendance Excel Template

- **URL:** `{{base_url}}/attendance/template-excel?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Import Attendance via Excel

- **URL:** `{{base_url}}/attendance/import-excel?business_id={{business_id}}`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

**Request Body (Multipart Form-Data):**
- `file`: `(file)`


---

### `GET` List Attendance Records

- **URL:** `{{base_url}}/attendance?skip=0&limit=100&business_id={{business_id}}&employee_id={{employee_id}}&date=2025-01-15&start_date=2025-01-01&end_date=2025-01-31&status=present`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`
  - `employee_id`: `{{employee_id}}`
  - `date`: `2025-01-15`
  - `start_date`: `2025-01-01`
  - `end_date`: `2025-01-31`
  - `status`: `present`

---

### `POST` Create Attendance Record

- **URL:** `{{base_url}}/attendance`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "employee_id": "{{employee_id}}",
  "date": "2025-01-15",
  "status": "present",
  "check_in": "09:00:00",
  "check_out": "17:30:00",
  "work_hours": 8.5,
  "overtime_hours": 0.5,
  "source": "manual",
  "note": "Logged via API"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("attendance_id", json.id);`

---

### `GET` Get Attendance Record

- **URL:** `{{base_url}}/attendance/{{attendance_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Attendance Record

- **URL:** `{{base_url}}/attendance/{{attendance_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "status": "late",
  "check_in": "09:30:00",
  "work_hours": 8.0,
  "note": "Late arrival due to traffic"
}
```


---

### `DELETE` Delete Attendance Record

- **URL:** `{{base_url}}/attendance/{{attendance_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---


### Compensation

### `GET` Export Compensation to Excel

- **URL:** `{{base_url}}/compensation/export-excel?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `GET` Download Compensation Excel Template

- **URL:** `{{base_url}}/compensation/template-excel?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Import Compensation via Excel

- **URL:** `{{base_url}}/compensation/import-excel?business_id={{business_id}}`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

**Request Body (Multipart Form-Data):**
- `file`: `(file)`


---

### `GET` List Salary Structures

- **URL:** `{{base_url}}/compensation/salaries?skip=0&limit=100&business_id={{business_id}}&employee_id={{employee_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`
  - `employee_id`: `{{employee_id}}`

---

### `GET` Get Salary Structure by Employee

- **URL:** `{{base_url}}/compensation/salaries/employee/{{employee_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `POST` Create Salary Structure

- **URL:** `{{base_url}}/compensation/salaries`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "employee_id": "{{employee_id}}",
  "basic_salary": 5000.0,
  "house_rent": 1000.0,
  "medical_allowance": 500.0,
  "transport_allowance": 300.0,
  "food_allowance": 200.0,
  "other_allowance": 100.0,
  "tax": 500.0,
  "provident_fund": 300.0,
  "other_deduction": 100.0,
  "effective_from": "2025-01-01"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("salary_id", json.id);`

---

### `GET` Get Salary Structure

- **URL:** `{{base_url}}/compensation/salaries/{{salary_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Salary Structure

- **URL:** `{{base_url}}/compensation/salaries/{{salary_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "basic_salary": 6000.0,
  "house_rent": 1200.0
}
```


---

### `DELETE` Delete Salary Structure

- **URL:** `{{base_url}}/compensation/salaries/{{salary_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---


### Payroll

### `GET` Export Payroll Settings to Excel

- **URL:** `{{base_url}}/payroll/settings/export-excel?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `GET` Get Payroll Settings

- **URL:** `{{base_url}}/payroll/settings?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `PUT` Update Payroll Settings

- **URL:** `{{base_url}}/payroll/settings?business_id={{business_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

**Request Body (JSON):**
```json
{
  "include_attendance": true,
  "include_leave": true,
  "include_holidays": true,
  "include_overtime": true,
  "deduct_absent_days": true,
  "standard_hours_per_day": 8.0
}
```


---

### `GET` Export Holidays to Excel

- **URL:** `{{base_url}}/payroll/holidays/export-excel?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `GET` List Holidays

- **URL:** `{{base_url}}/payroll/holidays?skip=0&limit=100&business_id={{business_id}}&holiday_type=public`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`
  - `holiday_type`: `public`

---

### `POST` Create Holiday

- **URL:** `{{base_url}}/payroll/holidays`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "name": "New Year's Day",
  "holiday_type": "public",
  "start_date": "2025-01-01",
  "end_date": "2025-01-01",
  "is_paid": true,
  "description": "Public Holiday"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("holiday_id", json.id);`

---

### `GET` Get Holiday

- **URL:** `{{base_url}}/payroll/holidays/{{holiday_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Holiday

- **URL:** `{{base_url}}/payroll/holidays/{{holiday_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "name": "New Year's Day (Observed)",
  "is_paid": true
}
```


---

### `DELETE` Delete Holiday

- **URL:** `{{base_url}}/payroll/holidays/{{holiday_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `GET` Export Payroll Periods to Excel

- **URL:** `{{base_url}}/payroll/periods/export-excel?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `GET` List Payroll Periods

- **URL:** `{{base_url}}/payroll/periods?skip=0&limit=100&business_id={{business_id}}&status=draft`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`
  - `status`: `draft`

---

### `POST` Create Payroll Period

- **URL:** `{{base_url}}/payroll/periods`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "name": "January 2025",
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "status": "draft",
  "payment_date": "2025-01-31",
  "notes": "January monthly payroll run"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("period_id", json.id);`

---

### `GET` Get Payroll Period

- **URL:** `{{base_url}}/payroll/periods/{{period_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `POST` Generate Period Payroll

- **URL:** `{{base_url}}/payroll/periods/{{period_id}}/generate`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

---

### `PUT` Update Payroll Period

- **URL:** `{{base_url}}/payroll/periods/{{period_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "status": "processing"
}
```


---

### `DELETE` Delete Payroll Period

- **URL:** `{{base_url}}/payroll/periods/{{period_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `GET` Export Payroll Records to Excel

- **URL:** `{{base_url}}/payroll/records/export-excel?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `GET` List Payroll Records

- **URL:** `{{base_url}}/payroll/records?skip=0&limit=100&business_id={{business_id}}&period_id={{period_id}}&employee_id={{employee_id}}&is_paid=false`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`
  - `period_id`: `{{period_id}}`
  - `employee_id`: `{{employee_id}}`
  - `is_paid`: `false`

---

### `POST` Create Payroll Record

- **URL:** `{{base_url}}/payroll/records`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "period_id": "{{period_id}}",
  "employee_id": "{{employee_id}}",
  "working_days": 22,
  "present_days": 22,
  "absent_days": 0,
  "leave_days": 0,
  "holiday_days": 0,
  "overtime_hours": 5.0,
  "basic_salary": 5000.0,
  "house_rent": 1000.0,
  "transport_allowance": 300.0,
  "medical_allowance": 500.0,
  "food_allowance": 200.0,
  "other_allowance": 100.0,
  "overtime_pay": 150.0,
  "bonus": 0.0,
  "tax": 500.0,
  "provident_fund": 300.0,
  "unpaid_leave_deduction": 0.0,
  "loan_installment": 0.0,
  "other_deduction": 50.0,
  "payment_method": "bank_transfer",
  "bank_account": "BD1234567890",
  "is_paid": false,
  "note": "January Payslip"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("record_id", json.id);`

---

### `GET` Get Payroll Record

- **URL:** `{{base_url}}/payroll/records/{{record_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Payroll Record

- **URL:** `{{base_url}}/payroll/records/{{record_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "is_paid": true,
  "note": "Paid via bank disbursement"
}
```


---

### `DELETE` Delete Payroll Record

- **URL:** `{{base_url}}/payroll/records/{{record_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---


### Salary Certificates

### `GET` List Salary Certificates

- **URL:** `{{base_url}}/salary-certificates?skip=0&limit=100&business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`

---

### `POST` Create Salary Certificate

- **URL:** `{{base_url}}/salary-certificates`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "employee_id": "{{employee_id}}",
  "issue_date": "2025-01-15",
  "purpose": "bank_loan",
  "addressed_to": "Bank of America",
  "include_breakdown": true,
  "notes": "Salary certificate for home loan application"
}
```


---

### `GET` Get Salary Certificate

- **URL:** `{{base_url}}/salary-certificates/{{certificate_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Salary Certificate

- **URL:** `{{base_url}}/salary-certificates/{{certificate_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "issue_date": "2025-01-20",
  "purpose": "bank_loan",
  "addressed_to": "Bank of America",
  "include_breakdown": true,
  "status": "issued",
  "basic_salary": 5000.0,
  "gross_salary": 7100.0,
  "net_salary": 6200.0,
  "notes": "Updated salary certificate notes"
}
```


---

### `DELETE` Delete Salary Certificate

- **URL:** `{{base_url}}/salary-certificates/{{certificate_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---


### Appointment Letters

### `GET` List Appointment Letters

- **URL:** `{{base_url}}/appointment-letters?skip=0&limit=100&business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`

---

### `POST` Create Appointment Letter

- **URL:** `{{base_url}}/appointment-letters`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "candidate_name": "John Smith",
  "candidate_email": "john.smith@example.com",
  "candidate_phone": "+1234567890",
  "offered_joining_date": "2025-02-01",
  "probation_period_months": 3,
  "employment_type": "full_time",
  "offered_basic_salary": 6000.0,
  "offered_gross_salary": 8500.0,
  "issue_date": "2025-01-15",
  "valid_until": "2025-01-25"
}
```


---

### `POST` Convert Appointment to Employee

- **URL:** `{{base_url}}/appointment-letters/{{appointment_id}}/convert-to-employee`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `GET` Get Appointment Letter

- **URL:** `{{base_url}}/appointment-letters/{{appointment_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Appointment Letter

- **URL:** `{{base_url}}/appointment-letters/{{appointment_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "candidate_name": "John Smith",
  "candidate_email": "john.smith@example.com",
  "candidate_phone": "+1234567890",
  "offered_joining_date": "2025-02-01",
  "probation_period_months": 3,
  "employment_type": "full_time",
  "offered_basic_salary": 6000.0,
  "offered_gross_salary": 8500.0,
  "status": "issued",
  "issue_date": "2025-01-15",
  "valid_until": "2025-01-30"
}
```


---

### `DELETE` Delete Appointment Letter

- **URL:** `{{base_url}}/appointment-letters/{{appointment_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `POST` Convert Appointment Letter to Active Employee

- **URL:** `{{base_url}}/appointment-letters/{{appointment_id}}/convert-to-employee`
- **Method:** `POST`
- **Summary:** Onboard hired candidate: converts accepted appointment letter directly into active Employee record.
- **Headers:** `Authorization: Bearer {{token}}`

---


### Notice Board

### `GET` List Notices

- **URL:** `{{base_url}}/notices?skip=0&limit=100&business_id={{business_id}}&active_only=true`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`
  - `active_only`: `true`

---

### `POST` Create Notice

- **URL:** `{{base_url}}/notices`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "title": "Company Annual Meeting",
  "content": "Annual general meeting scheduled for next week.",
  "category": "event",
  "target_audience": "all",
  "publish_date": "2025-01-15T09:00:00Z",
  "is_pinned": true,
  "is_active": true
}
```


---

### `GET` Get Notice

- **URL:** `{{base_url}}/notices/{{notice_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Notice

- **URL:** `{{base_url}}/notices/{{notice_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "title": "Company Annual Meeting (Updated)",
  "content": "Updated venue and agenda details for AGM.",
  "category": "event",
  "target_audience": "all",
  "is_pinned": true,
  "is_active": true
}
```


---

### `DELETE` Delete Notice

- **URL:** `{{base_url}}/notices/{{notice_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `POST` Mark Notice as Read

- **URL:** `{{base_url}}/notices/{{notice_id}}/read-receipts?employee_id={{employee_id}}`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `employee_id`: `{{employee_id}}`

---


### Recruitment & Interviews

### `GET` List Candidates

- **URL:** `{{base_url}}/recruitment/candidates?skip=0&limit=100&business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`

---

### `POST` Create Candidate

- **URL:** `{{base_url}}/recruitment/candidates`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "first_name": "Alice",
  "last_name": "Wonder",
  "email": "alice@example.com",
  "phone": "+1234567890"
}
```


---

### `GET` List Interviews

- **URL:** `{{base_url}}/recruitment/interviews?skip=0&limit=100&business_id={{business_id}}&candidate_id={{candidate_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`
  - `candidate_id`: `{{candidate_id}}`

---

### `POST` Schedule Interview

- **URL:** `{{base_url}}/recruitment/interviews`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "candidate_id": "{{candidate_id}}",
  "interviewer_id": "{{employee_id}}",
  "stage": "technical",
  "scheduled_at": "2025-01-20T10:00:00Z",
  "duration_minutes": 60
}
```


---

### `POST` Submit Interview Evaluation

- **URL:** `{{base_url}}/recruitment/evaluations`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "interview_id": "{{interview_id}}",
  "evaluator_id": "{{employee_id}}",
  "technical_score": 5,
  "communication_score": 4,
  "culture_fit_score": 5,
  "recommendation": "strong_hire",
  "feedback_notes": "Excellent technical candidate"
}
```


---

### `GET` Get Candidate

- **URL:** `{{base_url}}/recruitment/candidates/{{candidate_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Candidate

- **URL:** `{{base_url}}/recruitment/candidates/{{candidate_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "first_name": "Alice",
  "last_name": "Wonder",
  "email": "alice@example.com",
  "phone": "+1234567890",
  "status": "shortlisted"
}
```


---

### `DELETE` Delete Candidate

- **URL:** `{{base_url}}/recruitment/candidates/{{candidate_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `GET` Get Interview

- **URL:** `{{base_url}}/recruitment/interviews/{{interview_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Interview

- **URL:** `{{base_url}}/recruitment/interviews/{{interview_id}}`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "interviewer_id": "{{employee_id}}",
  "stage": "technical",
  "scheduled_at": "2025-01-22T10:00:00Z",
  "duration_minutes": 60,
  "status": "completed"
}
```


---

### `DELETE` Delete Interview

- **URL:** `{{base_url}}/recruitment/interviews/{{interview_id}}`
- **Method:** `DELETE`
- **Headers:** `Authorization: Bearer {{token}}`

---

### `GET` List Interview Evaluations

- **URL:** `{{base_url}}/recruitment/interviews/{{interview_id}}/evaluations`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---


### Offer Letters

### `GET` List Offer Letters

- **URL:** `{{base_url}}/offer-letters?skip=0&limit=100&business_id={{business_id}}`
- **Method:** `GET`
- **Summary:** List candidate job offer letters with status filter.
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`

---

### `POST` Create Offer Letter

- **URL:** `{{base_url}}/offer-letters`
- **Method:** `POST`
- **Summary:** Issue formal job offer letter.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "candidate_name": "Tariqul Islam",
  "candidate_email": "tariqul.islam@example.com",
  "candidate_phone": "+8801711223344",
  "job_title_id": "{{job_title_id}}",
  "department_id": "{{department_id}}",
  "offered_joining_date": "2026-11-01",
  "offered_basic_salary": 45000.0,
  "offered_gross_salary": 75000.0,
  "allowance_details": "House Rent: 22,500; Medical: 4,500; Conveyance: 3,000",
  "issue_date": "2026-10-23",
  "valid_until": "2026-10-30"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("offer_letter_id", json.id);`

---

### `GET` Get Offer Letter

- **URL:** `{{base_url}}/offer-letters/{{offer_letter_id}}`
- **Method:** `GET`
- **Summary:** Get offer letter details.
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Offer Letter

- **URL:** `{{base_url}}/offer-letters/{{offer_letter_id}}`
- **Method:** `PUT`
- **Summary:** Update offer terms or candidate response status (draft, sent, accepted, rejected, expired).
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "status": "accepted",
  "offered_gross_salary": 78000.0
}
```


---

### `DELETE` Delete Offer Letter

- **URL:** `{{base_url}}/offer-letters/{{offer_letter_id}}`
- **Method:** `DELETE`
- **Summary:** Delete draft offer letter.
- **Headers:** `Authorization: Bearer {{token}}`

---


### Experience Letters

### `GET` List Experience Letters

- **URL:** `{{base_url}}/experience-letters?skip=0&limit=100&business_id={{business_id}}`
- **Method:** `GET`
- **Summary:** List service experience certificate letters.
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`

---

### `POST` Create Experience Letter

- **URL:** `{{base_url}}/experience-letters`
- **Method:** `POST`
- **Summary:** Generate formal employee experience certificate.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "employee_id": "{{employee_id}}",
  "issue_date": "2026-10-23",
  "conduct_evaluation": "excellent",
  "roles_summary": "Served diligently as Lead Backend Architect, responsible for high-availability microservices.",
  "reason_for_leaving": "Career advancement and higher studies",
  "authorized_signatory_name": "Amina Rahman",
  "authorized_signatory_title": "Chief Human Resources Officer"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("experience_letter_id", json.id);`

---

### `GET` Get Experience Letter

- **URL:** `{{base_url}}/experience-letters/{{experience_letter_id}}`
- **Method:** `GET`
- **Summary:** Retrieve experience letter.
- **Headers:** `Authorization: Bearer {{token}}`

---

### `PUT` Update Experience Letter

- **URL:** `{{base_url}}/experience-letters/{{experience_letter_id}}`
- **Method:** `PUT`
- **Summary:** Update experience letter text or status.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "conduct_evaluation": "exemplary"
}
```


---

### `DELETE` Delete Experience Letter

- **URL:** `{{base_url}}/experience-letters/{{experience_letter_id}}`
- **Method:** `DELETE`
- **Summary:** Delete experience letter record.
- **Headers:** `Authorization: Bearer {{token}}`

---


### Roster Management

### `GET` List Shifts

- **URL:** `{{base_url}}/roster/shifts?skip=0&limit=100&business_id={{business_id}}`
- **Method:** `GET`
- **Summary:** List all master shifts (Morning, Evening, Night, General).
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `skip`: `0`
  - `limit`: `100`
  - `business_id`: `{{business_id}}`

---

### `POST` Create Shift

- **URL:** `{{base_url}}/roster/shifts`
- **Method:** `POST`
- **Summary:** Create a work shift.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "name": "Morning Shift (Hospital)",
  "code": "MS-01",
  "start_time": "08:00:00",
  "end_time": "16:00:00",
  "is_night_shift": false,
  "color_code": "#10B981"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("shift_id", json.id);`

---

### `PUT` Update Shift

- **URL:** `{{base_url}}/roster/shifts/{{shift_id}}`
- **Method:** `PUT`
- **Summary:** Update shift timings or attributes.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "color_code": "#059669"
}
```


---

### `DELETE` Delete Shift

- **URL:** `{{base_url}}/roster/shifts/{{shift_id}}`
- **Method:** `DELETE`
- **Summary:** Delete shift.
- **Headers:** `Authorization: Bearer {{token}}`

---

### `GET` List Department Roster Status

- **URL:** `{{base_url}}/roster/departments?business_id={{business_id}}`
- **Method:** `GET`
- **Summary:** List departments indicating whether roster scheduling is enabled.
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `PATCH` Toggle Department Roster Requirement

- **URL:** `{{base_url}}/roster/departments/{{department_id}}/toggle`
- **Method:** `PATCH`
- **Summary:** Toggle roster scheduling requirement for a department.
- **Headers:** `Authorization: Bearer {{token}}`

---

### `GET` List Monthly Rosters

- **URL:** `{{base_url}}/roster/monthly-rosters?business_id={{business_id}}&year=2026&month=10`
- **Method:** `GET`
- **Summary:** List monthly department roster header records.
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`
  - `year`: `2026`
  - `month`: `10`

---

### `GET` Get Monthly Roster Matrix

- **URL:** `{{base_url}}/roster/monthly-rosters/matrix?business_id={{business_id}}&department_id={{department_id}}&year=2026&month=10`
- **Method:** `GET`
- **Summary:** Fetch employee-by-day interactive matrix grid for the entire month.
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`
  - `department_id`: `{{department_id}}`
  - `year`: `2026`
  - `month`: `10`

---

### `PUT` Save Monthly Roster Matrix

- **URL:** `{{base_url}}/roster/monthly-rosters/matrix`
- **Method:** `PUT`
- **Summary:** Batch save shift allocations across the monthly calendar.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "department_id": "{{department_id}}",
  "year": 2026,
  "month": 10,
  "assignments": [
    {
      "employee_id": "{{employee_id}}",
      "date": "2026-10-01",
      "shift_id": "{{shift_id}}"
    }
  ]
}
```


---

### `POST` Submit Monthly Roster for Approval

- **URL:** `{{base_url}}/roster/monthly-rosters/{{roster_id}}/submit`
- **Method:** `POST`
- **Summary:** Submit draft monthly roster to department head.
- **Headers:** `Authorization: Bearer {{token}}`

---

### `POST` Review Monthly Roster (Approve/Reject)

- **URL:** `{{base_url}}/roster/monthly-rosters/{{roster_id}}/review`
- **Method:** `POST`
- **Summary:** Approve or reject submitted department monthly roster.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "status": "approved",
  "review_note": "Reviewed and approved for October operations."
}
```


---

### `GET` List Duty Assignments

- **URL:** `{{base_url}}/roster/duty-assignments?business_id={{business_id}}&date_from=2026-10-01&date_to=2026-10-31`
- **Method:** `GET`
- **Summary:** Query daily shift assignments by employee or date range.
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`
  - `date_from`: `2026-10-01`
  - `date_to`: `2026-10-31`

---

### `GET` List Duty Assign Batches

- **URL:** `{{base_url}}/roster/duty-assign-batches?business_id={{business_id}}`
- **Method:** `GET`
- **Summary:** List multi-employee duty assignment batches.
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Create Duty Assign Batch

- **URL:** `{{base_url}}/roster/duty-assign-batches`
- **Method:** `POST`
- **Summary:** Create a bulk duty assignment batch.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "title": "Emergency Night Rotation - Oct 2026",
  "date_from": "2026-10-15",
  "date_to": "2026-10-21",
  "shift_id": "{{shift_id}}",
  "employee_ids": [
    "{{employee_id}}"
  ]
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("batch_id", json.id);`

---

### `POST` Review Duty Assign Batch

- **URL:** `{{base_url}}/roster/duty-assign-batches/{{batch_id}}/review`
- **Method:** `POST`
- **Summary:** Approve or reject duty assign batch.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "status": "approved",
  "review_note": "Batch approved"
}
```


---

### `GET` List Roster Change Requests

- **URL:** `{{base_url}}/roster/change-requests?business_id={{business_id}}`
- **Method:** `GET`
- **Summary:** List employee individual shift change requests.
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Create Roster Change Request

- **URL:** `{{base_url}}/roster/change-requests`
- **Method:** `POST`
- **Summary:** Submit a shift change request.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "employee_id": "{{employee_id}}",
  "date": "2026-10-20",
  "target_shift_id": "{{shift_id}}",
  "reason": "Personal medical appointment in the morning"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("change_request_id", json.id);`

---

### `POST` Review Roster Change Request

- **URL:** `{{base_url}}/roster/change-requests/{{change_request_id}}/review`
- **Method:** `POST`
- **Summary:** Approve or reject a shift change request.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "status": "approved",
  "review_note": "Approved by supervisor"
}
```


---

### `GET` List Roster Exchange Requests

- **URL:** `{{base_url}}/roster/exchange-requests?business_id={{business_id}}`
- **Method:** `GET`
- **Summary:** List peer-to-peer shift swap requests.
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Create Roster Exchange Request

- **URL:** `{{base_url}}/roster/exchange-requests`
- **Method:** `POST`
- **Summary:** Initiate mutual peer shift exchange.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "requester_id": "{{employee_id}}",
  "target_employee_id": "00000000-0000-0000-0000-000000000002",
  "requester_date": "2026-10-22",
  "target_date": "2026-10-23",
  "reason": "Exchanging night shift for weekend coverage"
}
```

- **Collection Variable Hook:** `pm.collectionVariables.set("exchange_request_id", json.id);`

---

### `POST` Peer Review Exchange Request

- **URL:** `{{base_url}}/roster/exchange-requests/{{exchange_request_id}}/peer-review`
- **Method:** `POST`
- **Summary:** Target colleague accepts or rejects peer shift swap.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "status": "accepted",
  "note": "Agreed to swap shifts."
}
```


---

### `POST` Manager Review Exchange Request

- **URL:** `{{base_url}}/roster/exchange-requests/{{exchange_request_id}}/manager-review`
- **Method:** `POST`
- **Summary:** Final managerial sign-off applying swap to duty assignments.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "status": "approved",
  "note": "Final manager authorization for shift exchange."
}
```


---


## Finance & Accounting (Bangladesh)


### Chart of Accounts

### `GET` List Chart of Accounts

- **URL:** `{{base_url}}/finance/accounts?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `GET` Get Account Hierarchy Tree

- **URL:** `{{base_url}}/finance/accounts/tree?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Create Account

- **URL:** `{{base_url}}/finance/accounts`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "code": "5990",
  "name": "Miscellaneous Expenses",
  "account_type": "expense",
  "description": "Other administrative costs"
}
```


---


### Fiscal Years & Periods

### `GET` List Fiscal Years

- **URL:** `{{base_url}}/finance/fiscal-years?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Create Fiscal Year

- **URL:** `{{base_url}}/finance/fiscal-years`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "name": "FY 2025-2026",
  "start_date": "2025-07-01",
  "end_date": "2026-06-30"
}
```


---


### Journal Vouchers

### `GET` List Journal Vouchers

- **URL:** `{{base_url}}/finance/vouchers?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Create Draft Journal Voucher

- **URL:** `{{base_url}}/finance/vouchers`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "voucher_type": "journal",
  "entry_date": "2025-01-15",
  "reference": "REF-001",
  "notes": "Office rent payment",
  "entries": [
    {
      "account_id": "00000000-0000-0000-0000-000000000000",
      "debit": 50000.0,
      "credit": 0.0,
      "narration": "Rent expense"
    },
    {
      "account_id": "00000000-0000-0000-0000-000000000000",
      "debit": 0.0,
      "credit": 50000.0,
      "narration": "Cash payment"
    }
  ]
}
```


---


### Sales Invoices & Mushak 6.3

### `GET` List Sales Invoices

- **URL:** `{{base_url}}/finance/invoices?business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `business_id`: `{{business_id}}`

---

### `POST` Create Sales Invoice

- **URL:** `{{base_url}}/finance/invoices`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body (JSON):**
```json
{
  "business_id": 1,
  "issue_date": "2025-01-15",
  "buyer_name": "Dhaka Trading Co",
  "buyer_bin": "BD987654321",
  "buyer_address": "Motijheel, Dhaka",
  "delivery_destination": "Tejgaon, Dhaka",
  "lines": [
    {
      "description": "Industrial Equipment A",
      "uom": "Pcs",
      "quantity": 10,
      "unit_price": 1000.0,
      "sd_rate": 0.0,
      "vat_rate": 15.0
    }
  ]
}
```


---

### `POST` Generate Mushak 6.3 Tax Invoice (JSON)

- **URL:** `{{base_url}}/finance/invoices/{{invoice_id}}/mushak-6-3`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer {{token}}`

---


### Sales Sheet Excel Import

### `GET` Download Import Excel Template

- **URL:** `{{base_url}}/finance/sales-import/template`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`

---


### Financial Reports

### `GET` Trial Balance Report

- **URL:** `{{base_url}}/finance/reports/trial-balance?as_of_date=2025-12-31&business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `as_of_date`: `2025-12-31`
  - `business_id`: `{{business_id}}`

---

### `GET` Profit and Loss Statement

- **URL:** `{{base_url}}/finance/reports/profit-and-loss?start_date=2025-01-01&end_date=2025-12-31&business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `start_date`: `2025-01-01`
  - `end_date`: `2025-12-31`
  - `business_id`: `{{business_id}}`

---

### `GET` Balance Sheet Statement

- **URL:** `{{base_url}}/finance/reports/balance-sheet?as_of_date=2025-12-31&business_id={{business_id}}`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Parameters:**
  - `as_of_date`: `2025-12-31`
  - `business_id`: `{{business_id}}`

---
