import type { CSSProperties } from "react";

export type ColisPreviewLocation = "main" | "details" | "timeline" | "actions" | "invoice" | "courier" | "support" | "qr";

export interface ColisPreviewField {
  key: string;
  label: string;
  visible: boolean;
  position: number;
  slot: "primary" | "secondary" | "meta";
}

export interface ColisPreviewSection {
  title: string;
  fields: ColisPreviewField[];
  useCustomHtml: boolean;
  html: string;
  css: string;
  layout: "stack" | "inline" | "grid";
  backgroundSource: "none" | "status" | "city" | "seller" | "courier" | "support" | "tracking";
  icon: "package" | "truck" | "bike" | "invoice" | "support" | "qr" | "map" | "user" | "none";
  buttonPlacement: "right" | "left" | "bottom" | "hidden";
  qrPlacement: "right" | "left" | "top" | "bottom" | "hidden";
  style: {
    background: string;
    foreground: string;
    accent: string;
    border: string;
    radius: number;
    padding: number;
    gap: number;
  };
}

export type ColisPreviewSettings = Record<ColisPreviewLocation, ColisPreviewSection>;

export const COLIS_PREVIEW_SETTING_KEY = "colis_preview_settings";

export const colisPreviewFieldOptions = [
  { key: "customer_name", label: "Client" },
  { key: "customer_phone", label: "Phone" },
  { key: "customer_city", label: "City" },
  { key: "customer_address", label: "Address" },
  { key: "product_name", label: "Product" },
  { key: "order_value", label: "Amount" },
  { key: "status", label: "Status" },
  { key: "tracking", label: "Tracking" },
  { key: "external_tracking_number", label: "External tracking" },
  { key: "comment", label: "Comment" },
  { key: "status_note", label: "Note" },
  { key: "postponed_date", label: "Date Reporté" },
  { key: "scheduled_date", label: "Date Programmé" },
  { key: "created_at", label: "Created at" },
  { key: "vendeur", label: "Seller" },
  { key: "livreur", label: "Driver" },
  { key: "support", label: "Support" },
  { key: "history_status", label: "Activity status" },
  { key: "history_message", label: "Activity message" },
  { key: "history_actor", label: "Activity actor" },
  { key: "history_date", label: "Activity date" },
  { key: "invoice_label", label: "Invoice label" },
  { key: "invoice_status", label: "Invoice status" },
  { key: "courier_name", label: "Courier name" },
  { key: "courier_phone", label: "Courier phone" },
  { key: "support_name", label: "Support name" },
  { key: "support_phone", label: "Support phone" },
  { key: "qr_value", label: "QR value" },
] as const;

const baseStyle = {
  layout: "stack" as const,
  backgroundSource: "none" as const,
  icon: "package" as const,
  buttonPlacement: "right" as const,
  qrPlacement: "right" as const,
  style: {
    background: "hsl(var(--card))",
    foreground: "hsl(var(--foreground))",
    accent: "hsl(var(--primary))",
    border: "hsl(var(--border))",
    radius: 8,
    padding: 12,
    gap: 8,
  },
};

const fields = (keys: string[], slot: ColisPreviewField["slot"] = "secondary") => keys.map((key, index) => ({
  key,
  label: colisPreviewFieldOptions.find((field) => field.key === key)?.label ?? key,
  visible: true,
  position: index + 1,
  slot,
}));

export const defaultColisPreviewSettings: ColisPreviewSettings = {
  main: {
    title: "Main order row",
    ...baseStyle,
    fields: [
      ...fields(["customer_name"], "primary"),
      ...fields(["product_name", "customer_phone", "customer_city", "order_value", "status", "tracking"], "secondary"),
      ...fields(["status_note", "postponed_date", "scheduled_date"], "meta"),
    ],
    useCustomHtml: false,
    html: `<div class="order-main"><strong>{{customer_name}}</strong><span>{{product_name}}</span><small>{{customer_phone}} · {{customer_city}} · {{tracking}}</small></div>`,
    css: `.order-main{display:flex;flex-direction:column;gap:2px}.order-main strong{font-weight:800}.order-main small{opacity:.72}`,
  },
  details: {
    title: "Order details",
    ...baseStyle,
    fields: fields(["order_value", "customer_city", "comment", "status_note", "postponed_date", "scheduled_date", "livreur", "support", "tracking"], "secondary"),
    useCustomHtml: false,
    html: `<div class="details-grid"><div>{{order_value}}</div><div>{{customer_city}}</div><div>{{tracking}}</div></div>`,
    css: `.details-grid{display:grid;gap:8px;grid-template-columns:repeat(3,minmax(0,1fr))}`,
  },
  timeline: {
    title: "Activity chronology",
    ...baseStyle,
    icon: "truck",
    fields: fields(["history_status", "history_message", "status_note", "postponed_date", "scheduled_date", "history_actor", "history_date"], "secondary"),
    useCustomHtml: false,
    html: `<div class="activity-item"><strong>{{history_status}}</strong><span>{{history_message}}</span><small>{{history_actor}} · {{history_date}}</small></div>`,
    css: `.activity-item{display:flex;flex-direction:column;gap:4px}.activity-item strong{font-weight:800}`,
  },
  actions: {
    title: "Actions area",
    ...baseStyle,
    icon: "package",
    buttonPlacement: "right",
    fields: fields(["invoice_label", "invoice_status", "courier_name", "courier_phone", "support_name", "support_phone"], "secondary"),
    useCustomHtml: false,
    html: `<div class="actions-box"><strong>{{invoice_label}}</strong><span>{{invoice_status}}</span><small>{{courier_name}} · {{support_name}}</small></div>`,
    css: `.actions-box{display:flex;flex-direction:column;gap:4px}`,
  },
  invoice: {
    title: "Invoice block",
    ...baseStyle,
    icon: "invoice",
    fields: fields(["invoice_label", "invoice_status", "order_value", "tracking"], "secondary"),
    useCustomHtml: false,
    html: `<div class="invoice-box"><strong>{{invoice_label}}</strong><span>{{invoice_status}}</span><small>{{order_value}} · {{tracking}}</small></div>`,
    css: `.invoice-box{display:flex;flex-direction:column;gap:4px}`,
  },
  courier: {
    title: "Courier info",
    ...baseStyle,
    icon: "bike",
    fields: fields(["courier_name", "courier_phone", "livreur", "status"], "secondary"),
    useCustomHtml: false,
    html: `<div class="courier-box"><strong>{{courier_name}}</strong><span>{{courier_phone}}</span><small>{{status}}</small></div>`,
    css: `.courier-box{display:flex;flex-direction:column;gap:4px}`,
  },
  support: {
    title: "Support info",
    ...baseStyle,
    icon: "support",
    fields: fields(["support_name", "support_phone", "support"], "secondary"),
    useCustomHtml: false,
    html: `<div class="support-box"><strong>{{support_name}}</strong><span>{{support_phone}}</span></div>`,
    css: `.support-box{display:flex;flex-direction:column;gap:4px}`,
  },
  qr: {
    title: "QR block",
    ...baseStyle,
    icon: "qr",
    qrPlacement: "right",
    fields: fields(["qr_value", "tracking", "external_tracking_number"], "secondary"),
    useCustomHtml: false,
    html: `<div class="qr-box"><strong>{{qr_value}}</strong><small>{{tracking}}</small></div>`,
    css: `.qr-box{display:flex;flex-direction:column;gap:4px;align-items:center}`,
  },
};

