import uuid

from sqlalchemy.orm import Session

from app.modules.ecommerce.categories.models import Category, CategoryAttributeTemplate
from app.modules.ecommerce.categories.schemas import CategoryCreate, CategoryUpdate


class CategoryRepository:

    def get_by_id(self, db: Session, category_id: uuid.UUID) -> Category | None:
        return db.query(Category).filter(Category.id == category_id).first()

    def get_by_slug(self, db: Session, slug: str) -> Category | None:
        return db.query(Category).filter(Category.slug == slug).first()

    def get_all(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        business_id: int | None = None,
        parent_id: uuid.UUID | None = None,
    ) -> list[Category]:
        query = db.query(Category)
        if business_id is not None:
            query = query.filter(Category.business_id == business_id)
        if parent_id is not None:
            query = query.filter(Category.parent_id == parent_id)
        return query.offset(skip).limit(limit).all()

    def get_tree(self, db: Session, business_id: int | None = None) -> list[Category]:
        query = db.query(Category).filter(Category.parent_id.is_(None))
        if business_id is not None:
            query = query.filter(Category.business_id == business_id)
        return query.all()

    def create(self, db: Session, data: CategoryCreate) -> Category:
        category = Category(
            name=data.name,
            slug=data.slug,
            icon=data.icon,
            description=data.description,
            is_active=data.is_active,
            parent_id=data.parent_id,
            business_id=data.business_id,
        )
        if data.attribute_templates:
            for template_data in data.attribute_templates:
                template = CategoryAttributeTemplate(
                    attribute_name=template_data.attribute_name,
                    attribute_type=template_data.attribute_type,
                    is_required=template_data.is_required,
                    options=template_data.options,
                )
                category.attribute_templates.append(template)

        db.add(category)
        db.commit()
        db.refresh(category)
        return category

    def update(
        self, db: Session, category: Category, data: CategoryUpdate
    ) -> Category:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(category, field, value)

        db.commit()
        db.refresh(category)
        return category

    def delete(self, db: Session, category: Category) -> None:
        db.delete(category)
        db.commit()
