/**
 * Canvas templates for orders display.
 * Two editable HTML/CSS surfaces:
 *   - mainRow: the order row "client" cell rendered in lists.
 *   - details: the LEFT card of the open-details panel.
 *
 * The activity timeline stays as a React component (right card).
 */

export type ColisCanvasSurface = "mainRow" | "details";

export interface ColisCanvasTemplate {
  html: string;
  css: string;
}

export type ColisCanvasSettings = Record<ColisCanvasSurface, ColisCanvasTemplate>;

export const COLIS_CANVAS_SETTING_KEY = "colis_canvas_templates";

/* ---------- Defaults: modern, refined design ---------- */

export const defaultMainRowTemplate: ColisCanvasTemplate = {
  html: `
<div class="row">
  <div class="avatar">{{customer_initials}}</div>
  <div class="info">
    <div class="line1">
      <span class="name">{{customer_name}}</span>
      <span class="dot">·</span>
      <span class="product">{{product_name}}</span>
    </div>
    <div class="line2">
      <span class="chip">📞 {{customer_phone}}</span>
      <span class="chip">📍 {{customer_city}}</span>
      <span class="chip mono">{{tracking}}</span>
    </div>
  </div>
</div>`.trim(),
  css: `
.row{display:flex;align-items:center;gap:12px;padding:2px 0}
.avatar{flex:0 0 36px;height:36px;border-radius:50%;background:linear-gradient(135deg,hsl(var(--primary))/.15,hsl(var(--accent))/.15);color:hsl(var(--primary));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;letter-spacing:.5px;border:1px solid hsl(var(--border))}
.info{min-width:0;display:flex;flex-direction:column;gap:4px}
.line1{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:14px}
.name{font-weight:700;color:hsl(var(--foreground))}
.dot{color:hsl(var(--muted-foreground));opacity:.6}
.product{color:hsl(var(--muted-foreground));font-weight:500}
.line2{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;background:hsl(var(--muted));color:hsl(var(--muted-foreground));font-size:11px;font-weight:500}
.chip.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:hsl(var(--accent))/.10;color:hsl(var(--accent));font-weight:600}
`.trim(),
};

