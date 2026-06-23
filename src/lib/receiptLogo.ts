export async function receiptLogoAsDataUrl(): Promise<string> {
  const response = await fetch("/logo-pdf.jpg", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Impossible de charger le logo depuis /logo-pdf.jpg");
  }

  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Impossible de lire le logo du reçu."));
    reader.readAsDataURL(blob);
  });
}
