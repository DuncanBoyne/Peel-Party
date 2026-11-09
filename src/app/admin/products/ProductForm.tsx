"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { Plus, X, Save, Upload, GripVertical } from "lucide-react";
import { Product, SizeVariant, ProductCostConfig, ProductType } from "@/lib/types";
import { StandardSize, StandardColour, StandardPlacement, MaterialType } from "@/lib/server-data";

interface Props {
  product?: Product;
  isNew?: boolean;
  standardSizes?: StandardSize[];
  standardColours?: StandardColour[];
  standardPlacements?: StandardPlacement[];
  sheetWidthCm?: number;
  sheetHeightCm?: number;
  maxOrderQty?: number;
  materials?: MaterialType[];
  defaultProfitPercent?: number;
  seasons?: string[];
}

const emptyProduct: Partial<Product> = {
  name: "", category: "stickers", price: 0, description: "", longDescription: "",
  options: [], supportsTextInput: false, supportsFileUpload: false,
  orderType: "buy-now", badge: "", featured: false, inStock: true,
  reviewCount: 0, rating: 5.0,
};

const inputClass = "w-full h-10 px-3 rounded-xl border-2 border-[#e5e1d8] text-sm focus:outline-none focus:border-[#ef8733] transition-colors bg-white";
const labelClass = "block text-sm font-semibold text-[#111111] mb-1.5";

const CM_PER_INCH = 2.54;

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  sticker: "Individual Stickers",
  "sticker-sheet": "Sticker Sheet (predefined)",
  cup: "Cup / Mug",
  tshirt: "T-Shirt",
  other: "Other (per unit)",
};

function calcPerSheet(w: number, h: number, sw: number, sh: number) {
  if (!w || !h) return 0;
  return Math.max(
    Math.floor(sw / w) * Math.floor(sh / h),
    Math.floor(sw / h) * Math.floor(sh / w),
    0
  );
}

const DEFAULT_COST_CONFIG: ProductCostConfig = {
  productType: "sticker",
  batchSize: 10,
  batchMinutes: 5,
};

const MATERIAL_PRESETS = [
  { label: "Permanent Vinyl", widthIn: 12, heightIn: 48 },
  { label: "Heat Vinyl", widthIn: 12, heightIn: 60 },
  { label: "Heat Transfers", widthIn: 8, heightIn: 12 },
] as const;

