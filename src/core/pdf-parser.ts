import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

let _workerInitialized = false;

export function initPDFWorker(workerSrc?: string) {
  if (_workerInitialized) return;
  _workerInitialized = true;

  if (workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    return;
  }

  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.js",
      import.meta.url,
    ).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
}

initPDFWorker();

export interface PDFPage {
  pageNumber: number;
  textContent: string;
  images: PDFImage[];
  width: number;
  height: number;
}

export interface PDFImage {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
}

export interface WatermarkInfo {
  type: "text" | "image";
  content: string;
  position: { x: number; y: number };
  opacity: number;
}

export interface ExportPDFOptions {
  fileName?: string;
  pageSize?: "A4" | "Letter" | "Legal";
  orientation?: "portrait" | "landscape";
  margin?: number;
  fontSize?: number;
  fontFamily?: string;
  textColor?: { r: number; g: number; b: number };
}

const PAGE_SIZES: Record<string, [number, number]> = {
  A4: [595, 842],
  Letter: [612, 792],
  Legal: [612, 1008],
};

export class PDFParser {
  private pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
  private pdfBytes: Uint8Array | null = null;

  async loadPDF(file: File | ArrayBuffer): Promise<PDFPage[]> {
    if (file instanceof File) {
      const buf = await file.arrayBuffer();
      this.pdfBytes = new Uint8Array(buf);
    } else {
      this.pdfBytes = new Uint8Array(file);
    }

    const loadingTask = pdfjsLib.getDocument({ data: this.pdfBytes.slice() });
    this.pdfDoc = await loadingTask.promise;

    const pages: PDFPage[] = [];
    for (let i = 1; i <= this.pdfDoc.numPages; i++) {
      const page = await this.pdfDoc.getPage(i);
      const pageData = await this.extractPageContent(page, i);
      pages.push(pageData);
    }

    return pages;
  }

  async loadPDFFromUrl(url: string): Promise<PDFPage[]> {
    const loadingTask = pdfjsLib.getDocument(url);
    this.pdfDoc = await loadingTask.promise;

    const response = await fetch(url);
    const buf = await response.arrayBuffer();
    this.pdfBytes = new Uint8Array(buf);

    const pages: PDFPage[] = [];
    for (let i = 1; i <= this.pdfDoc.numPages; i++) {
      const page = await this.pdfDoc.getPage(i);
      const pageData = await this.extractPageContent(page, i);
      pages.push(pageData);
    }

    return pages;
  }

  private async extractPageContent(
    page: pdfjsLib.PDFPageProxy,
    pageNumber: number,
  ): Promise<PDFPage> {
    const viewport = page.getViewport({ scale: 1.5 });
    const textContent = await page.getTextContent();

    let fullText = "";
    const textItems: Array<{
      str: string;
      x: number;
      y: number;
      fontSize: number;
      fontName: string;
    }> = [];
    textContent.items.forEach((item: any) => {
      fullText += item.str + " ";
      if (item.str && item.str.trim()) {
        textItems.push({
          str: item.str,
          x: item.transform?.[4] || 0,
          y: item.transform?.[5] || 0,
          fontSize: item.height || 12,
          fontName: item.fontName || "",
        });
      }
    });

    const images = await this.extractImages(page);

    return {
      pageNumber,
      textContent: fullText.trim(),
      images,
      width: viewport.width,
      height: viewport.height,
    };
  }

  private async extractImages(
    page: pdfjsLib.PDFPageProxy,
  ): Promise<PDFImage[]> {
    const images: PDFImage[] = [];

    try {
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d")!;

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      const dataUrl = canvas.toDataURL("image/png");
      images.push({
        id: `page-${page.pageNumber}-full`,
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
        dataUrl,
      });
    } catch (error) {
      console.warn("Image extraction warning:", error);
    }

    return images;
  }

