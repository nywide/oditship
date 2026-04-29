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

type StickerTemplate = Record<string, string | boolean | number>;

type StickerElementKey =
  | "brand" | "sender" | "recipient" | "phone" | "city" | "address" | "qr" | "tracking" | "barcode" | "product" | "open" | "comment" | "price" | "date";

const stickerElements: StickerElementKey[] = ["brand", "sender", "recipient", "phone", "city", "address", "qr", "tracking", "barcode", "product", "open", "comment", "price", "date"];

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
  size_mm: 100,
  margin_mm: 2,
  border_mm: 0.45,
  font_scale: 1,
  brand_x: 4, brand_y: 4, brand_w: 45, brand_h: 14, brand_font: 8.8,
  sender_x: 52, sender_y: 4, sender_w: 44, sender_h: 14, sender_font: 3.1,
  recipient_x: 4, recipient_y: 22, recipient_w: 58, recipient_h: 8, recipient_font: 4.2,
  phone_x: 64, phone_y: 22, phone_w: 32, phone_h: 8, phone_font: 4,
  city_x: 4, city_y: 32, city_w: 40, city_h: 9, city_font: 4.2,
  address_x: 4, address_y: 43, address_w: 92, address_h: 15, address_font: 3.7,
  qr_x: 4, qr_y: 61, qr_w: 24, qr_h: 24, qr_font: 3,
  tracking_x: 31, tracking_y: 61, tracking_w: 65, tracking_h: 8, tracking_font: 4.4,
  barcode_x: 31, barcode_y: 70, barcode_w: 65, barcode_h: 13, barcode_font: 13,
  product_x: 4, product_y: 86, product_w: 50, product_h: 8, product_font: 3.7,
  open_x: 56, open_y: 86, open_w: 20, open_h: 8, open_font: 2.5,
  comment_x: 4, comment_y: 94, comment_w: 58, comment_h: 5, comment_font: 2.8,
  price_x: 76, price_y: 86, price_w: 20, price_h: 12, price_font: 5,
  date_x: 64, date_y: 32, date_w: 32, date_h: 8, date_font: 3.1,
};

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c] as string));
const text = (template: StickerTemplate, key: string) => String(template[key] ?? defaultStickerTemplate[key] ?? "");
const num = (template: StickerTemplate, key: string, fallback = 0) => {
  const value = Number(template[key] ?? defaultStickerTemplate[key] ?? fallback);
  return Number.isFinite(value) ? value : fallback;
};

export const getStickerTemplate = async (): Promise<StickerTemplate> => {
  const { data } = await (supabase as any).from("app_settings").select("value").eq("key", "sticker_template").maybeSingle();
  return { ...defaultStickerTemplate, ...(data?.value ?? {}) };
};

const stickerStyles = (template: StickerTemplate) => {
  const size = num(template, "size_mm", 100);
  const margin = num(template, "margin_mm", 2);
  const printable = Math.max(20, size - margin * 2);
  const border = template.show_border === false ? 0 : num(template, "border_mm", 0.45);
  return `
@page { size: ${size}mm ${size}mm; margin: ${margin}mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; margin:0; color:#070707; background:#fff; }
.sticker { position:relative; width:${printable}mm; height:${printable}mm; page-break-after:always; overflow:hidden; border:${border}mm solid #111; }
.sticker:last-child { page-break-after:auto; }
.field { position:absolute; overflow:hidden; line-height:1.08; word-break:break-word; }
.label { font-weight:900; }
.brand { font-weight:900; letter-spacing:0; line-height:.88; }
.brand small { display:block; font-size:45%; font-weight:700; margin-top:.7mm; }
.sender { text-align:right; white-space:normal; }
.box { border:.35mm solid #111; display:flex; align-items:center; justify-content:center; padding:.8mm; }
.qr img { width:100%; height:100%; image-rendering:pixelated; }
.tracking { text-align:center; font-weight:900; white-space:nowrap; }
.barcode { text-align:center; font-family:'Libre Barcode 39', monospace; line-height:.8; white-space:nowrap; }
.price { border:.55mm solid #111; font-weight:900; display:flex; align-items:center; justify-content:center; text-align:center; }
`;
};

