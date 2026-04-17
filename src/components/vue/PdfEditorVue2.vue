<template>
  <div class="pdf-editor-wrapper" :style="wrapperStyle">
    <div class="editor-header">
      <h3 class="editor-title">PDF 编辑器</h3>
      <div class="header-actions">
        <button
          @click="exportPDF"
          class="action-btn export-btn"
          :disabled="!hasPDF || isProcessing"
        >
          {{ isProcessing ? '处理中...' : '导出PDF' }}
        </button>
      </div>
    </div>

    <div class="toolbar-section">
      <input
        type="file"
        ref="fileInput"
        accept=".pdf"
        @change="handleFileUpload"
        style="display: none"
      />
      <button @click="triggerFileInput" class="upload-btn">
        <span class="icon">📄</span>
        上传PDF文件
      </button>

      <div v-if="fileName" class="file-info">
        <span class="file-name">{{ fileName }}</span>
        <button @click="clearFile" class="clear-btn">×</button>
      </div>
    </div>

    <div class="editor-container" :style="editorContainerStyle">
      <div ref="canvasEditorRef" class="pdf-canvas-editor-container"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PdfEditor',

  props: {
    editorStyle: {
      type: Object,
      default: function() { return {} }
    },
    exportFileName: {
      type: String,
      default: 'edited-document'
    },
    scale: {
      type: Number,
      default: 1.5
    }
  },

  data: function() {
    return {
      fileName: '',
      hasPDF: false,
      isProcessing: false,
      canvasEditor: null
    }
  },

  computed: {
    wrapperStyle: function() {
      var s = this.editorStyle
      return {
        width: s.width || undefined,
        background: s.background || undefined
      }
    },
    editorContainerStyle: function() {
      var s = this.editorStyle
      return {
        height: s.height || undefined,
        minHeight: s.minHeight || '500px',
        background: s.background || undefined,
        borderRadius: s.borderRadius || undefined
      }
    }
  },

  mounted: function() {
    this.initEditor()
  },

  beforeDestroy: function() {
    if (this.canvasEditor) {
      this.canvasEditor.destroy()
    }
  },

  methods: {
    initEditor: function() {
      var self = this
      import('../../core/pdf-canvas-editor').then(function(mod) {
        var PDFCanvasEditor = mod.PDFCanvasEditor
        if (self.$refs.canvasEditorRef) {
          self.canvasEditor = new PDFCanvasEditor(self.$refs.canvasEditorRef, self.scale, {
            onElementSelect: function(el) { self.$emit('element-select', el) },
            onElementsChange: function(els) { self.$emit('elements-change', els) }
          })
        }
      })
    },

    triggerFileInput: function() {
      this.$refs.fileInput.click()
    },

    handleFileUpload: function(event) {
      var file = event.target.files[0]
      if (file && file.type === 'application/pdf') {
        var self = this
        this.fileName = file.name
        this.isProcessing = true
        this.canvasEditor.loadPDF(file).then(function() {
          self.hasPDF = true
          self.$emit('pdf-loaded', { fileName: file.name })
        }).catch(function(error) {
          console.error('PDF loading error:', error)
          self.$emit('error', error)
        }).finally(function() {
          self.isProcessing = false
        })
      }
    },

    exportPDF: function() {
      if (!this.canvasEditor || !this.hasPDF) return
      var self = this
      this.isProcessing = true
      this.canvasEditor.exportPDF().then(function(pdfBytes) {
        var PDFCanvasEditor = self.canvasEditor.constructor
        PDFCanvasEditor.downloadPDF(pdfBytes, self.exportFileName + '-' + Date.now() + '.pdf')
        self.$emit('pdf-exported', pdfBytes)
      }).catch(function(error) {
        console.error('Export error:', error)
        self.$emit('error', error)
      }).finally(function() {
        self.isProcessing = false
      })
    },

    clearFile: function() {
      this.fileName = ''
      this.hasPDF = false
      if (this.canvasEditor) {
        this.canvasEditor.destroy()
      }
      if (this.$refs.canvasEditorRef) {
        var self = this
        import('../../core/pdf-canvas-editor').then(function(mod) {
          var PDFCanvasEditor = mod.PDFCanvasEditor
          self.canvasEditor = new PDFCanvasEditor(self.$refs.canvasEditorRef, self.scale, {
            onElementSelect: function(el) { self.$emit('element-select', el) },
            onElementsChange: function(els) { self.$emit('elements-change', els) }
          })
        })
      }
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = ''
      }
    }
  }
}
</script>

<style scoped>
.pdf-editor-wrapper {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 217, 255, 0.2);
}
.editor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); }
.editor-title { color: #00d9ff; font-size: 18px; font-weight: 600; margin: 0; }
.header-actions { display: flex; gap: 10px; }
.action-btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.3s ease; font-size: 14px; }
.export-btn { background: linear-gradient(135deg, #00d9ff 0%, #00ff88 100%); color: #1a1a2e; }
.export-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,217,255,0.4); }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.toolbar-section { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; }
.upload-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.3s ease; }
.upload-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102,126,234,0.4); }
.icon { font-size: 18px; }
.file-info { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(0,217,255,0.1); border-radius: 6px; color: #00d9ff; font-size: 14px; }
.clear-btn { background: none; border: none; color: #ff6b6b; cursor: pointer; font-size: 20px; line-height: 1; padding: 0 4px; }
.clear-btn:hover { color: #ff0000; }
.editor-container { background: #16213e; border-radius: 8px; overflow: hidden; margin-bottom: 15px; }
</style>
