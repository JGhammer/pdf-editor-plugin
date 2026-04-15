# PDF Editor Plugin

一个功能强大的PDF编辑器插件，支持 **Vue 2**、**Vue 3** 和 **React 18** 项目。提供富文本编辑、图片替换、水印去除等功能。

![PDF Editor](https://via.placeholder.com/800x400/1a1a2e/00d9ff?text=PDF+Editor+Plugin)

## ✨ 功能特性

- 📄 **PDF文件上传与解析** - 支持上传PDF文件并自动提取文本内容
- ✏️ **富文本编辑** - 基于Quill.js的强大编辑器，支持：
  - 文本格式化（粗体、斜体、下划线、删除线）
  - 字体大小和颜色调整
  - 段落对齐方式
  - 有序/无序列表
  - 图片插入和替换
  - 链接插入
- 🖼️ **图片替换** - 支持替换PDF中的图片
- 💧 **水印检测与去除** - 自动检测并移除PDF中的文字水印
- 📤 **PDF导出** - 将编辑后的内容导出为新的PDF文件
- 🎨 **现代化UI** - 深色主题设计，美观易用

## 📦 安装

### 使用 npm

```bash
npm install pdf-editor-plugin
```

### 使用 yarn

```bash
yarn add pdf-editor-plugin
```

### 使用 pnpm

```bash
pnpm add pdf-editor-plugin
```

## 🚀 快速开始

### React 项目中使用（推荐）

```jsx
import { PdfEditorReact } from 'pdf-editor-plugin'

function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>PDF 编辑器</h1>
      <PdfEditorReact
        placeholder="请上传或输入内容..."
        onContentChange={(data) => console.log('内容变化:', data.html)}
        onPdfLoaded={(data) => console.log('PDF加载完成，共', data.pages.length, '页')}
        onPdfExported={(pdfBytes) => console.log('PDF已导出')}
      />
    </div>
  )
}

export default App
```

### Vue 3 项目中使用

使用 TypeScript + Composition API：

```vue
<template>
  <PdfEditor 
    @content-change="handleContentChange"
    @pdf-loaded="handlePdfLoaded"
    placeholder="请上传PDF文件..."
  />
</template>

<script setup lang="ts">
import PdfEditor from 'pdf-editor-plugin/src/components/vue/PdfEditor.vue'

const handleContentChange = ({ html, delta }) => {
  console.log('内容变化:', html)
}

const handlePdfLoaded = ({ pages, watermarks }) => {
  console.log('PDF加载成功')
}
</script>
```

### Vue 2 项目中使用

使用 Options API：

```vue
<template>
  <PdfEditor 
    @content-change="handleContentChange"
    @pdf-loaded="handlePdfLoaded"
    placeholder="请上传PDF文件..."
  />
</template>

<script>
import PdfEditor from 'pdf-editor-plugin/src/components/vue/PdfEditorVue2.vue'

export default {
  components: { PdfEditor },
  methods: {
    handleContentChange({ html, delta }) {
      console.log('内容变化:', html)
    },
    handlePdfLoaded({ pages, watermarks }) {
      console.log('PDF加载成功')
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
| `initialContent` | `string` | `''` | 初始HTML内容 |

### Events 事件

#### Vue 组件事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `content-change` | `{ html: string, delta: object }` | 内容变化时触发 |
| `pdf-loaded` | `{ pages: array, watermarks: array }` | PDF加载完成时触发 |
| `pdf-exported` | `Uint8Array` | PDF导出完成时触发 |
| `error` | `Error` | 发生错误时触发 |

#### React 组件属性

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `onContentChange` | `(data) => void` | 内容变化回调 |
| `onPdfLoaded` | `(data) => void` | PDF加载完成回调 |
| `onPdfExported` | `(pdfBytes) => void` | PDF导出完成回调 |
| `onError` | `(error) => void` | 错误回调 |

### 高级用法：使用核心类

如果需要更精细的控制，可以直接使用核心类：

```javascript
import { PDFParser, PDFModifier, RichTextEditor } from 'pdf-editor-plugin'

// 1. 创建PDF解析器实例
const parser = new PDFParser()

// 2. 加载PDF文件
const fileInput = document.querySelector('input[type="file"]')
fileInput.onchange = async (e) => {
  const file = e.target.files[0]
  const pages = await parser.loadPDF(file)
  
  // 获取所有页面内容
  pages.forEach(page => {
    console.log(`第 ${page.pageNumber} 页:`)
    console.log('文本内容:', page.textContent)
    console.log('图片数量:', page.images.length)
  })
  
  // 3. 检测水印
  const watermarks = await parser.detectWatermarks()
  console.log('检测到的水印:', watermarks)
  
  // 4. 去除水印
  const modifier = new PDFModifier()
  const modifiedPdfBytes = await modifier.removeWatermark(
    parser.getPDFBytes(),
    ['水印文本1', '水印文本2']
  )
  
  // 5. 导出修改后的PDF
  const blob = new Blob([new Uint8Array(modifiedPdfBytes)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  window.open(url)
}
```

### 富文本编辑器高级用法

```javascript
import { RichTextEditor } from 'pdf-editor-plugin'

// 创建编辑器实例
const editor = new RichTextEditor('#editor-container', {
  theme: 'snow',
  placeholder: '开始编辑...',
  onContentChange: (html, delta) => {
    console.log('内容更新:', html)
  },
  onImageUpload: async (file) => {
    // 自定义图片上传逻辑
    const formData = new FormData()
    formData.append('image', file)
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    const data = await response.json()
    return data.url
  }
})

// 应用字体样式
editor.applyStyle({
  bold: true,
  italic: false,
  size: '18px',
  color: '#ff0000',
  align: 'center',
  font: 'Arial'
})

// 插入图片
editor.insertImage('/path/to/image.jpg')

// 替换图片
editor.replaceImage('/old-image.jpg', '/new-image.jpg')

// 查找并替换文本
editor.findAndReplace('旧文本', '新文本')

// 获取内容
const htmlContent = editor.getContent()
const textContent = editor.getText()

// 设置内容
editor.setContent('<p>Hello World!</p>')
```

## 🔧 配置选项

### 编辑器工具栏配置

默认工具栏包含以下功能：
- 标题级别（H1-H3）
- 文本格式（粗体、斜体、下划线、删除线）
- 文字颜色和背景色
- 对齐方式
- 列表（有序、无序）
- 缩进
- 链接、图片、视频插入
- 清除格式

如需自定义工具栏，可以通过修改源代码中的 `RichTextEditor` 类来实现。

## 🎯 使用场景

- 📝 **文档编辑** - 在线编辑PDF文档内容
- 🔄 **内容修改** - 批量修改PDF中的文本和图片
- 💧 **水印处理** - 移除不需要的水印信息
- 📚 **文档转换** - 将富文本内容转换为PDF格式
- 🖼️ **图片管理** - 替换PDF中的图片资源

## ⚙️ 技术栈

- **PDF解析**: [pdfjs-dist](https://github.com/nickmccurdy/pdfjs-dist) + [Tesseract.js](https://github.com/naptha/tesseract.js)
- **PDF操作**: [pdf-lib](https://github.com/Hopding/pdf-lib)
- **富文本编辑**: [Quill.js](https://quilljs.com/)
- **框架支持**: Vue 2 / Vue 3 / React 18

## 🐛 常见问题

### Q: 上传PDF后显示乱码？

A: 这通常是因为PDF使用了特殊编码或扫描件。插件会尝试使用OCR识别文本，但识别率取决于图像质量。

### Q: 水印无法完全去除？

A: 水印去除功能主要针对文字水印。对于图片形式的水印，需要使用图像处理技术，当前版本支持有限。

### Q: 导出的PDF格式丢失？

A: 当前版本的PDF导出会保留基本的文本格式，但复杂的排版可能无法完美还原。建议在导出前检查预览。

### Q: 如何自定义样式？

A: 可以通过CSS覆盖默认样式，或者直接修改组件的 `<style>` 部分。

### Q: Vue 2 和 Vue 3 版本有什么区别？

A: 
- **Vue 3 版本** (`PdfEditor.vue`): 使用 TypeScript + Composition API (`<script setup>`)，提供更好的类型支持
- **Vue 2 版本** (`PdfEditorVue2.vue`): 使用 Options API，兼容 Vue 2.x 项目

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**作者**: PDF Editor Plugin Team  
**版本**: 1.0.0  
**最后更新**: 2026-04-15