"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ShoppingCart, FileText, Plus, Minus } from "lucide-react";
import { Product, ArtworkFile } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { getProductMatrixTiers, resolveProductMatrixPrice, resolveProductOptionUnitPrice } from "@/lib/pricing";
import { useCart } from "@/context/CartContext";
import Button from "@/components/ui/Button";
import FileUpload from "@/components/ui/FileUpload";

interface ProductActionsProps {
  product: Product;
  maxOrderQty?: number;
}

export default function ProductActions({ product, maxOrderQty = 1000 }: ProductActionsProps) {
  const { addItem, volumeDiscounts } = useCart();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    Object.fromEntries(product.options.map((o) => [o.name, o.values[0]]))
  );
  const [customText, setCustomText] = useState("");
  const [slotState, setSlotState] = useState<Record<string, { file: File; url: string | null; uploading: boolean }[]>>({});
  const [designSplit, setDesignSplit] = useState("");
  const [slotResetKey, setSlotResetKey] = useState(0);
  const [quantity, setQuantity] = useState<number | null>(null);
  const [added, setAdded] = useState(false);

  const [isCustomQty, setIsCustomQty] = useState(false);
  const [customQtyInput, setCustomQtyInput] = useState("");

  const isQuote = product.orderType === "request-quote";
  const dropdownOptionNames = product.category === "personalised-glasses" || product.category === "bows"
    ? ["Colour"]
    : [];

  // Determine upload slots based on the selected Placement option value
  const uploadSlots = useMemo(() => {
    if (!product.supportsFileUpload) return [] as { key: string; label: string }[];
    const placement = selectedOptions["Placement"];
    if (!placement) return [{ key: "artwork", label: "Artwork" }];
    const lc = placement.toLowerCase();
    const hasFront = lc.includes("front");
    const hasBack = lc.includes("back");
    if (hasFront && hasBack) return [{ key: "front", label: "Front" }, { key: "back", label: "Back" }];
    if (hasFront) return [{ key: "front", label: "Front" }];
    if (hasBack) return [{ key: "back", label: "Back" }];
    return [{ key: "artwork", label: "Artwork" }];
  }, [product.supportsFileUpload, selectedOptions]);

  // FileUpload hands us the full list each time: keep finished uploads, upload only new files
  function handleFilesChange(key: string, files: File[]) {
    const known = slotState[key] ?? [];
    setSlotState((prev) => ({
      ...prev,
      [key]: files.map((file) => (prev[key] ?? []).find((u) => u.file === file) ?? { file, url: null, uploading: true }),
    }));
    files.filter((f) => !known.some((u) => u.file === f)).forEach((f) => uploadFile(key, f));
  }

  async function uploadFile(key: string, file: File) {
    let url: string | null = null;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/artwork-upload", { method: "POST", body: fd });
      const data = await res.json();
      url = res.ok && data.url ? (data.url as string) : null;
    } catch { /* url stays null — shown as failed */ }
    setSlotState((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).map((u) => (u.file === file ? { ...u, url, uploading: false } : u)),
    }));
  }

  const anyUploading = Object.values(slotState).some((list) => list.some((u) => u.uploading));
  const designCount = (slotState["artwork"] ?? []).length;

  const selectedSizeVariant = useMemo(() => {
    if (!product.sizeVariants?.length) return null;
    return product.sizeVariants.find((v) => v.name === selectedOptions["Size"]) ?? null;
  }, [product.sizeVariants, selectedOptions]);

  const sizeKey = selectedSizeVariant?.name ?? "";
  const matrixOptions = useMemo(
    () => ({ ...selectedOptions, Size: selectedOptions["Size"] ?? sizeKey }),
    [selectedOptions, sizeKey]
  );
  const { tiers: matrixTiers } = getProductMatrixTiers(product, matrixOptions);
  const hasMatrix = matrixTiers.length > 0;

  // True when an option (e.g. Placement) has a priceMap price for the current selection.
  // In this mode we use a free-entry stepper instead of matrix tier buttons.
  const hasOptionPrice = product.options.some(
    (opt) => (opt.priceMap?.[selectedOptions[opt.name]] ?? 0) > 0
  );

  const validQtys = hasMatrix ? matrixTiers.map((t) => t.qty) : null;
  const defaultQty = validQtys?.[0] ?? 1;
  const effectiveQty = quantity !== null && (hasOptionPrice || !validQtys || validQtys.includes(quantity))
    ? quantity
    : defaultQty;

  const stickersPerSheet = selectedSizeVariant?.stickersPerSheet ?? 0;

  const legacyTiers = useMemo(() => {
    if (hasMatrix || !stickersPerSheet) return null;
    const multipliers = [1, 2, 3, 5, 10, 15, 25, 50, 100, 150, 250, 500, 1000];
    return [...new Set(
      multipliers.map((m) => m * stickersPerSheet).filter((q) => q <= maxOrderQty)
    )].sort((a, b) => a - b);
  }, [hasMatrix, stickersPerSheet, maxOrderQty]);

  const tierQtys: number[] = hasMatrix ? matrixTiers.map((t) => t.qty) : (legacyTiers ?? []);
  // Don't show matrix tier buttons when option-level pricing (e.g. placement) is active —
  // use the free stepper instead so any quantity works at unitPrice × qty.
  const showTierButtons = tierQtys.length > 1 && !hasOptionPrice;

  // Custom qty is available for any product that shows tier buttons
  const canCustomQty = showTierButtons;

  // Compute custom quantity pricing whenever the input changes
  const customQtyData = useMemo(() => {
    if (!isCustomQty || !customQtyInput.trim()) return null;
    const raw = parseInt(customQtyInput, 10);
    if (isNaN(raw) || raw < 1) return null;

    // For sheet-based products round up to the next full sheet; otherwise use the raw qty directly
    const pricedQty = stickersPerSheet > 0 ? Math.ceil(raw / stickersPerSheet) * stickersPerSheet : raw;
    const sheetsNeeded = stickersPerSheet > 0 ? Math.ceil(raw / stickersPerSheet) : 1;

    if (pricedQty > maxOrderQty) {
      return { overMax: true as const, raw, sheetsNeeded, pricedQty };
    }

    const resolved = resolveProductMatrixPrice(product, matrixOptions, pricedQty);
    if (resolved) {
      return { overMax: false as const, raw, sheetsNeeded, pricedQty, totalPence: resolved.totalPence, unitPence: resolved.unitPence };
    }

    return null;
  }, [isCustomQty, customQtyInput, stickersPerSheet, product, matrixOptions, maxOrderQty]);

  // Resolve price and display qty (custom takes priority)
  const currentTier = hasMatrix
    ? (matrixTiers.find((t) => t.qty === effectiveQty) ?? matrixTiers[0])
    : null;

  // Per-option-value pricing — first option with a priceMap whose selected value has a price wins
  const optionUnitPrice = useMemo(
    () => resolveProductOptionUnitPrice(product, selectedOptions),
    [product, selectedOptions]
  );

  const pricedOptionUnitPrice = optionUnitPrice;
  const unitPrice = pricedOptionUnitPrice ?? product.price;
  const optionQty = isCustomQty && customQtyInput.trim()
    ? parseInt(customQtyInput, 10)
    : effectiveQty;
  const optionQtyIsValid = !isNaN(optionQty) && optionQty >= 1 && optionQty <= maxOrderQty;

  // Volume discount — only applies to non-matrix products with a unit price
  const activeVolumeTier = (!hasMatrix || pricedOptionUnitPrice !== null) && unitPrice > 0 && volumeDiscounts.length > 0
    ? [...volumeDiscounts].sort((a, b) => b.minQty - a.minQty).find((t) => optionQty >= t.minQty) ?? null
    : null;
  const volumeDiscountPct = activeVolumeTier?.discountPercent ?? 0;

  const displayPrice = pricedOptionUnitPrice !== null
    ? (optionQtyIsValid ? unitPrice * optionQty * (1 - volumeDiscountPct / 100) : 0)
    : isCustomQty && customQtyData && !customQtyData.overMax
      ? customQtyData.totalPence / 100
      : currentTier
        ? currentTier.totalPence / 100
        : unitPrice * effectiveQty * (1 - volumeDiscountPct / 100);

  const displayQtyLabel = !isCustomQty && currentTier ? effectiveQty : null;

  const displayUnit = (
    isCustomQty && customQtyData && !customQtyData.overMax && customQtyData.pricedQty > 1
      ? customQtyData.unitPence / 100
      : pricedOptionUnitPrice !== null
        ? (effectiveQty > 1 ? unitPrice : null)
        : (currentTier && effectiveQty > 1 ? currentTier.unitPence / 100 : null)
  ) || null;

  function handleOptionChange(optName: string, val: string) {
    setSelectedOptions((prev) => ({ ...prev, [optName]: val }));
    setQuantity(null);
    setIsCustomQty(false);
    setCustomQtyInput("");
    if (optName === "Placement") {
      setSlotState({});
      setSlotResetKey((k) => k + 1);
    }
  }

  function handleAddToCart() {
    // Numbered to match the list the customer saw, so "30 of design 1" lines up for the admin
    const artworks: ArtworkFile[] = uploadSlots.flatMap((slot) => {
      const list = slotState[slot.key] ?? [];
      return list.flatMap((u, i) => u.url
        ? [{ placement: list.length > 1 ? `Design ${i + 1} (${u.file.name})` : slot.label, url: u.url }]
        : []);
    });
    const artworksArg = artworks.length ? artworks : undefined;
    // Rides in selectedOptions so cart, checkout, admin orders and order emails all show it untouched
    const options = designCount > 1
      ? { ...selectedOptions, "Design split": designSplit.trim() || "Split evenly" }
      : selectedOptions;
    if (isCustomQty) {
      if (pricedOptionUnitPrice !== null) {
        if (!optionQtyIsValid) return;
        addItem(product, options, optionQty, customText || undefined, artworksArg, unitPrice * optionQty * (1 - volumeDiscountPct / 100));
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
        return;
      }
      if (!customQtyData || customQtyData.overMax) return;
      addItem(product, options, customQtyData.pricedQty, customText || undefined, artworksArg, customQtyData.totalPence / 100);
    } else {
      const linePrice = pricedOptionUnitPrice !== null
        ? unitPrice * optionQty * (1 - volumeDiscountPct / 100)
        : currentTier
          ? currentTier.totalPence / 100
          : unitPrice * effectiveQty * (1 - volumeDiscountPct / 100);
      addItem(product, options, effectiveQty, customText || undefined, artworksArg, linePrice);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const addToCartDisabled = anyUploading || (isCustomQty && (
    pricedOptionUnitPrice !== null
      ? !optionQtyIsValid || !customQtyInput.trim()
      : !customQtyData || customQtyData.overMax || !customQtyInput.trim()
  ));

  return (
    <div className="flex flex-col gap-5">
      {/* Price */}
      {!isQuote && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-display font-700 text-3xl text-[#111111]">
              {isCustomQty && customQtyData && !customQtyData.overMax
                ? formatPrice(displayPrice)
                : isCustomQty
                  ? "—"
                  : formatPrice(displayPrice)
              }
            </span>
            {displayUnit && (
              <span className="text-sm text-[#6b7280]">{formatPrice(displayUnit)} each</span>
            )}
            {pricedOptionUnitPrice !== null && !isCustomQty && volumeDiscountPct > 0 && (
              <span className="text-lg text-[#6b7280] line-through">{formatPrice(unitPrice * effectiveQty)}</span>
            )}
            {!currentTier && pricedOptionUnitPrice === null && product.originalPrice && !isCustomQty && !activeVolumeTier && (
              <span className="text-lg text-[#6b7280] line-through">{formatPrice(product.originalPrice)}</span>
            )}
            {pricedOptionUnitPrice === null && displayQtyLabel && (
              <span className="text-xs text-[#6b7280] bg-[#f0ede8] px-2 py-1 rounded-lg">
                for {displayQtyLabel}
              </span>
            )}
            {pricedOptionUnitPrice !== null && !isCustomQty && activeVolumeTier && (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                {activeVolumeTier.discountPercent}% off
              </span>
            )}
          </div>
          {(!hasMatrix || pricedOptionUnitPrice !== null) && volumeDiscounts.length > 0 && (
            <p className="text-xs text-[#6b7280]">
              {[...volumeDiscounts]
                .sort((a, b) => a.minQty - b.minQty)
                .map((t) => `${t.minQty}+: ${t.discountPercent}% off`)
                .join(" · ")}
            </p>
          )}
        </div>
      )}

      {/* Option selectors */}
      {product.options.map((opt) => (
        <div key={opt.name}>
          <label className="block text-sm font-semibold text-[#111111] mb-2">
            {opt.name}: <span className="text-[#ef8733]">{selectedOptions[opt.name]}</span>
          </label>
          {dropdownOptionNames.includes(opt.name) ? (
            <select
              value={selectedOptions[opt.name]}
              onChange={(e) => handleOptionChange(opt.name, e.target.value)}
              className="w-full h-11 px-4 rounded-xl border-2 border-[#e5e1d8] bg-white text-sm text-[#111111] focus:outline-none focus:border-[#ef8733] transition-colors"
            >
              {opt.values.map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex flex-wrap gap-2">
              {opt.values.map((val) => {
                const optPrice = opt.priceMap?.[val];
                const optPriceLabel = ` — ${formatPrice(optPrice ?? 0)}`;
                return (
                  <button
                    key={val}
                    onClick={() => handleOptionChange(opt.name, val)}
                    className={`px-4 py-2 text-sm rounded-full border-2 transition-all cursor-pointer ${
                      selectedOptions[opt.name] === val
                        ? "border-[#ef8733] bg-[#fff7ed] text-[#ef8733] font-semibold"
                      : "border-[#e5e1d8] text-[#111111] hover:border-[#ef8733]"
                    }`}
                  >
                    {val}{optPrice !== undefined && optPrice > 0 ? optPriceLabel : ""}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Custom text */}
      {product.supportsTextInput && (
        <div>
          <label className="block text-sm font-semibold text-[#111111] mb-2">
            Custom Text <span className="text-[#6b7280] font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Enter your text here…"
            maxLength={100}
            className="w-full h-11 px-4 rounded-xl border-2 border-[#e5e1d8] text-sm text-[#111111] placeholder:text-[#6b7280] focus:outline-none focus:border-[#ef8733] transition-colors"
          />
        </div>
      )}

      {/* File upload — one slot per placement position */}
      {uploadSlots.length > 0 && (
        <div className="flex flex-col gap-4">
          {uploadSlots.map((slot) => {
            const list = slotState[slot.key] ?? [];
            const done = list.filter((u) => !u.uploading && u.url);
            const failed = list.filter((u) => !u.uploading && !u.url);
            // Front/Back placements take one file each; the general artwork slot takes several designs
            const multiple = slot.key === "artwork";
            return (
              <div key={`${slotResetKey}-${slot.key}`}>
                <FileUpload
                  multiple={multiple}
                  onFiles={(files) => handleFilesChange(slot.key, files)}
                  label={uploadSlots.length > 1 ? `${slot.label} Artwork` : multiple ? "Upload Your Designs (optional)" : "Upload Artwork (optional)"}
                />
                {list.some((u) => u.uploading) && <p className="text-xs text-[#6b7280] mt-1">Uploading…</p>}
                {done.length > 0 && (
                  <p className="text-xs text-emerald-600 mt-1">
                    {done.length > 1 ? `${done.length} designs uploaded` : `${slot.label} artwork uploaded`} ✓
                  </p>
                )}
                {failed.length > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Upload failed for {failed.map((u) => u.file.name).join(", ")}. Remove and try again, or you can still add to cart
                  </p>
                )}
                {multiple && designCount > 1 && (
                  <div className="mt-4">
                    <label htmlFor="design-split" className="block text-sm font-semibold text-[#111111] mb-2">
                      How should we split your order between these {designCount} designs?{" "}
                      <span className="text-[#6b7280] font-normal">(optional)</span>
                    </label>
                    <textarea
                      id="design-split"
                      value={designSplit}
                      onChange={(e) => setDesignSplit(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="e.g. 30 of design 1, 20 of design 2"
                      className="w-full px-4 py-3 rounded-xl border-2 border-[#e5e1d8] text-sm text-[#111111] placeholder:text-[#6b7280] resize-none focus:outline-none focus:border-[#ef8733] transition-colors"
                    />
                    <p className="text-xs text-[#6b7280] mt-1">Leave blank and we&apos;ll split them evenly.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quantity */}
      {!isQuote && (
        <div>
          <label className="block text-sm font-semibold text-[#111111] mb-2">Quantity</label>

          {showTierButtons ? (
            <>
              <div className="flex flex-wrap gap-2">
                {tierQtys.map((q) => (
                  <button
                    key={q}
                    onClick={() => { setQuantity(q); setIsCustomQty(false); setCustomQtyInput(""); }}
                    className={`px-4 py-2 text-sm rounded-full border-2 transition-all cursor-pointer ${
                      !isCustomQty && effectiveQty === q
                        ? "border-[#ef8733] bg-[#fff7ed] text-[#ef8733] font-semibold"
                        : "border-[#e5e1d8] text-[#111111] hover:border-[#ef8733]"
                    }`}
                  >
                    {q}
                  </button>
                ))}
                {canCustomQty && (
                  <button
                    onClick={() => { setIsCustomQty(true); setQuantity(null); }}
                    className={`px-4 py-2 text-sm rounded-full border-2 transition-all cursor-pointer ${
                      isCustomQty
                        ? "border-[#ef8733] bg-[#fff7ed] text-[#ef8733] font-semibold"
                        : "border-[#e5e1d8] text-[#111111] hover:border-[#ef8733]"
                    }`}
                  >
                    Custom
                  </button>
                )}
              </div>

              {isCustomQty && (
                <div className="mt-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      value={customQtyInput}
                      onChange={(e) => setCustomQtyInput(e.target.value)}
                      placeholder={`e.g. 30`}
                      className="w-28 h-10 px-3 rounded-xl border-2 border-[#e5e1d8] text-sm focus:outline-none focus:border-[#ef8733] transition-colors"
                      autoFocus
                    />
                    {customQtyData?.overMax && (
                      <span className="text-sm text-amber-600">
                        Exceeds max —{" "}
                        <Link href={`/custom-order?product=${product.slug}`} className="text-[#ef8733] hover:underline font-medium">
                          request a quote
                        </Link>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {!isCustomQty && selectedSizeVariant && (
                <p className="text-xs text-[#6b7280] mt-2">
                  Quantities in multiples of {selectedSizeVariant.stickersPerSheet} (full sheets).{" "}
                  <Link href={`/custom-order?product=${product.slug}`} className="text-[#ef8733] hover:underline font-medium">
                    Need more than {maxOrderQty}?
                  </Link>
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, effectiveQty - 1))}
                className="w-10 h-10 rounded-full border-2 border-[#e5e1d8] flex items-center justify-center hover:border-[#ef8733] transition-colors cursor-pointer"
              >
                <Minus size={16} />
              </button>
              <span className="text-lg font-semibold text-[#111111] w-8 text-center">{effectiveQty}</span>
              <button
                onClick={() => setQuantity(Math.min(maxOrderQty, effectiveQty + 1))}
                className="w-10 h-10 rounded-full border-2 border-[#e5e1d8] flex items-center justify-center hover:border-[#ef8733] transition-colors cursor-pointer"
              >
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      {isQuote ? (
        <div className="flex flex-col gap-3">
          <Link href={`/custom-order?product=${product.slug}`}>
            <Button size="lg" fullWidth>
              <FileText size={18} /> Request a Quote
            </Button>
          </Link>
          <p className="text-xs text-[#6b7280] text-center">We respond within 24 hours with a full quote.</p>
        </div>
      ) : (
        <Button size="lg" fullWidth onClick={handleAddToCart} disabled={addToCartDisabled}>
          {added ? (
            "✓ Added to cart!"
          ) : (
            <><ShoppingCart size={18} /> Add to Cart{!addToCartDisabled && ` — ${formatPrice(displayPrice)}`}</>
          )}
        </Button>
      )}
    </div>
  );
}
