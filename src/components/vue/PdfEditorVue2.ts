import { defineComponent } from 'vue'
import { PDFParser, PDFModifier } from '../../core/pdf-parser'
import { RichTextEditor } from '../../core/rich-text-editor'

export { PDFParser, PDFModifier } from '../../core/pdf-parser'
export { RichTextEditor } from '../../core/rich-text-editor'

export default defineComponent({
  name: 'PdfEditor',
  props: {
    placeholder: { type: String, default: '请输入或粘贴PDF内容...' },
    readOnly: { type: Boolean, default: false },
    initialContent: { type: String, default: '' },
    editorStyle: { type: Object, default: () => ({}) },
    exportFileName: { type: String, default: 'edited-document' },
    exportOptions: { type: Object, default: () => ({}) }
  },
  emits: ['content-change', 'pdf-loaded', 'pdf-exported', 'error'],
  data() {
    return {
      fileName: '',
      hasPDF: false,
      hasContent: false,
      isProcessing: false,
      watermarks: [],
      editor: null,
      pdfParser: null,
      pdfModifier: null
    }
  },
  computed: {
    wrapperStyle() {
      var s = this.editorStyle
      return { width: s && s.width || undefined, background: s && s.background || undefined }
    },
    editorContainerStyle() {
      var s = this.editorStyle
      return { height: s && s.height || undefined, minHeight: s && s.minHeight || undefined, background: s && s.background || undefined, borderRadius: s && s.borderRadius || undefined }
    },
    editorInnerStyle() {
      var s = this.editorStyle
      return { height: s && s.height || undefined, minHeight: s && s.minHeight || undefined, padding: s && s.padding || undefined, fontSize: s && s.fontSize || undefined, fontFamily: s && s.fontFamily || undefined, color: s && s.textColor || undefined }
    }
  },
  mounted() { this.initEditor() },
  beforeDestroy() { if (this.editor) this.editor.destroy() },
  methods: {
    async initEditor() {
      if (this.$refs.editorRef) {
        this.editor = new RichTextEditor(this.$refs.editorRef, {
          placeholder: this.placeholder,
          readOnly: this.readOnly,
          style: this.editorStyle,
          onContentChange: (html, delta) => {
            this.hasContent = !!html && html !== '<p><br></p>'
            this.$emit('content-change', { html: html, delta: delta })
          },
          onImageUpload: async (file) => {
            return new Promise((resolve) => {
              var reader = new FileReader()
              reader.onload = (e) => resolve(e.target.result as string)
              reader.readAsDataURL(file)
            })
          }
        })
        if (this.initialContent) { this.editor.setContent(this.initialContent); this.hasContent = true }
      }
      this.pdfParser = new PDFParser()
      this.pdfModifier = new PDFModifier()
    },
    triggerFileInput() { this.$refs.fileInput.click() },
    triggerImageInput() { this.$refs.imageInput.click() },
    async handleFileUpload(event) {
      var file = event.target.files[0]
      if (file && file.type === 'application/pdf') {
        try {
          this.fileName = file.name; this.isProcessing = true
          var pages = await this.pdfParser.loadPDF(file); this.hasPDF = true
          var fullContent = ''
          pages.forEach((page, index) => {
            if (index > 0) fullContent += '<br/><br/>'
            fullContent += '<h2>第 ' + page.pageNumber + ' 页</h2><p>' + page.textContent + '</p>'
            if (page.images.length > 0) page.images.forEach(function(img) { fullContent += '<p><img src="' + img.dataUrl + '" style="max-width:100%;" /></p>' })
          })
          var self = this
          this.$nextTick(function() { if (self.editor) { self.editor.setContent(fullContent); self.hasContent = true } })
          var detectedWatermarks = await this.pdfParser.detectWatermarks(); this.watermarks = detectedWatermarks
          this.$emit('pdf-loaded', { pages: pages, watermarks: detectedWatermarks })
        } catch (error) { console.error('PDF loading error:', error); this.$emit('error', error) }
        finally { this.isProcessing = false }
      }
    },
    async handleImageReplace(event) {
      var file = event.target.files[0]
      if (file) {
        try {
          this.isProcessing = true; var self = this
          var reader = new FileReader()
          reader.onload = function(e) {
            var newUrl = e.target.result
            if (self.editor) { var images = self.editor.getAllImages(); if (images.length > 0) self.editor.replaceImage(images[0], newUrl); else self.editor.insertImage(newUrl) }
          }
          reader.readAsDataURL(file)
        } catch (error) { console.error('Image replacement error:', error); this.$emit('error', error) }
        finally { this.isProcessing = false }
      }
    },
    async removeWatermark() {
      if (!this.pdfParser.getPDFBytes() || !this.watermarks.length) return
      try {
        this.isProcessing = true
        await this.pdfModifier.removeWatermark(this.pdfParser.getPDFBytes(), this.watermarks.map(function(wm) { return wm.content }))
        this.watermarks = []; alert('水印已移除，将在导出时生效')
      } catch (error) { console.error('Watermark removal error:', error); this.$emit('error', error) }
      finally { this.isProcessing = false }
    },
    async removeSpecificWatermark(index) {
      var wm = this.watermarks[index]
      if (!this.pdfParser.getPDFBytes()) return
      try { this.isProcessing = true; await this.pdfModifier.removeWatermark(this.pdfParser.getPDFBytes(), [wm.content]); this.watermarks.splice(index, 1) }
      catch (error) { console.error('Error removing watermark:', error); this.$emit('error', error) }
      finally { this.isProcessing = false }
    },
    async exportPDF() {
      if (!this.editor || !this.hasContent) return
      try {
        this.isProcessing = true
        var content = this.editor.getContent()
        var pdfBytes = await this.pdfModifier.exportToPDF(content, [], Object.assign({}, this.exportOptions, { fileName: this.exportFileName }))
        PDFModifier.downloadPDF(pdfBytes, this.exportFileName + '-' + Date.now() + '.pdf')
        this.$emit('pdf-exported', pdfBytes)
      } catch (error) { console.error('Export error:', error); this.$emit('error', error) }
      finally { this.isProcessing = false }
    },
    clearFile() {
      this.fileName = ''; this.hasPDF = false; this.watermarks = []
      if (this.editor) this.editor.clear()
      this.hasContent = false
      if (this.$refs.fileInput) this.$refs.fileInput.value = ''
    }
  },
  template: `
    <div class="pdf-editor-wrapper" :style="wrapperStyle">
      <div class="editor-header">
        <h3 class="editor-title">文档编辑</h3>
        <div class="header-actions">
          <button v-if="hasPDF" @click="removeWatermark" class="action-btn watermark-btn" :disabled="isProcessing">{{ isProcessing ? '处理中...' : '去除水印' }}</button>
          <button @click="exportPDF" class="action-btn export-btn" :disabled="!hasContent">导出PDF</button>
        </div>
      </div>
      <div class="toolbar-section">
        <input type="file" ref="fileInput" accept=".pdf" @change="handleFileUpload" style="display:none" />
        <button @click="triggerFileInput" class="upload-btn"><span class="icon">📄</span> 上传PDF文件</button>
        <div v-if="fileName" class="file-info"><span class="file-name">{{ fileName }}</span><button @click="clearFile" class="clear-btn">×</button></div>
      </div>
      <div class="editor-container" :style="editorContainerStyle">
        <div ref="editorRef" class="rich-text-editor" :style="editorInnerStyle"></div>
      </div>
      <div v-if="watermarks.length > 0" class="watermark-panel">
        <h4>检测到的水印：</h4>
        <ul><li v-for="(wm, index) in watermarks" :key="index">{{ wm.content }} <button @click="removeSpecificWatermark(index)" class="remove-wm-btn">移除</button></li></ul>
      </div>
      <div v-if="hasPDF" class="image-replace-section">
        <h4>图片替换</h4>
        <input type="file" ref="imageInput" accept="image/*" @change="handleImageReplace" style="display:none" />
        <button @click="triggerImageInput" class="replace-image-btn">选择新图片替换</button>
      </div>
    </div>
  `
})