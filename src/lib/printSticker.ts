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

export type StickerElementType = "field" | "text" | "line" | "image" | "emoji" | "qr" | "barcode";
export type StickerSystemField =
  | "tracking" | "customer_name" | "customer_phone" | "customer_city" | "customer_address"
  | "product_name" | "order_value" | "open_package" | "comment" | "created_at" | "order_id";

export interface StickerElement {
  id: string;
  type: StickerElementType;
  label?: string;
  field?: StickerSystemField;
  text?: string;
  imageData?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  fontWeight: number;
  align: "left" | "center" | "right";
  border: boolean;
  radius: number;
  rotation: number;
  visible: boolean;
}

export interface StickerTemplate {
  version: 2;
  sizeMm: number;
  marginMm: number;
  showFrame: boolean;
  elements: StickerElement[];
}

export const stickerSystemFields: { value: StickerSystemField; label: string }[] = [
  { value: "tracking", label: "Numéro suivi" },
  { value: "customer_name", label: "Destinataire" },
  { value: "customer_phone", label: "Téléphone" },
  { value: "customer_city", label: "Ville" },
  { value: "customer_address", label: "Adresse" },
  { value: "product_name", label: "Produit" },
  { value: "order_value", label: "Prix" },
  { value: "open_package", label: "Ouverture colis" },
  { value: "comment", label: "Commentaire" },
  { value: "created_at", label: "Date" },
  { value: "order_id", label: "ID commande" },
];

export const defaultStickerTemplate: StickerTemplate = {
  version: 2,
  sizeMm: 100,
  marginMm: 2,
  showFrame: true,
  elements: [],
};

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c] as string));
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const n = (value: unknown, fallback: number) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export const normalizeStickerTemplate = (raw: unknown): StickerTemplate => {
  const source = (raw && typeof raw === "object" ? raw : {}) as Partial<StickerTemplate> & Record<string, unknown>;
  if (source.version === 2 && Array.isArray(source.elements)) {
    return {
      version: 2,
      sizeMm: clamp(n(source.sizeMm, 100), 40, 120),
      marginMm: clamp(n(source.marginMm, 2), 0, 10),
      showFrame: source.showFrame !== false,
      elements: source.elements.map((el, index) => normalizeElement(el, index)),
    };
  }
  return defaultStickerTemplate;
};

const normalizeElement = (element: Partial<StickerElement>, index: number): StickerElement => ({
  id: String(element.id || `el-${index}-${Date.now()}`),
  type: ["field", "text", "line", "image", "emoji", "qr", "barcode"].includes(String(element.type)) ? element.type as StickerElementType : "text",
  label: element.label || "",
  field: element.field,
  text: element.text || "",
  imageData: element.imageData || "",
  x: clamp(n(element.x, 8), 0, 100),
  y: clamp(n(element.y, 8), 0, 100),
  w: clamp(n(element.w, 30), 1, 100),
  h: clamp(n(element.h, 8), 1, 100),
  fontSize: clamp(n(element.fontSize, 4), 1, 24),
  fontWeight: clamp(n(element.fontWeight, 700), 100, 900),
  align: element.align === "center" || element.align === "right" ? element.align : "left",
  border: Boolean(element.border),
  radius: clamp(n(element.radius, 0), 0, 20),
  rotation: clamp(n(element.rotation, 0), -180, 180),
  visible: element.visible !== false,
});

export const getStickerTemplate = async (): Promise<StickerTemplate> => {
  const { data } = await (supabase as any).from("app_settings").select("value").eq("key", "sticker_template").maybeSingle();
  return normalizeStickerTemplate(data?.value);
};

export const resolveStickerValue = (order: StickerOrder, field?: StickerSystemField) => {
  const tracking = order.external_tracking_number || order.tracking_number || `ODiT-${order.id}`;
  switch (field) {
    case "tracking": return tracking;
    case "customer_name": return order.customer_name;
    case "customer_phone": return order.customer_phone;
    case "customer_city": return order.customer_city;
    case "customer_address": return order.customer_address;
    case "product_name": return order.product_name;
    case "order_value": return `${Number(order.order_value || 0).toFixed(2)} DH`;
    case "open_package": return order.open_package ? "NE PAS OUVRIR" : "AUTORISER D'OUVRIR";
    case "comment": return order.comment || "";
    case "created_at": return new Date(order.created_at || Date.now()).toLocaleString("fr-FR");
    case "order_id": return String(order.id);
    default: return "";
  }
};

