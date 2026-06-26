export function generateProductQrCode(): string {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `OZMK-${suffix}`;
}

type LabeledQrOptions = {
  qrCode: string;
  productName: string;
  qrSize?: number;
};

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["Ürün"];

  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function createLabeledQrDataUrl({
  qrCode,
  productName,
  qrSize = 400,
}: LabeledQrOptions): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  const qrDataUrl = await QRCode.toDataURL(qrCode, {
    width: qrSize,
    margin: 1,
    color: { dark: "#0c1117", light: "#ffffff" },
  });

  const padding = 28;
  const topSection = 44;
  const lineHeight = 26;
  const bottomPadding = 24;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas desteklenmiyor");

  const contentWidth = qrSize + padding * 2;
  ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
  const nameLines = wrapLines(ctx, productName.trim() || "Ürün", contentWidth - 16);
  const bottomSection = nameLines.length * lineHeight + bottomPadding;

  canvas.width = contentWidth;
  canvas.height = padding + topSection + qrSize + bottomSection;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

  ctx.fillStyle = "#1a5490";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ÖZMAKSAN", canvas.width / 2, padding + 12);

  ctx.strokeStyle = "#d71920";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding + 20, padding + 18);
  ctx.lineTo(canvas.width - padding - 20, padding + 18);
  ctx.stroke();

  ctx.fillStyle = "#1a5490";
  ctx.font = "bold 15px ui-monospace, Consolas, monospace";
  ctx.fillText(qrCode, canvas.width / 2, padding + 38);

  const img = await loadImage(qrDataUrl);
  const qrY = padding + topSection;
  ctx.drawImage(img, padding, qrY, qrSize, qrSize);

  ctx.fillStyle = "#1a5490";
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  const nameStartY = qrY + qrSize + 28;
  nameLines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, nameStartY + i * lineHeight);
  });

  return canvas.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** @deprecated createLabeledQrDataUrl kullanın */
export async function getQrDataUrl(text: string, size = 256): Promise<string> {
  return createLabeledQrDataUrl({
    qrCode: text,
    productName: text,
    qrSize: size,
  });
}

export async function downloadQrPng(
  qrCode: string,
  productName: string,
  filename?: string
): Promise<void> {
  const dataUrl = await createLabeledQrDataUrl({ qrCode, productName });
  const safeName =
    filename ??
    `etiket-${(productName || qrCode).replace(/\s+/g, "-").toLowerCase()}`;

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${safeName}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
