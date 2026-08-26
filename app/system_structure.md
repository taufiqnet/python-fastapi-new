app/
├── main.py
├── database.py
│
├── core/
│   ├── config.py
│   ├── deps.py
│   └── security.py
│
├── common/
│   ├── models.py                # Common Mixins: UUIDMixin, TimestampMixin, SoftDeleteMixin
│   ├── schemas.py               # Response Envelopes: APIResponse, PaginatedResponse
│   └── enums.py                 # Shared Enums: Currency, Status
│
├── modules/
│   ├── categories/
│   │   ├── __init__.py
│   │   ├── models.py            # Category (self-referential tree), CategoryAttributeTemplate
│   │   └── schemas.py           # CategoryCreate, CategoryOut, CategoryTreeNode DTOs
│   │
│   └── products/
│       ├── __init__.py
│       ├── models.py            # Product, ProductVariant, ProductImage, ProductAttribute, ProductTag
│       └── schemas.py           # ProductCreate, ProductOut, ProductListItem, ProductDetailOut DTOs
│
├── models/                      # Legacy horizontal layers (to be migrated incrementally to modules/)
│   ├── business.py
│   ├── task.py
│   └── user.py
│
├── schemas/
│   ├── business.py
│   ├── task.py
│   └── user.py
│
├── repositories/
│   ├── business_repository.py
│   ├── task_repository.py
│   └── user_repository.py
│
├── services/
│   ├── business_service.py
│   ├── task_service.py
│   └── user_service.py
│
└── routers/
    ├── auth.py
    ├── business.py
    └── tasks.py
