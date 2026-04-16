import { defineComponent, ref, onMounted, onBeforeUnmount, nextTick, h } from 'vue'
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

    expose({
      clearFile,
      exportPDF,
      removeWatermark
    })

    return () => {
      const s = props.editorStyle || {}
      const wrapperStyle = {
        width: s.width || undefined,
        background: s.background || undefined,
      }
      const editorContainerStyle = {
        height: s.height || undefined,
        minHeight: s.minHeight || undefined,
        background: s.background || undefined,
        borderRadius: s.borderRadius || undefined,
      }
      const editorInnerStyle = {
        height: s.height || undefined,
        minHeight: s.minHeight || undefined,
        padding: s.padding || undefined,
        fontSize: s.fontSize || undefined,
        fontFamily: s.fontFamily || undefined,
        color: s.textColor || undefined,
      }

      const watermarkItems = watermarks.value.map((wm, index) =>
        h('li', { key: index }, [
          wm.content + ' ',
          h('button', {
            class: 'remove-wm-btn',
            onClick: () => removeSpecificWatermark(index)
          }, '移除')
        ])
      )

      return h('div', { class: 'pdf-editor-wrapper', style: wrapperStyle }, [
        h('div', { class: 'editor-header' }, [
          h('h3', { class: 'editor-title' }, '文档编辑'),
          h('div', { class: 'header-actions' }, [
            hasPDF.value ? h('button', {
              class: 'action-btn watermark-btn',
              disabled: isProcessing.value,
              onClick: removeWatermark
            }, isProcessing.value ? '处理中...' : '去除水印') : null,
            h('button', {
              class: 'action-btn export-btn',
              disabled: !hasContent.value,
              onClick: exportPDF
            }, '导出PDF')
          ].filter(Boolean))
        ]),
        h('div', { class: 'toolbar-section' }, [
          h('input', {
            type: 'file',
            ref: fileInput,
            accept: '.pdf',
            style: { display: 'none' },
            onChange: handleFileUpload
          }),
          h('button', { class: 'upload-btn', onClick: triggerFileInput }, [
            h('span', { class: 'icon' }, '📄'),
            ' 上传PDF文件'
          ]),
          fileName.value ? h('div', { class: 'file-info' }, [
            h('span', { class: 'file-name' }, fileName.value),
            h('button', { class: 'clear-btn', onClick: clearFile }, '×')
          ]) : null
        ].filter(Boolean)),
        h('div', { class: 'editor-container', style: editorContainerStyle }, [
          h('div', { ref: editorRef, class: 'rich-text-editor', style: editorInnerStyle })
        ]),
        watermarks.value.length > 0 ? h('div', { class: 'watermark-panel' }, [
          h('h4', null, '检测到的水印：'),
          h('ul', null, watermarkItems)
        ]) : null,
        hasPDF.value ? h('div', { class: 'image-replace-section' }, [
          h('h4', null, '图片替换'),
          h('input', {
            type: 'file',
            ref: imageInput,
            accept: 'image/*',
            style: { display: 'none' },
            onChange: handleImageReplace
          }),
          h('button', {
            class: 'replace-image-btn',
            onClick: triggerImageInput
          }, '选择新图片替换')
        ]) : null
      ].filter(Boolean))
    }
  }
})
