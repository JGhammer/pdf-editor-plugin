# 快速入门指南

本指南将帮助你在 5 分钟内开始使用 PDF Editor Plugin。

## 📦 安装

```bash
npm install pdf-editor-plugin
```

## 🚀 React 项目快速开始

### 1. 创建组件

```jsx
// src/App.jsx
import PdfEditor from 'pdf-editor-plugin'
import 'pdf-editor-plugin/dist/style.css'

function App() {
  return (
    <div style={{ padding: '20px' }}>
      <PdfEditor 
        placeholder="上传 PDF 文件开始编辑..."
        onContentChange={(data) => console.log('内容已更新')}
      />
    </div>
  )
}

export default App
```

### 2. 启动项目

```bash
npm run dev
```

## 🎨 Vue 3 项目快速开始

### 1. 创建组件

```vue
<!-- src/App.vue -->
<template>
  <div style="padding: 20px">
    <PdfEditor 
      placeholder="上传 PDF 文件开始编辑..."
      @content-change="handleChange"
    />
  </div>
</template>

<script setup>
import PdfEditor from 'pdf-editor-plugin/vue3'
import 'pdf-editor-plugin/dist/style.css'

const handleChange = ({ html }) => {
  console.log('内容已更新:', html)
}
</script>
```

### 2. 启动项目

```bash
npm run dev
```

## 🎯 Vue 2 项目快速开始

### 1. 创建组件

```vue
<!-- src/App.vue -->
<template>
  <div style="padding: 20px">
    <PdfEditor 
      placeholder="上传 PDF 文件开始编辑..."
      @content-change="handleChange"
    />
  </div>
</template>

<script>
import PdfEditor from 'pdf-editor-plugin/vue2'
import 'pdf-editor-plugin/dist/style.css'

export default {
  components: { PdfEditor },
  methods: {
    handleChange({ html }) {
      console.log('内容已更新:', html)
    }
  }
}
</script>
```

### 2. 启动项目

```bash
npm run serve
```

## ✅ 验证安装

打开浏览器，你应该能看到一个带有深色主题的编辑器界面。尝试以下操作：

1. **上传 PDF** - 点击"上传 PDF 文件"按钮
2. **编辑内容** - 在富文本编辑器中修改文本
3. **导出 PDF** - 点击"导出 PDF"按钮下载编辑后的文件

## 🐛 常见问题

### 问题 1: 样式不显示

**解决方案**: 确保导入了 CSS 文件：
```javascript
import 'pdf-editor-plugin/dist/style.css'
```

### 问题 2: Vite 项目报错

**解决方案**: 在 `vite.config.js` 中添加：
```javascript
export default {
  optimizeDeps: {
    include: ['pdf-editor-plugin']
  }
}
```

### 问题 3: TypeScript 类型错误

**解决方案**: 确保你的 `tsconfig.json` 包含：
```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

## 📚 下一步

- 查看 [完整 API 文档](./README.md#-api-文档)
- 了解 [高级用法](./README.md#高级用法使用核心类)
- 浏览 [示例项目](./examples/)

## 💡 提示

- 使用最新版本的 React/Vue 以获得最佳体验
- PDF 文件大小建议不超过 10MB
- 复杂的 PDF 排版可能需要手动调整

---

**需要帮助?** 查看 [常见问题](./README.md#-常见问题) 或 [提交 Issue](https://github.com/JGhammer/pdf-editor-plugin/issues)