# PDF Editor Plugin

[![npm version](https://badge.fury.io/js/pdf-editor-plugin.svg)](https://badge.fury.io/js/pdf-editor-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个PDF 编辑器插件，支持 **Vue 2**、**Vue 3** 和 **React 18** 项目。提供富文本编辑、图片替换、水印去除、自定义样式等功能。

## ✨ 功能特性

- 📄 **PDF 文件上传与解析** - 支持上传 PDF 文件并自动提取文本和图片内容
- ✏️ **富文本编辑** - 基于 Quill.js 的强大编辑器
- 🖼️ **图片替换** - 支持替换 PDF 中的图片
- 💧 **水印检测与去除** - 自动检测并移除 PDF 中的文字水印
- 📤 **PDF 导出下载** - 将编辑后的内容导出为 PDF 文件并自动下载
- 🎨 **自定义编辑区样式** - 通过参数指定编辑区域的宽高、背景色等
- 📘 **TypeScript 支持** - 完整的类型定义

## 📦 安装

```bash
npm install pdf-editor-plugin
```

## 🚀 快速开始

### React 项目

```jsx
import PdfEditor from "pdf-editor-plugin";
import "pdf-editor-plugin/style.css";

function App() {
  return (
    <PdfEditor
      editorStyle={{ width: "100%", height: "600px", background: "#1a1a2e" }}
      exportFileName="my-document"
      onContentChange={(data) => console.log(data.html)}
    />
  );
}
```

### Vue 3 项目

```vue
<template>
  <PdfEditor
    :editor-style="{ width: '100%', height: '600px' }"
    export-file-name="my-document"
    @content-change="handleChange"
  />
</template>

<script setup>
import PdfEditor from "pdf-editor-plugin/vue3";
import "pdf-editor-plugin/style.css";
</script>
```

### Vue 2 项目

```vue
<template>
  <PdfEditor @content-change="handleChange" />
</template>

<script>
import PdfEditor from "pdf-editor-plugin/vue2";
import "pdf-editor-plugin/style.css";

export default {
  components: { PdfEditor },
  methods: {
    handleChange({ html }) {
      console.log(html);
    },
  },
};
</script>
```

## 📋 导入方式

| 导入路径                      | 框架  | 说明                              |
| ----------------------------- | ----- | --------------------------------- |
| `pdf-editor-plugin`           | React | 默认导出，包含 React 组件和核心类 |
| `pdf-editor-plugin/react`     | React | React 专用入口                    |
| `pdf-editor-plugin/vue3`      | Vue 3 | Vue 3 专用入口                    |
| `pdf-editor-plugin/vue2`      | Vue 2 | Vue 2 专用入口                    |
| `pdf-editor-plugin/style.css` | 通用  | 样式文件                          |

### 核心类导入

```javascript
import { PDFParser, PDFModifier, RichTextEditor } from "pdf-editor-plugin";
```

## 📋 API 文档

### Props 属性

| 属性名           | 类型               | 默认值                     | 说明              |
| ---------------- | ------------------ | -------------------------- | ----------------- |
| `placeholder`    | `string`           | `'请输入或粘贴PDF内容...'` | 编辑器占位符文本  |
| `readOnly`       | `boolean`          | `false`                    | 是否只读模式      |
| `initialContent` | `string`           | `''`                       | 初始 HTML 内容    |
| `editorStyle`    | `EditorStyle`      | `{}`                       | 编辑区自定义样式  |
| `exportFileName` | `string`           | `'edited-document'`        | 导出 PDF 文件名   |
| `exportOptions`  | `ExportPDFOptions` | `{}`                       | 导出 PDF 高级选项 |

### EditorStyle 类型

```typescript
interface EditorStyle {
  width?: string; // 编辑区宽度，如 '100%', '800px'
  height?: string; // 编辑区高度，如 '600px', '80vh'
  minHeight?: string; // 最小高度，如 '400px'
  background?: string; // 背景色，如 '#1a1a2e', 'white'
  borderColor?: string; // 边框颜色
  borderRadius?: string; // 圆角大小
  padding?: string; // 内边距
  fontSize?: string; // 字体大小，如 '14px'
  fontFamily?: string; // 字体族
  textColor?: string; // 文字颜色，如 '#ffffff'
}
```

### ExportPDFOptions 类型

```typescript
interface ExportPDFOptions {
  pageSize?: "A4" | "Letter" | "Legal";
  orientation?: "portrait" | "landscape";
  margin?: number;
  fontSize?: number;
  textColor?: { r: number; g: number; b: number };
}
```

### Events 事件

| 事件名         | Vue               | React             | 参数                    | 说明         |
| -------------- | ----------------- | ----------------- | ----------------------- | ------------ |
| content-change | `@content-change` | `onContentChange` | `{ html, delta }`       | 内容变化     |
| pdf-loaded     | `@pdf-loaded`     | `onPdfLoaded`     | `{ pages, watermarks }` | PDF 加载完成 |
| pdf-exported   | `@pdf-exported`   | `onPdfExported`   | `Uint8Array`            | PDF 导出完成 |
| error          | `@error`          | `onError`         | `Error`                 | 发生错误     |

### 核心类 API

```javascript
import { PDFParser, PDFModifier, RichTextEditor } from "pdf-editor-plugin";

// PDF 解析
const parser = new PDFParser();
const pages = await parser.loadPDF(file);
const watermarks = await parser.detectWatermarks();

// PDF 修改与导出
const modifier = new PDFModifier();
const pdfBytes = await modifier.exportToPDF(content, images, options);
PDFModifier.downloadPDF(pdfBytes, "output.pdf"); // 静态方法，直接下载

// 富文本编辑器
const editor = new RichTextEditor("#container", { style: { height: "600px" } });
editor.setContent("<p>Hello</p>");
editor.getContent();
editor.applyStyle({ bold: true, color: "#ff0000" });
editor.getAllImages();
editor.replaceImage(oldUrl, newUrl);
editor.insertImage(url);
editor.findAndReplace("旧文本", "新文本");
editor.updateStyle({ background: "#fff" });
```

## 🐛 常见问题

### Q: PDF.js Worker 配置？

A: 插件默认使用 `new URL()` 模式自动从本地 `pdfjs-dist` 包加载 Worker，**无需联网**且**版本一致**。如果自动检测失败，会回退到 CDN。

你也可以手动配置 Worker：

```javascript
import { initPDFWorker } from "pdf-editor-plugin";

// 方式1：使用本地 worker 文件（推荐，离线可用，版本一致）
initPDFWorker(
  new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url).toString(),
);

// 方式2：使用 CDN（需要联网）
initPDFWorker(
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
);

// 方式3：使用本地文件路径
initPDFWorker("/assets/pdf.worker.min.js");
```

**Vite 项目**中推荐在入口文件添加：

```javascript
// main.ts / main.jsx
import { initPDFWorker } from "pdf-editor-plugin";
initPDFWorker(
  new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url).toString(),
);
```

**Webpack 5 项目**中推荐：

```javascript
import { initPDFWorker } from "pdf-editor-plugin";
initPDFWorker(
  new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url).toString(),
);
```

### Q: Vite 项目中报错？

A: 在 `vite.config.js` 中添加：

```javascript
export default {
  optimizeDeps: {
    include: ["pdf-editor-plugin"],
  },
};
```

### Q: 样式不显示？

A: 确保导入样式文件：

```javascript
import "pdf-editor-plugin/style.css";
```

### Q: 如何自定义编辑区样式？

A: 通过 `editorStyle` 属性：

```jsx
<PdfEditor
  editorStyle={{ width: "100%", height: "600px", background: "#fff" }}
/>
```

## ⚙️ 技术栈

- **PDF 解析**: pdfjs-dist
- **PDF 操作**: pdf-lib
- **富文本编辑**: Quill.js
- **框架支持**: Vue 2 / Vue 3 / React 18

## 📄 许可证

MIT License

## 📮 联系方式

- **GitHub**: [https://github.com/JGhammer/pdf-editor-plugin](https://github.com/JGhammer/pdf-editor-plugin)
