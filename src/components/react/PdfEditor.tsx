import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { PDFParser, PDFModifier, ExportPDFOptions } from "../../core/pdf-parser";
import { RichTextEditor, EditorConfig, EditorStyle } from "../../core/rich-text-editor";

interface PdfEditorProps {
  placeholder?: string;
  readOnly?: boolean;
  initialContent?: string;
  editorStyle?: EditorStyle;
  exportFileName?: string;
  exportOptions?: ExportPDFOptions;
  onContentChange?: (data: { html: string; delta: any }) => void;
  onPdfLoaded?: (data: { pages: any[]; watermarks: any[] }) => void;
  onPdfExported?: (pdfBytes: Uint8Array) => void;
  onError?: (error: any) => void;
}

const PdfEditor: React.FC<PdfEditorProps> = ({
  placeholder = "请输入或粘贴PDF内容...",
  readOnly = false,
  initialContent = "",
  editorStyle = {},
  exportFileName = "edited-document",
  exportOptions = {},
  onContentChange,
  onPdfLoaded,
  onPdfExported,
  onError,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string>("");
  const [hasPDF, setHasPDF] = useState<boolean>(false);
  const [hasContent, setHasContent] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [watermarks, setWatermarks] = useState<any[]>([]);

  const editorInstance = useRef<RichTextEditor | null>(null);
  const pdfParserRef = useRef<PDFParser | null>(null);
  const pdfModifierRef = useRef<PDFModifier | null>(null);

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
      minHeight: editorStyle.minHeight || undefined,
      background: editorStyle.background || undefined,
      borderRadius: editorStyle.borderRadius || undefined,
    }),
    [editorStyle],
  );

  const innerStyle = useMemo(
    () => ({
      height: editorStyle.height || undefined,
      minHeight: editorStyle.minHeight || undefined,
      padding: editorStyle.padding || undefined,
      fontSize: editorStyle.fontSize || undefined,
      fontFamily: editorStyle.fontFamily || undefined,
      color: editorStyle.textColor || undefined,
    }),
    [editorStyle],
  );

  useEffect(() => {
    if (editorRef.current && !editorInstance.current) {
      const config: EditorConfig = {
        placeholder,
        readOnly,
        style: editorStyle,
        onContentChange: (html, delta) => {
          setHasContent(!!html && html !== "<p><br></p>");
          onContentChange?.({ html, delta });
        },
        onImageUpload: async (file: File): Promise<string> => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
        },
      };

      editorInstance.current = new RichTextEditor(editorRef.current, config);

      if (initialContent) {
        editorInstance.current.setContent(initialContent);
        setHasContent(true);
      }
    }

    if (!pdfParserRef.current) {
      pdfParserRef.current = new PDFParser();
    }

    if (!pdfModifierRef.current) {
      pdfModifierRef.current = new PDFModifier();
    }

    return () => {
      if (editorInstance.current) {
        editorInstance.current.destroy();
        editorInstance.current = null;
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

          const pages = await pdfParserRef.current!.loadPDF(file);
          setHasPDF(true);

          let fullContent = "";
          pages.forEach((page, index) => {
            if (index > 0) fullContent += "<br/><br/>";
            fullContent += `<h2>第 ${page.pageNumber} 页</h2>`;
            fullContent += `<p>${page.textContent}</p>`;
            if (page.images.length > 0) {
              page.images.forEach((img) => {
                fullContent += `<p><img src="${img.dataUrl}" style="max-width:100%;" /></p>`;
              });
            }
          });

          setTimeout(() => {
            editorInstance.current?.setContent(fullContent);
            setHasContent(true);
          }, 100);

          const detectedWatermarks =
            await pdfParserRef.current!.detectWatermarks();
          setWatermarks(detectedWatermarks);

          onPdfLoaded?.({ pages, watermarks: detectedWatermarks });
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

  const handleImageReplace = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (file) {
        try {
          setIsProcessing(true);
          const reader = new FileReader();
          reader.onload = (e) => {
            const newUrl = e.target?.result as string;
            if (editorInstance.current) {
              const images = editorInstance.current.getAllImages();
              if (images.length > 0) {
                editorInstance.current.replaceImage(images[0], newUrl);
              } else {
                editorInstance.current.insertImage(newUrl);
              }
            }
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error("Image replacement error:", error);
          onError?.(error);
        } finally {
          setIsProcessing(false);
        }
      }
    },
    [onError],
  );

  const removeWatermark = useCallback(async () => {
    if (!pdfParserRef.current?.getPDFBytes() || !watermarks.length) return;

    try {
      setIsProcessing(true);
      const watermarkTexts = watermarks.map((wm) => wm.content);
      await pdfModifierRef.current!.removeWatermark(
        pdfParserRef.current.getPDFBytes()!,
        watermarkTexts,
      );
      setWatermarks([]);
      alert("水印已移除，将在导出时生效");
    } catch (error) {
      console.error("Watermark removal error:", error);
      onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  }, [watermarks, onError]);

  const removeSpecificWatermark = useCallback(
    async (index: number) => {
      const wm = watermarks[index];
      if (!pdfParserRef.current?.getPDFBytes()) return;

      try {
        setIsProcessing(true);
        await pdfModifierRef.current!.removeWatermark(
          pdfParserRef.current.getPDFBytes()!,
          [wm.content],
        );
        setWatermarks((prev) => prev.filter((_, i) => i !== index));
      } catch (error) {
        console.error("Error removing watermark:", error);
        onError?.(error);
      } finally {
        setIsProcessing(false);
      }
    },
    [watermarks, onError],
  );

  const exportPDF = useCallback(async () => {
    if (!editorInstance.current || !hasContent) return;

    try {
      setIsProcessing(true);
      const content = editorInstance.current.getContent();
      const pdfBytes = await pdfModifierRef.current!.exportToPDF(content, [], {
        ...exportOptions,
        fileName: exportFileName,
      });

      PDFModifier.downloadPDF(
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
  }, [hasContent, exportFileName, exportOptions, onPdfExported, onError]);

  const clearFile = useCallback(() => {
    setFileName("");
    setHasPDF(false);
    setWatermarks([]);
    editorInstance.current?.clear();
    setHasContent(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div className="pdf-editor-wrapper" style={wrapperStyle}>
      <div className="editor-header">
        <h3 className="editor-title">文档编辑</h3>
        <div className="header-actions">
          {hasPDF && (
            <button
              onClick={removeWatermark}
              className="action-btn watermark-btn"
              disabled={isProcessing}
            >
              {isProcessing ? "处理中..." : "去除水印"}
            </button>
          )}
          <button
            onClick={exportPDF}
            className="action-btn export-btn"
            disabled={!hasContent}
          >
            导出PDF
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
        <div ref={editorRef} className="rich-text-editor" style={innerStyle}></div>
      </div>

      {watermarks.length > 0 && (
        <div className="watermark-panel">
          <h4>检测到的水印：</h4>
          <ul>
            {watermarks.map((wm, index) => (
              <li key={index}>
                {wm.content}
                <button
                  onClick={() => removeSpecificWatermark(index)}
                  className="remove-wm-btn"
                >
                  移除
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasPDF && (
        <div className="image-replace-section">
          <h4>图片替换</h4>
          <input
            type="file"
            ref={imageInputRef}
            accept="image/*"
            onChange={handleImageReplace}
            style={{ display: "none" }}
          />
          <button
            onClick={() => imageInputRef.current?.click()}
            className="replace-image-btn"
          >
            选择新图片替换
          </button>
        </div>
      )}

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
        .watermark-btn { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }
        .watermark-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(245,87,108,0.4); }
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
        .rich-text-editor { min-height: 400px; }
        .watermark-panel { background: rgba(240,147,251,0.1); border: 1px solid rgba(240,147,251,0.3); border-radius: 8px; padding: 15px; margin-bottom: 15px; }
        .watermark-panel h4 { color: #f093fb; margin: 0 0 10px 0; font-size: 14px; }
        .watermark-panel ul { list-style: none; padding: 0; margin: 0; }
        .watermark-panel li { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; color: #eee; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .remove-wm-btn { padding: 4px 12px; background: #f5576c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s ease; }
        .remove-wm-btn:hover { background: #ff0000; }
        .image-replace-section { background: rgba(0,217,255,0.1); border: 1px solid rgba(0,217,255,0.3); border-radius: 8px; padding: 15px; }
        .image-replace-section h4 { color: #00d9ff; margin: 0 0 10px 0; font-size: 14px; }
        .replace-image-btn { padding: 8px 16px; background: transparent; color: #00d9ff; border: 1px solid #00d9ff; border-radius: 6px; cursor: pointer; transition: all 0.3s ease; font-size: 14px; }
        .replace-image-btn:hover { background: #00d9ff; color: #1a1a2e; }
      `}</style>
    </div>
  );
};

export default PdfEditor;