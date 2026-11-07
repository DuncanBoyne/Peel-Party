"use client";

import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";
import FileUpload from "@/components/ui/FileUpload";

const productTypes = ["Custom Stickers", "Branded Mugs", "Custom Keyrings", "Mixed / Multi-product order", "Other"];
const quantities = ["1–24", "25–49", "50–99", "100–249", "250–499", "500+"];

export default function CustomOrderPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [artworkFiles, setArtworkFiles] = useState<File[]>([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    productType: "",
    quantity: "",
    deadline: "",
    customText: "",
    notes: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // A failed upload keeps its name with an empty url, so admin sees "(not uploaded)" and can ask for it
    const artworks = await Promise.all(
      artworkFiles.map(async (file) => {
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/artwork-upload", { method: "POST", body: fd });
          const data = await res.json();
          return { name: file.name, url: (data.url as string | undefined) ?? "" };
        } catch {
          return { name: file.name, url: "" };
        }
      })
    );

    await fetch("/api/admin/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, artworks }),
    });
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center py-20">
        <div className="w-20 h-20 bg-[#fff7ed] rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} className="text-[#ef8733]" />
        </div>
        <h1 className="font-display font-800 text-3xl text-[#111111] mb-3">Quote Request Sent!</h1>
        <p className="text-[#6b7280] text-lg max-w-md">
          Thanks, <strong>{form.name}</strong>! We'll review your request and come back to you within 24 hours with a full quote.
        </p>
        <p className="text-sm text-[#6b7280] mt-2">Check your inbox at <strong>{form.email}</strong></p>
        <button
          className="mt-8 text-sm text-[#ef8733] font-semibold hover:underline"
          onClick={() => setSubmitted(false)}
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-[#ef8733] text-sm font-semibold uppercase tracking-wider mb-1">Custom Orders</p>
        <h1 className="font-display font-800 text-4xl sm:text-5xl text-[#111111] mb-3">Request a Quote</h1>
        <p className="text-[#6b7280] text-lg">
          Fill in the form below and we'll come back to you within 24 hours with a tailored quote.
          No commitment required.
        </p>
      </div>

      {/* Steps */}
      <div className="flex flex-wrap gap-4 mb-10">
        {["1. Tell us what you need", "2. We send a proof + quote", "3. Approve and we print", "4. Delivered to your door"].map(
          (step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#ef8733] text-white text-xs font-bold flex items-center justify-center">
                {i + 1}
              </div>
              <span className="text-sm text-[#6b7280]">{step.slice(3)}</span>
            </div>
          )
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Contact info */}
        <fieldset className="border border-[#e5e1d8] rounded-2xl p-6">
          <legend className="font-display font-700 text-lg text-[#111111] px-2">Your Details</legend>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-1.5">Full Name *</label>
              <input required value={form.name} onChange={(e) => update("name", e.target.value)} type="text" placeholder="Jane Smith"
                className="w-full h-11 px-4 rounded-xl border-2 border-[#e5e1d8] text-sm focus:outline-none focus:border-[#ef8733] transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-1.5">Email Address *</label>
              <input required value={form.email} onChange={(e) => update("email", e.target.value)} type="email" placeholder="jane@example.com"
                className="w-full h-11 px-4 rounded-xl border-2 border-[#e5e1d8] text-sm focus:outline-none focus:border-[#ef8733] transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-1.5">Company <span className="text-[#6b7280] font-normal">(optional)</span></label>
              <input value={form.company} onChange={(e) => update("company", e.target.value)} type="text" placeholder="Acme Ltd"
                className="w-full h-11 px-4 rounded-xl border-2 border-[#e5e1d8] text-sm focus:outline-none focus:border-[#ef8733] transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-1.5">Phone <span className="text-[#6b7280] font-normal">(optional)</span></label>
              <input value={form.phone} onChange={(e) => update("phone", e.target.value)} type="tel" placeholder="07700 900000"
                className="w-full h-11 px-4 rounded-xl border-2 border-[#e5e1d8] text-sm focus:outline-none focus:border-[#ef8733] transition-colors" />
            </div>
          </div>
        </fieldset>

        {/* Order details */}
        <fieldset className="border border-[#e5e1d8] rounded-2xl p-6">
          <legend className="font-display font-700 text-lg text-[#111111] px-2">Order Details</legend>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-1.5">Product Type *</label>
              <select required value={form.productType} onChange={(e) => update("productType", e.target.value)}
                className="w-full h-11 px-4 rounded-xl border-2 border-[#e5e1d8] text-sm bg-white focus:outline-none focus:border-[#ef8733] transition-colors">
                <option value="">Select…</option>
                {productTypes.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-1.5">Quantity *</label>
              <select required value={form.quantity} onChange={(e) => update("quantity", e.target.value)}
                className="w-full h-11 px-4 rounded-xl border-2 border-[#e5e1d8] text-sm bg-white focus:outline-none focus:border-[#ef8733] transition-colors">
                <option value="">Select…</option>
                {quantities.map((q) => <option key={q}>{q}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-1.5">Deadline <span className="text-[#6b7280] font-normal">(if any)</span></label>
              <input value={form.deadline} onChange={(e) => update("deadline", e.target.value)} type="date"
                className="w-full h-11 px-4 rounded-xl border-2 border-[#e5e1d8] text-sm bg-white focus:outline-none focus:border-[#ef8733] transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-1.5">Custom Text <span className="text-[#6b7280] font-normal">(optional)</span></label>
              <input value={form.customText} onChange={(e) => update("customText", e.target.value)} type="text" placeholder="Name, slogan, date…"
                className="w-full h-11 px-4 rounded-xl border-2 border-[#e5e1d8] text-sm focus:outline-none focus:border-[#ef8733] transition-colors" />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-[#111111] mb-1.5">Additional Notes</label>
            <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={4}
              placeholder="Tell us about sizes, finishes, special requirements, brand guidelines… Sending several designs? Say how to split the quantity between them."
              className="w-full px-4 py-3 rounded-xl border-2 border-[#e5e1d8] text-sm resize-none focus:outline-none focus:border-[#ef8733] transition-colors" />
          </div>

          <div className="mt-4">
            <FileUpload multiple onFiles={setArtworkFiles} label="Upload Your Artwork (optional)" />
          </div>
        </fieldset>

        <Button type="submit" size="lg" loading={loading} fullWidth>
          <Send size={16} /> Send Quote Request
        </Button>

        <p className="text-xs text-[#6b7280] text-center">
          By submitting you agree to our privacy policy. We'll only use your details to respond to your request.
        </p>
      </form>
    </div>
  );
}
