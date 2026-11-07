import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import ClearCart from "./ClearCart";
import { Resend } from "resend";
import { capturePayPalOrder } from "@/lib/paypal";
import {
  getOrders, saveOrders, getPendingOrders, deletePendingOrder, getSettings,
} from "@/lib/server-data";
import { Order } from "@/lib/types";
import { orderItemDetailsHtml } from "@/lib/utils";
import Button from "@/components/ui/Button";

async function processPayPalOrder(token: string): Promise<"success" | "already_done" | "error"> {
  // Idempotency — don't process twice if the page is refreshed
  const existingOrders = await getOrders();
  if (existingOrders.find((o) => o.id === token)) return "already_done";

  let customId: string;
  try {
    const result = await capturePayPalOrder(token);
    if (result.status !== "COMPLETED") return "error";
    customId = result.customId;
  } catch (err) {
    console.error("[success/paypal] capture failed:", err instanceof Error ? err.message : String(err));
    return "error";
  }

  const pendingOrders = await getPendingOrders();
  const pending = pendingOrders[token] ?? pendingOrders[customId];
  if (!pending) {
    console.error("[success/paypal] pending order not found for token:", token, "customId:", customId);
    return "error";
  }

  const order: Order = {
    id: token,
    createdAt: new Date().toISOString(),
    status: "paid",
    customer: pending.customer,
    items: pending.items,
    subtotalPence: pending.subtotalPence,
    postagePence: pending.postagePence,
    totalPence: pending.totalPence,
  };

  existingOrders.unshift(order);
  await saveOrders(existingOrders);
  await deletePendingOrder(token);
  if (customId !== token) await deletePendingOrder(customId);

  // Send emails
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
    const fmt = (p: number) => `£${(p / 100).toFixed(2)}`;

    let ownerEmail = process.env.NOTIFY_EMAIL ?? "";
    if (!ownerEmail) {
      try { ownerEmail = (await getSettings()).email; } catch { /* ignore */ }
    }

    const itemRows = order.items
      .map((i) => {
        return `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0ede8">${i.name}${orderItemDetailsHtml(i)}</td><td style="padding:6px 12px;border-bottom:1px solid #f0ede8;text-align:right">${fmt(i.unitAmountPence * i.quantity)}</td></tr>`;
      })
      .join("");
    const postageRow = order.postagePence > 0
      ? `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0ede8">Postage &amp; Packaging</td><td style="padding:6px 12px;border-bottom:1px solid #f0ede8;text-align:right">${fmt(order.postagePence)}</td></tr>`
      : "";
    const totalRow = `<tr><td style="padding:8px 12px;font-weight:700">Total</td><td style="padding:8px 12px;font-weight:700;text-align:right">${fmt(order.totalPence)}</td></tr>`;
    const tableHtml = `<table style="width:100%;border-collapse:collapse;margin:16px 0">${itemRows}${postageRow}${totalRow}</table>`;
    const { firstName, lastName, email, phone, address1, address2, city, postcode } = order.customer;

    const jobs: Promise<unknown>[] = [];

    if (ownerEmail) {
      jobs.push(resend.emails.send({
        from: fromEmail,
        to: ownerEmail,
        subject: `New order — ${firstName} ${lastName} (${fmt(order.totalPence)})`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111"><h2 style="color:#ef8733;margin-bottom:4px">New Order Received</h2><p style="color:#6b7280;margin-top:0">${new Date(order.createdAt).toLocaleString("en-GB")}</p>${tableHtml}<h3 style="margin-bottom:8px">Customer</h3><p style="margin:2px 0">${firstName} ${lastName}</p><p style="margin:2px 0">${email}</p>${phone ? `<p style="margin:2px 0">${phone}</p>` : ""}<h3 style="margin-bottom:8px;margin-top:16px">Delivery Address</h3><p style="margin:2px 0">${address1}${address2 ? `, ${address2}` : ""}</p><p style="margin:2px 0">${city}, ${postcode}</p><p style="margin-top:20px;color:#6b7280;font-size:12px">Order ID: ${order.id}</p></div>`,
      }).catch((e) => console.error("[success] owner email failed:", e)));
    }

    if (email) {
      jobs.push(resend.emails.send({
        from: fromEmail,
        to: email,
        subject: "Your order confirmation — Peel & Party Co.",
        replyTo: ownerEmail || undefined,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111"><h2 style="color:#ef8733">Thanks for your order, ${firstName}!</h2><p>We've received your order and will begin production shortly. We'll be in touch when it's on its way.</p>${tableHtml}<p style="color:#6b7280;font-size:12px">Order reference: ${order.id}</p></div>`,
      }).catch((e) => console.error("[success] customer email failed:", e)));
    }

    await Promise.all(jobs);
  }

  return "success";
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; session_id?: string }>;
}) {
  const params = await searchParams;
  const paypalToken = params.token;

  // PayPal flow — capture the order on this page load
  if (paypalToken) {
    const result = await processPayPalOrder(paypalToken);
    if (result === "error") {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center py-20">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <XCircle size={40} className="text-red-500" />
          </div>
          <h1 className="font-display font-800 text-3xl text-[#111111] mb-3">Payment not confirmed</h1>
          <p className="text-[#6b7280] text-lg max-w-md mb-8">
            We couldn&apos;t confirm your payment. If money left your account please contact us and we&apos;ll sort it right away.
          </p>
          <Link href="/shop"><Button>Return to Shop</Button></Link>
        </div>
      );
    }
  }

  // Stripe flow (session_id present) or PayPal success / already_done
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center py-20">
      <ClearCart />
      <div className="w-20 h-20 bg-[#fff7ed] rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 size={40} className="text-[#ef8733]" />
      </div>
      <h1 className="font-display font-800 text-3xl text-[#111111] mb-3">Order Placed!</h1>
      <p className="text-[#6b7280] text-lg max-w-md mb-8">
        Thanks for your order. You&apos;ll receive a confirmation email shortly with your order details and production timeline.
      </p>
      <Link href="/shop">
        <Button>Continue Shopping</Button>
      </Link>
    </div>
  );
}
