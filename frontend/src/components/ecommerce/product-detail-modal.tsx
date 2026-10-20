"use client";

import React from "react";
import {
  X,
  Package,
  Tag,
  DollarSign,
  Layers,
  Calendar,
  Sparkles,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { ProductDetailOut, CategoryOut, BrandOut } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductDetailOut | null;
  categories: CategoryOut[];
  brands: BrandOut[];
  onEdit: (product: ProductDetailOut) => void;
  onDelete: (product: ProductDetailOut) => void;
}

export function ProductDetailModal({
  isOpen,
  onClose,
  product,
  categories,
  brands,
  onEdit,
  onDelete,
}: ProductDetailModalProps) {
  if (!isOpen || !product) return null;

  const categoryName =
    categories.find((c) => c.id === product.category_id)?.name || "Uncategorized";
  const brandName =
    product.brand || brands.find((b) => b.id === product.brand_id)?.name || "Generic";

  const primaryImage =
    product.images?.find((img) => img.is_primary) || product.images?.[0];
  const defaultVariant =
    product.variants?.find((v) => v.is_default) || product.variants?.[0];

  const priceNum = defaultVariant?.price ? Number(defaultVariant.price) : 0;
  const compareNum = defaultVariant?.compare_at_price
    ? Number(defaultVariant.compare_at_price)
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                product.status === "active"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
              }`}
            >
              {product.status === "active" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
              )}
              {product.status}
            </span>

            {product.is_featured && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Featured Item
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold mt-3 leading-snug">{product.title}</h2>
          <p className="text-xs text-indigo-200 font-mono mt-1">/{product.slug}</p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Main Hero & Quick Facts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Image Preview */}
            <div className="sm:col-span-1 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center aspect-square">
              {primaryImage?.url ? (
                <img
                  src={primaryImage.url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Package className="w-10 h-10 text-slate-300" />
                  <span className="text-[11px] font-medium">No Image</span>
                </div>
              )}
            </div>

            {/* Price & Overview */}
            <div className="sm:col-span-2 flex flex-col justify-between space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Retail Price</p>
                  <p className="text-2xl font-black text-indigo-700 mt-0.5">
                    {formatCurrency(priceNum, defaultVariant?.currency || "USD")}
                  </p>
                </div>
                {compareNum && compareNum > priceNum && (
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-400">Original Price</p>
                    <p className="text-sm font-semibold text-slate-400 line-through mt-0.5">
                      {formatCurrency(compareNum, defaultVariant?.currency || "USD")}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-medium">Brand</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{brandName}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-medium">Category</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{categoryName}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-medium">Master SKU</span>
                  <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                    {defaultVariant?.sku || "-"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-medium">Condition</span>
                  <span className="capitalize font-semibold text-slate-800 mt-0.5 block">
                    {product.condition || "New"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                Description
              </h3>
              <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-line leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {/* Variants List */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                Variants & Pricing ({product.variants.length})
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3">Stock Qty</th>
                      <th className="py-2.5 px-3 text-right">Default</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {product.variants.map((v, i) => (
                      <tr key={v.id || i} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-800">{v.sku}</td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-700">
                          {formatCurrency(Number(v.price) || 0, v.currency || "USD")}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{v.stock_qty ?? 0} units</td>
                        <td className="py-2.5 px-3 text-right">
                          {v.is_default && (
                            <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-semibold text-[10px]">
                              Primary
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Meta & Timestamps */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Created {formatDate(product.created_at)}
            </span>
            <span>Business Tenancy #{product.business_id || "All"}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete(product);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
          >
            <Trash2 className="w-4 h-4" />
            Delete Product
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-white transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(product);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