export const defaultDetailsTemplate: ColisCanvasTemplate = {
  html: `
<div class="card">
  <header class="hero">
    <div class="hero-left">
      <h3 class="customer">{{customer_name}}</h3>
      <p class="sub">{{customer_phone}} · {{product_name}}</p>
      <p class="addr">📍 {{customer_address}} — {{customer_city}}</p>
    </div>
    <div class="hero-right">
      <span class="status">{{status}}</span>
      <span class="track">{{tracking}}</span>
    </div>
  </header>

  <section class="grid">
    <div class="stat">
      <span class="stat-label">Montant</span>
      <span class="stat-value">{{order_value_formatted}}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Destination</span>
      <span class="stat-value">{{customer_city}}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Créée le</span>
      <span class="stat-value">{{created_at_formatted}}</span>
    </div>
  </section>

  {{#if comment}}<p class="note">💬 {{comment}}</p>{{/if}}
  {{#if status_note}}<p class="note alt">📝 {{status_note}}</p>{{/if}}

  <section class="qr-block">
    <img class="qr" src="{{qr_image_src}}" alt="QR" />
    <span class="qr-text">{{tracking}}</span>
  </section>

  <section class="actions">
    <div class="action">
      <div class="action-icon icon-invoice">📄</div>
      <div class="action-body">
        <span class="action-title">Facture client</span>
        <span class="action-sub">Disponible après la fin du trajet</span>
      </div>
      <span class="action-cta muted">Bientôt</span>
    </div>

    <a class="action {{livreur_class}}" href="{{livreur_href}}">
      <div class="action-icon icon-bike">🛵</div>
      <div class="action-body">
        <span class="action-title">{{livreur_name_or_label}}</span>
        <span class="action-sub">Livreur assigné</span>
      </div>
      <span class="action-cta">{{livreur_phone}}</span>
    </a>

    <a class="action {{support_class}}" href="{{support_href}}">
      <div class="action-icon icon-support">🎧</div>
      <div class="action-body">
        <span class="action-title">{{support_name}}</span>
        <span class="action-sub">Assistance</span>
      </div>
      <span class="action-cta">{{support_phone}}</span>
    </a>
  </section>
</div>`.trim(),
  css: `
.card{display:flex;flex-direction:column;gap:18px;padding:20px;border-radius:16px;background:hsl(var(--card));border:1px solid hsl(var(--border));box-shadow:0 1px 0 hsl(var(--border))}
.hero{display:flex;justify-content:space-between;gap:16px;padding-bottom:16px;border-bottom:1px solid hsl(var(--border))}
.hero-left{min-width:0;flex:1}
.customer{margin:0 0 4px;font-size:20px;font-weight:800;letter-spacing:-.01em;color:hsl(var(--foreground))}
.sub{margin:0;font-size:13px;font-weight:600;color:hsl(var(--foreground))/.85}
.addr{margin:6px 0 0;font-size:12px;color:hsl(var(--muted-foreground))}
.hero-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}
.status{padding:4px 12px;border-radius:999px;background:hsl(var(--primary));color:hsl(var(--primary-foreground));font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.track{padding:3px 10px;border-radius:999px;background:hsl(var(--accent))/.12;color:hsl(var(--accent));font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;font-weight:700}

.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.stat{display:flex;flex-direction:column;gap:2px;padding:12px 14px;border:1px solid hsl(var(--border));border-radius:12px;background:linear-gradient(180deg,hsl(var(--muted))/.4,transparent)}
.stat-label{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:hsl(var(--muted-foreground));font-weight:600}
.stat-value{font-size:15px;font-weight:700;color:hsl(var(--foreground))}

.note{margin:0;padding:10px 14px;border-radius:10px;background:hsl(var(--muted));font-size:13px;color:hsl(var(--foreground))/.9;border-left:3px solid hsl(var(--primary))}
.note.alt{border-left-color:hsl(var(--accent))}

.qr-block{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px;border-radius:12px;background:hsl(var(--muted))/.3;border:1px dashed hsl(var(--border))}
.qr{width:140px;height:140px;border-radius:8px;background:#fff;padding:6px}
.qr-text{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:hsl(var(--muted-foreground));font-weight:600}

.actions{display:flex;flex-direction:column;gap:8px}
.action{display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;border:1px solid hsl(var(--border));background:hsl(var(--card));text-decoration:none;transition:transform .12s ease,border-color .12s ease}
.action:hover{transform:translateY(-1px);border-color:hsl(var(--primary))/.4}
.action.disabled{pointer-events:none;opacity:.7}
.action-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.icon-invoice{background:hsl(var(--primary))/.10}
.icon-bike{background:hsl(var(--accent))/.12}
.icon-support{background:hsl(var(--muted))}
.action-body{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1}
.action-title{font-size:13px;font-weight:700;color:hsl(var(--foreground));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.action-sub{font-size:11px;color:hsl(var(--muted-foreground))}
.action-cta{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;font-weight:700;color:hsl(var(--primary));white-space:nowrap}
.action-cta.muted{color:hsl(var(--muted-foreground));font-weight:500;font-size:12px}
`.trim(),
};

export const defaultColisCanvasSettings: ColisCanvasSettings = {
  mainRow: defaultMainRowTemplate,
  details: defaultDetailsTemplate,
};

export const normalizeColisCanvasSettings = (value: unknown): ColisCanvasSettings => {
  const v = (value && typeof value === "object" ? value : {}) as Partial<ColisCanvasSettings>;
  return {
    mainRow: {
      html: typeof v.mainRow?.html === "string" ? v.mainRow!.html : defaultMainRowTemplate.html,
      css: typeof v.mainRow?.css === "string" ? v.mainRow!.css : defaultMainRowTemplate.css,
    },
    details: {
      html: typeof v.details?.html === "string" ? v.details!.html : defaultDetailsTemplate.html,
      css: typeof v.details?.css === "string" ? v.details!.css : defaultDetailsTemplate.css,
    },
  };
};

