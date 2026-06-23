export async function receiptLogoAsDataUrl(): Promise<string> {
  const logoPaths = ["/logo2.jpg", "/logo-pdf.jpg"];
  for (const path of logoPaths) {
    try {
      return await loadImagePathAsDataUrl(path);
    } catch {
      try {
        const response = await fetch(path, { cache: "no-store" });
        if (!response.ok) continue;
        const blob = await response.blob();
        return await blobToDataUrl(blob);
      } catch {
        continue;
      }
    }
  }

  throw new Error("Impossible de charger le logo du reçu.");
}

function loadImagePathAsDataUrl(path: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas indisponible.");
        ctx.fillStyle = "#F3F4F0";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(trimLogoCanvas(canvas).toDataURL("image/jpeg", 0.92));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error("Impossible de lire le logo du reçu."));
    };

    img.src = `${path}?v=${Date.now()}`;
  });
}

function trimLogoCanvas(source: HTMLCanvasElement) {
  const ctx = source.getContext("2d");
  if (!ctx) return source;

  const { width, height } = source;
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const background = [pixels[0], pixels[1], pixels[2]];
  const threshold = 34;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const distance =
        Math.abs(pixels[index] - background[0]) +
        Math.abs(pixels[index + 1] - background[1]) +
        Math.abs(pixels[index + 2] - background[2]);

      if (distance > threshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (minX >= maxX || minY >= maxY) return source;

  const padding = 18;
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropWidth = Math.min(width - cropX, maxX - minX + padding * 2);
  const cropHeight = Math.min(height - cropY, maxY - minY + padding * 2);
  const output = document.createElement("canvas");
  output.width = cropWidth;
  output.height = cropHeight;
  const outputCtx = output.getContext("2d");
  if (!outputCtx) return source;
  outputCtx.fillStyle = "#F3F4F0";
  outputCtx.fillRect(0, 0, cropWidth, cropHeight);
  outputCtx.drawImage(source, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return output;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Impossible de convertir le logo du reçu."));
    reader.readAsDataURL(blob);
  });
}
