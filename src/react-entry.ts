export { default } from "./components/react/PdfEditor";
export { PDFParser, PDFModifier, initPDFWorker } from "./core/pdf-parser";
export { RichTextEditor } from "./core/rich-text-editor";

export type {
  PDFPage,
  PDFImage,
  WatermarkInfo,
  ExportPDFOptions,
} from "./core/pdf-parser";

export type {
  EditorConfig,
  EditorStyle,
  FontStyle,
} from "./core/rich-text-editor";