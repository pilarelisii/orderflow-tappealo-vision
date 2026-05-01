// src/lib/downloadQRCodePosterPDF.ts
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import QRCodeLib from "qrcode";
import tappealoLogo from "@/assets/tappealo-logo.png";
import MercadoPago from "@/assets/Mercado_Pago.svg.png";

type Params = {
  qrUrl: string;
  qrName: string;
  venueLogoUrl?: string | null;
  filename?: string;
};

async function imageToDataUrl(src: string): Promise<string> {
  if (!src) throw new Error("Imagen vacía");
  if (src.startsWith("data:image/")) return src;

  const res = await fetch(src);
  if (!res.ok) throw new Error("No se pudo cargar la imagen");

  const blob = await res.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function logoToDataUrl(src: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // 🔥 CLAVE

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = reject;
    img.src = src;
  });
}

function safeName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export async function downloadQRCodePosterPDF({
  qrUrl,
  qrName,
  venueLogoUrl,
  filename,
}: Params) {
  if (!qrUrl?.trim()) throw new Error("qrUrl vacío");

  const qrDataUrl = await QRCodeLib.toDataURL(qrUrl, {
    width: 900,
    margin: 1,
    color: {
      dark: "#3D1F12",
      light: "#FFFFFF",
    },
  })


  const tappealoDataUrl = await imageToDataUrl(String(tappealoLogo));
  const mpDataUrl = await imageToDataUrl(String(MercadoPago));
  let logo: string | null = null;

  if (venueLogoUrl?.startsWith("data:image/")) {
    logo = venueLogoUrl;
  } else {
    console.warn("Logo ignorado por no ser base64");
  }

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = "794px";
  wrapper.style.height = "1123px";
  wrapper.style.background = "#ffffff";
  wrapper.style.fontFamily = "Inter, sans-serif";

  wrapper.innerHTML = `
    <div style="
      width:794px;
      height:1123px;
      position:relative;
      overflow:hidden;
      box-sizing:border-box;
      background:#fff;
      color:#3D1F12;
      text-align:center;
      padding:58px 70px 36px;
    ">
      <!-- puntos -->
      <div style="
        position:absolute;
        top:14px;
        left:32px;
        width:160px;
        height:145px;
        background-image:radial-gradient(#d9b7aa 3px, transparent 3px);
        background-size:32px 32px;
        opacity:.55;
      "></div>

      <div style="
        position:absolute;
        top:14px;
        right:32px;
        width:160px;
        height:145px;
        background-image:radial-gradient(#d9b7aa 3px, transparent 3px);
        background-size:32px 32px;
        opacity:.55;
      "></div>

      <!-- logo restaurante -->
      <div style="
        height:64px;
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        ${
          logo
            ? `<img src="${logo}" style="width:300px; object-fit:contain;" />`
            : `<div style="font-size:21px; letter-spacing:1px; font-weight:400;">(LOGO RESTO)</div>`
        }
      </div>

      <!-- nombre mesa -->
      <div style="
        margin-top:62px;
        font-size:62px;
        font-weight:300;
        letter-spacing:7px;
        line-height:1;
        margin-bottom:40px;
      ">
        ${qrName.toUpperCase()}
      </div>

      <!-- QR -->
      <div style="
        margin:64px auto 0;
        width:410px;
        height:410px;
        position:relative;
      ">
        <img src="${qrDataUrl}" style="width:90%; height:100%; object-fit:contain; margin:auto" />

        <div style="position:absolute; left:-18px; top:-18px; width:58px; height:58px; border-left:8px solid #3D1F12; border-top:8px solid #3D1F12; border-radius:5px;"></div>
        <div style="position:absolute; right:-18px; top:-18px; width:58px; height:58px; border-right:8px solid #3D1F12; border-top:8px solid #3D1F12; border-radius:5px;"></div>
        <div style="position:absolute; left:-18px; bottom:-18px; width:58px; height:58px; border-left:8px solid #3D1F12; border-bottom:8px solid #3D1F12; border-radius:5px;"></div>
        <div style="position:absolute; right:-18px; bottom:-18px; width:58px; height:58px; border-right:8px solid #3D1F12; border-bottom:8px solid #3D1F12; border-radius:5px;"></div>
      </div>

      <!-- frase -->
      <div style="
        margin-top:64px;
        font-size:34px;
        font-weight:800;
        line-height:1.15;
        white-space:nowrap;
      ">
        Escaneá y pedí <span style="color:#b9968a;">sin esperar</span>
      </div>

      <!-- acciones -->
      <div style="
        margin:58px auto 0;
        width:560px;
        display:grid;
        grid-template-columns: 1fr 1px 1fr 1px 1fr;
        align-items:center;
        color:#3D1F12;
      ">
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
          <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#3D1F12" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8" cy="21" r="1"></circle>
            <circle cx="19" cy="21" r="1"></circle>
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h8.78a2 2 0 0 0 2-1.58L21 7H5.12"></path>
            <path d="m9 11 2 2 4-4"></path>
          </svg>
          <div style="font-size:20px; margin-top:8px;">PEDIR</div>
        </div>

        <div style="height:72px; background:#b9968a;"></div>

        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
          <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#3D1F12" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.268 21a2 2 0 0 0 3.464 0"></path>
            <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.674C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path>
          </svg>
          <div style="font-size:20px; margin-top:8px;">LLAMAR</div>
        </div>

        <div style="height:72px; background:#b9968a;"></div>

        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
          <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#3D1F12" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <rect width="20" height="14" x="2" y="5" rx="2"></rect>
            <line x1="2" x2="22" y1="10" y2="10"></line>
            <path d="M6 15h2"></path>
            <path d="M10 15h4"></path>
          </svg>
          <div style="font-size:20px; margin-top:8px; text-align:center;">PAGAR</div>
        </div>
      </div>

      <!-- logo tappealo -->
      <div style="
        position:absolute;
        bottom:62px;
        left:70px;
        right:70px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:28px;
      ">
        <div style="height:2px; width:170px; background:#e7c9bd;"></div>
        <img src="${tappealoDataUrl}" style="width:205px; height:auto; object-fit:contain;" />
        <div style="height:2px; width:170px; background:#e7c9bd;"></div>
      </div>

      <!-- MP -->
     <div style="
      position:absolute;
      bottom:24px;
      left:0;
      right:0;
      color:#1263c7;
      font-size:14px;
      font-weight:700;
      display:flex;
      justify-content:center;
      align-items:center;
      gap:8px;
    ">
      <span style="text-transform:uppercase;">PAGÁ CON</span>
      <img src="${mpDataUrl}" style="width:115px; height:auto; object-fit:contain; margin-top:10px;" />
    </div>
    </div>
  `;

  document.body.appendChild(wrapper);

  const canvas = await html2canvas(wrapper, {
    scale: 3,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
  });

  document.body.removeChild(wrapper);

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  pdf.addImage(imgData, "PNG", 0, 0, 210, 297);

  pdf.save(`qr-${safeName(filename || qrName || "qr")}.pdf`);
}