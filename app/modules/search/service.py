import math

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.modules.products.models import Product, ProductVariant
from app.modules.search.schemas import (
    FacetOut,
    FacetValueOut,
    SearchQuery,
    SearchResult,
    SearchResultItem,
)


class SearchService:
    def search_products(self, db: Session, query: SearchQuery) -> SearchResult:
        base_query = db.query(Product)

        if query.business_id is not None:
            base_query = base_query.filter(Product.business_id == query.business_id)

        if query.status is not None:
            base_query = base_query.filter(Product.status == query.status)

        if query.category_id is not None:
            base_query = base_query.filter(Product.category_id == query.category_id)

        if query.brand:
            base_query = base_query.filter(Product.brand.ilike(f"%{query.brand}%"))

        if query.is_featured is not None:
            base_query = base_query.filter(Product.is_featured.is_(query.is_featured))

        if query.rating_min is not None:
            base_query = base_query.filter(Product.average_rating >= query.rating_min)

        if query.q and query.q.strip():
            term = f"%{query.q.strip()}%"
            base_query = base_query.filter(
                or_(
                    Product.title.ilike(term),
                    Product.description.ilike(term),
                    Product.brand.ilike(term),
                )
            )

        # Filter by price range via ProductVariant subquery/join
        if query.min_price is not None or query.max_price is not None:
            price_query = db.query(ProductVariant.product_id)
            if query.min_price is not None:
                price_query = price_query.filter(ProductVariant.price >= query.min_price)
            if query.max_price is not None:
                price_query = price_query.filter(ProductVariant.price <= query.max_price)
            matching_product_ids = [row[0] for row in price_query.all()]
            base_query = base_query.filter(Product.id.in_(matching_product_ids))

        total = base_query.count()

        # Sorting
        if query.sort_by == "price":
            # Sort by variant price using aggregated subquery to avoid duplicate rows
            price_subquery = (
                db.query(
                    ProductVariant.product_id,
                    func.min(ProductVariant.price).label("min_var_price"),
                    func.max(ProductVariant.price).label("max_var_price"),
                )
                .group_by(ProductVariant.product_id)
                .subquery()
            )
            base_query = base_query.outerjoin(
                price_subquery, Product.id == price_subquery.c.product_id
            )
            if query.sort_order == "asc":
                base_query = base_query.order_by(price_subquery.c.min_var_price.asc())
            else:
                base_query = base_query.order_by(price_subquery.c.max_var_price.desc())
        elif query.sort_by == "rating":
            if query.sort_order == "asc":
                base_query = base_query.order_by(Product.average_rating.asc())
            else:
                base_query = base_query.order_by(Product.average_rating.desc())
        elif query.sort_by == "sold_count":
            if query.sort_order == "asc":
                base_query = base_query.order_by(Product.sold_count.asc())
            else:
                base_query = base_query.order_by(Product.sold_count.desc())
        elif query.sort_by == "created_at":
            if query.sort_order == "asc":
                base_query = base_query.order_by(Product.created_at.asc())
            else:
                base_query = base_query.order_by(Product.created_at.desc())
        else:
            # default relevance / created_at desc
            base_query = base_query.order_by(Product.created_at.desc())

        # Pagination
        offset = (query.page - 1) * query.page_size
        products = base_query.offset(offset).limit(query.page_size).all()

        items = []
        for p in products:
            prices = [v.price for v in p.variants] if p.variants else []
            min_p = float(min(prices)) if prices else None
            max_p = float(max(prices)) if prices else None
            primary_img = next((img.url for img in p.images if img.is_primary), None)
            if not primary_img and p.images:
                primary_img = p.images[0].url

            items.append(
                SearchResultItem(
                    id=p.id,
                    business_id=p.business_id,
                    title=p.title,
                    slug=p.slug,
                    brand=p.brand,
                    description=p.description,
                    status=p.status,
                    category_id=p.category_id,
                    min_price=min_p,
                    max_price=max_p,
                    average_rating=float(p.average_rating or 0.0),
                    review_count=p.review_count,
                    sold_count=p.sold_count,
                    is_featured=p.is_featured,
                    primary_image_url=primary_img,
                )
            )

        # Generate facets (Brands and Categories)
        brand_facets = (
            db.query(Product.brand, func.count(Product.id))
            .filter(Product.brand.isnot(None), Product.status == (query.status or Product.status))
            .group_by(Product.brand)
            .all()
        )
        brand_facet_values = [
            FacetValueOut(value=brand, count=count) for brand, count in brand_facets if brand
        ]

        facets = [FacetOut(name="brand", values=brand_facet_values)]

        total_pages = math.ceil(total / query.page_size) if total > 0 else 0
        has_next = query.page < total_pages
        has_prev = query.page > 1

        return SearchResult(
            query=query.q,
            items=items,
            total=total,
            page=query.page,
            page_size=query.page_size,
            total_pages=total_pages,
            has_next=has_next,
            has_prev=has_prev,
            facets=facets,
        )
