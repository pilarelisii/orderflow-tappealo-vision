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
              margin: 0;
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
              width: 80mm;
              padding: 2mm;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.3;
              color: black !important;
              background: white !important;
            }
          }
          .print-receipt {
            width: 80mm;
            padding: 2mm;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.3;
            background: white;
            color: black;
          }
          .print-receipt .header {
            text-align: center;
            border-bottom: 1px dashed black;
            padding-bottom: 4mm;
            margin-bottom: 4mm;
          }
          .print-receipt .header h1 {
            font-size: 16px;
            font-weight: bold;
            margin: 0 0 2mm 0;
          }
          .print-receipt .header p {
            margin: 0;
            font-size: 10px;
          }
          .print-receipt .items {
            border-bottom: 1px dashed black;
            padding-bottom: 4mm;
            margin-bottom: 4mm;
          }
          .print-receipt .item {
            margin-bottom: 3mm;
          }
          .print-receipt .item-header {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
          }
          .print-receipt .item-desc {
            font-size: 10px;
            padding-left: 4mm;
            color: #333;
          }
          .print-receipt .footer {
            text-align: center;
          }
          .print-receipt .total {
            font-size: 16px;
            font-weight: bold;
            text-align: right;
            margin: 4mm 0;
            border-top: 1px solid black;
            padding-top: 2mm;
          }
          .print-receipt .delivery {
            margin: 3mm 0;
            padding: 2mm;
            border: 1px solid black;
          }
          .print-receipt .comments {
            font-size: 10px;
            margin: 3mm 0;
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