export default function ProductForm({
  product,
  isNew,
  standardSizes = [],
  standardColours = [],
  standardPlacements = [],
  sheetWidthCm = 17.32,
  sheetHeightCm = 23.67,
  maxOrderQty = 1000,
  materials = [],
  defaultProfitPercent = 40,
  seasons = [],
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<Product>>(product ?? emptyProduct);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newOptName, setNewOptName] = useState("");
  const [optionRaws, setOptionRaws] = useState<string[]>(
    (product?.options ?? []).map((o) => o.values.join(", "))
  );
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Dimension string state for cost setup (always declared, conditionally shown)
  const initCfg = product?.costConfig ?? DEFAULT_COST_CONFIG;
  const [heightCmStr, setHeightCmStr] = useState(initCfg.heightCm ? initCfg.heightCm.toFixed(2) : "");
  const [heightInStr, setHeightInStr] = useState(initCfg.heightCm ? (initCfg.heightCm / CM_PER_INCH).toFixed(3) : "");
  const [widthCmStr, setWidthCmStr] = useState(initCfg.widthCm ? initCfg.widthCm.toFixed(2) : "");
  const [widthInStr, setWidthInStr] = useState(initCfg.widthCm ? (initCfg.widthCm / CM_PER_INCH).toFixed(3) : "");

  const costCfg: ProductCostConfig = form.costConfig ?? DEFAULT_COST_CONFIG;
  const isSticker = costCfg.productType === "sticker";
  const isStickerSheet = costCfg.productType === "sticker-sheet";
  const perSheet = isSticker ? calcPerSheet(costCfg.widthCm ?? 0, costCfg.heightCm ?? 0, sheetWidthCm, sheetHeightCm) : 0;

  const SHEET_CATEGORIES = ["stickers", "vinyl", "coasters", "magnets", "bookmarks"];
  const CLOTHING_CATEGORIES = ["tshirts", "hoodies", "polos", "hats"];
  const isSheetCategory = SHEET_CATEGORIES.includes(form.category ?? "");
  const isNamedCategory = ["mugs", "tshirts", "hoodies", "polos", "hats", "keyrings"].includes(form.category ?? "");
  const isClothingCategory = CLOTHING_CATEGORIES.includes(form.category ?? "");
  const isColourCategory = isClothingCategory || ["vinyl", "personalised-glasses", "bows"].includes(form.category ?? "");
  const categorySizes = standardSizes.filter((s) => s.category === form.category);

  function updateCostConfig(field: keyof ProductCostConfig, value: ProductCostConfig[keyof ProductCostConfig] | undefined) {
    update("costConfig", { ...costCfg, [field]: value });
  }

  function handleHeightCmChange(raw: string) {
    setHeightCmStr(raw);
    const n = parseFloat(raw);
    if (!isNaN(n) && n > 0) {
      setHeightInStr((n / CM_PER_INCH).toFixed(3));
      updateCostConfig("heightCm", n);
    } else if (raw === "" || raw === "0") {
      setHeightInStr("");
      updateCostConfig("heightCm", undefined);
    }
  }
  function handleHeightInChange(raw: string) {
    setHeightInStr(raw);
    const n = parseFloat(raw);
    if (!isNaN(n) && n > 0) {
      const cm = n * CM_PER_INCH;
      setHeightCmStr(cm.toFixed(2));
      updateCostConfig("heightCm", cm);
    } else if (raw === "" || raw === "0") {
      setHeightCmStr("");
      updateCostConfig("heightCm", undefined);
    }
  }
  function handleWidthCmChange(raw: string) {
    setWidthCmStr(raw);
    const n = parseFloat(raw);
    if (!isNaN(n) && n > 0) {
      setWidthInStr((n / CM_PER_INCH).toFixed(3));
      updateCostConfig("widthCm", n);
    } else if (raw === "" || raw === "0") {
      setWidthInStr("");
      updateCostConfig("widthCm", undefined);
    }
  }
  function handleWidthInChange(raw: string) {
    setWidthInStr(raw);
    const n = parseFloat(raw);
    if (!isNaN(n) && n > 0) {
      const cm = n * CM_PER_INCH;
      setWidthCmStr(cm.toFixed(2));
      updateCostConfig("widthCm", cm);
    } else if (raw === "" || raw === "0") {
      setWidthCmStr("");
      updateCostConfig("widthCm", undefined);
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploadingImages(true);
    setUploadError("");
    const urls: string[] = [];
    for (const file of acceptedFiles) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.src) {
          urls.push(data.src);
        } else {
          setUploadError(data.error ?? "Upload failed");
        }
      } catch {
        setUploadError("Upload failed — check your connection");
      }
    }
    if (urls.length > 0) {
      setForm((prev) => ({ ...prev, images: [...(prev.images ?? []), ...urls] }));
    }
    setUploadingImages(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"] },
    multiple: true,
  });

  function removeImage(url: string) {
    update("images", (form.images ?? []).filter((u) => u !== url));
  }

  // Blank = back to the calculated count
  function setPerSheetOverride(name: string, raw: string) {
    const n = parseInt(raw, 10);
    update("sizeVariants", (form.sizeVariants ?? []).map((v) => {
      if (v.name !== name) return v;
      return n > 0
        ? { ...v, perSheetOverride: n, stickersPerSheet: n }
        : { ...v, perSheetOverride: undefined, stickersPerSheet: calcPerSheet(v.widthCm, v.heightCm, sheetWidthCm, sheetHeightCm) };
    }));
  }

  function syncSizes() {
    const validSizes: SizeVariant[] = categorySizes
      .map((s) => {
        // Manual per-sheet counts survive a re-sync; everything else is recalculated
        const override = (form.sizeVariants ?? []).find((v) => v.name === s.name)?.perSheetOverride;
        return {
          name: s.name,
          widthCm: s.widthCm ?? 0,
          heightCm: s.heightCm ?? 0,
          stickersPerSheet: override ?? calcPerSheet(s.widthCm ?? 0, s.heightCm ?? 0, sheetWidthCm, sheetHeightCm),
          ...(override ? { perSheetOverride: override } : {}),
        };
      })
      .filter((s) => s.stickersPerSheet > 0 && s.name);

    const existingOptions = (form.options ?? []).filter((o) => o.name !== "Size");
    const existingRaws = optionRaws.filter((_, i) => (form.options ?? [])[i]?.name !== "Size");
    const existingSizeOption = (form.options ?? []).find((o) => o.name === "Size");
    const sizeValues = validSizes.map((s) => s.name).join(", ");

    update("sizeVariants", validSizes);
    if (validSizes.length > 0) {
      update("options", [{ name: "Size", values: validSizes.map((s) => s.name), priceMap: existingSizeOption?.priceMap }, ...existingOptions]);
      setOptionRaws([sizeValues, ...existingRaws]);
    } else {
      update("options", existingOptions);
      setOptionRaws(existingRaws);
    }
  }

  function syncColours() {
    const names = standardColours.filter((c) => c.category === form.category).map((c) => c.name).filter(Boolean);
    const existingOptions = (form.options ?? []).filter((o) => o.name !== "Colour");
    const existingRaws = optionRaws.filter((_, i) => (form.options ?? [])[i]?.name !== "Colour");
    const existingColourOption = (form.options ?? []).find((o) => o.name === "Colour");

    if (names.length > 0) {
      update("options", [...existingOptions, { name: "Colour", values: names, priceMap: existingColourOption?.priceMap }]);
      setOptionRaws([...existingRaws, names.join(", ")]);
    } else {
      update("options", existingOptions);
      setOptionRaws(existingRaws);
    }
  }

  function syncPlacement() {
    const placements = standardPlacements.filter((p) => p.category === form.category);
    const existingOptions = (form.options ?? []).filter((o) => o.name !== "Placement");
    const existingRaws = optionRaws.filter((_, i) => (form.options ?? [])[i]?.name !== "Placement");
    const existingPlacementOption = (form.options ?? []).find((o) => o.name === "Placement");

    if (placements.length > 0) {
      const priceMap: Record<string, number> = {};
      placements.forEach((p) => { if (p.price > 0) priceMap[p.name] = p.price; });
      const newOpt = {
        name: "Placement",
        values: placements.map((p) => p.name),
        priceMap: Object.keys(priceMap).length > 0 ? priceMap : existingPlacementOption?.priceMap,
      };
      update("options", [newOpt, ...existingOptions]);
      setOptionRaws([placements.map((p) => p.name).join(", "), ...existingRaws]);
    } else {
      update("options", existingOptions);
      setOptionRaws(existingRaws);
    }
  }

  function syncOptions() {
    const names = categorySizes.map((s) => s.name).filter(Boolean);
    const existingOptions = (form.options ?? []).filter((o) => o.name !== "Size");
    const existingRaws = optionRaws.filter((_, i) => (form.options ?? [])[i]?.name !== "Size");
    const existingSizeOption = (form.options ?? []).find((o) => o.name === "Size");

    if (names.length > 0) {
      update("options", [{ name: "Size", values: names, priceMap: existingSizeOption?.priceMap }, ...existingOptions]);
      setOptionRaws([names.join(", "), ...existingRaws]);
    } else {
      update("options", existingOptions);
      setOptionRaws(existingRaws);
    }
  }

  function moveImage(from: number, to: number) {
    const imgs = [...(form.images ?? [])];
    const [moved] = imgs.splice(from, 1);
    imgs.splice(to, 0, moved);
    update("images", imgs);
  }

  function update(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addOption() {
    if (!newOptName.trim()) return;
    update("options", [...(form.options ?? []), { name: newOptName.trim(), values: [] }]);
    setOptionRaws((prev) => [...prev, ""]);
    setNewOptName("");
  }

  function updateOptionRaw(idx: number, raw: string) {
    setOptionRaws((prev) => prev.map((v, i) => (i === idx ? raw : v)));
  }

  function commitOptionValues(idx: number, raw: string) {
    const opts = [...(form.options ?? [])];
    const newValues = raw.split(",").map((v) => v.trim()).filter(Boolean);
    const oldPriceMap = opts[idx].priceMap;
    const newPriceMap = oldPriceMap
      ? Object.fromEntries(Object.entries(oldPriceMap).filter(([k, v]) => newValues.includes(k) && v > 0))
      : undefined;
    opts[idx] = {
      ...opts[idx],
      values: newValues,
      priceMap: newPriceMap && Object.keys(newPriceMap).length > 0 ? newPriceMap : undefined,
    };
    update("options", opts);
  }

  function updateOptionPrice(idx: number, value: string, raw: string) {
    const opts = [...(form.options ?? [])];
    const pounds = parseFloat(raw);
    const current = opts[idx].priceMap ?? {};
    if (!isNaN(pounds) && raw !== "" && pounds > 0) {
      opts[idx] = { ...opts[idx], priceMap: { ...current, [value]: pounds } };
    } else {
      const rest = { ...current };
      delete rest[value];
      opts[idx] = { ...opts[idx], priceMap: Object.keys(rest).length > 0 ? rest : undefined };
    }
    update("options", opts);
  }

  function removeOption(idx: number) {
    const opts = [...(form.options ?? [])];
    opts.splice(idx, 1);
    update("options", opts);
    setOptionRaws((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url = isNew ? "/api/admin/products" : `/api/admin/products/${product!.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: Number(form.price) }),
      });
      if (!res.ok) throw new Error("Save failed");
      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-3xl">
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

      {/* Basic info */}
      <div className="bg-white rounded-2xl border border-[#e5e1d8] p-6">
        <h2 className="font-display font-700 text-lg text-[#111111] mb-5">Basic Info</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Product Name *</label>
            <input required className={inputClass} value={form.name ?? ""} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Custom Die-Cut Stickers" />
          </div>
          <div>
            <label className={labelClass}>Category *</label>
            <select required className={inputClass} value={form.category} onChange={(e) => update("category", e.target.value)}>
              <option value="stickers">Stickers</option>
              <option value="vinyl">Vinyl</option>
              <optgroup label="Clothing">
                <option value="tshirts">T-Shirts</option>
                <option value="hoodies">Hoodies</option>
                <option value="polos">Polo Shirts</option>
                <option value="hats">Hats</option>
              </optgroup>
              <optgroup label="Gifts &amp; Decor">
                <option value="mugs">Mugs</option>
                <option value="keyrings">Keyrings</option>
                <option value="coasters">Coasters</option>
                <option value="magnets">Magnets</option>
                <option value="bookmarks">Bookmarks</option>
                <option value="personalised-glasses">Personalised Glasses</option>
                <option value="bows">Bows</option>
                <option value="cake-toppers">Cake Toppers</option>
                <option value="party-favours">Party Favours</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Price (£){" "}
              <span className="text-[#6b7280] font-normal">
                {form.costConfig ? "— auto-calculated from Cost Setup on save" : '— use 0 for "on request"'}
              </span>
            </label>
            <input type="number" min={0} step="0.01" className={inputClass} value={form.price ?? 0} onChange={(e) => update("price", e.target.value)} placeholder="14.99" />
          </div>
          <div>
            <label className={labelClass}>Order Type *</label>
            <select className={inputClass} value={form.orderType} onChange={(e) => update("orderType", e.target.value)}>
              <option value="buy-now">Buy Now</option>
              <option value="request-quote">Request a Quote</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Badge <span className="text-[#6b7280] font-normal">(optional)</span></label>
            <input className={inputClass} value={form.badge ?? ""} onChange={(e) => update("badge", e.target.value)} placeholder="e.g. Best Seller, Sale, New" />
          </div>
          <div>
            <label className={labelClass}>Season <span className="text-[#6b7280] font-normal">(optional — add seasons in Settings)</span></label>
            {/* "" not undefined: the PUT merges, so a dropped key would leave the old season in place */}
            <select className={inputClass} value={form.season ?? ""} onChange={(e) => update("season", e.target.value)}>
              <option value="">Not seasonal</option>
              {[...new Set([...seasons, form.season ?? ""])].filter(Boolean).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Short Description *</label>
            <input required className={inputClass} value={form.description ?? ""} onChange={(e) => update("description", e.target.value)} placeholder="One-line product summary" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Full Description</label>
            <textarea rows={4} className="w-full px-3 py-2.5 rounded-xl border-2 border-[#e5e1d8] text-sm focus:outline-none focus:border-[#ef8733] transition-colors resize-none bg-white" value={form.longDescription ?? ""} onChange={(e) => update("longDescription", e.target.value)} placeholder="Detailed description shown on the product page" />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-[#f0ede8]">
          {[
            { key: "featured", label: "Featured on homepage" },
            { key: "inStock", label: "In stock" },
            { key: "supportsTextInput", label: "Allow custom text" },
            { key: "supportsFileUpload", label: "Allow file upload" },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form[key as keyof Product]}
                onChange={(e) => update(key, e.target.checked)}
                className="w-4 h-4 accent-[#ef8733]"
              />
              <span className="text-sm text-[#111111]">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Images */}
      <div className="bg-white rounded-2xl border border-[#e5e1d8] p-6">
        <h2 className="font-display font-700 text-lg text-[#111111] mb-1">Product Images</h2>
        <p className="text-sm text-[#6b7280] mb-5">
          First image is the main product photo. Drag to reorder.
        </p>

        {uploadError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {uploadError}
          </div>
        )}

        {/* Existing images */}
        {(form.images ?? []).length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
            {(form.images ?? []).map((url, i) => (
              <div key={url} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-[#e5e1d8]">
                <Image src={url} alt={`Product image ${i + 1}`} fill className="object-cover" sizes="160px" />
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 text-[10px] font-semibold bg-[#ef8733] text-white px-1.5 py-0.5 rounded-md">
                    Main
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => moveImage(i, i - 1)}
                      title="Move left"
                      className="h-7 w-7 bg-white rounded-lg flex items-center justify-center text-[#111111] hover:bg-[#ef8733] hover:text-white transition-colors cursor-pointer"
                    >
                      <GripVertical size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    title="Remove"
                    className="h-7 w-7 bg-white rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-[#ef8733] bg-orange-50"
              : "border-[#e5e1d8] hover:border-[#ef8733] hover:bg-[#fdf9f5]"
          }`}
        >
          <input {...getInputProps()} />
          <Upload size={24} className={`mx-auto mb-2 ${isDragActive ? "text-[#ef8733]" : "text-[#9ca3af]"}`} />
          {uploadingImages ? (
            <p className="text-sm font-medium text-[#ef8733]">Uploading…</p>
          ) : isDragActive ? (
            <p className="text-sm font-medium text-[#ef8733]">Drop images here</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-[#111111]">Drop images here or click to browse</p>
              <p className="text-xs text-[#6b7280] mt-1">JPG, PNG, WebP, GIF — multiple files supported</p>
            </>
          )}
        </div>
      </div>

      {/* Sizes — sheet-based products */}
      {isSheetCategory && (
        <div className="bg-white rounded-2xl border border-[#e5e1d8] p-6">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div>
              <h2 className="font-display font-700 text-lg text-[#111111]">Sizes</h2>
              <p className="text-sm text-[#6b7280] mt-0.5">
                Synced from Standard Sizes in Cost Settings. Max order qty: <strong>{maxOrderQty}</strong> — above this, customers are sent to a quote.
              </p>
            </div>
            <button
              type="button"
              onClick={syncSizes}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#ef8733] text-white rounded-xl text-sm font-semibold hover:bg-[#ea7316] transition-colors cursor-pointer shrink-0"
            >
              Sync Sizes
            </button>
          </div>

          {categorySizes.length === 0 ? (
            <p className="text-sm text-[#6b7280] mt-4 p-4 bg-[#f9f7f4] rounded-xl">
              No standard sizes defined for this category yet. Go to <strong>Admin → Costs &amp; Profit → Standard Sizes</strong> to add them first.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {categorySizes.map((s) => {
                const variant = (form.sizeVariants ?? []).find((v) => v.name === s.name);
                const synced = !!variant;
                const perSh = calcPerSheet(s.widthCm ?? 0, s.heightCm ?? 0, sheetWidthCm, sheetHeightCm);
                return (
                  <div key={s.id} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border-2 ${synced ? "border-[#ef8733] bg-[#fff7ed]" : "border-[#e5e1d8]"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${synced ? "text-[#ef8733]" : "text-[#111111]"}`}>{s.name || "Unnamed"}</span>
                      <span className="text-xs text-[#6b7280]">{s.widthCm}×{s.heightCm} cm · {((s.widthCm ?? 0) / CM_PER_INCH).toFixed(2)}″×{((s.heightCm ?? 0) / CM_PER_INCH).toFixed(2)}″</span>
                    </div>
                    {variant ? (
                      <label className="flex items-center gap-2 text-xs text-[#6b7280]">
                        {variant.perSheetOverride && <span>auto {perSh} ·</span>}
                        <input
                          type="number"
                          min={1}
                          value={variant.perSheetOverride ?? ""}
                          placeholder={String(variant.stickersPerSheet)}
                          onChange={(e) => setPerSheetOverride(variant.name, e.target.value)}
                          className="w-16 h-8 px-2 rounded-lg border-2 border-[#e5e1d8] bg-white text-sm text-[#111111] focus:outline-none focus:border-[#ef8733]"
                          aria-label={`${variant.name} stickers per sheet`}
                        />
                        /sheet
                      </label>
                    ) : (
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${perSh > 0 ? "bg-[#f0fdf4] text-emerald-700" : "bg-red-50 text-red-500"}`}>
                        {perSh > 0 ? `${perSh}/sheet` : "too large"}
                      </span>
                    )}
                  </div>
                );
              })}
              {(form.sizeVariants ?? []).length > 0 && (
                <p className="text-xs text-[#6b7280] mt-1">
                  ✓ {form.sizeVariants!.length} size{form.sizeVariants!.length !== 1 ? "s" : ""} synced to this product. Quantities will step in multiples of each size&apos;s stickers/sheet. If Cricut fits a different number, type it in the box. Sync Sizes keeps typed numbers; clear the box to go back to the calculated one.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sizes — named option categories (mugs, tshirts, keyrings) */}
      {isNamedCategory && (
        <div className="bg-white rounded-2xl border border-[#e5e1d8] p-6">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div>
              <h2 className="font-display font-700 text-lg text-[#111111]">Standard Options</h2>
              <p className="text-sm text-[#6b7280] mt-0.5">
                Sync standard size/style names from Cost Settings as a &quot;Size&quot; product option.
              </p>
            </div>
            <button
              type="button"
              onClick={syncOptions}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#ef8733] text-white rounded-xl text-sm font-semibold hover:bg-[#ea7316] transition-colors cursor-pointer shrink-0"
            >
              Sync Options
            </button>
          </div>

          {categorySizes.length === 0 ? (
            <p className="text-sm text-[#6b7280] mt-4 p-4 bg-[#f9f7f4] rounded-xl">
              No standard sizes defined for this category yet. Go to <strong>Admin → Costs &amp; Profit → Standard Sizes</strong> to add them first.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {categorySizes.map((s) => {
                const syncedValues = (form.options ?? []).find((o) => o.name === "Size")?.values ?? [];
                const synced = syncedValues.includes(s.name);
                return (
                  <div key={s.id} className={`flex items-center px-4 py-2.5 rounded-xl border-2 ${synced ? "border-[#ef8733] bg-[#fff7ed]" : "border-[#e5e1d8]"}`}>
                    <span className={`text-sm font-semibold ${synced ? "text-[#ef8733]" : "text-[#111111]"}`}>{s.name || "Unnamed"}</span>
                  </div>
                );
              })}
              {((form.options ?? []).find((o) => o.name === "Size")?.values ?? []).length > 0 && (
                <p className="text-xs text-[#6b7280] mt-1">
                  ✓ Size option synced with {(form.options ?? []).find((o) => o.name === "Size")!.values.length} value{(form.options ?? []).find((o) => o.name === "Size")!.values.length !== 1 ? "s" : ""}.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Colours — clothing and vinyl */}
      {isColourCategory && (
        <div className="bg-white rounded-2xl border border-[#e5e1d8] p-6">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div>
              <h2 className="font-display font-700 text-lg text-[#111111]">Available Colours</h2>
              <p className="text-sm text-[#6b7280] mt-0.5">
                Sync your standard colour palette from Cost Settings as a &quot;Colour&quot; product option.
              </p>
            </div>
            <button
              type="button"
              onClick={syncColours}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#ef8733] text-white rounded-xl text-sm font-semibold hover:bg-[#ea7316] transition-colors cursor-pointer shrink-0"
            >
              Sync Colours
            </button>
          </div>

          {standardColours.length === 0 ? (
            <p className="text-sm text-[#6b7280] mt-4 p-4 bg-[#f9f7f4] rounded-xl">
              No standard colours defined yet. Go to <strong>Admin → Costs &amp; Profit → Standard Colours</strong> to add them first.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {standardColours.map((c) => {
                const synced = ((form.options ?? []).find((o) => o.name === "Colour")?.values ?? []).includes(c.name);
                return (
                  <span key={c.id} className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 ${synced ? "border-[#ef8733] bg-[#fff7ed] text-[#ef8733]" : "border-[#e5e1d8] text-[#111111]"}`}>
                    {c.name || "Unnamed"}
                  </span>
                );
              })}
              {((form.options ?? []).find((o) => o.name === "Colour")?.values ?? []).length > 0 && (
                <p className="w-full text-xs text-[#6b7280] mt-1">
                  ✓ Colour option synced with {(form.options ?? []).find((o) => o.name === "Colour")!.values.length} colour{(form.options ?? []).find((o) => o.name === "Colour")!.values.length !== 1 ? "s" : ""}.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Print Placement — clothing categories */}
      {isClothingCategory && (
        <div className="bg-white rounded-2xl border border-[#e5e1d8] p-6">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div>
              <h2 className="font-display font-700 text-lg text-[#111111]">Print Placement &amp; Pricing</h2>
              <p className="text-sm text-[#6b7280] mt-0.5">
                Sync placement options from Cost Settings, then set the <strong>total price per unit</strong> for each placement below (in the Product Options section). The customer&apos;s price updates instantly when they choose Chest, Back, or Both.
              </p>
            </div>
            <button
              type="button"
              onClick={syncPlacement}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#ef8733] text-white rounded-xl text-sm font-semibold hover:bg-[#ea7316] transition-colors cursor-pointer shrink-0"
            >
              Sync Placement
            </button>
          </div>

          <div className="mt-3 p-3 bg-[#fff7ed] border border-[#ef8733]/30 rounded-xl text-sm text-[#6b7280]">
            <strong className="text-[#111111]">How placement pricing works:</strong> Each placement option (e.g. &ldquo;Front Only&rdquo;, &ldquo;Front &amp; Back&rdquo;) needs its own price set in <strong>Product Options → Placement → Per-value prices</strong> below. Set the <em>complete</em> price per shirt for that placement — the customer pays that × their quantity. A simple quantity stepper is shown (not bulk tiers).
          </div>

          {standardPlacements.filter((p) => p.category === form.category).length === 0 ? (
            <p className="text-sm text-[#6b7280] mt-4 p-4 bg-[#f9f7f4] rounded-xl">
              No placements defined for this category yet. Go to <strong>Admin → Costs &amp; Profit → Standard Placements</strong> to add them first (e.g. &ldquo;Front Only&rdquo;, &ldquo;Back Only&rdquo;, &ldquo;Front &amp; Back&rdquo;).
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {standardPlacements.filter((p) => p.category === form.category).map((p) => {
                const syncedValues = (form.options ?? []).find((o) => o.name === "Placement")?.values ?? [];
                const synced = syncedValues.includes(p.name);
                const livePrice = (form.options ?? []).find((o) => o.name === "Placement")?.priceMap?.[p.name];
                return (
                  <div key={p.id} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border-2 ${synced ? "border-[#ef8733] bg-[#fff7ed]" : "border-[#e5e1d8]"}`}>
                    <span className={`text-sm font-semibold ${synced ? "text-[#ef8733]" : "text-[#111111]"}`}>{p.name || "Unnamed"}</span>
                    {livePrice !== undefined && livePrice > 0
                      ? <span className="text-xs font-semibold text-emerald-700">£{livePrice.toFixed(2)} / unit ✓</span>
                      : synced
                        ? <span className="text-xs text-amber-600">No price set — add in Product Options below</span>
                        : null
                    }
                  </div>
                );
              })}
              {((form.options ?? []).find((o) => o.name === "Placement")?.values ?? []).length > 0 && (
                <p className="text-xs text-[#6b7280] mt-1">
                  ✓ Placement synced. Set per-unit prices in <strong>Product Options → Placement</strong> below — leave any placement at £0 to hide it from pricing.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cost Setup */}
      <div className="bg-white rounded-2xl border border-[#e5e1d8] p-6">
        <h2 className="font-display font-700 text-lg text-[#111111] mb-1">Cost Setup</h2>
        <p className="text-sm text-[#6b7280] mb-5">
          Internal only — used in Costs &amp; Profit to calculate suggested pricing.{" "}
          <span className="font-medium text-[#111111]">Batch size</span> = units per run.{" "}
          <span className="font-medium text-[#111111]">Batch time</span> = minutes per run.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Product Type</label>
            <select
              className={inputClass}
              value={costCfg.productType}
              onChange={(e) => updateCostConfig("productType", e.target.value as ProductType)}
            >
              {(Object.entries(PRODUCT_TYPE_LABELS) as [ProductType, string][]).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Materials <span className="text-[#6b7280] font-normal">(select all that apply)</span></label>
            {materials.length === 0 ? (
              <p className="text-xs text-[#9ca3af] mt-1">Add materials in Costs &amp; Profit → Materials first.</p>
            ) : (
              <div className="flex flex-col gap-2 p-3 rounded-xl border-2 border-[#e5e1d8] bg-[#fafaf9]">
                {materials.map((m) => {
                  const checked = (costCfg.materialIds ?? []).includes(m.id);
                  return (
                    <label key={m.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const current = costCfg.materialIds ?? [];
                          const next = e.target.checked
                            ? [...current, m.id]
                            : current.filter((id) => id !== m.id);
                          updateCostConfig("materialIds", next.length > 0 ? next : undefined);
                        }}
                        className="w-4 h-4 accent-[#ef8733]"
                      />
                      <span className="text-sm text-[#111111]">{m.name || "Unnamed"}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {(costCfg.materialIds ?? []).length > 0 && (
              <p className="text-xs text-[#6b7280] mt-1.5">
                {(costCfg.materialIds ?? []).length} material{(costCfg.materialIds ?? []).length !== 1 ? "s" : ""} selected — costs will be summed.
              </p>
            )}
          </div>

          {isStickerSheet && (
            <div className="flex items-start gap-3 px-4 py-3 bg-[#f0fdf4] rounded-xl border border-emerald-100 sm:col-span-2">
              <span className="text-sm text-[#6b7280]">
                Quantity tiers step in multiples of <span className="font-semibold text-emerald-700">{costCfg.batchSize}</span> (sheets per page).
                Set <strong>Sheets per page</strong> below to control the step size.
              </span>
            </div>
          )}

          {!isSticker && !isStickerSheet && (
            <div>
              <label className={labelClass}>Items per sheet <span className="text-[#6b7280] font-normal">(how many fit on one sheet of material)</span></label>
              <input
                type="number" step="1" min="1" placeholder="e.g. 5"
                className={inputClass}
                value={costCfg.itemsPerSheet ?? ""}
                onChange={(e) =>
                  updateCostConfig("itemsPerSheet", e.target.value !== "" ? parseInt(e.target.value) : undefined)
                }
              />
              {costCfg.itemsPerSheet && costCfg.itemsPerSheet > 0 && (
                <p className="text-xs text-[#6b7280] mt-1">
                  Quantity tiers will step in multiples of {costCfg.itemsPerSheet}. Sheet-based materials (e.g. sublimation paper) will be costed per sheet.
                </p>
              )}
            </div>
          )}

          {isSticker && (
            <>
              <div className="sm:col-span-2">
                <label className={labelClass}>Material Presets</label>
                <div className="flex flex-wrap gap-2">
                  {MATERIAL_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        handleWidthInChange(String(preset.widthIn));
                        handleHeightInChange(String(preset.heightIn));
                      }}
                      className="inline-flex items-center h-9 px-3 rounded-xl border-2 border-[#e5e1d8] text-sm text-[#111111] hover:border-[#ef8733] hover:bg-[#fff7ed] transition-colors cursor-pointer"
                    >
                      {preset.label} — {preset.widthIn}″×{preset.heightIn}″
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Height</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      className={inputClass}
                      value={heightCmStr}
                      onChange={(e) => handleHeightCmChange(e.target.value)}
                    />
                    <p className="text-xs text-[#9ca3af] mt-0.5 px-1">cm</p>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number" step="0.001" min="0" placeholder="0.000"
                      className={inputClass}
                      value={heightInStr}
                      onChange={(e) => handleHeightInChange(e.target.value)}
                    />
                    <p className="text-xs text-[#9ca3af] mt-0.5 px-1">inches</p>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Width</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      className={inputClass}
                      value={widthCmStr}
                      onChange={(e) => handleWidthCmChange(e.target.value)}
                    />
                    <p className="text-xs text-[#9ca3af] mt-0.5 px-1">cm</p>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number" step="0.001" min="0" placeholder="0.000"
                      className={inputClass}
                      value={widthInStr}
                      onChange={(e) => handleWidthInChange(e.target.value)}
                    />
                    <p className="text-xs text-[#9ca3af] mt-0.5 px-1">inches</p>
                  </div>
                </div>
              </div>

              {perSheet > 0 && (
                <div className="sm:col-span-2 flex items-center gap-3 px-4 py-3 bg-[#f0fdf4] rounded-xl border border-emerald-100">
                  <span className="text-sm text-[#6b7280]">Stickers per sheet:</span>
                  <span className="text-sm font-bold text-emerald-700">{perSheet}</span>
                </div>
              )}
            </>
          )}

          <div>
            <label className={labelClass}>{isStickerSheet ? "Sheets per page" : "Batch Size"} <span className="text-[#6b7280] font-normal">({isStickerSheet ? "copies per printable page" : isSticker || costCfg.itemsPerSheet ? "sheets per run" : "units per run"})</span></label>
            <input
              type="number" step="1" min="1"
              className={inputClass}
              value={costCfg.batchSize}
              onChange={(e) => updateCostConfig("batchSize", parseInt(e.target.value || "1"))}
            />
          </div>

          <div>
            <label className={labelClass}>Batch Time <span className="text-[#6b7280] font-normal">(minutes per run)</span></label>
            <input
              type="number" step="1" min="1"
              className={inputClass}
              value={costCfg.batchMinutes}
              onChange={(e) => updateCostConfig("batchMinutes", parseInt(e.target.value || "1"))}
            />
          </div>

          <div>
            <label className={labelClass}>
              Ink Cost{" "}
              <span className="text-[#6b7280] font-normal">
                ({isSticker || isStickerSheet ? "£ per sheet" : "£ per unit"}, blank = global default)
              </span>
            </label>
            <input
              type="number" step="0.01" min="0" placeholder="default"
              className={inputClass}
              value={costCfg.inkCostPence !== undefined ? (costCfg.inkCostPence / 100).toFixed(2) : ""}
              onChange={(e) =>
                updateCostConfig("inkCostPence", e.target.value !== "" ? Math.round(parseFloat(e.target.value) * 100) : undefined)
              }
            />
          </div>

          <div>
            <label className={labelClass}>
              Postage / order{" "}
              <span className="text-[#6b7280] font-normal">(£, blank = global default)</span>
            </label>
            <input
              type="number" step="0.01" min="0" placeholder="default"
              className={inputClass}
              value={costCfg.postagePence !== undefined ? (costCfg.postagePence / 100).toFixed(2) : ""}
              onChange={(e) =>
                updateCostConfig("postagePence", e.target.value !== "" ? Math.round(parseFloat(e.target.value) * 100) : undefined)
              }
            />
          </div>


          <div>
            <label className={labelClass}>Profit % <span className="text-[#6b7280] font-normal">(blank = global default: {defaultProfitPercent}%)</span></label>
            <input
              type="number" step="1" min="0" max="999" placeholder={`${defaultProfitPercent}`}
              className={inputClass}
              value={costCfg.profitPercent !== undefined ? costCfg.profitPercent : ""}
              onChange={(e) =>
                updateCostConfig("profitPercent", e.target.value !== "" ? parseFloat(e.target.value) : undefined)
              }
            />
          </div>

          <div>
            <label className={labelClass}>Max Order Qty <span className="text-[#6b7280] font-normal">(blank = global default: {maxOrderQty})</span></label>
            <input
              type="number" step="1" min="1" placeholder={`${maxOrderQty}`}
              className={inputClass}
              value={costCfg.maxOrderQty !== undefined ? costCfg.maxOrderQty : ""}
              onChange={(e) =>
                updateCostConfig("maxOrderQty", e.target.value !== "" ? parseInt(e.target.value) : undefined)
              }
            />
            <p className="text-xs text-[#6b7280] mt-1">Orders above this quantity are sent to a quote. Price tiers are built up to this limit.</p>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="bg-white rounded-2xl border border-[#e5e1d8] p-6">
        <h2 className="font-display font-700 text-lg text-[#111111] mb-1">Product Options</h2>
        <p className="text-sm text-[#6b7280] mb-5">e.g. Size, Finish, Quantity. Values are comma-separated.</p>

        <div className="flex flex-col gap-3 mb-4">
          {(form.options ?? []).map((opt, i) => (
            <div key={i} className="flex gap-3 items-start p-4 bg-[#f9f7f4] rounded-xl border border-[#e5e1d8]">
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#111111] mb-1.5">{opt.name}</p>
                <input
                  className={inputClass}
                  value={optionRaws[i] ?? opt.values.join(", ")}
                  onChange={(e) => updateOptionRaw(i, e.target.value)}
                  onBlur={(e) => commitOptionValues(i, e.target.value)}
                  placeholder="Value 1, Value 2, Value 3"
                />
                {opt.values.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-[#6b7280] mb-2 uppercase tracking-wide">Per-value prices (£) — optional</p>
                    <div className="grid grid-cols-2 gap-2">
                      {opt.values.map((val) => (
                        <label key={val} className="flex items-center gap-2">
                          <span className="text-xs text-[#111111] truncate flex-1">{val}</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="—"
                            className="w-24 h-8 px-2 rounded-lg border-2 border-[#e5e1d8] text-xs focus:outline-none focus:border-[#ef8733] transition-colors bg-white"
                            value={opt.priceMap?.[val] !== undefined && opt.priceMap![val] > 0 ? opt.priceMap![val].toFixed(2) : ""}
                            onChange={(e) => updateOptionPrice(i, val, e.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                    {opt.priceMap && Object.values(opt.priceMap).some((price) => price > 0) && (
                      <p className="text-xs text-[#6b7280] mt-1.5">Customers will see the price next to each option and the total will update when they select.</p>
                    )}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => removeOption(i)} className="mt-7 text-[#d1c8bc] hover:text-red-500 transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={newOptName}
            onChange={(e) => setNewOptName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
            placeholder="New option name (e.g. Size)"
            className="flex-1 h-10 px-3 rounded-xl border-2 border-dashed border-[#e5e1d8] text-sm focus:outline-none focus:border-[#ef8733] transition-colors bg-white"
          />
          <button
            type="button"
            onClick={addOption}
            className="h-10 px-4 bg-[#f0ede8] text-[#111111] rounded-xl text-sm font-semibold hover:bg-[#e5e1d8] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 h-11 px-6 bg-[#ef8733] text-white rounded-xl font-semibold text-sm hover:bg-[#ea7316] transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Save size={16} /> {loading ? "Saving…" : isNew ? "Create Product" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="h-11 px-6 bg-[#f0ede8] text-[#111111] rounded-xl font-semibold text-sm hover:bg-[#e5e1d8] transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
