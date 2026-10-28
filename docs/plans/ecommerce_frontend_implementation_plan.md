# Implementation Plan - Next.js E-Commerce Module Full Operations & Menu

## Goal Description
Expand the Next.js frontend for the **E-Commerce** module from its current single product page into a complete, enterprise-grade suite matching all existing FastAPI backend REST endpoints and Jinja2 HTML templates (`app/templates/modules/ecommerce`). 

This includes:
1. Fixing foundational imports and git tracking (`@/lib/api-client`, `@/lib/utils`, `.gitignore`).
2. Restructuring the sidebar navigation menu under **E-Commerce** with grouped submenus and RBAC permissions.
3. Upgrading `products/page.tsx` and designing all new pages to strictly adhere to the mandatory UI rule in [.agents/rules/ui_in_place_filtering.md](file:///d:/Shakil/Python/python-fastapi-new/.agents/rules/ui_in_place_filtering.md) (in-place non-destructive filtering, two-tier `initialLoading` vs `isFetching`, top-rim progress line, smooth row opacity transitions, and `startTransition` batching).
4. Implementing full CRUD operations, modals, drawers, Excel import/export templates, and status management across all 5 domain clusters:
   - **Catalog & Store**: Products (refactored), Categories, Brands & Models, Catalog Browse, Pricing & Coupons.
   - **Sales & POS**: Orders, Customers, POS Terminal (with 80mm thermal receipt printing), POS Registers & Shift Management.
   - **Inventory & Warehouse**: Stock Levels, Stock Adjustments, Warehouses, Barcode Printing, Stock Transfers, Physical Counts/Audits.
   - **Procurement & Inbound**: Purchase Orders, Suppliers & Vendors.
   - **Operations & Marketplace**: Shipping & Deliveries, Payments & Refunds, Customer Reviews Moderation, Multi-Vendor Sellers, Reports & Analytics.

---

## User Review Required

> [!IMPORTANT]
> **Git Tracking & Root `.gitignore` Fix**:
> The root `.gitignore` contains `lib/` on line 13. Because it lacks a leading slash, git ignores any directory named `lib` anywhere in the project, including `frontend/src/lib/`. As a result, critical utilities like `api-client.ts` and `utils.ts` were missing from git tracking and broke frontend imports.
> We will update line 13 of `.gitignore` to `/lib/` and add explicit inclusion for `!frontend/src/lib/`.

> [!NOTE]
> **UI In-Place Non-Destructive Filtering Guarantee**:
> In compliance with `.agents/rules/ui_in_place_filtering.md`, all data tables and grids will **never unmount** during search, filtering, or pagination transitions. We eliminate `{loading ? <LargeSpinnerCard /> : <Table />}` in favor of a two-tier loading state (`initialLoading` on first mount, `isFetching` during updates), top-rim indeterminate progress bars, and React `startTransition` for single-network-request batching.

> [!TIP]
> **Execution Strategy**:
> Given the scope across 17 sub-modules, we will organize implementation into sequenced phases, ensuring each module is fully functional, tested, and aligned with backend APIs before moving to the next.

---

## E-Commerce Feature & Architecture Matrix

| E-Commerce Submodule | Jinja2 HTML Source | FastAPI Backend Router | Proposed Next.js Route | Primary Operations & Components |
| :--- | :--- | :--- | :--- | :--- |
| **Foundation & Libs** | — | Core API Client | `@/lib/api-client`, `@/lib/utils` | Axios client, auth token interceptors, `cn`, `formatCurrency`, `formatDate` |
| **Sidebar Menu** | `base.html` | Permission Registry | `sidebar.tsx` | Grouped navigation items with Lucide icons and RBAC checks |
| **Products** | `products/product_*.html` | `/products/*` | `/ecommerce/products` | Refactor to in-place filtering, variants, image upload, status toggle, detail modal |
| **Categories** | `categories/category_*.html` | `/categories/*` | `/ecommerce/categories` | Tree/grid view, parent hierarchy, attribute templates tab, Excel import/export |
| **Brands & Models** | `brands/brand_*.html`, `models/*` | `/brands/*`, `/models/*` | `/ecommerce/brands` | Brands tab, Models tab, logo display, brand modal, model modal |
| **Catalog Browse** | `catalog/catalog_browse.html` | `/catalog/*`, `/products/*` | `/ecommerce/catalog` | Customer store browse, search facets, category pill filters, quick view card |
| **Coupons & Pricing** | `pricing/*.html` | `/pricing/*` | `/ecommerce/pricing` | Coupons tab, price rules tab, discount code generator, usage statistics |
| **Orders** | `orders/order_*.html` | `/orders/*` | `/ecommerce/orders` | Order list, payment/fulfillment status badges, detail drawer, invoice modal |
| **Customers** | `customer/customer_*.html` | `/customers/*` | `/ecommerce/customers` | Customer directory, total spend, address book, customer drawer, order history |
| **POS Terminal** | `pos/terminal.html` | `/pos/*` | `/ecommerce/pos` | Barcode scanning, fast cart, cash/card/MFS checkout, 80mm receipt print modal |
| **POS Registers** | `pos/registers.html` | `/pos/registers/*` | `/ecommerce/pos/registers` | Registers listing, open/close shift drawer, cash drawer reconciliation |
| **Inventory & Stock** | `inventory/inventory_*.html` | `/inventory/*` | `/ecommerce/inventory` | Stock levels, low stock alerts, valuation summary, adjustments modal |
| **Stock Transfers** | `inventory/stock_transfer_*.html` | `/inventory/transfers/*` | `/ecommerce/inventory/transfers` | Transfer list, origin/dest warehouses, transfer create modal, receive action |
| **Stock Audits/Counts**| `inventory/stock_count_*.html` | `/inventory/counts/*` | `/ecommerce/inventory/counts` | Physical inventory cycle count audit, discrepancy calculation, audit finalize |
| **Procurement & PO** | `procurement/po_*.html`, `suppliers_*` | `/procurement/*` | `/ecommerce/procurement` | Purchase orders, suppliers tab, vendor rating, PO creation modal |
| **Shipping** | `shipping/shipping_manage.html`| `/shipping/*` | `/ecommerce/shipping` | Shipments table, carrier selection, tracking number modal, delivery update |
| **Payments** | `payments/payments_manage.html`| `/payments/*` | `/ecommerce/payments` | Transactions log, gateway breakdown, manual capture, refund dialog |
| **Reviews** | `reviews/reviews_manage.html` | `/reviews/*` | `/ecommerce/reviews` | Rating stars, verified buyer badge, approve / reject moderation actions |
| **Multi-Vendor Sellers**| `sellers/sellers_manage.html` | `/sellers/*` | `/ecommerce/sellers` | Vendor directory, commission type & rate, pending vendor approvals |
| **Reports & Analytics** | `reports/reports_manage.html` | `/reports/*` | `/ecommerce/reports` | Revenue analytics, top selling items, date range picker, export CSV/Excel |

---

## Detailed Implementation Phases

### Phase 1: Foundation, Libs, Types & Sidebar Navigation
1. **Fix Git Tracking & Libs**:
   - Update `.gitignore` so `frontend/src/lib/` is explicitly tracked.
   - Create `frontend/src/lib/utils.ts` with `cn`, `formatCurrency`, and `formatDate`.
   - Create `frontend/src/lib/api-client.ts` configured with `NEXT_PUBLIC_API_URL`, authorization headers from localStorage, and response interceptors.
2. **Expand TypeScript Definitions**:
   - In `frontend/src/types/index.ts`, add complete interfaces for:
     - `CategoryOut`, `CategoryCreateInput`, `CategoryAttributeTemplate`
     - `BrandOut`, `BrandCreateInput`, `ProductModelOut`
     - `OrderOut`, `OrderItemOut`, `OrderAddressOut`, `OrderPaymentStatus`, `OrderFulfillmentStatus`
     - `CustomerOut`, `CustomerCreateInput`
     - `POSRegisterOut`, `POSSessionOut`, `POSCheckoutRequest`, `POSCheckoutResponse`
     - `InventoryStockOut`, `WarehouseOut`, `StockTransferOut`, `StockCountOut`
     - `SupplierOut`, `PurchaseOrderOut`
     - `ShipmentOut`, `PaymentTransactionOut`, `ReviewOut`, `SellerOut`, `EcommerceReportOut`
3. **Restructure Sidebar Navigation**:
   - Update `frontend/src/components/layout/sidebar.tsx` under the `ecommerce` module section:
     - Group 1: **Catalog & Store** (`Products`, `Categories`, `Brands & Models`, `Catalog Browse`, `Pricing & Coupons`)
     - Group 2: **Sales & POS** (`Orders`, `Customers`, `POS Terminal`, `POS Registers`)
     - Group 3: **Inventory & Warehouses** (`Stock & Inventory`, `Stock Transfers`, `Stock Audits & Counts`)
     - Group 4: **Procurement & Inbound** (`Purchase Orders`, `Suppliers & Vendors`)
     - Group 5: **Operations & Reports** (`Shipping & Delivery`, `Payments & Refunds`, `Customer Reviews`, `Multi-Vendor Sellers`, `Reports & Analytics`)
4. **Refactor Existing `products/page.tsx`**:
   - Replace `{loading ? <LargeSpinnerCard /> : <Table />}` with `initialLoading` vs `isFetching`.
   - Add top-rim indeterminate progress bar.
   - Batch filter selections and page resets using `startTransition`.

---

### Phase 2: Catalog Management Subsystem
1. **Categories (`/ecommerce/categories`)**:
   - Stat cards: Total Categories, Root Categories, Subcategories, Active Rate.
   - Dual view modes: Interactive Tree View & Flat Data Table.
   - In-place non-destructive search and status filter.
   - Category Form Modal with tabs for "General Info" and "Attribute Templates".
   - Category Detail Drawer.
   - Excel sample template download and Excel upload modal.
2. **Brands & Models (`/ecommerce/brands`)**:
   - Tabbed view: "Brands Directory" and "Product Models".
   - Brand logo preview, website link, and active status.
   - Brand Create/Edit modal with file/URL logo input.
   - Model Create/Edit modal with brand selection and model specifications.
   - Delete confirmation dialog.
3. **Customer Catalog Browse (`/ecommerce/catalog`)**:
   - Rich retail-style card grid with product cards, badges (Featured, In Stock, Sale).
   - Sidebar filters: Category checkboxes, brand select, price range slider.
   - Quick View modal with gallery images, variant selection, and Add to Cart trigger.
4. **Pricing & Coupons (`/ecommerce/pricing`)**:
   - Tab 1: Discount Coupons (code, discount type [percentage vs fixed], max discount, validity dates, usage limit, status toggle).
   - Tab 2: Price Lists & Tiers (wholesale, retail, bulk pricing rules).
   - Coupon Create/Edit modal and copy-to-clipboard action.

---

### Phase 3: Sales, Orders & POS Terminal Subsystem
1. **Orders (`/ecommerce/orders`)**:
   - Stat metrics: Total Orders, Total Revenue, Pending Fulfillment, Delivered Orders.
   - Search by order number, customer name, date range.
   - Filter dropdowns: Payment Status (`paid`, `unpaid`, `refunded`, `partially_paid`), Fulfillment Status (`pending`, `processing`, `shipped`, `delivered`, `cancelled`).
   - Order Detail Drawer: Customer information, shipping address, line items with thumbnails, unit price, tax, totals, fulfillment timeline.
   - Status Update Modal: Quick transition for payment or shipping status.
   - Printable 80mm / A4 Order Invoice modal with print styling.
   - Excel template download and bulk import.
2. **Customers (`/ecommerce/customers`)**:
   - Customer directory with avatar initials, email, phone, total orders, lifetime spend.
   - Search by customer name, email, phone.
   - Customer Create/Edit modal with billing/shipping address fields.
   - Customer Detail Drawer showing order history and lifetime value.
3. **POS Terminal (`/ecommerce/pos`)**:
   - Top Control Bar: Active shift indicator, Cashier name, selected Register, Offline/Online status badge, Scanner beep sound toggle.
   - Shift Management: "Open Shift" modal (opening cash drawer float) & "Close Shift" modal (closing count, expected cash, discrepancy note).
   - Center Area: Live barcode / SKU listener input, category pill filter buttons, responsive product tiles with price and current stock badges.
   - Right Cart Panel:
     - Line items with quantity stepper (+/-), remove item, line discount.
     - Customer assignment dropdown (or Quick Add Customer).
     - Global order discount / coupon input.
     - Subtotal, Tax calculation, Total display.
   - Tender Payment Modal: Cash tender with quick currency denomination buttons, Card, Mobile Banking (bKash/Nagad/Rocket), change calculation.
   - Thermal Receipt Print Modal: Formatted 80mm thermal receipt with auto-focus print.
4. **POS Registers (`/ecommerce/pos/registers`)**:
   - Register list with hardware ID, warehouse assignment, active shift status, and register edit modal.

---

### Phase 4: Inventory & Supply Chain Subsystem
1. **Stock & Inventory (`/ecommerce/inventory`)**:
   - Stat cards: Total SKUs, Total Units On-Hand, Low Stock Alerts, Out of Stock, Inventory Asset Value.
   - In-place filtered table: SKU, Item Title, Category, Warehouse, Quantity On-Hand, Reserved, Available, Reorder Threshold, Unit Cost, Total Value.
   - Integration with existing `inventory-adjustment-modal.tsx`: Adjustment reason (`purchase`, `damage`, `count_correction`, `return`, `transfer`), quantity, notes.
   - Barcode Print Modal: Generates printable barcode labels (Code128 / QR) with product title and price.
   - Warehouse and UoM management sub-tabs or drawers.
2. **Stock Transfers (`/ecommerce/inventory/transfers`)**:
   - Stock Transfer list: Transfer number, Source Warehouse, Destination Warehouse, Total Items, Status (`draft`, `in_transit`, `received`, `cancelled`).
   - New Transfer Modal: Select source, destination, item lines and quantities.
   - Receive Transfer Action: Inspect received quantities and finalize inventory relocation.
3. **Stock Audits & Counts (`/ecommerce/inventory/counts`)**:
   - Physical cycle count audit records: Count reference, Warehouse, Auditor, Status (`open`, `in_progress`, `completed`).
   - Count Sheet Drawer: Enter physically counted quantities vs system on-hand, display variance, post reconciliation adjustments.
4. **Procurement & Purchase Orders (`/ecommerce/procurement`)**:
   - Tab 1: Purchase Orders (PO number, Supplier, Order Date, Expected Delivery, Total Amount, Status: `draft`, `submitted`, `partially_received`, `received`, `cancelled`).
   - Tab 2: Suppliers & Vendors (Supplier name, contact person, email, phone, payment terms, tax ID, active PO count).
   - PO Creation Modal: Line items selection, supplier selection, unit costs, delivery warehouse.
   - Supplier Create/Edit modal.

---

### Phase 5: Operations, Marketplace & Analytics Subsystem
1. **Shipping & Delivery (`/ecommerce/shipping`)**:
   - Shipments list: Tracking Number, Order Number, Carrier (e.g. RedX, Steadfast, DHL, Pathao, In-House), Status (`pending`, `dispatched`, `in_transit`, `delivered`, `failed`).
   - Create Shipment Modal: Carrier select, tracking code, shipping cost, estimated delivery date.
   - Status update dialog.
2. **Payments & Refunds (`/ecommerce/payments`)**:
   - Transaction log: Transaction Reference, Order Number, Payment Method (`cash`, `card`, `stripe`, `bkash`, `nagad`, `bank_transfer`), Amount, Fee, Status (`success`, `pending`, `failed`, `refunded`).
   - Refund Action Modal: Process partial or full refund with reason code.
3. **Customer Reviews Moderation (`/ecommerce/reviews`)**:
   - Reviews table: Product, Customer, Rating (1-5 stars), Review Title & Content, Date, Status (`pending`, `approved`, `rejected`).
   - One-click Approve / Reject moderation buttons with instant UI update.
4. **Multi-Vendor Sellers (`/ecommerce/sellers`)**:
   - Seller accounts: Store Name, Owner, Email, Commission Type (percentage vs flat), Commission Rate, Status (`active`, `pending_approval`, `suspended`).
   - Seller Approval Modal and commission rate settings.
5. **Reports & Analytics (`/ecommerce/reports`)**:
   - Top KPI cards: Gross Sales, Net Sales, Order Volume, Average Order Value (AOV), Return Rate.
   - Breakdown charts: Sales by Category, Top 10 Selling Products, Revenue over Time.
   - Date range selector: Today, Last 7 Days, This Month, Custom Date Range.
   - Export report to CSV / Excel.

---

## Technical Architecture & In-Place Filtering Compliance

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               Next.js Frontend Architecture                             │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              Sidebar Navigation                                │   │
│   │   E-Commerce Groups: Catalog & Store | Sales & POS | Inventory | Operations    │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
│                                           │                                            │
│                                           ▼                                            │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                      Page Component (e.g. /ecommerce/orders)                   │   │
│   │                                                                                │   │
│   │   [Stat Summary Cards] (Total, Revenue, Processing, Delivered)                 │   │
│   │                                                                                │   │
│   │   [Toolbar & Filter Bar]                                                       │   │
│   │   ├── Search (debounced)                                                       │   │
│   │   ├── Status Dropdowns (Payment, Fulfillment, Business)                        │   │
│   │   └── Action Buttons (Export, Import, New Record)                              │   │
│   │                                                                                │   │
│   │   ┌────────────────────────────────────────────────────────────────────────┐   │   │
│   │   │ [Table Container] (NEVER UNMOUNTS ON FILTER / PAGE CHANGE)             │   │   │
│   │   │ ──────────────────────────────────────────────────────────────         │   │   │
│   │   │ ┌────────────────────────────────────────────────────────────────────┐ │   │   │
│   │   │ │ Top Rim Progress Bar: {isFetching && <TopIndeterminateBar />}      │ │   │   │
│   │   │ └────────────────────────────────────────────────────────────────────┘ │   │   │
│   │   │                                                                        │   │   │
│   │   │ <tbody className={isFetching ? "opacity-50 pointer-events-none" : ""}> │   │   │
│   │   │    {paginatedItems.map(row => <TableRow key={row.id} />)}              │   │   │
│   │   │ </tbody>                                                               │   │   │
│   │   │                                                                        │   │   │
│   │   │ [Table Footer]                                                         │   │   │
│   │   │ ├── Showing X to Y of Z {isFetching && <Loader2 className="animate-spin" />}│   │
│   │   │ └── Pagination Controls (startTransition wrapped)                      │   │   │
│   │   └────────────────────────────────────────────────────────────────────────┘   │   │
│   │                                                                                │   │
│   │   [Interactive Modals / Drawers]                                               │   │
│   │   ├── Create / Edit Modal (Form state, validation)                             │   │
│   │   ├── Detail Drawer / Slide-Over (Tabs, related records)                       │   │
│   │   ├── Excel Template Download & Import Modal                                   │   │
│   │   └── Delete Confirmation Dialog                                               │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
│                                           │                                            │
│                                           ▼                                            │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                           @/lib/api-client (Axios)                             │   │
│   │   ├── Base URL: NEXT_PUBLIC_API_URL || 'http://localhost:8000'                 │   │
│   │   └── Authorization: Bearer ${localStorage.getItem('access_token')}            │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
│                                           │                                            │
│                                           ▼                                            │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                   FastAPI Backend REST Endpoints (/api/v1/*)                   │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Verification Plan

### Automated Tests
1. **In-Place Filtering & Non-Destructive Table Mount Tests**:
   - Run vitest suite to verify table persistence during filtering:
     ```bash
     docker exec nextjs_frontend npm test
     ```
   - Specifically test:
     - `src/components/ecommerce/__tests__/in-place-filtering-products.test.tsx`
     - New test suites for Orders, Categories, Inventory, and POS in-place filtering.
2. **Build & Lint Verification**:
   - Verify zero TypeScript or Next.js compilation errors:
     ```bash
     docker exec nextjs_frontend npm run lint
     docker exec nextjs_frontend npm run build
     ```

### Manual Verification
1. **Sidebar Navigation**:
   - Log in to the application and expand the **E-Commerce** sidebar menu.
   - Verify all 5 groups display cleanly with proper uppercase group labels and sub-links.
   - Click each sub-link to verify routing loads the respective module without errors.
2. **Products Page Refactor**:
   - Open `/ecommerce/products`.
   - Type in the search box; verify the table rows smoothly dim (`opacity-50`) and the top progress bar pulses while results update, without unmounting the table headers or pagination.
3. **Categories Management**:
   - Open `/ecommerce/categories`.
   - Test creating a category with attribute templates.
   - Test editing, deleting, downloading Excel template, and viewing hierarchy tree.
4. **Orders & Invoices**:
   - Open `/ecommerce/orders`.
   - Filter by status, open an order detail drawer, inspect line items, and trigger the printable invoice modal.
5. **POS Terminal**:
   - Open `/ecommerce/pos`.
   - Open a shift with starting float cash.
   - Search/scan products into the cart, adjust quantity, tender payment with cash/card/MFS, verify change calculation, and inspect the 80mm thermal receipt print preview.
6. **Inventory & Adjustments**:
   - Open `/ecommerce/inventory`.
   - Filter stock levels, click "Adjust Stock", change quantity with reason code, and observe updated stock in-place.
7. **Procurement, Shipping & Operations**:
   - Verify `/ecommerce/procurement`, `/ecommerce/shipping`, `/ecommerce/payments`, `/ecommerce/reviews`, `/ecommerce/sellers`, and `/ecommerce/reports` operate smoothly.
