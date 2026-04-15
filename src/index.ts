// React 组件
export { default as PdfEditorReact } from "./components/react/PdfEditor";

// 核心类（供高级用户使用）
export { PDFParser, PDFModifier } from "./core/pdf-parser";
export { RichTextEditor } from "./core/rich-text-editor";

// 类型导出
export type { PDFPage, PDFImage, WatermarkInfo } from "./core/pdf-parser";

export type { EditorConfig, FontStyle } from "./core/rich-text-editor";

// Vue组件需要单独引入（由于构建工具限制）
// 使用方式: import PdfEditorVue from 'pdf-editor-plugin/dist/vue/PdfEditor.vue'
