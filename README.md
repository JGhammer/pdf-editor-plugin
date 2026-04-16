# PDF Editor Plugin

[![npm version](https://badge.fury.io/js/pdf-editor-plugin.svg)](https://badge.fury.io/js/pdf-editor-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个功能强大的 PDF 编辑器插件，支持 **Vue 2**、**Vue 3** 和 **React 18** 项目。提供富文本编辑、图片替换、水印去除、自定义样式等功能。

## ✨ 功能特性

- 📄 **PDF 文件上传与解析** - 支持上传 PDF 文件并自动提取文本和图片内容
- ✏️ **富文本编辑** - 基于 Quill.js 的强大编辑器，支持：
  - 文本格式化（粗体、斜体、下划线、删除线）
  - 字体大小和颜色调整
  - 段落对齐方式
  - 有序/无序列表
  - 图片插入和替换
  - 链接插入
- 🖼️ **图片替换** - 支持替换 PDF 中的图片
- 💧 **水印检测与去除** - 自动检测并移除 PDF 中的文字水印
- 📤 **PDF 导出下载** - 将编辑后的内容导出为 PDF 文件并自动下载
- 🎨 **自定义编辑区样式** - 通过参数指定编辑区域的宽高、背景色等
- 📘 **TypeScript 支持** - 完整的类型定义

## 📦 安装

```bash
# 使用 npm
npm install pdf-editor-plugin

# 使用 yarn
yarn add pdf-editor-plugin

# 使用 pnpm
pnpm add pdf-editor-plugin
```

## 🚀 快速开始

### React 项目中使用

```jsx
import PdfEditor from 'pdf-editor-plugin'
import 'pdf-editor-plugin/dist/style.css'

function App() {
  return (
    <PdfEditor
      placeholder="请上传或输入内容..."
      editorStyle={{
        width: '100%',
        height: '600px',
        background: '#1a1a2e',
        fontSize: '14px',
        textColor: '#ffffff'
      }}
      exportFileName="my-document"
      onContentChange={(data) => console.log('内容变化:', data.html)}
      onPdfLoaded={(data) => console.log('PDF 加载完成')}
      onPdfExported={(pdfBytes) => console.log('PDF 已导出')}
    />
  )
}

export default App
```

### Vue 3 项目中使用

```vue
<template>
  <PdfEditor 
    placeholder="请上传 PDF 文件..."
    :editor-style="{
      width: '100%',
      height: '600px',
      background: '#1a1a2e',
      fontSize: '14px',
      textColor: '#ffffff'
    }"
    export-file-name="my-document"
    @content-change="handleContentChange"
    @pdf-loaded="handlePdfLoaded"
    @pdf-exported="handlePdfExported"
  />
</template>

<script setup>
import PdfEditor from 'pdf-editor-plugin/vue3'
import 'pdf-editor-plugin/dist/style.css'

const handleContentChange = ({ html, delta }) => {
  console.log('内容变化:', html)
}

const handlePdfLoaded = ({ pages, watermarks }) => {
  console.log('PDF 加载成功，共', pages.length, '页')
}

const handlePdfExported = (pdfBytes) => {
  console.log('PDF 已导出')
}
</script>
```

### Vue 2 项目中使用

```vue
<template>
  <PdfEditor 
    placeholder="请上传 PDF 文件..."
    :editor-style="editorStyle"
    export-file-name="my-document"
    @content-change="handleContentChange"
  />
</template>

<script>
import PdfEditor from 'pdf-editor-plugin/vue2'
import 'pdf-editor-plugin/dist/style.css'

export default {
  components: { PdfEditor },
  data() {
    return {
      editorStyle: {
        width: '100%',
        height: '600px',
        background: '#1a1a2e'
      }
    }
  },
  methods: {
    handleContentChange({ html }) {
      console.log('内容变化:', html)
    }
  }
}
</script>
```

## 📋 API 文档

### Props 属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `placeholder` | `string` | `'请输入或粘贴PDF内容...'` | 编辑器占位符文本 |
| `readOnly` | `boolean` | `false` | 是否只读模式 |
| `initialContent` | `string` | `''` | 初始 HTML 内容 |
| `editorStyle` | `EditorStyle` | `{}` | 编辑区自定义样式 |
| `exportFileName` | `string` | `'edited-document'` | 导出 PDF 文件名（不含扩展名） |
| `exportOptions` | `ExportPDFOptions` | `{}` | 导出 PDF 高级选项 |

### EditorStyle 类型

```typescript
interface EditorStyle {
  width?: string        // 编辑区宽度，如 '100%', '800px'
  height?: string       // 编辑区高度，如 '600px', '80vh'
  minHeight?: string    // 最小高度，如 '400px'
  background?: string   // 背景色，如 '#1a1a2e', 'white'
  borderColor?: string  // 边框颜色
  borderRadius?: string // 圆角大小
  padding?: string      // 内边距
  fontSize?: string     // 字体大小，如 '14px'
  fontFamily?: string   // 字体族，如 'Arial, sans-serif'
  textColor?: string    // 文字颜色，如 '#ffffff'
}
```

### ExportPDFOptions 类型

```typescript
interface ExportPDFOptions {
  fileName?: string                    // 文件名
  pageSize?: 'A4' | 'Letter' | 'Legal' // 纸张大小，默认 A4
  orientation?: 'portrait' | 'landscape' // 页面方向，默认 portrait
  margin?: number                      // 页边距，默认 50
  fontSize?: number                    // 字体大小，默认 12
  fontFamily?: string                  // 字体族
  textColor?: { r: number; g: number; b: number } // 文字颜色 RGB
}
```

### Events 事件

#### Vue 组件事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `content-change` | `{ html: string, delta: object }` | 内容变化时触发 |
| `pdf-loaded` | `{ pages: array, watermarks: array }` | PDF 加载完成时触发 |
| `pdf-exported` | `Uint8Array` | PDF 导出完成时触发 |
| `error` | `Error` | 发生错误时触发 |

#### React 组件属性

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `onContentChange` | `(data) => void` | 内容变化回调 |
| `onPdfLoaded` | `(data) => void` | PDF 加载完成回调 |
| `onPdfExported` | `(pdfBytes) => void` | PDF 导出完成回调 |
| `onError` | `(error) => void` | 错误回调 |

### 高级用法：使用核心类

```javascript
import { PDFParser, PDFModifier, RichTextEditor } from 'pdf-editor-plugin'

// 1. 创建 PDF 解析器实例
const parser = new PDFParser()

// 2. 加载 PDF 文件
const fileInput = document.querySelector('input[type="file"]')
fileInput.onchange = async (e) => {
  const file = e.target.files[0]
  const pages = await parser.loadPDF(file)
  
  pages.forEach(page => {
    console.log(`第 ${page.pageNumber} 页:`)
    console.log('文本内容:', page.textContent)
    console.log('图片数量:', page.images.length)
  })
  
  // 3. 检测水印
  const watermarks = await parser.detectWatermarks()
  
  // 4. 去除水印
  const modifier = new PDFModifier()
  const modifiedPdfBytes = await modifier.removeWatermark(
    parser.getPDFBytes(),
    ['水印文本1', '水印文本2']
  )
  
  // 5. 导出并下载 PDF
  PDFModifier.downloadPDF(modifiedPdfBytes, 'output.pdf')
}

// 6. 自定义富文本编辑器
const editor = new RichTextEditor('#editor-container', {
  style: {
    width: '800px',
    height: '600px',
    background: '#ffffff',
    fontSize: '16px',
    textColor: '#333333'
  },
  onContentChange: (html, delta) => {
    console.log('内容更新:', html)
  },
  onImageUpload: async (file) => {
    const formData = new FormData()
    formData.append('image', file)
    const response = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await response.json()
    return data.url
  }
})

// 获取所有图片
const images = editor.getAllImages()

// 替换图片
editor.replaceImage('/old-image.jpg', '/new-image.jpg')

// 查找替换文本
editor.findAndReplace('旧文本', '新文本')

// 动态更新样式
editor.updateStyle({ background: '#f0f0f0', fontSize: '18px' })
```

## 🎯 使用场景

- 📝 **文档编辑** - 在线编辑 PDF 文档内容
- 🔄 **内容修改** - 批量修改 PDF 中的文本和图片
- 💧 **水印处理** - 移除不需要的水印信息
- 📚 **文档转换** - 将富文本内容转换为 PDF 格式
- 🖼️ **图片管理** - 替换 PDF 中的图片资源

## ⚙️ 技术栈

- **PDF 解析**: [pdfjs-dist](https://github.com/nickmccurdy/pdfjs-dist) + [Tesseract.js](https://github.com/naptha/tesseract.js)
- **PDF 操作**: [pdf-lib](https://github.com/Hopding/pdf-lib)
- **富文本编辑**: [Quill.js](https://quilljs.com/)
- **框架支持**: Vue 2 / Vue 3 / React 18

## 🐛 常见问题

### Q: 上传 PDF 后显示乱码？

A: 这通常是因为 PDF 使用了特殊编码或扫描件。插件会尝试使用 OCR 识别文本，但识别率取决于图像质量。

### Q: 水印无法完全去除？

A: 水印去除功能主要针对文字水印。对于图片形式的水印，需要使用图像处理技术，当前版本支持有限。

### Q: 导出的 PDF 格式丢失？

A: 当前版本的 PDF 导出会保留基本的文本格式，但复杂的排版可能无法完美还原。建议在导出前检查预览。

### Q: 如何自定义编辑区样式？

A: 通过 `editorStyle` 属性指定：

```jsx
<PdfEditor
  editorStyle={{
    width: '100%',
    height: '600px',
    background: '#ffffff',
    fontSize: '16px',
    textColor: '#333333'
  }}
/>
```

### Q: 如何自定义导出 PDF 的文件名？

A: 通过 `exportFileName` 属性指定：

```jsx
<PdfEditor exportFileName="my-document" />
```

### Q: 在 Vite 项目中使用报错？

A: 确保正确导入样式文件：
```javascript
import 'pdf-editor-plugin/dist/style.css'
```

如果遇到模块解析问题，可以在 `vite.config.js` 中添加：
```javascript
export default {
  optimizeDeps: {
    include: ['pdf-editor-plugin']
  }
}
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

- **作者**: JGhammer
- **GitHub**: [https://github.com/JGhammer/pdf-editor-plugin](https://github.com/JGhammer/pdf-editor-plugin)
- **Issues**: [https://github.com/JGhammer/pdf-editor-plugin/issues](https://github.com/JGhammer/pdf-editor-plugin/issues)

---

**版本**: 1.0.0  
**最后更新**: 2026-04-15