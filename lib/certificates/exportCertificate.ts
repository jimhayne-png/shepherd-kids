/**
 * Certificate export engine — browser-side, no server required.
 *
 * Pipeline:  DOM element  →  html2canvas (high-DPI canvas)  →  jsPDF / PNG blob
 *
 * All measurements assume US Letter landscape (11 × 8.5 in) at 300 DPI.
 * html2canvas limitations: CSS `box-shadow` and `filter` (glows) are not
 * rendered — intentional for print output.
 */

const CERT_W_IN = 11;     // US Letter landscape width
const CERT_H_IN = 8.5;    // US Letter landscape height
const DPI       = 300;
const BLEED_IN  = 0.125;  // 1/8 in bleed (print shop)
const GAP_IN    = 0.0625; // 1/16 in gap between bleed and crop mark
const MARK_IN   = 0.125;  // 1/8 in crop mark length

export type ExportFormat = "pdf-home" | "pdf-print" | "png";

// ── Canvas capture ────────────────────────────────────────────────────────────

// Sanitize the cloned document before html2canvas renders it.
// Targets two known html2canvas 1.4.1 crash paths:
//
// 1. SVGs with width="100%" — in the offline iframe their container has no
//    layout width, so getBoundingClientRect returns 0. html2canvas records
//    intrinsicWidth=0, serialises the SVG with width="0px", loads it as a
//    0×0 image, then calls createPattern(zero_size_image) which throws.
//    Fix: replace % width with the viewBox pixel width.
//
// 2. SVGs with overflow:visible containing content outside the viewBox —
//    the bounding-rect calculation may expand to 0 in certain iframe
//    layout states. Fix: clip to viewBox (hidden) in the clone only.
//
// Additional defensive measures: remove CSS filter (html2canvas ignores it
// but keeping it can produce internal zero-size canvases on some builds),
// remove canvas/img with zero size, clamp sub-pixel heights.
function sanitizeClone(clonedDoc: Document): void {
  // ── Remove zero-size canvas elements ───────────────────────────────────
  clonedDoc.querySelectorAll<HTMLCanvasElement>("canvas").forEach(c => {
    if (!c.width || !c.height) c.remove();
  });

  // ── Remove zero-size img elements ──────────────────────────────────────
  clonedDoc.querySelectorAll<HTMLImageElement>("img").forEach(img => {
    if (img.getAttribute("width") === "0" || img.getAttribute("height") === "0") {
      img.remove();
    }
  });

  // ── Fix SVG elements ───────────────────────────────────────────────────
  clonedDoc.querySelectorAll<SVGSVGElement>("svg").forEach(svg => {
    // Remove CSS filter — html2canvas doesn't render it anyway, and on
    // some code paths it can trigger a zero-size internal canvas.
    if (svg.style.filter) svg.style.removeProperty("filter");

    // Clip overflow:visible so out-of-bounds content doesn't expand the
    // bounds calculation in the offline iframe to an unexpected value.
    if (svg.style.overflow === "visible") svg.style.overflow = "hidden";

    // Replace percentage width with the explicit viewBox pixel width.
    // Without this, width="100%" resolves to 0 in the offline iframe,
    // producing a zero-intrinsicWidth SVGElementContainer that later
    // throws in createPattern.
    const wAttr = svg.getAttribute("width") ?? "";
    if (wAttr.endsWith("%")) {
      const vbParts = (svg.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/);
      const vbW = vbParts.length >= 4 ? parseFloat(vbParts[2]) : 0;
      if (vbW > 0) {
        svg.setAttribute("width", `${vbW}`);
      } else {
        svg.remove(); // no fallback dimension — drop the element
      }
    }

    // Remove SVG if it still has zero explicit dimensions and no viewBox.
    const w = parseFloat(svg.getAttribute("width") ?? "0");
    const h = parseFloat(svg.getAttribute("height") ?? "0");
    if (w === 0 && h === 0 && !svg.getAttribute("viewBox")) {
      svg.remove();
    }
  });

  // ── Fix sub-pixel heights on non-SVG elements ──────────────────────────
  // e.g. the 0.75 px divider divs in CertificateRibbon / CertificateFooter.
  // html2canvas floors fractional px to 0 in certain layout contexts,
  // producing a zero-height gradient canvas → createPattern crash.
  clonedDoc.querySelectorAll<HTMLElement>("div, span, p").forEach(el => {
    const h = el.style.height;
    if (h) {
      const v = parseFloat(h);
      if (v > 0 && v < 1) el.style.height = "1px";
    }
    const w = el.style.width;
    if (w) {
      const v = parseFloat(w);
      if (v > 0 && v < 1) el.style.width = "1px";
    }
  });
}

