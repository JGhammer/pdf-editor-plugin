import "./styles/editor.css";

export { default } from "./components/vue/PdfEditorVue2";
export { PDFCanvasEditor } from "./core/pdf-canvas-editor";
export { PDFParser, PDFModifier, initPDFWorker } from "./core/pdf-parser";
export { RichTextEditor } from "./core/rich-text-editor";

export type { EditorElement } from "./core/pdf-canvas-editor";

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
