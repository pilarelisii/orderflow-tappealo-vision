import { CashClosing, PAYMENT_BUCKET_LABEL, PaymentBucket } from "@/types/cashClosing";
import { formatCurrency } from "@/lib/formatters";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const row = (label: string, value: string, bold = false) =>
  `<div class="row${bold ? " bold" : ""}"><span>${esc(label)}</span><span>${esc(value)}</span></div>`;

/** Imprime el cierre en formato ticket 80mm (mismo estilo que las comandas). */
export function printCashClosing(closing: CashClosing, venueName?: string) {
  const frame = document.createElement("iframe");
  frame.style.position = "absolute";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "none";
  document.body.appendChild(frame);

  const d = frame.contentWindow?.document;
  if (!d) return;

  const t = closing.totals;
  const buckets = (Object.keys(PAYMENT_BUCKET_LABEL) as PaymentBucket[]).filter(
    (b) => t.by_payment[b]?.count > 0
  );
  const diffLabel =
    closing.difference === 0 ? "Sin diferencia" : closing.difference > 0 ? "Sobrante" : "Faltante";

  d.open();
  d.write(`
    <html>
      <head>
        <title>Cierre de caja</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.35; width: 80mm; }
          .receipt { width: 80mm; padding: 2mm; box-sizing: border-box; }
          .header { text-align: center; border-bottom: 1px dashed black; padding-bottom: 3mm; margin-bottom: 3mm; }
          .header h1 { font-size: 16px; margin: 0 0 1mm 0; }
          .header p { margin: 0; font-size: 10px; }
          .section { border-bottom: 1px dashed black; padding-bottom: 3mm; margin-bottom: 3mm; }
          .section h2 { font-size: 12px; margin: 0 0 1mm 0; }
          .row { display: flex; justify-content: space-between; gap: 2mm; }
          .bold { font-weight: bold; }
          .big { font-size: 14px; }
          .footer { text-align: center; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>${esc((venueName || "Cierre de caja").toUpperCase())}</h1>
            <p>CIERRE DE CAJA</p>
            <p>Desde ${new Date(closing.period_start).toLocaleString("es-AR")}</p>
            <p>Hasta ${new Date(closing.closed_at).toLocaleString("es-AR")}</p>
          </div>

          <div class="section">
            <h2>VENTAS</h2>
            ${buckets.map((b) => row(`${PAYMENT_BUCKET_LABEL[b]} (${t.by_payment[b].count})`, formatCurrency(t.by_payment[b].amount))).join("")}
            ${row(`Total cobrado (${t.orders_count})`, formatCurrency(t.gross_sales), true)}
            ${t.coupons_count ? row(`Descuentos cupones (${t.coupons_count})`, `-${formatCurrency(t.coupons_discount)}`) : ""}
            ${t.pending_count ? row(`Sin cobrar (${t.pending_count})`, formatCurrency(t.pending_amount)) : ""}
          </div>

          <div class="section">
            <h2>ARQUEO</h2>
            ${row("Fondo inicial", formatCurrency(closing.opening_cash))}
            ${row("Efectivo contado", formatCurrency(closing.counted_cash))}
            ${row("Tarjetas / posnet", formatCurrency(closing.counted_cards))}
            ${row("Gastos / retiros", formatCurrency(closing.expenses))}
            ${row("Esperado en local", formatCurrency(closing.expected_in_store))}
            ${row("Declarado", formatCurrency(closing.declared_in_store))}
            <div class="big">${row(diffLabel, formatCurrency(closing.difference), true)}</div>
          </div>

          ${closing.notes ? `<div class="section"><h2>NOTAS</h2>${esc(closing.notes)}</div>` : ""}

          <div class="footer">
            ${closing.closed_by ? `<p>Cerró: ${esc(closing.closed_by)}</p>` : ""}
            <p>Firma: ____________________</p>
            <p>powered by Tappealo</p>
          </div>
        </div>
      </body>
    </html>
  `);
  d.close();

  frame.contentWindow?.focus();
  frame.contentWindow?.print();

  setTimeout(() => document.body.removeChild(frame), 1000);
}
