import * as mammoth from "mammoth/mammoth.browser";
import { cleanDocumentText } from "./textCleanup";

export async function extractDocxText(file: File): Promise<string> {
  const result = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  });
  return cleanDocumentText(result.value);
}