  async detectWatermarks(): Promise<WatermarkInfo[]> {
    if (!this.pdfDoc) throw new Error("PDF not loaded");

    const watermarks: WatermarkInfo[] = [];

    for (let i = 1; i <= this.pdfDoc.numPages; i++) {
      const page = await this.pdfDoc.getPage(i);
      const textContent = await page.getTextContent();

      const textMap = new Map<string, { count: number; items: any[] }>();
      textContent.items.forEach((item: any) => {
        const str = item.str.trim();
        if (str.length > 0 && str.length < 50) {
          const existing = textMap.get(str) || { count: 0, items: [] };
          existing.count++;
          existing.items.push(item);
          textMap.set(str, existing);
        }
      });

      textMap.forEach(({ count, items }, text) => {
        if (count >= 3) {
          const hasDiagonalPattern = items.some((item: any) => {
            const transform = item.transform;
            if (!transform) return false;
            const a = Math.abs(transform[0] || 0);
            const b = Math.abs(transform[1] || 0);
            return b / (a + b) > 0.3;
          });

          const hasLowOpacity = items.some((item: any) => {
            return item.opacity !== undefined && item.opacity < 0.5;
          });

          if (hasDiagonalPattern || hasLowOpacity) {
            watermarks.push({
              type: "text",
              content: text,
              position: { x: 0, y: 0 },
              opacity: 0.3,
            });
          }
        }
      });
    }

    return watermarks;
  }

  getPDFDocument(): pdfjsLib.PDFDocumentProxy | null {
    return this.pdfDoc;
  }

  getPDFBytes(): Uint8Array | null {
    return this.pdfBytes;
  }
}

export class PDFModifier {
  async removeWatermark(
    pdfBytes: ArrayBuffer | Uint8Array,
    watermarkTexts: string[],
  ): Promise<Uint8Array> {
    const bytes =
      pdfBytes instanceof Uint8Array
        ? pdfBytes.slice()
        : new Uint8Array(pdfBytes);
    const pdfDoc = await PDFDocument.load(bytes);
    return pdfDoc.save();
  }

  async replaceImage(
    pdfBytes: ArrayBuffer | Uint8Array,
    imageIndex: number,
    newImageFile: File,
  ): Promise<Uint8Array> {
    const bytes =
      pdfBytes instanceof Uint8Array
        ? pdfBytes.slice()
        : new Uint8Array(pdfBytes);
    const pdfDoc = await PDFDocument.load(bytes);
    const imageBytes = await newImageFile.arrayBuffer();
    let newImage;

    if (newImageFile.type === "image/png") {
      newImage = await pdfDoc.embedPng(imageBytes);
    } else {
      newImage = await pdfDoc.embedJpg(imageBytes);
    }

    return pdfDoc.save();
  }

  async modifyTextStyles(
    pdfBytes: ArrayBuffer | Uint8Array,
    modifications: Array<{
      pageIndex: number;
      text: string;
      fontSize?: number;
      fontFamily?: string;
      color?: { r: number; g: number; b: number };
    }>,
  ): Promise<Uint8Array> {
    const bytes =
      pdfBytes instanceof Uint8Array
        ? pdfBytes.slice()
        : new Uint8Array(pdfBytes);
    const pdfDoc = await PDFDocument.load(bytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    modifications.forEach((mod) => {
      if (mod.pageIndex < pages.length) {
        const page = pages[mod.pageIndex];
        const { height } = page.getSize();

        if (mod.text) {
          page.drawText(mod.text, {
            x: 50,
            y: height - 50,
            size: mod.fontSize || 12,
            font,
            color: mod.color
              ? rgb(mod.color.r / 255, mod.color.g / 255, mod.color.b / 255)
              : rgb(0, 0, 0),
          });
        }
      }
    });

    return pdfDoc.save();
  }

  async exportToPDF(
    content: string,
    images: File[] = [],
    options: ExportPDFOptions = {},
  ): Promise<Uint8Array> {
    const { pageSize = "A4", orientation = "portrait" } = options;

    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: ${orientation === "portrait" ? "794px" : "1123px"};
      background: white;
      color: black;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
      font-size: 14px;
      line-height: 1.8;
      padding: 40px;
      box-sizing: border-box;
      word-wrap: break-word;
      overflow-wrap: break-word;
    `;
    container.innerHTML = content;
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");

      const size = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
      const pdfWidth = orientation === "landscape" ? size[1] : size[0];
      const pdfHeight = orientation === "landscape" ? size[0] : size[1];

      const pdf = new jsPDF({
        orientation: orientation === "landscape" ? "l" : "p",
        unit: "pt",
        format: pageSize.toLowerCase() as "a4" | "letter" | "legal",
      });

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = -pdfHeight + (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const pdfOutput = pdf.output("arraybuffer");
      return new Uint8Array(pdfOutput);
    } finally {
      document.body.removeChild(container);
    }
  }

  static downloadPDF(pdfBytes: Uint8Array, fileName: string = "document.pdf") {
    const blob = new Blob([new Uint8Array(pdfBytes)], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
