declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<any, any, any>
  export default component
}

declare module 'pdf-editor-plugin/vue3' {
  import { DefineComponent } from 'vue'
  const PdfEditor: DefineComponent<{
    placeholder?: string
    readOnly?: boolean
    initialContent?: string
  }, {
    fileName: string
    hasPDF: boolean
    hasContent: boolean
    isProcessing: boolean
    watermarks: any[]
  }, any>
  export default PdfEditor
}

declare module 'pdf-editor-plugin/vue2' {
  import { DefineComponent } from 'vue'
  const PdfEditor: DefineComponent<{
    placeholder?: string
    readOnly?: boolean
    initialContent?: string
  }, {
    fileName: string
    hasPDF: boolean
    hasContent: boolean
    isProcessing: boolean
    watermarks: any[]
  }, any>
  export default PdfEditor
}