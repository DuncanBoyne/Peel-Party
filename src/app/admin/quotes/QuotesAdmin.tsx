"use client";

import { useState } from "react";
import { Quote } from "@/lib/server-data";
import { MessageSquare, ChevronDown, ChevronUp, Trash2, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";

interface Props { initialQuotes: Quote[] }

const statuses: Quote["status"][] = ["new", "in-progress", "responded", "closed"];
const statusConfig = {
  "new": { label: "New", color: "#ef8733", icon: AlertCircle },
  "in-progress": { label: "In Progress", color: "#3b82f6", icon: Clock },
  "responded": { label: "Responded", color: "#10b981", icon: CheckCircle },
  "closed": { label: "Closed", color: "#6b7280", icon: XCircle },
};

export default function QuotesAdmin({ initialQuotes }: Props) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Quote["status"] | "all">("all");

  async function updateStatus(id: string, status: Quote["status"]) {
    await fetch(`/api/admin/quotes/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
  }

  async function deleteQuote(id: string) {
    if (!confirm("Delete this quote request?")) return;
    await fetch(`/api/admin/quotes/${id}`, { method: "DELETE" });
    setQuotes((prev) => prev.filter((q) => q.id !== id));
  }

  const filtered = filter === "all" ? quotes : quotes.filter((q) => q.status === filter);

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${filter === "all" ? "bg-[#111111] text-white" : "bg-white border border-[#e5e1d8] text-[#111111] hover:border-[#111111]"}`}>
          All ({quotes.length})
        </button>
        {statuses.map((s) => {
          const { label, color, icon: Icon } = statusConfig[s];
          const count = quotes.filter((q) => q.status === s).length;
          return (
            <button key={s} onClick={() => setFilter(s)} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer border ${filter === s ? "text-white border-transparent" : "bg-white border-[#e5e1d8] hover:border-current"}`}
              style={filter === s ? { backgroundColor: color, borderColor: color } : { color }}>
              <Icon size={13} /> {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#e5e1d8] p-16 text-center">
          <MessageSquare size={36} className="mx-auto mb-3 text-[#d1c8bc]" />
          <p className="font-semibold text-[#111111]">No quote requests</p>
          <p className="text-sm text-[#6b7280] mt-1">
            {filter === "all" ? "Submitted quotes will appear here." : `No ${filter} quotes right now.`}
          </p>
        </div>
      )}

      {/* Quote cards */}
      <div className="flex flex-col gap-3">
        {filtered.map((q) => {
          const { label, color, icon: Icon } = statusConfig[q.status];
          const isOpen = expandedId === q.id;
          return (
            <div key={q.id} className="bg-white rounded-2xl border border-[#e5e1d8] overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpandedId(isOpen ? null : q.id)}>
                <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-[#6b7280] mb-0.5">Customer</p>
                    <p className="text-sm font-semibold text-[#111111] truncate">{q.name}</p>
                    <p className="text-xs text-[#6b7280] truncate">{q.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6b7280] mb-0.5">Product</p>
                    <p className="text-sm text-[#111111] truncate">{q.productType || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6b7280] mb-0.5">Quantity</p>
                    <p className="text-sm text-[#111111]">{q.quantity || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6b7280] mb-0.5">Received</p>
                    <p className="text-sm text-[#111111]">
                      {new Date(q.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${color}18`, color }}>
                    <Icon size={11} /> {label}
                  </span>
                  {isOpen ? <ChevronUp size={16} className="text-[#6b7280]" /> : <ChevronDown size={16} className="text-[#6b7280]" />}
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-[#f0ede8] px-5 py-5">
                  <div className="grid sm:grid-cols-2 gap-4 text-sm mb-5">
                    {[
                      ["Company", q.company], ["Phone", q.phone],
                      ["Deadline", q.deadline || "Not specified"], ["Custom Text", q.customText || "None"],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <p className="text-xs text-[#6b7280] mb-0.5">{label}</p>
                        <p className="text-[#111111]">{val || "—"}</p>
                      </div>
                    ))}
                    <div>
                      <p className="text-xs text-[#6b7280] mb-0.5">Artwork</p>
                      {(() => {
                        const files = q.artworks ?? (q.artworkFileName || q.artworkUrl
                          ? [{ name: q.artworkFileName || "View file", url: q.artworkUrl ?? "" }]
                          : []);
                        if (!files.length) return <p className="text-[#6b7280]">No file uploaded</p>;
                        return files.map((f, fi) => f.url ? (
                          <a key={fi} href={f.url} target="_blank" rel="noopener noreferrer" className="block text-[#ef8733] underline text-sm font-medium">
                            {f.name}
                          </a>
                        ) : (
                          <p key={fi} className="text-[#111111] text-sm">{f.name} <span className="text-[#9ca3af]">(not uploaded)</span></p>
                        ));
                      })()}
                    </div>
                    {q.notes && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-[#6b7280] mb-0.5">Notes</p>
                        <p className="text-[#111111] whitespace-pre-line">{q.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#f0ede8]">
                    <span className="text-xs text-[#6b7280] font-medium">Update status:</span>
                    {statuses.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(q.id, s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer border ${q.status === s ? "text-white border-transparent" : "border-[#e5e1d8] hover:border-current"}`}
                        style={q.status === s ? { backgroundColor: statusConfig[s].color, borderColor: statusConfig[s].color } : { color: statusConfig[s].color }}
                      >
                        {statusConfig[s].label}
                      </button>
                    ))}
                    <button onClick={() => deleteQuote(q.id)} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-semibold hover:bg-red-100 transition-colors cursor-pointer">
                      <Trash2 size={11} /> Delete
                    </button>
                    <a href={`mailto:${q.email}?subject=Re: Your quote request`} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ef8733] text-white rounded-full text-xs font-semibold hover:bg-[#ea7316] transition-colors">
                      Reply by Email
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