/* ---------- Interpolation ---------- */

export const sanitizeCanvasHtml = (value: string) =>
  value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");

const formatDateFr = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "";

export const initials = (name?: string | null) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

/** Replace `{{#if key}}...{{/if}}` blocks based on truthiness of `data[key]`. */
const applyConditionals = (template: string, data: Record<string, unknown>) =>
  template.replace(
    /{{#if\s+([a-zA-Z0-9_]+)\s*}}([\s\S]*?){{\/if\s*}}/g,
    (_match, key: string, body: string) => {
      const value = data[key];
      const truthy = value !== undefined && value !== null && value !== "" && value !== false;
      return truthy ? body : "";
    }
  );

/** Replace `{{key}}` placeholders. Unknown keys → empty string. */
export const renderCanvasTemplate = (template: string, data: Record<string, unknown>) => {
  const conditioned = applyConditionals(template, data);
  return conditioned.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key: string) => {
    const value = data[key];
    if (value === undefined || value === null) return "";
    return String(value);
  });
};

/* ---------- Data builders ---------- */

export interface MainRowSource {
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  customer_address?: string;
  product_name: string;
  order_value: number;
  status: string;
  tracking_number?: string | null;
  external_tracking_number?: string | null;
  id: number | string;
}

export const buildMainRowData = (o: MainRowSource): Record<string, unknown> => {
  const tracking = o.external_tracking_number || o.tracking_number || `ODiT-${o.id}`;
  return {
    ...o,
    tracking,
    customer_initials: initials(o.customer_name),
    order_value_formatted: `${Number(o.order_value).toFixed(2)} MAD`,
  };
};

export interface DetailsSource extends MainRowSource {
  comment?: string | null;
  status_note?: string | null;
  postponed_date?: string | null;
  scheduled_date?: string | null;
  created_at: string;
}

export interface DetailsContext {
  qr_image_src: string;
  livreur_name?: string | null;
  livreur_phone?: string | null;
  support_name?: string | null;
  support_phone?: string | null;
}

export const buildDetailsData = (o: DetailsSource, ctx: DetailsContext): Record<string, unknown> => {
  const tracking = o.external_tracking_number || o.tracking_number || `ODiT-${o.id}`;
  const livreurName = ctx.livreur_name?.trim() || "";
  const livreurPhone = ctx.livreur_phone?.trim() || "";
  const supportName = ctx.support_name?.trim() || "Support ODiT";
  const supportPhone = ctx.support_phone?.trim() || "";
  return {
    ...o,
    tracking,
    customer_initials: initials(o.customer_name),
    order_value_formatted: `${Number(o.order_value).toFixed(2)} MAD`,
    created_at_formatted: formatDateFr(o.created_at),
    qr_image_src: ctx.qr_image_src,
    livreur_name: livreurName,
    livreur_phone: livreurPhone,
    livreur_name_or_label: livreurName || "Disponible après transit",
    livreur_class: livreurPhone ? "" : "disabled",
    livreur_href: livreurPhone ? `tel:${livreurPhone}` : "#",
    support_name: supportName,
    support_phone: supportPhone,
    support_class: supportPhone ? "" : "disabled",
    support_href: supportPhone ? `tel:${supportPhone}` : "#",
  };
};

/* ---------- Sample data for admin live preview ---------- */

export const canvasSampleOrder: DetailsSource = {
  id: 1234,
  customer_name: "Mohamed Timlalin",
  customer_phone: "0766535089",
  customer_city: "Errachidia",
  customer_address: "Azmour Ljadida",
  product_name: "ASN Premium",
  order_value: 150,
  status: "transit",
  tracking_number: "KM706ACCB52680",
  external_tracking_number: "KM706ACCB52680",
  comment: "Fragile, livrer après 18h",
  status_note: null,
  created_at: new Date().toISOString(),
};
