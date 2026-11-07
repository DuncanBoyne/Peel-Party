import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { OrderItem } from "./types";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Order email HTML under a line's name: options, custom text and artwork links.
// Everything here is customer-supplied, so it is escaped.
export function orderItemDetailsHtml(item: OrderItem): string {
  const span = (s: string) => `<br><span style="color:#6b7280;font-size:12px">${s}</span>`;
  const files = item.artworks?.length
    ? item.artworks
    : item.artworkUrl ? [{ placement: "Artwork", url: item.artworkUrl }] : [];
  return [
    item.selectedOptions && Object.keys(item.selectedOptions).length
      ? span(Object.entries(item.selectedOptions).map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(v)}`).join(" | "))
      : "",
    item.customText ? span(`Text: ${escapeHtml(item.customText)}`) : "",
    files.length
      ? span(files.map((a) => `<a href="${escapeHtml(a.url)}" style="color:#ef8733">${escapeHtml(a.placement)}</a>`).join(" · "))
      : "",
  ].join("");
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(pounds: number): string {
  return `£${pounds.toFixed(2)}`;
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