const elementStyle = (template: StickerTemplate, key: StickerElementKey) => {
  const scale = num(template, "font_scale", 1);
  return `left:${num(template, `${key}_x`)}mm;top:${num(template, `${key}_y`)}mm;width:${num(template, `${key}_w`)}mm;height:${num(template, `${key}_h`)}mm;font-size:${num(template, `${key}_font`) * scale}mm;`;
};

const renderSticker = async (o: StickerOrder, template: StickerTemplate) => {
  const tracking = o.external_tracking_number || o.tracking_number || `ODiT-${o.id}`;
  const qr = await QRCode.toDataURL(tracking, { width: 120, margin: 1 });
  const stickerDate = new Date(o.created_at || Date.now()).toLocaleString("fr-FR");
  return `<div class="sticker">
    <div class="field brand" style="${elementStyle(template, "brand")}">${esc(text(template, "brand_title"))}<small>${esc(text(template, "brand_subtitle"))}</small></div>
    <div class="field sender" style="${elementStyle(template, "sender")}"><span class="label">${esc(text(template, "sender_label"))}:</span> ${esc(text(template, "sender_name"))}<br><span class="label">${esc(text(template, "phone_label"))}:</span> ${esc(o.customer_phone)}</div>
    <div class="field" style="${elementStyle(template, "recipient")}"><span class="label">${esc(text(template, "recipient_label"))}:</span> ${esc(o.customer_name)}</div>
    <div class="field" style="${elementStyle(template, "phone")}"><span class="label">${esc(text(template, "phone_label"))}:</span> ${esc(o.customer_phone)}</div>
    <div class="field" style="${elementStyle(template, "city")}"><span class="label">${esc(text(template, "city_label"))}:</span> ${esc(o.customer_city)}</div>
    <div class="field" style="${elementStyle(template, "date")}"><span class="label">${esc(text(template, "date_label"))}:</span> ${esc(stickerDate)}</div>
    <div class="field" style="${elementStyle(template, "address")}"><span class="label">${esc(text(template, "address_label"))}:</span> ${esc(o.customer_address)}</div>
    <div class="field box qr" style="${elementStyle(template, "qr")}">${template.show_qr === false ? esc(text(template, "qr_label")) : `<img src="${qr}" alt="QR">`}</div>
    <div class="field tracking" style="${elementStyle(template, "tracking")}">${esc(text(template, "tracking_label"))}<br>#${esc(tracking)}</div>
    ${template.show_barcode === false ? "" : `<div class="field barcode" style="${elementStyle(template, "barcode")}">*${esc(tracking)}*</div>`}
    <div class="field" style="${elementStyle(template, "product")}"><span class="label">${esc(text(template, "product_label"))}:</span> ${esc(o.product_name)}</div>
    <div class="field box" style="${elementStyle(template, "open")}">${esc(text(template, o.open_package ? "open_package_denied" : "open_package_allowed"))}</div>
    <div class="field" style="${elementStyle(template, "comment")}"><span class="label">${esc(text(template, "comment_label"))}:</span> ${esc(o.comment || "")}</div>
    <div class="field price" style="${elementStyle(template, "price")}">${Number(o.order_value).toFixed(2)} ${esc(text(template, "currency"))}</div>
  </div>`;
};

const openPrintWindow = (title: string, body: string, template: StickerTemplate) => {
  const win = window.open("", "_blank", "width=620,height=620");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${esc(title)}</title><style>${stickerStyles(template)}</style><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap"></head><body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
  win.document.close();
};

export const printSticker = async (o: StickerOrder) => {
  const template = await getStickerTemplate();
  openPrintWindow(`Sticker ${o.external_tracking_number || o.tracking_number || o.id}`, await renderSticker(o, template), template);
};

export const printStickers = async (orders: StickerOrder[]) => {
  if (!orders.length) return;
  const template = await getStickerTemplate();
  const html = (await Promise.all(orders.map((order) => renderSticker(order, template)))).join("");
  openPrintWindow(`Stickers (${orders.length})`, html, template);
};

export { stickerElements, type StickerElementKey, type StickerTemplate };