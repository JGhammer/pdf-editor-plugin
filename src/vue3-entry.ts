import "./styles/editor.css";

export { default } from "./components/vue/PdfEditorVue3";
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