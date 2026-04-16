import { defineComponent, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
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
  setup(props, { emit, expose }) {
    const editorRef = ref<HTMLElement | null>(null)
    const fileInput = ref<HTMLInputElement | null>(null)
    const imageInput = ref<HTMLInputElement | null>(null)
    const fileName = ref('')
    const hasPDF = ref(false)
    const hasContent = ref(false)
    const isProcessing = ref(false)
    const watermarks = ref<any[]>([])

    let editor: RichTextEditor | null = null
    let pdfParser: PDFParser | null = null
    let pdfModifier: PDFModifier | null = null

    const triggerFileInput = () => { fileInput.value?.click() }
    const triggerImageInput = () => { imageInput.value?.click() }

    onMounted(() => {
      if (editorRef.value) {
        editor = new RichTextEditor(editorRef.value, {
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
        })
        if (props.initialContent) {
          editor.setContent(props.initialContent)
          hasContent.value = true
        }
      }
      pdfParser = new PDFParser()
      pdfModifier = new PDFModifier()
    })

    onBeforeUnmount(() => {
      if (editor) editor.destroy()
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
          reader.onload = (e) => {
            const newUrl = e.target?.result as string
            if (editor) {
              const images = editor.getAllImages()
              if (images.length > 0) editor.replaceImage(images[0], newUrl)
              else editor.insertImage(newUrl)
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

    const wrapperStyle = () => ({
      width: props.editorStyle?.width || undefined,
      background: props.editorStyle?.background || undefined,
    })
    const editorContainerStyle = () => ({
      height: props.editorStyle?.height || undefined,
      minHeight: props.editorStyle?.minHeight || undefined,
      background: props.editorStyle?.background || undefined,
      borderRadius: props.editorStyle?.borderRadius || undefined,
    })
    const editorInnerStyle = () => ({
      height: props.editorStyle?.height || undefined,
      minHeight: props.editorStyle?.minHeight || undefined,
      padding: props.editorStyle?.padding || undefined,
      fontSize: props.editorStyle?.fontSize || undefined,
      fontFamily: props.editorStyle?.fontFamily || undefined,
      color: props.editorStyle?.textColor || undefined,
    })

    return {
      editorRef, fileInput, imageInput,
      fileName, hasPDF, hasContent, isProcessing, watermarks,
      triggerFileInput, triggerImageInput,
      handleFileUpload, handleImageReplace,
      removeWatermark, removeSpecificWatermark,
      exportPDF, clearFile,
      wrapperStyle, editorContainerStyle, editorInnerStyle
    }
  },
  template: `
    <div class="pdf-editor-wrapper" :style="wrapperStyle()">
      <div class="editor-header">
        <h3 class="editor-title">文档编辑</h3>
        <div class="header-actions">
          <button v-if="hasPDF" @click="removeWatermark" class="action-btn watermark-btn" :disabled="isProcessing">
            {{ isProcessing ? '处理中...' : '去除水印' }}
          </button>
          <button @click="exportPDF" class="action-btn export-btn" :disabled="!hasContent">导出PDF</button>
        </div>
      </div>
      <div class="toolbar-section">
        <input type="file" ref="fileInput" accept=".pdf" @change="handleFileUpload" style="display:none" />
        <button @click="triggerFileInput" class="upload-btn"><span class="icon">📄</span> 上传PDF文件</button>
        <div v-if="fileName" class="file-info">
          <span class="file-name">{{ fileName }}</span>
          <button @click="clearFile" class="clear-btn">×</button>
        </div>
      </div>
      <div class="editor-container" :style="editorContainerStyle()">
        <div ref="editorRef" class="rich-text-editor" :style="editorInnerStyle()"></div>
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