import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";

export interface StickerOrder {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  product_name: string;
  order_value: number;
  open_package: boolean;
  comment?: string | null;
  tracking_number?: string | null;
  external_tracking_number?: string | null;
  created_at?: string | null;
}

type StickerTemplate = Record<string, string | boolean>;

export const defaultStickerTemplate: StickerTemplate = {
  brand_title: "POSTESHIP",
  brand_subtitle: "logistique & e-com service",
  sender_label: "Expéditeur",
  sender_name: "ODiT",
  phone_label: "Tél",
  date_label: "Date",
  recipient_label: "Destinataire",
  city_label: "Ville",
  address_label: "Adresse",
  hub_label: "HUB",
  qr_label: "QR",
  tracking_label: "#NUMERO DE SUIVI",
  product_label: "Produit",
  open_package_allowed: "AUTORISER D'OUVRIR",
  open_package_denied: "NE PAS OUVRIR",
  comment_label: "Commentaire",
  currency: "DH",
  show_border: true,
  show_qr: true,
  show_barcode: true,
};

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c] as string));
const text = (template: StickerTemplate, key: string) => String(template[key] ?? defaultStickerTemplate[key] ?? "");

export const getStickerTemplate = async (): Promise<StickerTemplate> => {
  const { data } = await (supabase as any).from("app_settings").select("value").eq("key", "sticker_template").maybeSingle();
  return { ...defaultStickerTemplate, ...(data?.value ?? {}) };
};

const stickerStyles = `
@page { size: 100mm 150mm; margin: 2mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; margin:0; color:#070707; background:#fff; }
.sticker { width:96mm; min-height:146mm; padding:3mm; page-break-after:always; border:1mm solid #111; }
.sticker:last-child { page-break-after:auto; }
.top { display:grid; grid-template-columns: 1fr auto; gap:4mm; align-items:start; border-bottom:.5mm solid #111; padding-bottom:2.5mm; }
.brand { font-weight:900; font-size:14mm; line-height:.82; letter-spacing:-.4mm; }
.subtitle { font-size:4.7mm; margin-top:1mm; }
.sender { text-align:right; font-size:5mm; line-height:1.35; white-space:nowrap; }
.section { border-bottom:.5mm solid #111; padding:3mm 0; }
.recipient { display:grid; grid-template-columns: 1fr 27mm; gap:3mm; }
.line { font-size:7.2mm; line-height:1.35; }
.line b, .sender b { font-weight:900; }
.hub { align-self:center; text-align:center; font-size:6mm; line-height:1.05; }
.hub b { display:block; font-size:8.2mm; }
.codes { display:grid; grid-template-columns: 26mm 1fr; gap:8mm; align-items:center; }
.qr-title { text-align:center; font-weight:900; font-size:6mm; margin-bottom:1.5mm; }
.qr-box { width:25mm; height:25mm; border:.55mm solid #111; display:flex; align-items:center; justify-content:center; }
.qr-box img { width:18mm; height:18mm; image-rendering:pixelated; }
.track-label { text-align:center; font-size:4.6mm; margin-bottom:2mm; }
.barcode { text-align:center; font-family:'Libre Barcode 39', monospace; font-size:18mm; line-height:.8; }
.track { text-align:center; font-weight:900; font-size:8mm; letter-spacing:.3mm; }
.product { font-size:6.5mm; padding-top:4mm; }
.bottom { display:grid; grid-template-columns: 1fr 39mm; gap:5mm; align-items:start; padding-top:7mm; }
.open { display:inline-flex; min-width:25mm; min-height:13mm; border:.5mm solid #111; align-items:center; justify-content:center; padding:1mm 2mm; font-size:3.3mm; text-align:center; margin:3mm 0 4mm; }
.comment { font-size:5.3mm; }
.price { border:.8mm solid #111; font-weight:900; font-size:10.5mm; text-align:center; padding:3mm 2mm; white-space:nowrap; }
`;

const renderSticker = async (o: StickerOrder, template: StickerTemplate) => {
  const tracking = o.external_tracking_number || o.tracking_number || `ODiT-${o.id}`;
  const qr = await QRCode.toDataURL(tracking, { width: 120, margin: 1 });
  const stickerDate = new Date(o.created_at || Date.now()).toLocaleString("fr-FR");
  return `<div class="sticker">
    <div class="top"><div><div class="brand">${esc(text(template, "brand_title"))}</div><div class="subtitle">${esc(text(template, "brand_subtitle"))}</div></div><div class="sender"><b>${esc(text(template, "sender_label"))}:</b> ${esc(text(template, "sender_name"))}<br><b>${esc(text(template, "phone_label"))}:</b> ${esc(o.customer_phone)}<br><b>${esc(text(template, "date_label"))}:</b> ${esc(stickerDate)}</div></div>
    <div class="section recipient"><div><div class="line"><b>${esc(text(template, "recipient_label"))}:</b> ${esc(o.customer_name)}</div><div class="line"><b>${esc(text(template, "phone_label"))}:</b> ${esc(o.customer_phone)}</div><div class="line"><b>${esc(text(template, "city_label"))}:</b> ${esc(o.customer_city)}</div><div class="line"><b>${esc(text(template, "address_label"))}:</b> ${esc(o.customer_address)}</div></div><div class="hub">${esc(text(template, "hub_label"))}<b>${esc(o.customer_city.split(" ").slice(-1)[0] || o.customer_city)}</b></div></div>
    <div class="section codes"><div><div class="qr-title">${esc(text(template, "qr_label"))}</div><div class="qr-box">${template.show_qr === false ? "" : `<img src="${qr}" alt="QR">`}</div></div><div><div class="track-label">${esc(text(template, "tracking_label"))}</div>${template.show_barcode === false ? "" : `<div class="barcode">*${esc(tracking)}*</div>`}<div class="track">#${esc(tracking)}</div></div></div>
    <div class="product"><b>${esc(text(template, "product_label"))}:</b> ${esc(o.product_name)}</div>
    <div class="bottom"><div><div class="open">${esc(text(template, o.open_package ? "open_package_denied" : "open_package_allowed"))}</div><div class="comment">${esc(text(template, "comment_label"))}: ${esc(o.comment || "")}</div></div><div class="price">${Number(o.order_value).toFixed(2)} ${esc(text(template, "currency"))}</div></div>
  </div>`;
};

const openPrintWindow = (title: string, body: string) => {
  const win = window.open("", "_blank", "width=520,height=780");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${esc(title)}</title><style>${stickerStyles}</style><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap"></head><body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
  win.document.close();
};

export const printSticker = async (o: StickerOrder) => {
  const template = await getStickerTemplate();
  openPrintWindow(`Sticker ${o.external_tracking_number || o.tracking_number || o.id}`, await renderSticker(o, template));
};

export const printStickers = async (orders: StickerOrder[]) => {
  if (!orders.length) return;
  const template = await getStickerTemplate();
  const html = (await Promise.all(orders.map((order) => renderSticker(order, template)))).join("");
  openPrintWindow(`Stickers (${orders.length})`, html);
};