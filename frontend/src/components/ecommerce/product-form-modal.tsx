"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Image as ImageIcon, Sparkles, Tag, DollarSign, Box } from "lucide-react";
import { ProductDetailOut, ProductCreateInput, CategoryOut, BrandOut } from "@/types";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/context/toast-context";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productToEdit?: ProductDetailOut | null;
  categories: CategoryOut[];
  brands: BrandOut[];
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSuccess,
  productToEdit,
  categories,
  brands,
}: ProductFormModalProps) {
  const { toast } = useToast();
  const isEdit = Boolean(productToEdit);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [brandId, setBrandId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [status, setStatus] = useState("active");
  const [condition, setCondition] = useState("new");
  const [productType, setProductType] = useState("physical");
  const [price, setPrice] = useState<string>("0.00");
  const [comparePrice, setComparePrice] = useState<string>("");
  const [sku, setSku] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  useEffect(() => {
    if (productToEdit) {
      setTitle(productToEdit.title || "");
      setSlug(productToEdit.slug || "");
      setDescription(productToEdit.description || "");
      setBrand(productToEdit.brand || "");
      setBrandId(productToEdit.brand_id || "");
      setCategoryId(productToEdit.category_id || "");
      setStatus(productToEdit.status || "active");
      setCondition(productToEdit.condition || "new");
      setProductType(productToEdit.product_type || "physical");
      setIsFeatured(Boolean(productToEdit.is_featured));

      const defaultVariant =
        productToEdit.variants?.find((v) => v.is_default) || productToEdit.variants?.[0];
      if (defaultVariant) {
        setPrice(defaultVariant.price ? String(defaultVariant.price) : "0.00");
        setComparePrice(defaultVariant.compare_at_price ? String(defaultVariant.compare_at_price) : "");
        setSku(defaultVariant.sku || "");
      }

      const primaryImg =
        productToEdit.images?.find((img) => img.is_primary) || productToEdit.images?.[0];
      if (primaryImg) {
        setImageUrl(primaryImg.url || "");
      }
      setAutoSlug(false);
    } else {
      // Defaults for create mode
      setTitle("");
      setSlug("");
      setDescription("");
      setBrand("");
      setBrandId("");
      setCategoryId("");
      setStatus("active");
      setCondition("new");
      setProductType("physical");
      setPrice("49.99");
      setComparePrice("");
      setSku(`PRD-${Math.floor(1000 + Math.random() * 9000)}`);
      setImageUrl("");
      setIsFeatured(false);
      setAutoSlug(true);
    }
  }, [productToEdit, isOpen]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (autoSlug && !isEdit) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Validation Error", "Product title is required.");
      return;
    }

    if (!slug.trim()) {
      toast.error("Validation Error", "Product slug is required.");
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error("Validation Error", "Price must be a valid number greater than 0.");
      return;
    }

    setSubmitting(true);

    try {
      if (isEdit && productToEdit) {
        // Update product via PUT /products/{id}
        const updatePayload: Record<string, unknown> = {
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          brand: brand.trim() || null,
          status,
          condition,
          product_type: productType,
          category_id: categoryId || null,
          brand_id: brandId || null,
          is_featured: isFeatured,
        };

        await apiClient.put(`/products/${productToEdit.id}`, updatePayload);

        // If default variant exists, update its price & SKU
        const defaultVar = productToEdit.variants?.find((v) => v.is_default) || productToEdit.variants?.[0];
        if (defaultVar?.id) {
          await apiClient.put(`/products/variants/${defaultVar.id}`, {
            price: numPrice,
            compare_at_price: comparePrice ? parseFloat(comparePrice) : null,
            sku: sku.trim() || defaultVar.sku,
          }).catch(() => {});
        }

        toast.success("Product Updated", `"${title}" has been saved successfully.`);
      } else {
        // Create product via POST /products/
        const createPayload: ProductCreateInput = {
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          brand: brand.trim() || undefined,
          status,
          condition,
          product_type: productType,
          category_id: categoryId || null,
          brand_id: brandId || null,
          is_featured: isFeatured,
          variants: [
            {
              sku: sku.trim() || `SKU-${Date.now().toString().slice(-6)}`,
              price: numPrice,
              compare_at_price: comparePrice ? parseFloat(comparePrice) : undefined,
              currency: "USD",
              is_default: true,
            },
          ],
          images: imageUrl.trim()
            ? [
                {
                  url: imageUrl.trim(),
                  position: 0,
                  is_primary: true,
                  alt_text: title.trim(),
                },
              ]
            : [],
        };

        await apiClient.post("/products/", createPayload);
        toast.success("Product Created", `"${title}" added to your catalog.`);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      let msg = "Failed to save product.";
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        msg = axErr.response?.data?.detail || msg;
      }
      toast.error(isEdit ? "Update Failed" : "Creation Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEdit ? "Edit Product" : "Create New Product"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEdit
                  ? "Update product catalog details, attributes and pricing"
                  : "Add an item with variants, pricing and inventory tracking"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Section: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-500" />
              General Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Product Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wireless Ergonomic Keyboard"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    URL Slug <span className="text-rose-500">*</span>
                  </label>
                  {!isEdit && (
                    <button
                      type="button"
                      onClick={() => setAutoSlug(!autoSlug)}
                      className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      {autoSlug ? "Auto-synced" : "Custom"}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="wireless-ergonomic-keyboard"
                  value={slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    setSlug(e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Brand</label>
                <select
                  value={brandId}
                  onChange={(e) => {
                    setBrandId(e.target.value);
                    const selected = brands.find((b) => b.id === e.target.value);
                    if (selected) setBrand(selected.name);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="">No Brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="active">Active (Published)</option>
                  <option value="draft">Draft (Hidden)</option>
                  <option value="archived">Archived</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
              <textarea
                rows={3}
                placeholder="Detailed description of features, materials, and warranty..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Section: Pricing & SKU */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              Pricing & Default Variant
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Retail Price ($) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Compare-at Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Optional original price"
                  value={comparePrice}
                  onChange={(e) => setComparePrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Master SKU <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PRD-8941"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Section: Image & Features */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
              Media & Attributes
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Primary Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">Direct HTTPS image link for the cover thumbnail</p>
              </div>

              {imageUrl ? (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-xs"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">Thumbnail Preview</p>
                    <p className="text-[11px] text-slate-400">Live preview of provided image</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-slate-400">
                  <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  </div>
                  <div className="text-xs">
                    <p className="font-medium text-slate-500">No Image Specified</p>
                    <p className="text-[11px]">A default placeholder will be displayed</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span className="text-xs font-semibold text-slate-700">Mark as Featured Product</span>
              </label>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>Condition:</span>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="new">Brand New</option>
                  <option value="used">Used</option>
                  <option value="refurbished">Refurbished</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 transition disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
