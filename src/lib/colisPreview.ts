export type ColisPreviewLocation = "main" | "details" | "timeline";

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
] as const;

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
    fields: fields(["order_value", "customer_city", "comment", "status_note", "postponed_date", "scheduled_date", "livreur", "support", "tracking"], "secondary"),
    useCustomHtml: false,
    html: `<div class="details-grid"><div>{{order_value}}</div><div>{{customer_city}}</div><div>{{tracking}}</div></div>`,
    css: `.details-grid{display:grid;gap:8px;grid-template-columns:repeat(3,minmax(0,1fr))}`,
  },
  timeline: {
    title: "Activity chronology",
    fields: fields(["history_status", "history_message", "status_note", "postponed_date", "scheduled_date", "history_actor", "history_date"], "secondary"),
    useCustomHtml: false,
    html: `<div class="activity-item"><strong>{{history_status}}</strong><span>{{history_message}}</span><small>{{history_actor}} · {{history_date}}</small></div>`,
    css: `.activity-item{display:flex;flex-direction:column;gap:4px}.activity-item strong{font-weight:800}`,
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
    };
    return acc;
  }, {} as ColisPreviewSettings);
};

export const sortedVisibleFields = (section: ColisPreviewSection, slot?: ColisPreviewField["slot"]) =>
  section.fields.filter((field) => field.visible && (!slot || field.slot === slot)).sort((a, b) => a.position - b.position);

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