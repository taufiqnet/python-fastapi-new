# ProERP Standard List Layout & UI Design Specification
**Reference Implementation:** `app/templates/modules/ecommerce/products/product_list.html` (`/products`)  
**File Convention:** `prompt_proerp_standard_list_layout.md`  
**Purpose:** Reusable master design specification and AI prompt template for building all future list/index views across ProERP modules (Finance, Inventory, POS, HRM, CRM, Procurement).

---

## 1. Master Prompt for AI Agents & Developers

When creating or refactoring any list/index view in ProERP, use the following standardized instruction:

```markdown
Implement the list page for [ENTITY_NAME] following the ProERP Standard List Layout (`/products` reference):

1. Backend View Router (FastAPI):
   - Inject `current_user`, `db`, and optional `business_id` query param with `resolve_business_id(current_user, business_id)`.
   - Calculate 4 top-level KPI metrics (`total_count`, `active_count`, `metric_3_count`, `metric_4_count`).
   - Resolve multi-tenant data: `businesses = business_service.list_businesses(db)`, `biz_map = {b.id: b.name_en for b in businesses}`, and active tenant `current_business`.
   - Restrict non-superusers to their own `business_id` only.

2. Frontend Template (Jinja2 / TailwindCSS):
   - Extend `base.html` with DataTables CSS/JS (`jquery.dataTables.min.css`, `responsive.dataTables.min.css`).
   - Page Header: Title `h1`, subtitle, `#btnToggleFilters` button, optional Import Excel button, and primary "+ Create [Entity]" button.
   - KPI Stat Cards (`.stat-grid`): 4-column responsive grid with `.stat-icon` (indigo, green, yellow, gray/sky) and live values.
   - Toolbar (`.toolbar`): Live search input (`#customSearch`), status filter dropdown (`#filterStatus`), multi-tenant business dropdown (`#filterBusiness`), and `#btnClearFilters` button.
   - Table Card (`.table-card`): DataTables table (`table.dataTable`) with light uppercase headers (`#f9fafb`), entity title + slug/code, related badges, tenant profile badge, status pill, and action buttons (view, edit, delete).
   - Custom Footer (`.dt-footer`): Live range text (`#dtInfo`: "Showing 1–10 of X entries"), per-page dropdown (`#dtPerPage`: 5, 10, 25, 50), and numbered pagination with ellipsis (`#dtPagination`).
   - Interactivity: Slide-toggleable toolbar, SweetAlert2 delete confirmation, and DataTables custom pagination (`movePage(p)`).
```

---

## 2. Standard Page Anatomy & Components

Every list page in ProERP adheres to a strict 6-tier visual hierarchy:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Page Header (Title, Subtitle, [Toggle Filters] [Import] [+ Create]) │
├────────────────────────────────────────────────────────────────────────┤
│ 2. KPI Stat Cards (4 Cards: Total, Active, Secondary, Tertiary Metric) │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Filter Toolbar ([Search Input] [Status ▼] [Business ▼] [✕ Clear])   │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Table Card (DataTables Grid with Brand/Code/Tenant/Status Badges)   │
├────────────────────────────────────────────────────────────────────────┤
│ 5. Custom Footer ("Showing 1–10 of 45 entries" | Per-Page | [1][2] >) │
├────────────────────────────────────────────────────────────────────────┤
│ 6. Action Modals (Import Excel Modal / SweetAlert2 Delete Dialog)      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. UI Component Tokens & Styling Reference

### 3.1 CSS Design Tokens (Include in `{% block head %}`)

```html
{% block head %}
<!-- DataTables CSS -->
<link rel="stylesheet" type="text/css" href="/static/vendor/datatables/jquery.dataTables.min.css">
<link rel="stylesheet" type="text/css" href="/static/vendor/datatables/responsive.dataTables.min.css">

