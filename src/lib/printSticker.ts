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
}

const stickerStyles = `
@page { size: 100mm 150mm; margin: 4mm; }
* { box-sizing: border-box; }
body { font-family: Inter, system-ui, sans-serif; margin:0; padding: 0; color: #111; }
.sticker { padding: 8px; page-break-after: always; }
.sticker:last-child { page-break-after: auto; }
.header { display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #000; padding-bottom: 6px; }
.brand { font-weight: 800; font-size: 18px; }
.tracking { font-family: 'Courier New', monospace; font-weight: 700; font-size: 14px; }
h2 { margin: 8px 0 4px; font-size: 13px; text-transform: uppercase; color: #555; letter-spacing: .5px; }
.row { font-size: 14px; margin: 2px 0; }
.big { font-size: 18px; font-weight: 700; }
.barcode { font-family: 'Libre Barcode 39', monospace; font-size: 56px; text-align: center; letter-spacing: 2px; }
.footer { margin-top: 8px; padding-top: 6px; border-top: 1px dashed #999; font-size: 11px; color: #666; display:flex; justify-content:space-between; }
.badge { display:inline-block; padding:2px 6px; border:1px solid #000; border-radius: 3px; font-size: 11px; font-weight:700; }
`;

const stickerHtml = (o: StickerOrder): string => {
  const tracking = o.external_tracking_number || o.tracking_number || `ODiT-${o.id}`;
  return `<div class="sticker">
    <div class="header">
      <div class="brand">ODiT</div>
      <div class="tracking">${tracking}</div>
    </div>
    <h2>Destinataire</h2>
    <div class="row big">${o.customer_name}</div>
    <div class="row">${o.customer_phone}</div>
    <div class="row">${o.customer_address}</div>
    <div class="row"><strong>${o.customer_city}</strong></div>

    <h2>Colis</h2>
    <div class="row">${o.product_name}</div>
    <div class="row big">${Number(o.order_value).toFixed(2)} MAD</div>
    <div class="row">
      ${o.open_package ? '<span class="badge">Ne pas ouvrir</span>' : '<span class="badge">Ouverture autorisée</span>'}
    </div>
    ${o.comment ? `<div class="row" style="font-size:12px;color:#555">${o.comment}</div>` : ""}

    <div class="barcode">*${tracking}*</div>

    <div class="footer">
      <span>Order #${o.id}</span>
      <span>${new Date().toLocaleDateString("fr-FR")}</span>
    </div>
  </div>`;
};

const openPrintWindow = (title: string, body: string) => {
  const win = window.open("", "_blank", "width=480,height=720");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${title}</title>
  <style>${stickerStyles}</style>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap">
  </head><body>${body}
    <script>window.onload = () => { setTimeout(() => window.print(), 300); }</script>
  </body></html>`);
  win.document.close();
};

export const printSticker = (o: StickerOrder) => {
  const tracking = o.external_tracking_number || o.tracking_number || `ODiT-${o.id}`;
  openPrintWindow(`Sticker ${tracking}`, stickerHtml(o));
};

export const printStickers = (orders: StickerOrder[]) => {
  if (orders.length === 0) return;
  if (orders.length === 1) return printSticker(orders[0]);
  openPrintWindow(`Stickers (${orders.length})`, orders.map(stickerHtml).join(""));
};
