"use client";

import { useState } from "react";
import { Save, CheckCircle2, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { categoryMeta } from "@/lib/data";
import type { SiteSettings } from "@/lib/server-data";
import type { ShopNavLink, ShopNavSection } from "@/lib/shop-nav";

interface Props { initialSettings: SiteSettings }

const inputClass = "w-full h-10 px-3 rounded-xl border-2 border-[#e5e1d8] text-sm focus:outline-none focus:border-[#ef8733] transition-colors bg-white";
const labelClass = "block text-sm font-semibold text-[#111111] mb-1.5";
const iconButtonClass = "inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#e5e1d8] text-[#111111] hover:bg-[#f0ede8] transition-colors disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e1d8] p-6">
      <h2 className="font-display font-700 text-lg text-[#111111] mb-5">{title}</h2>
      <div className="grid sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export default function SettingsForm({ initialSettings }: Props) {
  const [form, setForm] = useState(initialSettings);
  const [pendingCategoryBySection, setPendingCategoryBySection] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const categoryOptions = Object.entries(categoryMeta).map(([slug, meta]) => ({
    label: meta.title,
    href: `/shop/${slug}`,
  }));

  function update<K extends keyof SiteSettings>(field: K, value: SiteSettings[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateShopNavSections(shopNavSections: ShopNavSection[]) {
    setForm((prev) => ({ ...prev, shopNavSections }));
  }

  function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return items;
    const next = [...items];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return next;
  }

  function addSection() {
    updateShopNavSections([
      ...form.shopNavSections,
      { id: `section-${Date.now()}`, title: "New Section", links: [] },
    ]);
  }

  function updateSection(sectionId: string, updates: Partial<ShopNavSection>) {
    updateShopNavSections(
      form.shopNavSections.map((section) =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    );
  }

  function removeSection(sectionId: string) {
    updateShopNavSections(form.shopNavSections.filter((section) => section.id !== sectionId));
  }

  function moveSection(index: number, direction: -1 | 1) {
    updateShopNavSections(moveItem(form.shopNavSections, index, direction));
  }

  function updateSectionLinks(sectionId: string, links: ShopNavLink[]) {
    updateShopNavSections(
      form.shopNavSections.map((section) =>
        section.id === sectionId ? { ...section, links } : section
      )
    );
  }

  function addCategoryLink(sectionId: string, href: string) {
    const option = categoryOptions.find((item) => item.href === href);
    if (!option) return;
    setPendingCategoryBySection((prev) => ({ ...prev, [sectionId]: "" }));

    const section = form.shopNavSections.find((item) => item.id === sectionId);
    if (!section || section.links.some((link) => link.href === option.href)) return;

    updateSectionLinks(sectionId, [
      ...section.links,
      { id: `link-${Date.now()}`, label: option.label, href: option.href },
    ]);
  }

  function addCustomLink(sectionId: string) {
    const section = form.shopNavSections.find((item) => item.id === sectionId);
    if (!section) return;
    updateSectionLinks(sectionId, [
      ...section.links,
      { id: `link-${Date.now()}`, label: "New Link", href: "/shop" },
    ]);
  }

  function updateLink(sectionId: string, linkId: string, updates: Partial<ShopNavLink>) {
    const section = form.shopNavSections.find((item) => item.id === sectionId);
    if (!section) return;
    updateSectionLinks(
      sectionId,
      section.links.map((link) => (link.id === linkId ? { ...link, ...updates } : link))
    );
  }

  function removeLink(sectionId: string, linkId: string) {
    const section = form.shopNavSections.find((item) => item.id === sectionId);
    if (!section) return;
    updateSectionLinks(sectionId, section.links.filter((link) => link.id !== linkId));
  }

  function moveLink(sectionId: string, index: number, direction: -1 | 1) {
    const section = form.shopNavSections.find((item) => item.id === sectionId);
    if (!section) return;
    updateSectionLinks(sectionId, moveItem(section.links, index, direction));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Textarea keeps raw lines while typing; tidy them only on save
    const seasons = [...new Set(form.seasons.map((s) => s.trim()).filter(Boolean))];
    setForm((prev) => ({ ...prev, seasons }));
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, seasons }),
    });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-3xl">
      <Section title="Business Info">
        <Field label="Business Name">
          <input className={inputClass} value={form.businessName} onChange={(e) => update("businessName", e.target.value)} />
        </Field>
        <Field label="Tagline">
          <input className={inputClass} value={form.tagline} onChange={(e) => update("tagline", e.target.value)} />
        </Field>
        <Field label="Email">
          <input type="email" className={inputClass} value={form.email} onChange={(e) => update("email", e.target.value)} />
        </Field>
        <Field label="Phone">
          <input className={inputClass} value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </Field>
        <Field label="Address / Location">
          <input className={inputClass} value={form.address} onChange={(e) => update("address", e.target.value)} />
        </Field>
        <Field label="Free Shipping Threshold (pence)">
          <input type="number" className={inputClass} value={form.freeShippingThreshold} onChange={(e) => update("freeShippingThreshold", Number(e.target.value))} />
        </Field>
      </Section>

      <Section title="Homepage Hero">
        <Field label="Hero Headline" full>
          <input className={inputClass} value={form.heroTitle} onChange={(e) => update("heroTitle", e.target.value)} />
        </Field>
        <Field label="Hero Subtitle" full>
          <textarea rows={3} className="w-full px-3 py-2.5 rounded-xl border-2 border-[#e5e1d8] text-sm focus:outline-none focus:border-[#ef8733] transition-colors resize-none bg-white" value={form.heroSubtitle} onChange={(e) => update("heroSubtitle", e.target.value)} />
        </Field>
        <Field label="Primary CTA Button Text">
          <input className={inputClass} value={form.heroPrimaryCta} onChange={(e) => update("heroPrimaryCta", e.target.value)} />
        </Field>
        <Field label="Secondary CTA Button Text">
          <input className={inputClass} value={form.heroSecondaryCta} onChange={(e) => update("heroSecondaryCta", e.target.value)} />
        </Field>
      </Section>

      <Section title="Shop Dropdown">
        <div className="sm:col-span-2 flex flex-col gap-4">
          <p className="text-sm text-[#6b7280]">
            Controls the grouped Shop dropdown shown in the site header. All Products stays fixed at the top.
          </p>

          {form.shopNavSections.map((section, sectionIndex) => (
            <div key={section.id} className="rounded-xl border-2 border-[#e5e1d8] bg-[#fafaf9] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className={labelClass}>Section Name</label>
                  <input
                    className={inputClass}
                    value={section.title}
                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={iconButtonClass}
                    onClick={() => moveSection(sectionIndex, -1)}
                    disabled={sectionIndex === 0}
                    aria-label="Move section up"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    className={iconButtonClass}
                    onClick={() => moveSection(sectionIndex, 1)}
                    disabled={sectionIndex === form.shopNavSections.length - 1}
                    aria-label="Move section down"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    type="button"
                    className={iconButtonClass}
                    onClick={() => removeSection(section.id)}
                    aria-label="Remove section"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {section.links.map((link, linkIndex) => (
                  <div key={link.id} className="grid gap-2 rounded-lg border border-[#e5e1d8] bg-white p-3 sm:grid-cols-[1fr_1.25fr_auto] sm:items-end">
                    <div>
                      <label className={labelClass}>Link Label</label>
                      <input
                        className={inputClass}
                        value={link.label}
                        onChange={(e) => updateLink(section.id, link.id, { label: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Link URL</label>
                      <input
                        className={inputClass}
                        value={link.href}
                        onChange={(e) => updateLink(section.id, link.id, { href: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className={iconButtonClass}
                        onClick={() => moveLink(section.id, linkIndex, -1)}
                        disabled={linkIndex === 0}
                        aria-label="Move link up"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        className={iconButtonClass}
                        onClick={() => moveLink(section.id, linkIndex, 1)}
                        disabled={linkIndex === section.links.length - 1}
                        aria-label="Move link down"
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        className={iconButtonClass}
                        onClick={() => removeLink(section.id, link.id)}
                        aria-label="Remove link"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <select
                  className={`${inputClass} sm:max-w-xs`}
                  value={pendingCategoryBySection[section.id] ?? ""}
                  onChange={(e) => {
                    setPendingCategoryBySection((prev) => ({ ...prev, [section.id]: e.target.value }));
                    addCategoryLink(section.id, e.target.value);
                  }}
                >
                  <option value="">Add product category...</option>
                  {categoryOptions.map((option) => (
                    <option key={option.href} value={option.href}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => addCustomLink(section.id)}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border-2 border-[#111111] text-sm font-semibold hover:bg-[#111111] hover:text-white transition-colors cursor-pointer"
                >
                  <Plus size={16} /> Add Custom Link
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addSection}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#111111] text-white text-sm font-semibold hover:bg-[#2b2b2b] transition-colors cursor-pointer sm:self-start"
          >
            <Plus size={16} /> Add Section
          </button>
        </div>
      </Section>

      <Section title="Seasonal Dropdown">
        <Field label="Seasons (one per line)" full>
          <textarea
            rows={5}
            className="w-full px-3 py-2.5 rounded-xl border-2 border-[#e5e1d8] text-sm focus:outline-none focus:border-[#ef8733] transition-colors resize-none bg-white"
            value={form.seasons.join("\n")}
            onChange={(e) => update("seasons", e.target.value.split("\n"))}
            placeholder={"Christmas\nEaster\nHalloween\nHarvest"}
          />
          <p className="text-xs text-[#6b7280] mt-1.5">
            Tag products with a season on the product edit page. A season only shows in the site&apos;s Seasonal menu once at least one product is tagged with it.
          </p>
        </Field>
      </Section>

      <Section title="Custom Order Section">
        <Field label="Section Title" full>
          <input className={inputClass} value={form.customOrderTitle} onChange={(e) => update("customOrderTitle", e.target.value)} />
        </Field>
        <Field label="Section Subtitle" full>
          <textarea rows={3} className="w-full px-3 py-2.5 rounded-xl border-2 border-[#e5e1d8] text-sm focus:outline-none focus:border-[#ef8733] transition-colors resize-none bg-white" value={form.customOrderSubtitle} onChange={(e) => update("customOrderSubtitle", e.target.value)} />
        </Field>
      </Section>

      <Section title="Social Links">
        {(["socialInstagram", "socialFacebook", "socialTiktok"] as const).map((key) => (
          <Field key={key} label={key.replace("social", "")}>
            <input className={inputClass} value={form[key]} onChange={(e) => update(key, e.target.value)} placeholder="https://…" />
          </Field>
        ))}
      </Section>

      <Section title="SEO / Meta">
        <Field label="Meta Title" full>
          <input className={inputClass} value={form.metaTitle} onChange={(e) => update("metaTitle", e.target.value)} />
        </Field>
        <Field label="Meta Description" full>
          <textarea rows={2} className="w-full px-3 py-2.5 rounded-xl border-2 border-[#e5e1d8] text-sm focus:outline-none focus:border-[#ef8733] transition-colors resize-none bg-white" value={form.metaDescription} onChange={(e) => update("metaDescription", e.target.value)} />
        </Field>
      </Section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 h-11 px-6 bg-[#ef8733] text-white rounded-xl font-semibold text-sm hover:bg-[#ea7316] transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Save size={16} /> {loading ? "Saving…" : "Save Settings"}
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
            <CheckCircle2 size={16} /> Settings saved!
          </div>
        )}
      </div>
    </form>
  );
}
