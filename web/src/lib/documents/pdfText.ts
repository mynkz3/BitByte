import type { PDFDocumentProxy } from "pdfjs-dist";
import { joinPageText } from "./textCleanup";

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({ data: bytes }).promise;
  return extractPdfDocumentText(document);
}

export async function extractPdfDocumentText(
  document: PDFDocumentProxy,
): Promise<string> {
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .filter((item): item is typeof item & { str: string } => "str" in item)
        .map((item) => item.str)
        .join(" "),
    );
  }

  return joinPageText(pages);
}
