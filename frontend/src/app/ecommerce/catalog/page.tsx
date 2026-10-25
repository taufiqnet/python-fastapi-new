"use client";

import React, { useEffect, useState, useMemo, useRef, startTransition } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import {
  SearchResult,
  SearchResultItem,
  CategoryOut,
  BrandOut,
  SuggestItem,
} from "@/types";
import { useAuth } from "@/context/auth-context";
import {
  ShoppingBag,
  Search,
  Filter,
  Star,
  RefreshCw,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Package,
  Layers,
  Award,
  Eye,
  Loader2,
  Check,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function CatalogBrowsePage() {
  const { user } = useAuth();
  const businessId = user?.business_id || 1;

  // Facet & Filter State
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [brand, setBrand] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [ratingMin, setRatingMin] = useState<string>("");
  const [isFeatured, setIsFeatured] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("relevance");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);

  // Data State
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [brands, setBrands] = useState<BrandOut[]>([]);

  // Autocomplete Suggestions State
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Quick View Modal
  const [quickViewProduct, setQuickViewProduct] = useState<SearchResultItem | null>(null);

  // Two-tier Loading per ui_in_place_filtering.md
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Fetch initial auxiliary data (categories & brands for sidebar)
  useEffect(() => {
    const fetchAuxData = async () => {
      try {
        const [catRes, brandRes] = await Promise.allSettled([
          apiClient.get<CategoryOut[]>("/categories/?limit=200"),
          apiClient.get<BrandOut[]>("/brands/?limit=200"),
        ]);
        if (catRes.status === "fulfilled") setCategories(catRes.value.data || []);
        if (brandRes.status === "fulfilled") setBrands(brandRes.value.data || []);
      } catch {
        // Non-blocking aux error
      }
    };
    fetchAuxData();
  }, []);

  // Main search function
  const executeSearch = async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.append("q", q.trim());
      if (businessId) params.append("business_id", String(businessId));
      if (categoryId) params.append("category_id", categoryId);
      if (brand) params.append("brand", brand);
      if (minPrice) params.append("min_price", minPrice);
      if (maxPrice) params.append("max_price", maxPrice);
      if (ratingMin) params.append("rating_min", ratingMin);
      if (isFeatured) params.append("is_featured", "true");
      params.append("sort_by", sortBy);
      params.append("sort_order", sortOrder);
      params.append("page", String(page));
      params.append("page_size", String(pageSize));

      const res = await apiClient.get<SearchResult>(`/search?${params.toString()}`);
      setSearchResult(res.data);
    } catch {
      setError("Failed to fetch product catalog search results.");
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  // Initial mount trigger
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      executeSearch(true);
    }
  }, []);

  // Reactive trigger on filter or pagination change (background update)
  useEffect(() => {
    if (!isInitialMount.current) {
      executeSearch(false);
    }
  }, [categoryId, brand, ratingMin, isFeatured, sortBy, sortOrder, page, pageSize]);

  // Handle Query Autocomplete Suggestions
  useEffect(() => {
    if (!q.trim() || q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get<SuggestItem[]>(
          `/search/suggest?q=${encodeURIComponent(q.trim())}&limit=5`
        );
        setSuggestions(res.data || []);
      } catch {
        // Ignore suggestion failures
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  // Handlers wrapped in startTransition
  const handleKeywordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    startTransition(() => {
      setPage(1);
    });
    executeSearch(false);
  };

  const handleSelectSuggestion = (item: SuggestItem) => {
    setQ(item.title);
    setShowSuggestions(false);
    startTransition(() => {
      setPage(1);
    });
    executeSearch(false);
  };

  const resetFilters = () => {
    startTransition(() => {
      setQ("");
      setCategoryId("");
      setBrand("");
      setMinPrice("");
      setMaxPrice("");
      setRatingMin("");
      setIsFeatured(false);
      setSortBy("relevance");
      setSortOrder("desc");
      setPage(1);
    });
    // Trigger search after reset
    setTimeout(() => {
      executeSearch(false);
    }, 50);
  };

  const hasActiveFilters =
    q.trim() !== "" ||
    categoryId !== "" ||
    brand !== "" ||
    minPrice !== "" ||
    maxPrice !== "" ||
    ratingMin !== "" ||
    isFeatured ||
    sortBy !== "relevance";

  const items = searchResult?.items || [];
  const totalItems = searchResult?.total || 0;
  const totalPages = searchResult?.total_pages || 1;

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
              <span>Catalog & Store</span>
              <span>•</span>
              <span>Faceted Retail Showcase</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <ShoppingBag className="w-7 h-7 text-indigo-600" />
              Product Catalog Showcase
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Explore and filter products dynamically across categories, brands, price brackets, and verified ratings.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => executeSearch(false)}
              disabled={isFetching}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
              title="Refresh Catalog"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            </button>
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition shadow-xs disabled:opacity-40"
            >
              Reset All Filters
            </button>
          </div>
        </div>

        {/* 2-Column Layout: Sidebar Filters + Main Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Sidebar Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5 lg:sticky lg:top-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Faceted Filters</h3>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Keyword Search Form */}
            <form onSubmit={handleKeywordSubmit} className="relative">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Keyword / Search
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Title, model, or keywords..."
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => {
                      setQ("");
                      setShowSuggestions(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-slate-50">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full px-3 py-2 text-left hover:bg-indigo-50/50 flex items-center justify-between text-xs transition"
                    >
                      <span className="font-medium text-slate-800 truncate">{s.title}</span>
                      {s.min_price && (
                        <span className="text-[11px] font-semibold text-emerald-600 shrink-0">
                          {formatCurrency(s.min_price)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </form>

            {/* Category Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) =>
                  startTransition(() => {
                    setCategoryId(e.target.value);
                    setPage(1);
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Brand / Manufacturer
              </label>
              <select
                value={brand}
                onChange={(e) =>
                  startTransition(() => {
                    setBrand(e.target.value);
                    setPage(1);
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Brackets */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Price Bracket ($)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) =>
                    startTransition(() => {
                      setMinPrice(e.target.value);
                      setPage(1);
                    })
                  }
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) =>
                    startTransition(() => {
                      setMaxPrice(e.target.value);
                      setPage(1);
                    })
                  }
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Minimum Rating */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Minimum Rating
              </label>
              <select
                value={ratingMin}
                onChange={(e) =>
                  startTransition(() => {
                    setRatingMin(e.target.value);
                    setPage(1);
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Any Rating</option>
                <option value="4.0">★★★★☆ 4.0 & above</option>
                <option value="3.0">★★★☆☆ 3.0 & above</option>
                <option value="2.0">★★☆☆☆ 2.0 & above</option>
              </select>
            </div>

            {/* Featured Only Toggle */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Featured Only
              </span>
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) =>
                  startTransition(() => {
                    setIsFeatured(e.target.checked);
                    setPage(1);
                  })
                }
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
            </div>
          </div>

          {/* Main Showcase Area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Sorting & Result Count Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-500">
                <span>
                  Showing <strong className="text-slate-900 font-bold">{items.length}</strong> of{" "}
                  <strong className="text-slate-900 font-bold">{totalItems}</strong> matching products
                </span>
                {isFetching && <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />}
              </div>

              {/* Sort Controls */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    startTransition(() => {
                      setSortBy(e.target.value);
                      setPage(1);
                    })
                  }
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price">Price</option>
                  <option value="rating">Rating</option>
                  <option value="created_at">Newest Arrivals</option>
                  <option value="sold_count">Best Sellers</option>
                </select>

                <button
                  type="button"
                  onClick={() =>
                    startTransition(() => {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      setPage(1);
                    })
                  }
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                  title="Toggle Asc/Desc"
                >
                  {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
                </button>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            {/* Products Grid Container - Never Unmounts per Invariant */}
            <div className="relative">
              {/* Top-rim Indeterminate Progress Bar during background fetching */}
              {isFetching && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20 rounded-t-2xl">
                  <div className="w-full h-full bg-indigo-600 origin-left animate-indeterminate" />
                </div>
              )}

              {initialLoading && items.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                    <p className="text-sm font-semibold text-slate-800">Loading catalog products...</p>
                    <p className="text-xs text-slate-400">Executing faceted search query</p>
                  </div>
                </div>
              ) : items.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Package className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No matching products found</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Try relaxing your price brackets or clearing specific category/brand filter combinations.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold rounded-xl text-xs transition"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                /* Showcase Product Cards Grid */
                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 ${
                    isFetching ? "opacity-50 transition-opacity" : ""
                  }`}
                >
                  {items.map((prod) => (
                    <div
                      key={prod.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col group"
                    >
                      {/* Product Image Thumbnail */}
                      <div className="relative aspect-4/3 bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-center overflow-hidden">
                        {prod.primary_image_url ? (
                          <img
                            src={prod.primary_image_url}
                            alt={prod.title}
                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-300">
                            <Package className="w-10 h-10 stroke-[1.5]" />
                            <span className="text-[10px] mt-1 font-medium">No Image</span>
                          </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                          {prod.is_featured && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                              <Sparkles className="w-2.5 h-2.5" /> Featured
                            </span>
                          )}
                        </div>

                        {/* Quick View Button */}
                        <button
                          type="button"
                          onClick={() => setQuickViewProduct(prod)}
                          className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-semibold rounded-lg shadow-md backdrop-blur-xs"
                        >
                          <Eye className="w-3 h-3" /> Quick View
                        </button>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Brand & Category */}
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                            <span className="font-semibold text-indigo-600 truncate">
                              {prod.brand || "General Brand"}
                            </span>
                            {prod.sold_count > 0 && (
                              <span className="text-slate-400">{prod.sold_count} sold</span>
                            )}
                          </div>

                          {/* Product Title */}
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition line-clamp-2 leading-snug">
                            {prod.title}
                          </h4>

                          {/* Ratings */}
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="flex items-center text-amber-400">
                              <Star className="w-3.5 h-3.5 fill-current" />
                            </div>
                            <span className="text-xs font-bold text-slate-800">
                              {prod.average_rating ? prod.average_rating.toFixed(1) : "—"}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ({prod.review_count || 0})
                            </span>
                          </div>
                        </div>

                        {/* Pricing & Footer */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                          <div>
                            <span className="text-xs text-slate-400 block text-[10px] uppercase font-semibold">
                              Price
                            </span>
                            <span className="text-base font-extrabold text-slate-900">
                              {prod.min_price != null ? formatCurrency(prod.min_price) : "Contact"}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setQuickViewProduct(prod)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  Page <strong className="text-slate-900 font-bold">{page}</strong> of{" "}
                  <strong className="text-slate-900 font-bold">{totalPages}</strong>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startTransition(() => setPage((p) => Math.max(1, p - 1)))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold flex items-center gap-1 transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => startTransition(() => setPage((p) => Math.min(totalPages, p + 1)))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold flex items-center gap-1 transition"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick View Modal */}
        {quickViewProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900 truncate">
                    Product Quick View
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickViewProduct(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="aspect-16/9 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden p-4">
                  {quickViewProduct.primary_image_url ? (
                    <img
                      src={quickViewProduct.primary_image_url}
                      alt={quickViewProduct.title}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Package className="w-12 h-12 text-slate-300" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
                    <Award className="w-3.5 h-3.5" />
                    <span>{quickViewProduct.brand || "General Manufacturer"}</span>
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900 mt-1">
                    {quickViewProduct.title}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Slug: /{quickViewProduct.slug}
                  </p>
                </div>

                {quickViewProduct.description && (
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    {quickViewProduct.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Catalog Price</span>
                    <p className="text-base font-extrabold text-slate-900 mt-0.5">
                      {quickViewProduct.min_price != null
                        ? formatCurrency(quickViewProduct.min_price)
                        : "Contact"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Customer Rating</span>
                    <div className="flex items-center gap-1.5 mt-1 text-slate-800 font-bold text-sm">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span>{quickViewProduct.average_rating?.toFixed(1) || "5.0"}</span>
                      <span className="text-xs text-slate-400 font-normal">
                        ({quickViewProduct.review_count} reviews)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setQuickViewProduct(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-xs transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