const elementCss = (el: StickerElement) => `left:${el.x}mm;top:${el.y}mm;width:${el.w}mm;height:${el.h}mm;font-size:${el.fontSize}mm;font-weight:${el.fontWeight};text-align:${el.align};border:${el.border ? ".35mm solid #111" : "0"};border-radius:${el.radius}mm;transform:rotate(${el.rotation}deg);`;

const stickerStyles = (template: StickerTemplate) => `
@page { size: ${template.sizeMm}mm ${template.sizeMm}mm; margin: ${template.marginMm}mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; margin:0; color:#070707; background:#fff; }
.sticker { position:relative; width:${Math.max(20, template.sizeMm - template.marginMm * 2)}mm; height:${Math.max(20, template.sizeMm - template.marginMm * 2)}mm; page-break-after:always; overflow:hidden; border:${template.showFrame ? ".35mm solid #111" : "0"}; }
.sticker:last-child { page-break-after:auto; }
.el { position:absolute; overflow:hidden; line-height:1.05; word-break:break-word; display:flex; align-items:center; padding:.5mm; transform-origin:center; }
.el.center { justify-content:center; } .el.right { justify-content:flex-end; } .el.left { justify-content:flex-start; }
.el-line { padding:0; border-top:.45mm solid #111 !important; height:0 !important; min-height:0; }
.el-image img, .el-qr img { width:100%; height:100%; object-fit:contain; image-rendering:pixelated; }
.el-barcode { font-family:'Libre Barcode 39', monospace; white-space:nowrap; line-height:.8; }
`;

const renderElement = async (order: StickerOrder, el: StickerElement) => {
  if (!el.visible) return "";
  const tracking = resolveStickerValue(order, "tracking");
  const classes = `el ${el.align} el-${el.type}`;
  if (el.type === "line") return `<div class="${classes} el-line" style="${elementCss(el)}"></div>`;
  if (el.type === "image") return `<div class="${classes}" style="${elementCss(el)}">${el.imageData ? `<img src="${esc(el.imageData)}" alt="logo">` : ""}</div>`;
  if (el.type === "qr") {
    const qr = await QRCode.toDataURL(tracking, { width: 160, margin: 1 });
    return `<div class="${classes}" style="${elementCss(el)}"><img src="${qr}" alt="QR"></div>`;
  }
  if (el.type === "barcode") return `<div class="${classes}" style="${elementCss(el)}">*${esc(tracking)}*</div>`;
  const value = el.type === "field" ? resolveStickerValue(order, el.field) : el.text;
  return `<div class="${classes}" style="${elementCss(el)}">${esc(value)}</div>`;
};

const renderSticker = async (order: StickerOrder, template: StickerTemplate) => {
  const elements = (await Promise.all(template.elements.map((el) => renderElement(order, el)))).join("");
  return `<div class="sticker">${elements}</div>`;
};

const openPrintWindow = (title: string, body: string, template: StickerTemplate) => {
  const win = window.open("", "_blank", "width=620,height=620");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${esc(title)}</title><style>${stickerStyles(template)}</style><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap"></head><body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
  win.document.close();
};

export const printSticker = async (order: StickerOrder) => {
  const template = await getStickerTemplate();
  openPrintWindow(`Sticker ${order.external_tracking_number || order.tracking_number || order.id}`, await renderSticker(order, template), template);
};

export const printStickers = async (orders: StickerOrder[]) => {
  if (!orders.length) return;
  const template = await getStickerTemplate();
  const html = (await Promise.all(orders.map((order) => renderSticker(order, template)))).join("");
  openPrintWindow(`Stickers (${orders.length})`, html, template);
};
