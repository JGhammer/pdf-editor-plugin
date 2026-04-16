# PDF Editor Plugin - 测试指南

## 🧪 如何测试插件功能

### 方法一：使用测试页面（推荐）

1. **构建项目**
   ```bash
   npm install
   npm run build
   ```

2. **启动本地服务器**
   ```bash
   # 使用 Python（如果已安装）
   python -m http.server 8080
   
   # 或使用 Node.js 的 http-server
   npx http-server -p 8080
   
   # 或使用 VS Code 的 Live Server 插件
   ```

3. **打开测试页面**
   ```
   http://localhost:8080/examples/test.html
   ```

### 方法二：在实际项目中测试

#### React 项目测试

1. 创建一个新的 React 项目：
   ```bash
   npx create-react-app test-app
   cd test-app
   ```

2. 安装插件：
   ```bash
   npm install file:../path/to/pdf-editor-plugin
   ```

3. 在 `src/App.js` 中使用：
   ```jsx
   import { PdfEditorReact } from 'pdf-editor-plugin'
   import 'pdf-editor-plugin/dist/style.css'

   function App() {
     return (
       <div style={{ padding: '20px' }}>
         <h1>PDF 编辑器测试</h1>
         <PdfEditorReact 
           placeholder="请上传PDF文件..."
           onContentChange={(data) => console.log('内容变化:', data)}
           onPdfLoaded={(data) => console.log('PDF加载完成:', data)}
         />
       </div>
     )
   }

   export default App
   ```

4. 启动项目：
   ```bash
   npm start
   ```

#### Vue 3 项目测试

1. 创建 Vue 项目：
   ```bash
   npm create vue@latest test-vue-app
   cd test-vue-app
   npm install
   ```

2. 安装插件：
   ```bash
   npm install file:../path/to/pdf-editor-plugin
   ```

3. 在 `src/App.vue` 中使用：
   ```vue
   <template>
     <div style="padding: 20px">
       <h1>PDF 编辑器测试</h1>
       <PdfEditor 
         placeholder="请上传PDF文件..."
         @content-change="handleContentChange"
         @pdf-loaded="handlePdfLoaded"
       />
     </div>
   </template>

   <script setup>
   import PdfEditor from 'pdf-editor-plugin/src/components/vue/PdfEditor.vue'
   import 'pdf-editor-plugin/dist/style.css'

   const handleContentChange = (data) => {
     console.log('内容变化:', data)
   }

   const handlePdfLoaded = (data) => {
     console.log('PDF加载完成:', data)
   }
   </script>
   ```

4. 启动项目：
   ```bash
   npm run dev
   ```

#### Vue 2 项目测试

1. 创建 Vue 2 项目：
   ```bash
   vue create test-vue2-app
   # 选择 Vue 2
   cd test-vue2-app
   ```

2. 安装插件：
   ```bash
   npm install file:../path/to/pdf-editor-plugin
   ```

3. 在 `src/App.vue` 中使用：
   ```vue
   <template>
     <div style="padding: 20px">
       <h1>PDF 编辑器测试</h1>
       <PdfEditor 
         placeholder="请上传PDF文件..."
         @content-change="handleContentChange"
       />
     </div>
   </template>

   <script>
   import PdfEditor from 'pdf-editor-plugin/src/components/vue/PdfEditorVue2.vue'
   import 'pdf-editor-plugin/dist/style.css'

   export default {
     components: { PdfEditor },
     methods: {
       handleContentChange(data) {
         console.log('内容变化:', data)
       }
     }
   }
   </script>
   ```

4. 启动项目：
   ```bash
   npm run serve
   ```

## 📝 测试清单

### ✅ 基础功能测试

- [ ] 编辑器正常加载
- [ ] 工具栏显示正常
- [ ] 文本输入功能
- [ ] 文本格式化（粗体、斜体、下划线）
- [ ] 字体颜色和大小调整
- [ ] 段落对齐
- [ ] 列表功能

### ✅ PDF 功能测试

- [ ] PDF 文件上传
- [ ] PDF 文本提取
- [ ] 水印检测
- [ ] 水印去除
- [ ] 图片替换
- [ ] PDF 导出

### ✅ 样式测试

- [ ] 深色主题显示正常
- [ ] 响应式布局
- [ ] 按钮交互效果
- [ ] 滚动条样式

## 🐛 常见问题排查

### 问题1：模块加载失败

**原因**：未构建项目或路径错误

**解决**：
```bash
npm run build
```

### 问题2：样式不显示

**原因**：未导入 CSS 文件

**解决**：
```javascript
import 'pdf-editor-plugin/dist/style.css'
```

### 问题3：Quill 编辑器报错

**原因**：Quill 依赖未正确安装

**解决**：
```bash
npm install quill
```

### 问题4：PDF.js worker 报错

**原因**：Worker 文件路径问题

**解决**：已在代码中配置 CDN 路径，确保网络连接正常

## 📊 性能测试

### 测试大文件

1. 准备一个 10MB 以上的 PDF 文件
2. 上传并观察加载时间
3. 检查内存使用情况
4. 测试编辑响应速度

### 测试并发操作

1. 快速连续点击按钮
2. 同时进行多个编辑操作
3. 检查是否有内存泄漏

## 🎯 下一步

测试通过后，你可以：

1. 在实际项目中集成插件
2. 根据需求自定义样式
3. 扩展功能（如添加更多工具栏选项）
4. 优化性能（如懒加载、代码分割）

---

如有问题，请查看 [README.md](../README.md) 或提交 Issue。