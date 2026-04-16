// React 组件
export { default as PdfEditorReact } from "./components/react/PdfEditor";

// 核心类（供高级用户使用）
export { PDFParser, PDFModifier } from "./core/pdf-parser";
export { RichTextEditor } from "./core/rich-text-editor";

// 类型导出
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

// 默认导出（React 组件）
import PdfEditorReact from "./components/react/PdfEditor";
export default PdfEditorReact;