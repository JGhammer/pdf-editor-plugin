import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { PDFCanvasEditor, EditorElement } from "../../core/pdf-canvas-editor";

interface PdfEditorProps {
  editorStyle?: {
    width?: string;
    height?: string;
    minHeight?: string;
    background?: string;
    borderRadius?: string;
  };
  exportFileName?: string;
  scale?: number;
  onPdfLoaded?: (data: { fileName: string }) => void;
  onPdfExported?: (pdfBytes: Uint8Array) => void;
  onError?: (error: any) => void;
  onElementSelect?: (element: EditorElement | null) => void;
  onElementsChange?: (elements: EditorElement[]) => void;
}

const PdfEditor: React.FC<PdfEditorProps> = ({
  editorStyle = {},
  exportFileName = "edited-document",
  scale = 1.5,
  onPdfLoaded,
  onPdfExported,
  onError,
  onElementSelect,
  onElementsChange,
}) => {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<PDFCanvasEditor | null>(null);

  const [fileName, setFileName] = useState<string>("");
  const [hasPDF, setHasPDF] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const wrapperStyle = useMemo(
    () => ({
      width: editorStyle.width || undefined,
      background: editorStyle.background || undefined,
    }),
    [editorStyle],
  );

  const containerStyle = useMemo(
    () => ({
      height: editorStyle.height || undefined,
      minHeight: editorStyle.minHeight || "500px",
      background: editorStyle.background || undefined,
      borderRadius: editorStyle.borderRadius || undefined,
    }),
    [editorStyle],
  );

  useEffect(() => {
    if (editorContainerRef.current && !editorRef.current) {
      editorRef.current = new PDFCanvasEditor(
        editorContainerRef.current,
        scale,
        {
          onElementSelect: (el) => onElementSelect?.(el),
          onElementsChange: (els) => onElementsChange?.(els),
        },
      );
    }
    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type === "application/pdf") {
        try {
          setFileName(file.name);
          setIsProcessing(true);
          await editorRef.current!.loadPDF(file);
          setHasPDF(true);
          onPdfLoaded?.({ fileName: file.name });
        } catch (error) {
          console.error("PDF loading error:", error);
          onError?.(error);
        } finally {
          setIsProcessing(false);
        }
      }
    },
    [onPdfLoaded, onError],
  );

  const exportPDF = useCallback(async () => {
    if (!editorRef.current || !hasPDF) return;
    try {
      setIsProcessing(true);
      const pdfBytes = await editorRef.current.exportPDF();
      PDFCanvasEditor.downloadPDF(
        pdfBytes,
        `${exportFileName}-${Date.now()}.pdf`,
      );
      onPdfExported?.(pdfBytes);
    } catch (error) {
      console.error("Export error:", error);
      onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  }, [hasPDF, exportFileName, onPdfExported, onError]);

  const clearFile = useCallback(() => {
    setFileName("");
    setHasPDF(false);
    if (editorRef.current) {
      editorRef.current.destroy();
    }
    if (editorContainerRef.current) {
      editorRef.current = new PDFCanvasEditor(
        editorContainerRef.current,
        scale,
        {
          onElementSelect: (el) => onElementSelect?.(el),
          onElementsChange: (els) => onElementsChange?.(els),
        },
      );
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [scale, onElementSelect, onElementsChange, onError]);

  return (
    <div className="pdf-editor-wrapper" style={wrapperStyle}>
      <div className="editor-header">
        <h3 className="editor-title">PDF 编辑器</h3>
        <div className="header-actions">
          <button
            onClick={exportPDF}
            className="action-btn export-btn"
            disabled={!hasPDF || isProcessing}
          >
            {isProcessing ? "处理中..." : "导出PDF"}
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <input
          type="file"
          ref={fileInputRef}
          accept=".pdf"
          onChange={handleFileUpload}
          style={{ display: "none" }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="upload-btn"
        >
          <span className="icon">📄</span>
          上传PDF文件
        </button>

        {fileName && (
          <div className="file-info">
            <span className="file-name">{fileName}</span>
            <button onClick={clearFile} className="clear-btn">
              ×
            </button>
          </div>
        )}
      </div>

      <div className="editor-container" style={containerStyle}>
        <div ref={editorContainerRef} className="pdf-canvas-editor-container" />
      </div>

      <style>{`
        .pdf-editor-wrapper {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 217, 255, 0.2);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .editor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .editor-title { color: #00d9ff; font-size: 18px; font-weight: 600; margin: 0; }
        .header-actions { display: flex; gap: 10px; }
        .action-btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.3s ease; font-size: 14px; }
        .export-btn { background: linear-gradient(135deg, #00d9ff 0%, #00ff88 100%); color: #1a1a2e; }
        .export-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,217,255,0.4); }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .toolbar-section { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; }
        .upload-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.3s ease; font-size: 14px; }
        .upload-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102,126,234,0.4); }
        .icon { font-size: 18px; }
        .file-info { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(0,217,255,0.1); border-radius: 6px; color: #00d9ff; font-size: 14px; }
        .clear-btn { background: none; border: none; color: #ff6b6b; cursor: pointer; font-size: 20px; line-height: 1; padding: 0 4px; }
        .clear-btn:hover { color: #ff0000; }
        .editor-container { background: #16213e; border-radius: 8px; overflow: hidden; margin-bottom: 15px; }
      `}</style>
    </div>
  );
};

export default PdfEditor;
