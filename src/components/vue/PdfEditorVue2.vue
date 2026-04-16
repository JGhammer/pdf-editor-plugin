<template>
  <div class="pdf-editor-wrapper" :style="wrapperStyle">
    <div class="editor-header">
      <h3 class="editor-title">文档编辑</h3>
      <div class="header-actions">
        <button 
          v-if="hasPDF" 
          @click="removeWatermark" 
          class="action-btn watermark-btn"
          :disabled="isProcessing"
        >
          {{ isProcessing ? '处理中...' : '去除水印' }}
        </button>
        <button 
          @click="exportPDF" 
          class="action-btn export-btn"
          :disabled="!hasContent"
        >
          导出PDF
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
      <div ref="editorRef" class="rich-text-editor" :style="editorInnerStyle"></div>
    </div>

    <div v-if="watermarks.length > 0" class="watermark-panel">
      <h4>检测到的水印：</h4>
      <ul>
        <li v-for="(wm, index) in watermarks" :key="index">
          {{ wm.content }}
          <button @click="removeSpecificWatermark(index)" class="remove-wm-btn">移除</button>
        </li>
      </ul>
    </div>

    <div class="image-replace-section" v-if="hasPDF">
      <h4>图片替换</h4>
      <input
        type="file"
        ref="imageInput"
        accept="image/*"
        @change="handleImageReplace"
        style="display: none"
      />
      <button @click="triggerImageInput" class="replace-image-btn">
        选择新图片替换
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PdfEditor',
  
  props: {
    placeholder: {
      type: String,
      default: '请输入或粘贴PDF内容...'
    },
    readOnly: {
      type: Boolean,
      default: false
    },
    initialContent: {
      type: String,
      default: ''
    },
    editorStyle: {
      type: Object,
      default: () => ({})
    },
    exportFileName: {
      type: String,
      default: 'edited-document'
    },
    exportOptions: {
      type: Object,
      default: () => ({})
    }
  },

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
      return {
        width: s.width || undefined,
        background: s.background || undefined
      }
    },
    editorContainerStyle() {
      var s = this.editorStyle
      return {
        height: s.height || undefined,
        minHeight: s.minHeight || undefined,
        background: s.background || undefined,
        borderRadius: s.borderRadius || undefined
      }
    },
    editorInnerStyle() {
      var s = this.editorStyle
      return {
        height: s.height || undefined,
        minHeight: s.minHeight || undefined,
        padding: s.padding || undefined,
        fontSize: s.fontSize || undefined,
        fontFamily: s.fontFamily || undefined,
        color: s.textColor || undefined
      }
    }
  },

  mounted() {
    this.initEditor()
  },

  beforeDestroy() {
    if (this.editor) {
      this.editor.destroy()
    }
  },

  methods: {
    async initEditor() {
      var RichTextEditor = (await import('../core/rich-text-editor')).RichTextEditor
      var PDFParser = (await import('../core/pdf-parser')).PDFParser
      var PDFModifier = (await import('../core/pdf-parser')).PDFModifier

      if (this.$refs.editorRef) {
        this.editor = new RichTextEditor(this.$refs.editorRef, {
          placeholder: this.placeholder,
          readOnly: this.readOnly,
          style: this.editorStyle,
          onContentChange: (html, delta) => {
            this.hasContent = !!html && html !== '<p><br></p>'
            this.$emit('content-change', { html, delta })
          },
          onImageUpload: async (file) => {
            return new Promise((resolve) => {
              var reader = new FileReader()
              reader.onload = (e) => resolve(e.target.result)
              reader.readAsDataURL(file)
            })
          }
        })

        if (this.initialContent) {
          this.editor.setContent(this.initialContent)
          this.hasContent = true
        }
      }

      this.pdfParser = new PDFParser()
      this.pdfModifier = new PDFModifier()
    },

    triggerFileInput() {
      this.$refs.fileInput.click()
    },

    triggerImageInput() {
      this.$refs.imageInput.click()
    },

    async handleFileUpload(event) {
      var file = event.target.files[0]
      
      if (file && file.type === 'application/pdf') {
        try {
          this.fileName = file.name
          this.isProcessing = true
          
          var pages = await this.pdfParser.loadPDF(file)
          this.hasPDF = true
          
          var fullContent = ''
          pages.forEach((page, index) => {
            if (index > 0) fullContent += '<br/><br/>'
            fullContent += '<h2>第 ' + page.pageNumber + ' 页</h2>'
            fullContent += '<p>' + page.textContent + '</p>'
            if (page.images.length > 0) {
              page.images.forEach(function(img) {
                fullContent += '<p><img src="' + img.dataUrl + '" style="max-width:100%;" /></p>'
              })
            }
          })
          
          this.$nextTick(function() {
            if (this.editor) {
              this.editor.setContent(fullContent)
              this.hasContent = true
            }
          }.bind(this))
          
          var detectedWatermarks = await this.pdfParser.detectWatermarks()
          this.watermarks = detectedWatermarks
          
          this.$emit('pdf-loaded', { pages: pages, watermarks: detectedWatermarks })
        } catch (error) {
          console.error('PDF loading error:', error)
          this.$emit('error', error)
        } finally {
          this.isProcessing = false
        }
      }
    },

    async handleImageReplace(event) {
      var file = event.target.files[0]
      
      if (file) {
        try {
          this.isProcessing = true
          var self = this
          var reader = new FileReader()
          reader.onload = function(e) {
            var newUrl = e.target.result
            if (self.editor) {
              var images = self.editor.getAllImages()
              if (images.length > 0) {
                self.editor.replaceImage(images[0], newUrl)
              } else {
                self.editor.insertImage(newUrl)
              }
            }
          }
          reader.readAsDataURL(file)
        } catch (error) {
          console.error('Image replacement error:', error)
          this.$emit('error', error)
        } finally {
          this.isProcessing = false
        }
      }
    },

    async removeWatermark() {
      if (!this.pdfParser.getPDFBytes() || !this.watermarks.length) return
      
      try {
        this.isProcessing = true
        var watermarkTexts = this.watermarks.map(function(wm) { return wm.content })
        await this.pdfModifier.removeWatermark(this.pdfParser.getPDFBytes(), watermarkTexts)
        this.watermarks = []
        alert('水印已移除，将在导出时生效')
      } catch (error) {
        console.error('Watermark removal error:', error)
        this.$emit('error', error)
      } finally {
        this.isProcessing = false
      }
    },

    async removeSpecificWatermark(index) {
      var wm = this.watermarks[index]
      if (!this.pdfParser.getPDFBytes()) return
      
      try {
        this.isProcessing = true
        await this.pdfModifier.removeWatermark(this.pdfParser.getPDFBytes(), [wm.content])
        this.watermarks.splice(index, 1)
      } catch (error) {
        console.error('Error removing watermark:', error)
        this.$emit('error', error)
      } finally {
        this.isProcessing = false
      }
    },

    async exportPDF() {
      if (!this.editor || !this.hasContent) return
      
      try {
        this.isProcessing = true
        var content = this.editor.getContent()
        var PDFModifier = (await import('../core/pdf-parser')).PDFModifier
        var pdfBytes = await this.pdfModifier.exportToPDF(content, [], {
          ...this.exportOptions,
          fileName: this.exportFileName
        })
        
        PDFModifier.downloadPDF(pdfBytes, this.exportFileName + '-' + Date.now() + '.pdf')
        
        this.$emit('pdf-exported', pdfBytes)
      } catch (error) {
        console.error('Export error:', error)
        this.$emit('error', error)
      } finally {
        this.isProcessing = false
      }
    },

    clearFile() {
      this.fileName = ''
      this.hasPDF = false
      this.watermarks = []
      if (this.editor) {
        this.editor.clear()
      }
      this.hasContent = false
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
.watermark-btn { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }
.watermark-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(245,87,108,0.4); }
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
.rich-text-editor { min-height: 400px; }
.watermark-panel { background: rgba(240,147,251,0.1); border: 1px solid rgba(240,147,251,0.3); border-radius: 8px; padding: 15px; margin-bottom: 15px; }
.watermark-panel h4 { color: #f093fb; margin: 0 0 10px 0; font-size: 14px; }
.watermark-panel ul { list-style: none; padding: 0; margin: 0; }
.watermark-panel li { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; color: #eee; border-bottom: 1px solid rgba(255,255,255,0.05); }
.remove-wm-btn { padding: 4px 12px; background: #f5576c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s ease; }
.remove-wm-btn:hover { background: #ff0000; }
.image-replace-section { background: rgba(0,217,255,0.1); border: 1px solid rgba(0,217,255,0.3); border-radius: 8px; padding: 15px; }
.image-replace-section h4 { color: #00d9ff; margin: 0 0 10px 0; font-size: 14px; }
.replace-image-btn { padding: 8px 16px; background: transparent; color: #00d9ff; border: 1px solid #00d9ff; border-radius: 6px; cursor: pointer; transition: all 0.3s ease; }
.replace-image-btn:hover { background: #00d9ff; color: #1a1a2e; }
</style>