import jsPDF from "jspdf";
import QRCodeLib from "qrcode";
import tappealoLogo from "@/assets/tappealo-logo.png";

function detectFormat(dataUrl: string): "PNG" | "JPEG" {
  if (
    dataUrl.startsWith("data:image/jpeg") ||
    dataUrl.startsWith("data:image/jpg")
  ) {
    return "JPEG";
  }
  return "PNG";
}

async function imgToDataURL(src: string): Promise<string> {
  const res = await fetch(src);
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

async function getImageSize(
  dataUrl: string
): Promise<{ w: number; h: number }> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.width, h: img.height });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

type QRItem = {
  id: string;
  name: string;
  url: string;
};

type DownloadAllQRCodesPDFParams = {
  items: QRItem[];
  restaurantLogoUrl?: string | null;
  filename?: string;
};

export const downloadAllQRCodesPDF = async ({
  items,
  restaurantLogoUrl,
  filename = "todos-los-qr",
}: DownloadAllQRCodesPDFParams) => {
  try {
    if (!items.length) throw new Error("No hay QRs para exportar");

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const tappealoDataUrl = await anyImageToDataURL(String(tappealoLogo));
    const tapFmt = detectFormat(tappealoDataUrl);
    const tapSize = await getImageSize(tappealoDataUrl);

    let restaurantDataUrl: string | null = null;
    if (restaurantLogoUrl) {
      try {
        restaurantDataUrl = await anyImageToDataURL(restaurantLogoUrl);
      } catch (e) {
        console.warn("No pude cargar logo del restaurante:", e);
        restaurantDataUrl = null;
      }
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (i > 0) doc.addPage();

      let y = 20;

      if (!item.url?.trim()) continue;

      const qrDataUrl = await QRCodeLib.toDataURL(item.url, {
        width: 1024,
        margin: 1,
      });

      // título
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.setTextColor(30, 30, 30);
      doc.text((item.name || "QR").toUpperCase(), pageW / 2, y, {
        align: "center",
      });

      // subtítulo
      y += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(16);
      doc.setTextColor(60, 60, 60);
      doc.text("Pedí y retirá acá", pageW / 2, y, { align: "center" });

      y += 16;

      // logo restaurante
      if (restaurantDataUrl) {
        const restFmt = detectFormat(restaurantDataUrl);
        const logoW = pageW * 0.55;
        const logoH = 22;
        doc.addImage(
          restaurantDataUrl,
          restFmt,
          (pageW - logoW) / 2,
          y,
          logoW,
          logoH
        );
        y += logoH + 14;
      } else {
        y += 6;
      }

      // qr
      const qrSize = pageW * 0.68;
      doc.addImage(qrDataUrl, "PNG", (pageW - qrSize) / 2, y, qrSize, qrSize);
      y += qrSize + 14;

      // logo tappealo proporcional
      const tapW = pageW * 0.32;
      const tapH = (tapW * tapSize.h) / tapSize.w;

      const bottomMargin = 12;
      if (y + tapH > pageH - bottomMargin) {
        y = pageH - bottomMargin - tapH;
      }

      doc.addImage(tappealoDataUrl, tapFmt, (pageW - tapW) / 2, y, tapW, tapH);
    }

    const safe = filename
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");

    doc.save(`${safe}.pdf`);
  } catch (e) {
    console.error("downloadAllQRCodesPDF error:", e);
    throw e;
  }
};