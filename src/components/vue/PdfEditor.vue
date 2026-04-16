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

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { PDFParser, PDFModifier, WatermarkInfo, ExportPDFOptions } from '../../core/pdf-parser'
import { RichTextEditor, EditorConfig, EditorStyle } from '../../core/rich-text-editor'

interface Props {
  placeholder?: string
  readOnly?: boolean
  initialContent?: string
  editorStyle?: EditorStyle
  exportFileName?: string
  exportOptions?: ExportPDFOptions
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请输入或粘贴PDF内容...',
  readOnly: false,
  initialContent: '',
  exportFileName: 'edited-document',
  editorStyle: () => ({}),
  exportOptions: () => ({})
})

const emit = defineEmits<{
  'content-change': [data: { html: string; delta: any }]
  'pdf-loaded': [data: { pages: any[]; watermarks: WatermarkInfo[] }]
  'pdf-exported': [pdfBytes: Uint8Array]
  'error': [error: any]
}>()

const editorRef = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const fileName = ref<string>('')
const hasPDF = ref<boolean>(false)
const hasContent = ref<boolean>(false)
const isProcessing = ref<boolean>(false)
const watermarks = ref<WatermarkInfo[]>([])

let editor: RichTextEditor | null = null
let pdfParser: PDFParser | null = null
let pdfModifier: PDFModifier | null = null

const wrapperStyle = computed(() => {
  const s = props.editorStyle
  return {
    width: s.width || undefined,
    background: s.background || undefined,
  }
})

const editorContainerStyle = computed(() => {
  const s = props.editorStyle
  return {
    height: s.height || undefined,
    minHeight: s.minHeight || undefined,
    background: s.background || undefined,
    borderRadius: s.borderRadius || undefined,
  }
})

const editorInnerStyle = computed(() => {
  const s = props.editorStyle
  return {
    height: s.height || undefined,
    minHeight: s.minHeight || undefined,
    padding: s.padding || undefined,
    fontSize: s.fontSize || undefined,
    fontFamily: s.fontFamily || undefined,
    color: s.textColor || undefined,
  }
})

const triggerFileInput = () => {
  fileInput.value?.click()
}

const triggerImageInput = () => {
  imageInput.value?.click()
}

onMounted(() => {
  if (editorRef.value) {
    const config: EditorConfig = {
      placeholder: props.placeholder,
      readOnly: props.readOnly,
      style: props.editorStyle,
      onContentChange: (html: string, delta: any) => {
        hasContent.value = !!html && html !== '<p><br></p>'
        emit('content-change', { html, delta })
      },
      onImageUpload: async (file: File): Promise<string> => {
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.readAsDataURL(file)
        })
      }
    }

    editor = new RichTextEditor(editorRef.value, config)

    if (props.initialContent) {
      editor.setContent(props.initialContent)
      hasContent.value = true
    }
  }

  pdfParser = new PDFParser()
  pdfModifier = new PDFModifier()
})

onBeforeUnmount(() => {
  if (editor) {
    editor.destroy()
  }
})

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file && file.type === 'application/pdf') {
    try {
      fileName.value = file.name
      isProcessing.value = true
      
      const pages = await pdfParser!.loadPDF(file)
      hasPDF.value = true
      
      let fullContent = ''
      pages.forEach((page, index) => {
        if (index > 0) fullContent += '<br/><br/>'
        fullContent += `<h2>第 ${page.pageNumber} 页</h2>`
        fullContent += `<p>${page.textContent}</p>`
        if (page.images.length > 0) {
          page.images.forEach((img) => {
            fullContent += `<p><img src="${img.dataUrl}" style="max-width:100%;" /></p>`
          })
        }
      })
      
      await nextTick()
      editor?.setContent(fullContent)
      hasContent.value = true
      
      const detectedWatermarks = await pdfParser!.detectWatermarks()
      watermarks.value = detectedWatermarks
      
      emit('pdf-loaded', { pages, watermarks: detectedWatermarks })
    } catch (error) {
      console.error('PDF loading error:', error)
      emit('error', error)
    } finally {
      isProcessing.value = false
    }
  }
}

