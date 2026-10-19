export function cleanDocumentText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
}

export function joinPageText(pages: string[]): string {
  return pages.map(cleanDocumentText).filter(Boolean).join("\n\n");
}