export const normalizeColisPreviewSettings = (value: unknown): ColisPreviewSettings => {
  const input = (value && typeof value === "object" ? value : {}) as Partial<ColisPreviewSettings>;
  return (Object.keys(defaultColisPreviewSettings) as ColisPreviewLocation[]).reduce((acc, key) => {
    const defaults = defaultColisPreviewSettings[key];
    const current = input[key] ?? defaults;
    const currentFields = Array.isArray(current.fields) ? current.fields : [];
    acc[key] = {
      ...defaults,
      ...current,
      fields: defaults.fields.map((field) => ({ ...field, ...(currentFields.find((item) => item.key === field.key) ?? {}) })),
      useCustomHtml: Boolean(current.useCustomHtml),
      html: typeof current.html === "string" ? current.html : defaults.html,
      css: typeof current.css === "string" ? current.css : defaults.css,
      layout: ["stack", "inline", "grid"].includes(String(current.layout)) ? current.layout : defaults.layout,
      backgroundSource: ["none", "status", "city", "seller", "courier", "support", "tracking"].includes(String(current.backgroundSource)) ? current.backgroundSource : defaults.backgroundSource,
      icon: ["package", "truck", "bike", "invoice", "support", "qr", "map", "user", "none"].includes(String(current.icon)) ? current.icon : defaults.icon,
      buttonPlacement: ["right", "left", "bottom", "hidden"].includes(String(current.buttonPlacement)) ? current.buttonPlacement : defaults.buttonPlacement,
      qrPlacement: ["right", "left", "top", "bottom", "hidden"].includes(String(current.qrPlacement)) ? current.qrPlacement : defaults.qrPlacement,
      style: { ...defaults.style, ...(current.style && typeof current.style === "object" ? current.style : {}) },
    };
    return acc;
  }, {} as ColisPreviewSettings);
};

export const sortedVisibleFields = (section: ColisPreviewSection, slot?: ColisPreviewField["slot"]) =>
  section.fields.filter((field) => field.visible && (!slot || field.slot === slot)).sort((a, b) => a.position - b.position);

export const backgroundValue = (section: ColisPreviewSection, data: Record<string, unknown>) => {
  const source = section.backgroundSource === "seller" ? "vendeur" : section.backgroundSource === "courier" ? "courier_name" : section.backgroundSource;
  return section.backgroundSource === "none" ? "" : getColisPreviewValue(data, source);
};

export const colisSectionStyle = (section: ColisPreviewSection, data: Record<string, unknown>): CSSProperties => {
  const bgSource = backgroundValue(section, data);
  return {
    background: bgSource ? `linear-gradient(135deg, ${section.style.background}, hsl(var(--muted)))` : section.style.background,
    color: section.style.foreground,
    borderColor: section.style.border,
    borderRadius: section.style.radius,
    padding: section.style.padding,
    gap: section.style.gap,
  };
};

export const formatPreviewDate = (value?: string | null) => value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "";

export const getColisPreviewValue = (data: Record<string, unknown>, key: string) => {
  const value = data[key];
  if (value === undefined || value === null || value === "") return "";
  if (key.includes("date") || key === "created_at" || key === "history_date") return formatPreviewDate(String(value));
  if (key === "order_value") return `${Number(value).toFixed(2)} MAD`;
  return String(value);
};

export const renderColisTemplate = (template: string, data: Record<string, unknown>) =>
  template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => getColisPreviewValue(data, key));

export const sanitizeColisHtml = (value: string) => value
  .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
  .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");