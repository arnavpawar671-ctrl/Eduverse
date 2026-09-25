/**
 * Client-side text extraction so uploaded study materials can be used as
 * AI Tutor context ("Chat with your notes").
 */

const MAX_TEXT_CHARS = 120_000;
const TEXT_EXT = ["txt", "md", "csv", "json", "log", "rtf"];

function clean(text: string): string {
  return text
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

export function supportsNoteExtraction(file: File): boolean {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (file.type.startsWith("text/")) return true;
  return ["pdf", "docx", ...TEXT_EXT].includes(ext);
}

export async function extractNoteText(file: File): Promise<string | null> {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  try {
    if (file.type.startsWith("text/") || TEXT_EXT.includes(ext)) {
      if (file.size > 2_000_000) return null;
      const text = await file.text();
      return clean(text);
    }
    if (ext === "pdf") return clean(await extractPdf(file));
    if (ext === "docx") return clean(await extractDocx(file));
    return null;
  } catch (err) {
    console.warn("Note extraction failed", err);
    return null;
  }
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerMod = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default;

  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  const maxPages = Math.min(doc.numPages, 80);
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .trim(),
    );
  }
  return pages.join("\n\n");
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
