import { Order } from "@/types/order";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PrintableReceiptProps {
  order: Order;
}

export function PrintableReceipt({ order }: PrintableReceiptProps) {
  const formattedDate = format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: es });

  return (
    <div className="print-receipt">
      <style>
        {`
          @media print {
            @page {
              size: 80mm auto;
              margin: 0mm 2mm;
            }
            body * {
              visibility: hidden;
            }
            .print-receipt, .print-receipt * {
              visibility: visible;
            }
            .print-receipt {
              position: absolute;
              left: 0;
              top: 0;
              width: 72mm;
              max-width: 576px;
              padding: 2mm 0;
              margin: 0 auto;
              font-family: 'Courier New', monospace;
              font-size: 11px;
              line-height: 1.2;
              color: black !important;
              background: white !important;
            }
          }
          .print-receipt {
            width: 72mm;
            max-width: 576px;
            padding: 2mm 0;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.2;
            background: white;
            color: black;
          }
          .print-receipt .header {
            text-align: center;
            border-bottom: 1px dashed black;
            padding-bottom: 3mm;
            margin-bottom: 3mm;
          }
          .print-receipt .header h1 {
            font-size: 14px;
            font-weight: bold;
            margin: 0 0 1mm 0;
          }
          .print-receipt .header p {
            margin: 0;
            font-size: 10px;
          }
          .print-receipt .items {
            border-bottom: 1px dashed black;
            padding-bottom: 3mm;
            margin-bottom: 3mm;
          }
          .print-receipt .item {
            margin-bottom: 2mm;
          }
          .print-receipt .item-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
          }
          .print-receipt .item-desc {
            font-size: 9px;
            padding-left: 3mm;
            color: #333;
          }
          .print-receipt .footer {
            text-align: center;
          }
          .print-receipt .total {
            font-size: 14px;
            font-weight: bold;
            text-align: right;
            margin: 3mm 0;
            border-top: 1px solid black;
            padding-top: 2mm;
          }
          .print-receipt .delivery {
            margin: 2mm 0;
            padding: 2mm;
            border: 1px solid black;
            font-size: 10px;
          }
          .print-receipt .comments {
            font-size: 9px;
            margin: 2mm 0;
            padding: 2mm;
            background: #f0f0f0;
          }
        `}
      </style>
      
      <div className="header">
        <h1>LA BICI</h1>
        <p>Pedido #{order.id.slice(0, 8).toUpperCase()}</p>
        <p>{formattedDate}</p>
      </div>

      <div className="items">
        {order.items.map((item, idx) => (
          <div key={idx} className="item">
            <div className="item-header">
              <span>{item.cantidad}x {item.item}</span>
            </div>
            {item.descripcion && (
              <div className="item-desc">→ {item.descripcion}</div>
            )}
          </div>
        ))}
      </div>

      <div className="delivery">
        <strong>Entrega:</strong> {order.lugar_entrega}
        {order.telefono && (
          <div style={{ marginTop: '1mm' }}>
            <strong>Tel:</strong> {order.telefono}
          </div>
        )}
      </div>

      {order.comentarios_generales && (
        <div className="comments">
          <strong>Notas:</strong> {order.comentarios_generales}
        </div>
      )}

      <div className="total">
        TOTAL: ${order.total.toLocaleString('es-CL')}
      </div>

      <div className="footer">
        <p>¡Gracias por tu pedido!</p>
        <p>- - - - - - - - - -</p>
      </div>
    </div>
  );
}