<style>
    :root { --indigo: #4f46e5; --indigo-dark: #4338ca; }

    /* ── 4-Card KPI Stat Grid ── */
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 1.25rem; }
    @media (max-width: 1024px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .stat-grid { grid-template-columns: repeat(1, 1fr); } }
    .stat-card {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .stat-icon {
        width: 38px; height: 38px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        font-size: 16px; flex-shrink: 0;
    }
    .stat-icon.indigo  { background: #eef2ff; color: #4f46e5; }
    .stat-icon.green   { background: #f0fdf4; color: #16a34a; }
    .stat-icon.yellow  { background: #fefce8; color: #ca8a04; }
    .stat-icon.sky     { background: #f0f9ff; color: #0284c7; }
    .stat-icon.gray    { background: #f3f4f6; color: #6b7280; }
    .stat-label { font-size: 11px; color: #6b7280; margin-bottom: 2px; }
    .stat-value { font-size: 20px; font-weight: 700; color: #111827; line-height: 1; }

    /* ── Toolbar & Filter Controls ── */
    .toolbar {
        display: flex; flex-wrap: wrap; align-items: center;
        gap: 8px; margin-bottom: 12px;
    }
    .toolbar-search {
        position: relative; flex: 1; min-width: 200px;
    }
    .toolbar-search i {
        position: absolute; left: 10px; top: 50%;
        transform: translateY(-50%); color: #9ca3af; font-size: 13px;
    }
    .toolbar-search input {
        width: 100%; padding: 7px 12px 7px 30px;
        border: 1px solid #e5e7eb; border-radius: 8px;
        background: #f9fafb; color: #374151; font-size: 13px; outline: none;
        transition: border-color .15s, background .15s;
    }
    .toolbar-search input:focus {
        border-color: var(--indigo);
        box-shadow: 0 0 0 2px rgba(79,70,229,.08);
        background: #fff;
    }
    .toolbar select {
        padding: 7px 28px 7px 10px; border: 1px solid #e5e7eb;
        border-radius: 8px; background: #f9fafb; color: #374151;
        font-size: 13px; cursor: pointer; outline: none;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
        background-repeat: no-repeat; background-position: right 8px center;
    }
    .toolbar select:focus { border-color: var(--indigo); background-color: #fff; }

    /* ── Table Card & DataTables Overrides ── */
    .table-card {
        background: #fff; border: 1px solid #e5e7eb;
        border-radius: 12px; overflow: hidden;
    }
    table.dataTable { border-collapse: collapse !important; }
    table.dataTable thead tr th {
        background: #f9fafb !important;
        border-bottom: 1px solid #e5e7eb !important;
        font-size: 10px !important; font-weight: 700 !important;
        text-transform: uppercase; letter-spacing: .6px;
        color: #6b7280 !important; padding: 10px 14px !important;
        white-space: nowrap;
    }
    table.dataTable tbody td { padding: 9px 14px !important; font-size: 13px; vertical-align: middle; }
    table.dataTable tbody tr:hover td { background: #f9fafb !important; }
    table.dataTable.no-footer { border-bottom: 1px solid #f3f4f6 !important; }
    .dataTables_filter, .dataTables_length { display: none !important; }

    /* ── Custom Pagination Footer ── */
    .dt-footer {
        display: flex; align-items: center; justify-content: space-between;
        padding: 8px 14px; border-top: 1px solid #f3f4f6;
        background: #fafafa; flex-wrap: wrap; gap: 8px;
    }
    .dt-footer .dt-info { font-size: 12px; color: #9ca3af; }
    .dt-footer .dt-perpage {
        display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280;
    }
    .dt-perpage select {
        padding: 3px 22px 3px 8px; border: 1px solid #e5e7eb;
        border-radius: 6px; background: #fff; color: #374151;
        font-size: 12px; cursor: pointer; appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
        background-repeat: no-repeat; background-position: right 6px center;
    }

    /* ── Badges & Status Pills ── */
    .badge { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; text-transform: capitalize; }
    .badge-active, .badge-published { background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }
    .badge-draft   { background: #fefce8; color: #ca8a04; border: 1px solid #fef08a; }
    .badge-inactive, .badge-archived { background: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb; }

    /* ── Action Buttons ── */
    .action-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; transition: all .15s; font-size: 13px; text-decoration: none; }
    .action-btn.view { color: #10b981; } .action-btn.view:hover { background: #ecfdf5; border-color: #a7f3d0; color: #047857; }
    .action-btn.edit { color: #4f46e5; } .action-btn.edit:hover { background: #eef2ff; border-color: #a5b4fc; color: #3730a3; }
    .action-btn.delete { color: #ef4444; } .action-btn.delete:hover { background: #fef2f2; border-color: #fca5a5; color: #b91c1c; }
</style>
{% endblock %}
```

---

## 4. Complete HTML Template Boilerplate

Save new views under `app/templates/modules/[MODULE]/[ENTITY]/[entity]_list.html`:

```html
{% extends "base.html" %}

{% block title %}Products | SaaS Platform{% endblock %}

{% block content %}
<!-- 1. Header Section -->
<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
    <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Products</h1>
        <p class="text-xs text-gray-500 mt-0.5 font-medium">Manage product catalog, status, and pricing</p>
    </div>
    <div class="flex items-center gap-3">
        <button type="button" id="btnToggleFilters" class="w-10 h-10 border border-gray-200 bg-white rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors shadow-sm" title="Toggle Filters">
            <i class="fas fa-sliders-h text-sm"></i>
        </button>
        <button type="button" onclick="openImportModal()" class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors">
            <i class="fas fa-file-excel"></i> Import Excel
        </button>
        <a href="/products/create" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm">
            <i class="fas fa-plus"></i> Create Product
        </a>
    </div>
</div>

<!-- 2. KPI Stat Cards -->
<div class="stat-grid">
    <div class="stat-card">
        <div class="stat-icon indigo"><i class="fas fa-box"></i></div>
        <div>
            <div class="stat-label">Total Products</div>
            <div class="stat-value">{{ total_count }}</div>
        </div>
    </div>
    <div class="stat-card">
        <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
        <div>
            <div class="stat-label">Active / Published</div>
            <div class="stat-value">{{ published_count }}</div>
        </div>
    </div>
    <div class="stat-card">
        <div class="stat-icon yellow"><i class="fas fa-edit"></i></div>
        <div>
            <div class="stat-label">Drafts</div>
            <div class="stat-value">{{ draft_count }}</div>
        </div>
    </div>
    <div class="stat-card">
        <div class="stat-icon gray"><i class="fas fa-archive"></i></div>
        <div>
            <div class="stat-label">Archived</div>
            <div class="stat-value">{{ archived_count }}</div>
        </div>
    </div>
</div>

<!-- 3. Toolbar & Filters -->
<div class="toolbar">
    <div class="toolbar-search">
        <i class="fas fa-search"></i>
        <input type="text" id="customSearch" placeholder="Search product title, slug, brand...">
    </div>
    <select id="filterStatus">
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
        <option value="inactive">Inactive</option>
        <option value="archived">Archived</option>
    </select>
    {% if current_user and not current_user.is_superuser %}
    <select id="filterBusiness" disabled class="bg-gray-100 text-gray-500 cursor-not-allowed">
        {% for b in businesses %}
        {% if b.id == current_user.business_id %}
        <option value="{{ b.id }}" selected>{{ b.name_en }}</option>
        {% endif %}
        {% endfor %}
    </select>
    {% else %}
    <select id="filterBusiness" onchange="window.location.href='/products?business_id='+this.value">
        <option value="">All Businesses</option>
        {% for b in businesses %}
        <option value="{{ b.id }}" {% if b.id == selected_business_id %}selected{% endif %}>{{ b.name_en }}</option>
        {% endfor %}
    </select>
    {% endif %}
    <button type="button" id="btnClearFilters" class="px-4 py-2 border border-gray-200 hover:border-red-300 bg-gray-50 hover:bg-red-50 text-gray-700 hover:text-red-700 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer">
        <i class="fas fa-times-circle text-xs"></i> Clear Filters
    </button>
</div>

<!-- 4. Table Card -->
<div class="table-card">
    <div class="overflow-x-auto">
        <table id="productTable" class="w-full text-left display">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Business Profile</th>
                    <th>Status</th>
                    <th style="width:110px">Actions</th>
                    <th class="hidden"></th><!-- Status Raw -->
                    <th class="hidden"></th><!-- Business Raw -->
                </tr>
            </thead>
            <tbody>
                {% for p in products %}
                {% set st = p.status.value if p.status.value is defined else p.status %}
                <tr id="product-row-{{ p.id }}">
                    <td>
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                <i class="fas fa-box"></i>
                            </div>
                            <div>
                                <div class="font-semibold text-gray-900">{{ p.title }}</div>
                                <div class="text-[10px] text-gray-500 font-mono">{{ p.slug }}</div>
                            </div>
                        </div>
                    </td>
                    <td class="text-xs text-gray-600">{{ cat_map.get(p.category_id, '—') }}</td>
                    <td class="text-xs text-gray-600">{{ brand_map.get(p.brand_id, p.brand or '—') }}</td>
                    <td class="text-xs text-gray-600">
                        {% if p.business_id and biz_map.get(p.business_id) %}
                        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-gray-700 text-[11px] font-medium">
                            <i class="fas fa-building text-gray-400 text-[10px]"></i>
                            <span>{{ biz_map.get(p.business_id) }}</span>
                        </span>
                        {% else %}
                        <span class="text-gray-400 italic text-[11px]">— Global —</span>
                        {% endif %}
                    </td>
                    <td>
                        {% if st == 'published' or st == 'active' %}
                        <span class="badge badge-published"><i class="fas fa-circle text-[6px] mr-1"></i> {{ st }}</span>
                        {% elif st == 'draft' %}
                        <span class="badge badge-draft"><i class="fas fa-circle text-[6px] mr-1"></i> Draft</span>
                        {% else %}
                        <span class="badge badge-archived"><i class="fas fa-circle text-[6px] mr-1"></i> {{ st }}</span>
                        {% endif %}
                    </td>
                    <td>
                        <div class="flex items-center gap-1.5">
                            <a href="/products/detail/{{ p.id }}" class="action-btn view" title="View Product"><i class="fas fa-eye"></i></a>
                            <a href="/products/edit/{{ p.id }}" class="action-btn edit" title="Edit Product"><i class="fas fa-edit"></i></a>
                            <button type="button" class="action-btn delete" onclick="deleteProduct('{{ p.id }}', '{{ p.title|e }}')" title="Delete Product"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </td>
                    <td class="hidden">{{ st }}</td>
                    <td class="hidden">{% if p.business_id and biz_map.get(p.business_id) %}{{ biz_map.get(p.business_id) }}{% else %}Global{% endif %}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>

    <!-- 5. Custom Footer -->
    <div class="dt-footer">
        <div class="dt-info" id="dtInfo"></div>
        <div class="flex items-center gap-4 flex-wrap">
            <div class="dt-perpage">
                Show
                <select id="dtPerPage">
                    <option value="5">5</option>
                    <option value="10" selected>10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                </select>
                entries
            </div>
            <div id="dtPagination"></div>
        </div>
    </div>
</div>
{% endblock %}

{% block extra_js %}
<!-- jQuery & DataTables JS -->
<script src="/static/vendor/jquery.min.js"></script>
<script src="/static/vendor/datatables/jquery.dataTables.min.js"></script>
<script src="/static/vendor/datatables/dataTables.responsive.min.js"></script>

<script>
$(document).ready(function () {
    var table = $('#productTable').DataTable({
        responsive: true,
        pageLength: 10,
        dom: 'rt',
        columnDefs: [{ targets: [6, 7], visible: false, searchable: true }],
        order: [],
        language: { emptyTable: "No records found." },
        drawCallback: function () { updateFooter(this.api()); }
    });

    $('#customSearch').on('input', function () { table.search(this.value).draw(); });
    $('#filterStatus').on('change', function () { table.column(6).search(this.value).draw(); });
    if ($('#filterBusiness').length) {
        $('#filterBusiness').on('change', function () { table.column(7).search(this.value).draw(); });
    }
    $('#dtPerPage').on('change', function () { table.page.len(parseInt(this.value)).draw(); });

    $('#btnToggleFilters').on('click', function() {
        $('.toolbar').slideToggle(200);
    });

    $('#btnClearFilters').on('click', function() {
        $('#customSearch').val('');
        table.search('');
        $('#filterStatus').val('');
        if ($('#filterBusiness').length) {
            $('#filterBusiness').val('');
        }
        table.columns().search('').draw();
    });

    function updateFooter(api) {
        var info = api.page.info();
        var start = info.recordsDisplay === 0 ? 0 : info.start + 1;
        var end   = Math.min(info.end, info.recordsDisplay);
        var total = info.recordsDisplay;
        var overall = info.recordsTotal;

        if (total === 0) {
            $('#dtInfo').text('No entries found');
        } else if (total < overall) {
            $('#dtInfo').text('Showing ' + start + '–' + end + ' of ' + total + ' filtered (total ' + overall + ')');
        } else {
            $('#dtInfo').text('Showing ' + start + '–' + end + ' of ' + total + ' entries');
        }

        var pages = info.pages;
        var current = info.page;
        var html = '';
        var btnClass = 'inline-flex items-center justify-center w-7 h-7 rounded text-xs border transition-colors ';
        var base   = btnClass + 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 cursor-pointer';
        var active = btnClass + 'border-indigo-600 bg-indigo-600 text-white font-semibold cursor-default';
        var disabled = btnClass + 'border-gray-100 bg-white text-gray-300 cursor-default';

        if (current === 0) {
            html += '<button class="' + disabled + '" disabled><i class="fas fa-chevron-left" style="font-size:10px"></i></button>';
        } else {
            html += '<button class="' + base + '" onclick="movePage(' + (current - 1) + ')"><i class="fas fa-chevron-left" style="font-size:10px"></i></button>';
        }

        var start_p = Math.max(0, current - 2);
        var end_p   = Math.min(pages - 1, current + 2);
        if (start_p > 0) html += '<button class="' + base + '" onclick="movePage(0)">1</button>';
        if (start_p > 1) html += '<span class="text-gray-400 text-xs px-1">…</span>';
        for (var i = start_p; i <= end_p; i++) {
            html += '<button class="' + (i === current ? active : base) + '" onclick="movePage(' + i + ')">' + (i + 1) + '</button>';
        }
        if (end_p < pages - 2) html += '<span class="text-gray-400 text-xs px-1">…</span>';
        if (end_p < pages - 1) html += '<button class="' + base + '" onclick="movePage(' + (pages - 1) + ')">' + pages + '</button>';

        if (current >= pages - 1) {
            html += '<button class="' + disabled + '" disabled><i class="fas fa-chevron-right" style="font-size:10px"></i></button>';
        } else {
            html += '<button class="' + base + '" onclick="movePage(' + (current + 1) + ')"><i class="fas fa-chevron-right" style="font-size:10px"></i></button>';
        }

        $('#dtPagination').html('<div class="flex items-center gap-1">' + html + '</div>');
    }
    window._dtTable = table;
});

function movePage(p) { window._dtTable.page(p).draw('page'); }

function deleteProduct(id, name) {
    Swal.fire({
        title: 'Delete Product?',
        text: 'Are you sure you want to delete "' + name + '"? This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, Delete',
        cancelButtonText: 'Cancel'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch('/products/' + id, { method: 'DELETE' });
                if (res.ok) {
                    Swal.fire({ icon: 'success', title: 'Deleted', text: 'Product removed.', timer: 1200, showConfirmButton: false })
                        .then(() => window.location.reload());
                } else {
                    const err = await res.json();
                    throw new Error(err.detail || 'Failed to delete');
                }
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Delete Failed', text: err.message });
            }
        }
    });
}
</script>
{% endblock %}
```

---

## 5. Backend Controller Pattern (FastAPI Router)

```python
@router.get("/[entities]", response_class=HTMLResponse)
def entity_list_page(
    request: Request,
    skip: int = 0,
    limit: int = 500,
    business_id: Optional[int] = Query(None),
    current_user: User = Depends(require_permission("[MODULE]", "[ENTITY]", "view")),
    db: Session = Depends(get_db),
):
    resolved_business_id = resolve_business_id(current_user, business_id)
    businesses = business_service.list_businesses(db, skip=0, limit=500)
    biz_map = {b.id: b.name_en for b in businesses}
    
    if current_user and not current_user.is_superuser and current_user.business_id:
        businesses = [b for b in businesses if b.id == current_user.business_id]
        entities = entity_service.get_all(db, business_id=current_user.business_id)
        selected_business_id = current_user.business_id
    else:
        entities = entity_service.get_all(db, business_id=resolved_business_id)
        selected_business_id = resolved_business_id or (businesses[0].id if businesses else 1)

    # Calculate 4 KPI metrics
    total_count = len(entities)
    active_count = sum(1 for e in entities if getattr(e, "is_active", True))
    metric_3_count = sum(1 for e in entities if getattr(e, "status", None) == "draft")
    metric_4_count = total_count - active_count

    current_biz = next((b for b in businesses if b.id == selected_business_id), None)
    if not current_biz and businesses:
        current_biz = businesses[0]

    return templates.TemplateResponse(
        name="modules/[MODULE]/[ENTITY]/[entity]_list.html",
        context={
            "request": request,
            "current_user": current_user,
            "entities": entities,
            "businesses": businesses,
            "biz_map": biz_map,
            "current_business": current_biz,
            "selected_business_id": selected_business_id,
            "total_count": total_count,
            "active_count": active_count,
            "metric_3_count": metric_3_count,
            "metric_4_count": metric_4_count,
            "active_page": "[entity]_list",
        },
    )
```