const handleImageReplace = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file) {
    try {
      isProcessing.value = true
      const reader = new FileReader()
      reader.onload = async (e) => {
        const newUrl = e.target?.result as string
        if (editor) {
          const images = editor.getAllImages()
          if (images.length > 0) {
            editor.replaceImage(images[0], newUrl)
          } else {
            editor.insertImage(newUrl)
          }
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Image replacement error:', error)
      emit('error', error)
    } finally {
      isProcessing.value = false
    }
  }
}

const removeWatermark = async () => {
  if (!pdfParser?.getPDFBytes() || !watermarks.value.length) return
  
  try {
    isProcessing.value = true
    const watermarkTexts = watermarks.value.map(wm => wm.content)
    await pdfModifier!.removeWatermark(pdfParser.getPDFBytes()!, watermarkTexts)
    watermarks.value = []
    alert('水印已移除，将在导出时生效')
  } catch (error) {
    console.error('Watermark removal error:', error)
    emit('error', error)
  } finally {
    isProcessing.value = false
  }
}

const removeSpecificWatermark = async (index: number) => {
  const wm = watermarks.value[index]
  if (!pdfParser?.getPDFBytes()) return
  
  try {
    isProcessing.value = true
    await pdfModifier!.removeWatermark(pdfParser.getPDFBytes()!, [wm.content])
    watermarks.value.splice(index, 1)
  } catch (error) {
    console.error('Error removing watermark:', error)
    emit('error', error)
  } finally {
    isProcessing.value = false
  }
}

const exportPDF = async () => {
  if (!editor || !hasContent.value) return
  
  try {
    isProcessing.value = true
    const content = editor.getContent()
    const pdfBytes = await pdfModifier!.exportToPDF(content, [], {
      ...props.exportOptions,
      fileName: props.exportFileName,
    })
    
    PDFModifier.downloadPDF(pdfBytes, `${props.exportFileName}-${Date.now()}.pdf`)
    
    emit('pdf-exported', pdfBytes)
  } catch (error) {
    console.error('Export error:', error)
    emit('error', error)
  } finally {
    isProcessing.value = false
  }
}

const clearFile = () => {
  fileName.value = ''
  hasPDF.value = false
  watermarks.value = []
  editor?.clear()
  hasContent.value = false
  if (fileInput.value) fileInput.value.value = ''
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

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.editor-title {
  color: #00d9ff;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  font-size: 14px;
}

.watermark-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.watermark-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
}

.export-btn {
  background: linear-gradient(135deg, #00d9ff 0%, #00ff88 100%);
  color: #1a1a2e;
}

.export-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 217, 255, 0.4);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.upload-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.upload-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.icon {
  font-size: 18px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 217, 255, 0.1);
  border-radius: 6px;
  color: #00d9ff;
  font-size: 14px;
}

.clear-btn {
  background: none;
  border: none;
  color: #ff6b6b;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  padding: 0 4px;
}

.clear-btn:hover {
  color: #ff0000;
}

.editor-container {
  background: #16213e;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 15px;
}

.rich-text-editor {
  min-height: 400px;
}

.watermark-panel {
  background: rgba(240, 147, 251, 0.1);
  border: 1px solid rgba(240, 147, 251, 0.3);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
}

.watermark-panel h4 {
  color: #f093fb;
  margin: 0 0 10px 0;
  font-size: 14px;
}

.watermark-panel ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.watermark-panel li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  color: #eee;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.remove-wm-btn {
  padding: 4px 12px;
  background: #f5576c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.remove-wm-btn:hover {
  background: #ff0000;
}

.image-replace-section {
  background: rgba(0, 217, 255, 0.1);
  border: 1px solid rgba(0, 217, 255, 0.3);
  border-radius: 8px;
  padding: 15px;
}

.image-replace-section h4 {
  color: #00d9ff;
  margin: 0 0 10px 0;
  font-size: 14px;
}

.replace-image-btn {
  padding: 8px 16px;
  background: transparent;
  color: #00d9ff;
  border: 1px solid #00d9ff;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.replace-image-btn:hover {
  background: #00d9ff;
  color: #1a1a2e;
}
</style>