import { defineComponent, ref, onMounted, onBeforeUnmount, h } from "vue";
import { PDFCanvasEditor, EditorElement } from "../../core/pdf-canvas-editor";

export { PDFCanvasEditor } from "../../core/pdf-canvas-editor";
export type { EditorElement } from "../../core/pdf-canvas-editor";

export default defineComponent({
  name: "PdfEditor",
  props: {
    editorStyle: { type: Object, default: () => ({}) },
    exportFileName: { type: String, default: "edited-document" },
    scale: { type: Number, default: 1.5 },
  },
  emits: [
    "pdf-loaded",
    "pdf-exported",
    "error",
    "element-select",
    "elements-change",
  ],
  setup(props, { emit, expose }) {
    const canvasEditorRef = ref<HTMLElement | null>(null);
    const fileInput = ref<HTMLInputElement | null>(null);
    const fileName = ref("");
    const hasPDF = ref(false);
    const isProcessing = ref(false);

    let canvasEditor: PDFCanvasEditor | null = null;

    const triggerFileInput = () => {
      fileInput.value?.click();
    };

    onMounted(() => {
      if (canvasEditorRef.value) {
        canvasEditor = new PDFCanvasEditor(canvasEditorRef.value, props.scale, {
          onElementSelect: (el) => emit("element-select", el),
          onElementsChange: (els) => emit("elements-change", els),
        });
      }
    });

    onBeforeUnmount(() => {
      if (canvasEditor) canvasEditor.destroy();
    });

    const handleFileUpload = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file && file.type === "application/pdf") {
        try {
          fileName.value = file.name;
          isProcessing.value = true;
          await canvasEditor!.loadPDF(file);
          hasPDF.value = true;
          emit("pdf-loaded", { fileName: file.name });
        } catch (error) {
          console.error("PDF loading error:", error);
          emit("error", error);
        } finally {
          isProcessing.value = false;
        }
      }
    };

    const exportPDF = async () => {
      if (!canvasEditor || !hasPDF.value) return;
      try {
        isProcessing.value = true;
        const pdfBytes = await canvasEditor.exportPDF();
        PDFCanvasEditor.downloadPDF(
          pdfBytes,
          `${props.exportFileName}-${Date.now()}.pdf`,
        );
        emit("pdf-exported", pdfBytes);
      } catch (error) {
        console.error("Export error:", error);
        emit("error", error);
      } finally {
        isProcessing.value = false;
      }
    };

    const clearFile = () => {
      fileName.value = "";
      hasPDF.value = false;
      if (canvasEditor) canvasEditor.destroy();
      if (canvasEditorRef.value) {
        canvasEditor = new PDFCanvasEditor(canvasEditorRef.value, props.scale, {
          onElementSelect: (el) => emit("element-select", el),
          onElementsChange: (els) => emit("elements-change", els),
        });
      }
      if (fileInput.value) fileInput.value.value = "";
    };

    expose({
      clearFile,
      exportPDF,
      getEditor: () => canvasEditor,
    });

    return () => {
      const s = props.editorStyle || {};
      const wrapperStyle = {
        width: s.width || undefined,
        background: s.background || undefined,
      };
      const editorContainerStyle = {
        height: s.height || undefined,
        minHeight: s.minHeight || "500px",
        background: s.background || undefined,
        borderRadius: s.borderRadius || undefined,
      };

      return h("div", { class: "pdf-editor-wrapper", style: wrapperStyle }, [
        h("div", { class: "editor-header" }, [
          h("h3", { class: "editor-title" }, "PDF 编辑器"),
          h("div", { class: "header-actions" }, [
            h(
              "button",
              {
                class: "action-btn export-btn",
                disabled: !hasPDF.value || isProcessing.value,
                onClick: exportPDF,
              },
              isProcessing.value ? "处理中..." : "导出PDF",
            ),
          ]),
        ]),
        h(
          "div",
          { class: "toolbar-section" },
          [
            h("input", {
              type: "file",
              ref: fileInput,
              accept: ".pdf",
              style: { display: "none" },
              onChange: handleFileUpload,
            }),
            h("button", { class: "upload-btn", onClick: triggerFileInput }, [
              h("span", { class: "icon" }, "📄"),
              " 上传PDF文件",
            ]),
            fileName.value
              ? h("div", { class: "file-info" }, [
                  h("span", { class: "file-name" }, fileName.value),
                  h("button", { class: "clear-btn", onClick: clearFile }, "×"),
                ])
              : null,
          ].filter(Boolean),
        ),
        h("div", { class: "editor-container", style: editorContainerStyle }, [
          h("div", {
            ref: canvasEditorRef,
            class: "pdf-canvas-editor-container",
          }),
        ]),
      ]);
    };
  },
});