async function captureElement(el: HTMLElement): Promise<HTMLCanvasElement> {
  const w = el.offsetWidth;
  if (!w) throw new Error("Certificate element has zero width — is it rendered and visible?");

  const scale = (CERT_W_IN * DPI) / w;  // ≈ 3.84 at 860px wide

  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(el, {
    scale,
    useCORS:         true,
    allowTaint:      true,
    logging:         false,
    backgroundColor: null,
    onclone:         (_clonedDoc: Document) => sanitizeClone(_clonedDoc),
  });

  if (!canvas.width || !canvas.height) {
    throw new Error(`html2canvas returned an empty canvas (${canvas.width}×${canvas.height})`);
  }
  return canvas;
}

// Sample top-left corner pixel for bleed fill (avoids hard-coding theme colors)
function sampleCornerColor(canvas: HTMLCanvasElement): string {
  const px = canvas.getContext("2d")!.getImageData(2, 2, 1, 1).data;
  return `rgb(${px[0]},${px[1]},${px[2]})`;
}

// ── Download helpers ──────────────────────────────────────────────────────────

function triggerDownload(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href     = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── Print Shop canvas: bleed + crop marks ────────────────────────────────────

function buildPrintShopCanvas(cert: HTMLCanvasElement): HTMLCanvasElement {
  const pxPerIn = cert.width / CERT_W_IN;  // ≈ 300 at 300 DPI

  const bleedPx = Math.round(BLEED_IN * pxPerIn);
  const gapPx   = Math.round(GAP_IN   * pxPerIn);
  const markPx  = Math.round(MARK_IN  * pxPerIn);

  const offset = markPx + gapPx + bleedPx;

  const outW = cert.width  + offset * 2;
  const outH = cert.height + offset * 2;

  const out = document.createElement("canvas");
  out.width  = outW;
  out.height = outH;
  const ctx  = out.getContext("2d")!;

  // White base
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, outW, outH);

  // Bleed area filled with cert's edge color
  ctx.fillStyle = sampleCornerColor(cert);
  ctx.fillRect(
    offset - bleedPx, offset - bleedPx,
    cert.width + bleedPx * 2, cert.height + bleedPx * 2,
  );

  // Certificate at trim position
  ctx.drawImage(cert, offset, offset);

  // Crop marks — 4 corners × 2 lines
  ctx.strokeStyle = "#000000";
  ctx.lineWidth   = 1;

  const x0 = offset;
  const x1 = offset + cert.width;
  const y0 = offset;
  const y1 = offset + cert.height;

  function hLine(xa: number, xb: number, y: number) {
    ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke();
  }
  function vLine(x: number, ya: number, yb: number) {
    ctx.beginPath(); ctx.moveTo(x, ya); ctx.lineTo(x, yb); ctx.stroke();
  }

  hLine(0,             markPx,        y0);  // TL horizontal
  vLine(x0,            0,             markPx);  // TL vertical
  hLine(outW - markPx, outW,          y0);  // TR horizontal
  vLine(x1,            0,             markPx);  // TR vertical
  hLine(0,             markPx,        y1);  // BL horizontal
  vLine(x0,            outH - markPx, outH);  // BL vertical
  hLine(outW - markPx, outW,          y1);  // BR horizontal
  vLine(x1,            outH - markPx, outH);  // BR vertical

  return out;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function exportCertificate(
  el:       HTMLElement,
  format:   ExportFormat,
  filename: string = "certificate",
): Promise<void> {
  const cert = await captureElement(el);

  // ── PNG ───────────────────────────────────────────────────────────────────
  if (format === "png") {
    triggerDownload(cert.toDataURL("image/png"), `${filename}.png`);
    return;
  }

  const { jsPDF } = await import("jspdf");

  // ── Home printer PDF — letter landscape, JPEG 0.96 ────────────────────────
  if (format === "pdf-home") {
    const pdf = new jsPDF({ orientation: "landscape", unit: "in", format: "letter" });
    pdf.addImage(
      cert.toDataURL("image/jpeg", 0.96),
      "JPEG", 0, 0, CERT_W_IN, CERT_H_IN,
    );
    pdf.save(`${filename}.pdf`);
    return;
  }

  // ── Print Shop PDF — custom size with 1/8 in bleed + crop marks ───────────
  const out     = buildPrintShopCanvas(cert);
  const pxPerIn = cert.width / CERT_W_IN;
  const totalW  = out.width  / pxPerIn;
  const totalH  = out.height / pxPerIn;

  const pdfW = Math.max(totalW, totalH);
  const pdfH = Math.min(totalW, totalH);

  const pdf = new jsPDF({ orientation: "landscape", unit: "in", format: [pdfW, pdfH] });
  pdf.addImage(
    out.toDataURL("image/jpeg", 0.99),
    "JPEG", 0, 0, pdfW, pdfH,
  );
  pdf.save(`${filename}-printshop.pdf`);
}
