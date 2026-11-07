import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { getOrders, saveOrders, getSettings, getPendingStripeData, deletePendingStripeData } from "@/lib/server-data";
import { Order, OrderItem } from "@/lib/types";
import { orderItemDetailsHtml } from "@/lib/utils";

export const runtime = "nodejs";

// Next.js must NOT parse the body — we need raw bytes for signature verification
export const dynamic = "force-dynamic";

function verifyStripeSignature(rawBody: string, sigHeader: string, secret: string): boolean {
  const parts = sigHeader.split(",");
  const tPart = parts.find((p) => p.startsWith("t="));
  const v1Parts = parts.filter((p) => p.startsWith("v1="));
  if (!tPart || !v1Parts.length) return false;

  const timestamp = tPart.slice(2);
  // Reject events more than 5 minutes old to prevent replay attacks
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return v1Parts.some((p) => {
    const sig = p.slice(3);
    if (sig.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  });
}

interface StripeLineItem { n: string; p: number; q: number }

interface StripeSession {
  id: string;
  created: number;
  customer_email: string | null;
  amount_total: number | null;
  metadata: Record<string, string>;
}

function buildOwnerEmail(order: Order): string {
  const fmt = (p: number) => `£${(p / 100).toFixed(2)}`;
  const itemRows = order.items
    .map((i) => {
      return `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0ede8">${i.name}${orderItemDetailsHtml(i)}</td><td style="padding:6px 12px;border-bottom:1px solid #f0ede8;text-align:right">${fmt(i.unitAmountPence * i.quantity)}</td></tr>`;
    })
    .join("");
  const { firstName, lastName, email, phone, address1, address2, city, postcode } = order.customer;
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <h2 style="color:#ef8733;margin-bottom:4px">New Order Received</h2>
      <p style="color:#6b7280;margin-top:0">${new Date(order.createdAt).toLocaleString("en-GB")}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        ${itemRows}
        ${order.postagePence > 0 ? `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0ede8">Postage &amp; Packaging</td><td style="padding:6px 12px;border-bottom:1px solid #f0ede8;text-align:right">${fmt(order.postagePence)}</td></tr>` : ""}
        <tr><td style="padding:8px 12px;font-weight:700">Total</td><td style="padding:8px 12px;font-weight:700;text-align:right">${fmt(order.totalPence)}</td></tr>
      </table>
      <h3 style="margin-bottom:8px">Customer</h3>
      <p style="margin:2px 0">${firstName} ${lastName}</p>
      <p style="margin:2px 0">${email}</p>
      ${phone ? `<p style="margin:2px 0">${phone}</p>` : ""}
      <h3 style="margin-bottom:8px;margin-top:16px">Delivery Address</h3>
      <p style="margin:2px 0">${address1}${address2 ? `, ${address2}` : ""}</p>
      <p style="margin:2px 0">${city}, ${postcode}</p>
      <p style="margin-top:20px;color:#6b7280;font-size:12px">Order ID: ${order.id}</p>
    </div>`;
}

function buildCustomerEmail(order: Order): string {
  const fmt = (p: number) => `£${(p / 100).toFixed(2)}`;
  const itemRows = order.items
    .map((i) => {
      return `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0ede8">${i.name}${orderItemDetailsHtml(i)}</td><td style="padding:6px 12px;border-bottom:1px solid #f0ede8;text-align:right">${fmt(i.unitAmountPence * i.quantity)}</td></tr>`;
    })
    .join("");
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <h2 style="color:#ef8733">Thanks for your order, ${order.customer.firstName}!</h2>
      <p>We've received your order and will begin production shortly. We'll be in touch when it's on its way.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        ${itemRows}
        ${order.postagePence > 0 ? `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0ede8">Postage &amp; Packaging</td><td style="padding:6px 12px;border-bottom:1px solid #f0ede8;text-align:right">${fmt(order.postagePence)}</td></tr>` : ""}
        <tr><td style="padding:8px 12px;font-weight:700">Total paid</td><td style="padding:8px 12px;font-weight:700;text-align:right">${fmt(order.totalPence)}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:12px">Order reference: ${order.id}</p>
    </div>`;
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const sigHeader = req.headers.get("stripe-signature") ?? "";

  if (!verifyStripeSignature(rawBody, sigHeader, webhookSecret)) {
    console.error("[webhook] Signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { type: string; data: { object: StripeSession } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  const meta = session.metadata ?? {};

  // Parse items from metadata
  let rawItems: StripeLineItem[] = [];
  try {
    rawItems = JSON.parse(meta.items_json ?? "[]");
  } catch {
    rawItems = [];
  }

  const POSTAGE_NAME = "Postage & Packaging";
  const postageItem = rawItems.find((i) => i.n === POSTAGE_NAME);
  const fallbackItems: OrderItem[] = rawItems
    .filter((i) => i.n !== POSTAGE_NAME)
    .map((i) => ({ name: i.n, unitAmountPence: i.p, quantity: i.q }));

  // Try to load full items (with customText/artworkUrl) stored at checkout time
  let productItems: OrderItem[] = fallbackItems;
  try {
    const pendingData = await getPendingStripeData(session.id);
    if (pendingData?.items?.length) productItems = pendingData.items;
    await deletePendingStripeData(session.id).catch(() => {});
  } catch { /* non-fatal — use fallback */ }

  const postagePence = postageItem ? postageItem.p : 0;
  const subtotalPence = productItems.reduce((s, i) => s + i.unitAmountPence * i.quantity, 0);
  const totalPence = session.amount_total ?? subtotalPence + postagePence;

  const order: Order = {
    id: session.id,
    createdAt: new Date(session.created * 1000).toISOString(),
    status: "paid",
    customer: {
      email: session.customer_email ?? "",
      firstName: meta.firstName ?? "",
      lastName: meta.lastName ?? "",
      phone: meta.phone ?? "",
      address1: meta.address1 ?? "",
      address2: meta.address2 ?? "",
      city: meta.city ?? "",
      postcode: meta.postcode ?? "",
    },
    items: productItems,
    subtotalPence,
    postagePence,
    totalPence,
  };

  // Save order
  try {
    const orders = await getOrders();
    // Deduplicate — Stripe can send the same event more than once
    if (!orders.find((o) => o.id === order.id)) {
      orders.unshift(order);
      await saveOrders(orders);
    }
  } catch (err) {
    console.error("[webhook] Failed to save order:", err);
  }

  // Send emails
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "orders@resend.dev";

    let ownerEmail = process.env.NOTIFY_EMAIL ?? "";
    if (!ownerEmail) {
      try {
        const settings = await getSettings();
        ownerEmail = settings.email;
      } catch { /* ignore */ }
    }

    const emailJobs: Promise<unknown>[] = [];

    if (ownerEmail) {
      emailJobs.push(
        resend.emails.send({
          from: fromEmail,
          to: ownerEmail,
          subject: `New order — ${order.customer.firstName} ${order.customer.lastName} (£${(totalPence / 100).toFixed(2)})`,
          html: buildOwnerEmail(order),
        }).catch((e) => console.error("[webhook] Owner email failed:", e))
      );
    }

    if (order.customer.email) {
      emailJobs.push(
        resend.emails.send({
          from: fromEmail,
          to: order.customer.email,
          subject: "Your order confirmation — Peel & Party Co.",
          html: buildCustomerEmail(order),
          replyTo: ownerEmail || undefined,
        }).catch((e) => console.error("[webhook] Customer email failed:", e))
      );
    }

    await Promise.all(emailJobs);
  } else {
    console.warn("[webhook] RESEND_API_KEY not set — emails skipped");
  }

  return NextResponse.json({ received: true });
}
