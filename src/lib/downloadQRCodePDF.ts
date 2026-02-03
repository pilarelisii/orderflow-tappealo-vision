// lib/downloadQRCodePDF.ts
import jsPDF from "jspdf";
import QRCodeLib from "qrcode";
import tappealoLogo from "@/assets/tappealo-logo.png";

function detectFormat(dataUrl: string): "PNG" | "JPEG" {
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "JPEG";
  return "PNG";
}

async function imgToDataURL(src: string): Promise<string> {
  const res = await fetch(src, { mode: "cors" as RequestMode, cache: "no-store" });
  if (!res.ok) throw new Error(`No pude cargar imagen: ${src} (${res.status})`);

  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function anyImageToDataURL(srcOrDataUrl: string): Promise<string> {
  if (!srcOrDataUrl) throw new Error("src vacío");
  if (srcOrDataUrl.startsWith("data:image/")) return srcOrDataUrl;
  return imgToDataURL(srcOrDataUrl);
}

// ✅ Lee dimensiones reales de un dataURL para mantener proporción
async function getImageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.width, h: img.height });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export const downloadQRCodePDF = async ({
  qrUrl,
  qrName,
  restaurantLogoUrl,
  filename,
}: {
  qrUrl: string;
  qrName: string;
  restaurantLogoUrl: string | null;
  filename?: string;
}) => {
  try {
    if (!qrUrl?.trim()) throw new Error("qrUrl vacío (buildQRUrl devolvió '')");

    // 1) QR
    const qrDataUrl = await QRCodeLib.toDataURL(qrUrl, {
      width: 1024,
      margin: 1,
    });

    // 2) Logo tappealo
    const tappealoDataUrl = await anyImageToDataURL(String(tappealoLogo));

    // 3) Logo restaurante (opcional)
    let restaurantDataUrl: string | null = null;
    if (restaurantLogoUrl) {
      try {
        restaurantDataUrl = await anyImageToDataURL(restaurantLogoUrl);
      } catch (e) {
        console.warn("No pude cargar logo del restaurante (lo salteo):", e);
        restaurantDataUrl = null;
      }
    }

    // 4) PDF
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = 20;

    /* ---------- TÍTULO ---------- */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(30, 30, 30);
    doc.text((qrName || "QR").toUpperCase(), pageW / 2, y, { align: "center" });

    /* ---------- SUBTÍTULO ---------- */
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.setTextColor(60, 60, 60);
    doc.text("Pedí y retirá acá", pageW / 2, y, { align: "center" });

    y += 16;

    /* ---------- LOGO RESTAURANTE ---------- */
    if (restaurantDataUrl) {
      const fmt = detectFormat(restaurantDataUrl);
      const logoW = pageW * 0.55;
      const logoH = 22; // si querés proporcional también, te lo adapto
      doc.addImage(restaurantDataUrl, fmt, (pageW - logoW) / 2, y, logoW, logoH);
      y += logoH + 14;
    } else {
      y += 6;
    }

    /* ---------- QR ---------- */
    const qrSize = pageW * 0.68;
    doc.addImage(qrDataUrl, "PNG", (pageW - qrSize) / 2, y, qrSize, qrSize);
    y += qrSize + 14;

    /* ---------- TAPPEALO (sin deformar) ---------- */
    const tapFmt = detectFormat(tappealoDataUrl);

    // ancho deseado
    const tapW = pageW * 0.32;

    // calcular alto proporcional
    const { w: pxW, h: pxH } = await getImageSize(tappealoDataUrl);
    const tapH = (tapW * pxH) / pxW;

    // si nos pasamos, lo pegamos cerca del borde inferior con margen
    const bottomMargin = 12;
    if (y + tapH > pageH - bottomMargin) {
      y = pageH - bottomMargin - tapH;
    }

    doc.addImage(tappealoDataUrl, tapFmt, (pageW - tapW) / 2, y, tapW, tapH);

    /* ---------- DOWNLOAD ---------- */
    const safe = (filename || qrName || "qr")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");

    doc.save(`qr-${safe}.pdf`);
  } catch (e) {
    console.error("downloadQRCodePDF error:", e);
    throw e;
  }
};