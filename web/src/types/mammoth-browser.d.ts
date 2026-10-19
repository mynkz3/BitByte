declare module "mammoth/mammoth.browser" {
  interface ExtractedText {
    value: string;
    messages: unknown[];
  }

  export function extractRawText(input: {
    arrayBuffer: ArrayBuffer;
  }): Promise<ExtractedText>;
}
