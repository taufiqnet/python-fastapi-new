/**
 * Client-side PDF export utility using html2pdf.js.
 * Operates 100% in the Next.js frontend without navigating or redirecting to backend ports.
 */

export interface PdfExportOptions {
  orientation?: "portrait" | "landscape";
  margin?: number | [number, number, number, number];
  scale?: number;
}

export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  options?: PdfExportOptions
): Promise<void> {
  if (typeof window === "undefined" || !element) {
    return;
  }

  // Dynamic import to prevent SSR evaluation errors
  // @ts-expect-error html2pdf.js dynamic import
  const html2pdfModule = await import("html2pdf.js");
  const html2pdf = html2pdfModule.default || html2pdfModule;

  const resolvedFilename = filename.toLowerCase().endsWith(".pdf")
    ? filename
    : `${filename}.pdf`;

  const opt = {
    margin: options?.margin ?? [10, 8, 10, 8],
    filename: resolvedFilename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: options?.scale ?? 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: options?.orientation ?? "portrait",
    },
  };

  await html2pdf().set(opt).from(element).save();
}
