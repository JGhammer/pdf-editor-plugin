import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import Tesseract from "tesseract.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
  private pdfBytes: ArrayBuffer | null = null;

  async loadPDF(file: File | ArrayBuffer): Promise<PDFPage[]> {
    if (file instanceof File) {
      this.pdfBytes = await file.arrayBuffer();
    } else {
      this.pdfBytes = file;
    }

    const loadingTask = pdfjsLib.getDocument({ data: this.pdfBytes });
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
    this.pdfBytes = await response.arrayBuffer();

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
    const textItems: Array<{ str: string; x: number; y: number; fontSize: number; fontName: string }> = [];
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

      const textMap = new Map<string, number>();
      textContent.items.forEach((item: any) => {
        const str = item.str.trim();
        if (str.length > 0 && str.length < 50) {
          textMap.set(str, (textMap.get(str) || 0) + 1);
        }
      });

      textMap.forEach((count, text) => {
        if (count >= 3) {
          watermarks.push({
            type: "text",
            content: text,
            position: { x: 0, y: 0 },
            opacity: 0.3,
          });
        }
      });
    }

    return watermarks;
  }

  getPDFDocument(): pdfjsLib.PDFDocumentProxy | null {
    return this.pdfDoc;
  }

  getPDFBytes(): ArrayBuffer | null {
    return this.pdfBytes;
  }
}

export class PDFModifier {
  async removeWatermark(
    pdfBytes: ArrayBuffer,
    watermarkTexts: string[],
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    return pdfDoc.save();
  }

  async replaceImage(
    pdfBytes: ArrayBuffer,
    imageIndex: number,
    newImageFile: File,
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
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
    pdfBytes: ArrayBuffer,
    modifications: Array<{
      pageIndex: number;
      text: string;
      fontSize?: number;
      fontFamily?: string;
      color?: { r: number; g: number; b: number };
    }>,
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
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
    const {
      fileName,
      pageSize = "A4",
      orientation = "portrait",
      margin = 50,
      fontSize = 12,
      textColor,
    } = options;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let pageWidth: number, pageHeight: number;
    const size = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
    if (orientation === "landscape") {
      pageWidth = size[1];
      pageHeight = size[0];
    } else {
      pageWidth = size[0];
      pageHeight = size[1];
    }

    const textContent = this.stripHTML(content);
    const lines = this.wrapText(textContent, font, fontSize, pageWidth - margin * 2);

    let yPosition = pageHeight - margin;
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);

    const textColorRgb = textColor
      ? rgb(textColor.r / 255, textColor.g / 255, textColor.b / 255)
      : rgb(0, 0, 0);

    lines.forEach((line) => {
      if (yPosition < margin + fontSize) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
      }
      currentPage.drawText(line, {
        x: margin,
        y: yPosition,
        size: fontSize,
        font,
        color: textColorRgb,
      });
      yPosition -= fontSize * 1.5;
    });

    for (const imageFile of images) {
      try {
        const imageBytes = await imageFile.arrayBuffer();
        let image;
        if (imageFile.type === "image/png") {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          image = await pdfDoc.embedJpg(imageBytes);
        }

        const imgPage = pdfDoc.addPage([pageWidth, pageHeight]);
        const scaledWidth = Math.min(image.width, pageWidth - margin * 2);
        const scaledHeight = (image.height * scaledWidth) / image.width;

        if (scaledHeight > pageHeight - margin * 2) {
          const adjustedHeight = pageHeight - margin * 2;
          const adjustedWidth = (image.width * adjustedHeight) / image.height;
          imgPage.drawImage(image, {
            x: (pageWidth - adjustedWidth) / 2,
            y: (pageHeight - adjustedHeight) / 2,
            width: adjustedWidth,
            height: adjustedHeight,
          });
        } else {
          imgPage.drawImage(image, {
            x: (pageWidth - scaledWidth) / 2,
            y: (pageHeight - scaledHeight) / 2,
            width: scaledWidth,
            height: scaledHeight,
          });
        }
      } catch (error) {
        console.error("Failed to embed image:", error);
      }
    }

    return pdfDoc.save();
  }

  static downloadPDF(pdfBytes: Uint8Array, fileName: string = "document.pdf") {
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private stripHTML(html: string): string {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  private wrapText(
    text: string,
    font: any,
    fontSize: number,
    maxWidth: number,
  ): string[] {
    const paragraphs = text.split("\n");
    const lines: string[] = [];

    paragraphs.forEach((paragraph) => {
      if (!paragraph.trim()) {
        lines.push("");
        return;
      }

      const words = paragraph.split(" ");
      let currentLine = "";

      words.forEach((word) => {
        const testLine = currentLine + word + " ";
        try {
          const metrics = font.widthOfTextAtSize(testLine, fontSize);
          if (metrics > maxWidth && currentLine !== "") {
            lines.push(currentLine.trim());
            currentLine = word + " ";
          } else {
            currentLine = testLine;
          }
        } catch {
          if (currentLine.length + word.length > 80 && currentLine !== "") {
            lines.push(currentLine.trim());
            currentLine = word + " ";
          } else {
            currentLine = testLine;
          }
        }
      });

      if (currentLine) {
        lines.push(currentLine.trim());
      }
    });

    return lines;
  }
}