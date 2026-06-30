/**
 * Certificate export engine — browser-side, no server required.
 *
 * Core rule:
 * The live certificate is responsive, but every export is normalized to
 * exactly US Letter landscape at 300 DPI: 3300 × 2550 px.
 *
 * This keeps PNG, home PDF, and print-shop PDF using the same certificate image
 * so text placement does not shift between preview and export.
 */

const CERT_W_IN = 11;
const CERT_H_IN = 8.5;
const DPI = 300;

const CERT_W_PX = CERT_W_IN * DPI;
const CERT_H_PX = CERT_H_IN * DPI;

const BLEED_IN = 0.125;
const GAP_IN = 0.0625;
const MARK_IN = 0.125;

export type ExportFormat = "pdf-home" | "pdf-print" | "png";

async function waitForAssets(el: HTMLElement): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const images = Array.from(el.querySelectorAll("img"));

  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }

          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
}

function sanitizeClone(clonedDoc: Document): void {
  clonedDoc.querySelectorAll<HTMLCanvasElement>("canvas").forEach((canvas) => {
    if (!canvas.width || !canvas.height) canvas.remove();
  });

  clonedDoc.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    if (img.getAttribute("width") === "0" || img.getAttribute("height") === "0") {
      img.remove();
    }
  });

  clonedDoc.querySelectorAll<SVGSVGElement>("svg").forEach((svg) => {
    if (svg.style.filter) svg.style.removeProperty("filter");
    if (svg.style.overflow === "visible") svg.style.overflow = "hidden";

    const widthAttr = svg.getAttribute("width") ?? "";

    if (widthAttr.endsWith("%")) {
      const viewBoxParts = (svg.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/);
      const viewBoxWidth = viewBoxParts.length >= 4 ? parseFloat(viewBoxParts[2]) : 0;

      if (viewBoxWidth > 0) {
        svg.setAttribute("width", `${viewBoxWidth}`);
      } else {
        svg.remove();
      }
    }

    const width = parseFloat(svg.getAttribute("width") ?? "0");
    const height = parseFloat(svg.getAttribute("height") ?? "0");

    if (width === 0 && height === 0 && !svg.getAttribute("viewBox")) {
      svg.remove();
    }
  });

  clonedDoc.querySelectorAll<HTMLElement>("div, span, p").forEach((node) => {
    const height = node.style.height;
    if (height) {
      const value = parseFloat(height);
      if (value > 0 && value < 1) node.style.height = "1px";
    }

    const width = node.style.width;
    if (width) {
      const value = parseFloat(width);
      if (value > 0 && value < 1) node.style.width = "1px";
    }
  });
}

function sampleCornerColor(canvas: HTMLCanvasElement): string {
  const context = canvas.getContext("2d");
  if (!context) return "#08060D";

  const pixel = context.getImageData(2, 2, 1, 1).data;
  return `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
}

function normalizeToLetterCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = CERT_W_PX;
  out.height = CERT_H_PX;

  const context = out.getContext("2d");
  if (!context) throw new Error("Could not create normalized certificate canvas.");

  const ctx: CanvasRenderingContext2D = context;

  const fill = sampleCornerColor(source);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, out.width, out.height);

  const sourceRatio = source.width / source.height;
  const targetRatio = CERT_W_PX / CERT_H_PX;

  let drawW = CERT_W_PX;
  let drawH = CERT_H_PX;

  if (sourceRatio > targetRatio) {
    drawW = CERT_W_PX;
    drawH = CERT_W_PX / sourceRatio;
  } else {
    drawH = CERT_H_PX;
    drawW = CERT_H_PX * sourceRatio;
  }

  const x = (CERT_W_PX - drawW) / 2;
  const y = (CERT_H_PX - drawH) / 2;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, x, y, drawW, drawH);

  return out;
}

async function captureElement(el: HTMLElement): Promise<HTMLCanvasElement> {
  const rect = el.getBoundingClientRect();

  if (!rect.width || !rect.height) {
    throw new Error("Certificate element has zero size — is it rendered and visible?");
  }

  await waitForAssets(el);

  const html2canvas = (await import("html2canvas")).default;

  const scale = Math.max(CERT_W_PX / rect.width, CERT_H_PX / rect.height);

  const raw = await html2canvas(el, {
    scale,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: null,
    onclone: (clonedDoc: Document) => sanitizeClone(clonedDoc),
  });

  if (!raw.width || !raw.height) {
    throw new Error(`html2canvas returned an empty canvas (${raw.width}×${raw.height})`);
  }

  return normalizeToLetterCanvas(raw);
}

function triggerDownload(dataUrl: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function buildPrintShopCanvas(cert: HTMLCanvasElement): HTMLCanvasElement {
  const bleedPx = Math.round(BLEED_IN * DPI);
  const gapPx = Math.round(GAP_IN * DPI);
  const markPx = Math.round(MARK_IN * DPI);

  const offset = markPx + gapPx + bleedPx;

  const outW = cert.width + offset * 2;
  const outH = cert.height + offset * 2;

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;

  const context = out.getContext("2d");
  if (!context) throw new Error("Could not create print-shop canvas.");

  const ctx: CanvasRenderingContext2D = context;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, outW, outH);

  ctx.fillStyle = sampleCornerColor(cert);
  ctx.fillRect(
    offset - bleedPx,
    offset - bleedPx,
    cert.width + bleedPx * 2,
    cert.height + bleedPx * 2
  );

  ctx.drawImage(cert, offset, offset);

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;

  const x0 = offset;
  const x1 = offset + cert.width;
  const y0 = offset;
  const y1 = offset + cert.height;

  function hLine(xa: number, xb: number, y: number): void {
    ctx.beginPath();
    ctx.moveTo(xa, y);
    ctx.lineTo(xb, y);
    ctx.stroke();
  }

  function vLine(x: number, ya: number, yb: number): void {
    ctx.beginPath();
    ctx.moveTo(x, ya);
    ctx.lineTo(x, yb);
    ctx.stroke();
  }

  hLine(0, markPx, y0);
  vLine(x0, 0, markPx);

  hLine(outW - markPx, outW, y0);
  vLine(x1, 0, markPx);

  hLine(0, markPx, y1);
  vLine(x0, outH - markPx, outH);

  hLine(outW - markPx, outW, y1);
  vLine(x1, outH - markPx, outH);

  return out;
}

export async function exportCertificate(
  el: HTMLElement,
  format: ExportFormat,
  filename = "certificate"
): Promise<void> {
  const cert = await captureElement(el);

  if (format === "png") {
    triggerDownload(cert.toDataURL("image/png"), `${filename}.png`);
    return;
  }

  const { jsPDF } = await import("jspdf");

  if (format === "pdf-home") {
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "in",
      format: "letter",
      compress: true,
    });

    pdf.addImage(cert.toDataURL("image/jpeg", 0.98), "JPEG", 0, 0, CERT_W_IN, CERT_H_IN);
    pdf.save(`${filename}.pdf`);
    return;
  }

  const out = buildPrintShopCanvas(cert);
  const totalW = out.width / DPI;
  const totalH = out.height / DPI;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "in",
    format: [totalW, totalH],
    compress: true,
  });

  pdf.addImage(out.toDataURL("image/jpeg", 0.99), "JPEG", 0, 0, totalW, totalH);
  pdf.save(`${filename}-printshop.pdf`);
}