import Quill from "quill";
import "quill/dist/quill.snow.css";

export interface EditorConfig {
  theme?: string;
  placeholder?: string;
  readOnly?: boolean;
  modules?: {
    toolbar?: any;
    [key: string]: any;
  };
  onContentChange?: (html: string, delta: any) => void;
  onImageUpload?: (file: File) => Promise<string>;
}

export interface FontStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  size?: string;
  color?: string;
  background?: string;
  align?: "left" | "center" | "right" | "justify";
  font?: string;
}

export class RichTextEditor {
  private quill: Quill | null = null;
  private container: HTMLElement | null = null;
  private config: EditorConfig;

  constructor(container: HTMLElement | string, config: EditorConfig = {}) {
    this.container =
      typeof container === "string"
        ? document.querySelector(container)
        : container;

    this.config = {
      theme: "snow",
      placeholder: "请输入内容...",
      readOnly: false,
      ...config,
    };

    this.initEditor();
  }

  private initEditor() {
    if (!this.container) {
      throw new Error("Container element not found");
    }

    this.quill = new Quill(this.container, {
      theme: this.config.theme,
      placeholder: this.config.placeholder,
      readOnly: this.config.readOnly,
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ align: [] }],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ indent: "-1" }, { indent: "+1" }],
          ["link", "image", "video"],
          ["clean"],
        ],
        ...this.config.modules,
      },
    });

    this.setupEventHandlers();
    this.applyDarkTheme();
  }

  private setupEventHandlers() {
    if (!this.quill) return;

    this.quill.on("text-change", () => {
      if (this.config.onContentChange) {
        const html = this.quill!.root.innerHTML;
        const delta = this.quill!.getContents();
        this.config.onContentChange!(html, delta);
      }
    });

    // 自定义图片上传处理
    const toolbar = this.quill.getModule("toolbar");
    if (toolbar) {
      toolbar.addHandler("image", () => this.handleImageInsert());
    }
  }

  private async handleImageInsert() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];

      if (file && this.config.onImageUpload) {
        try {
          const url = await this.config.onImageUpload(file);
          const range = this.quill!.getSelection(true);
          this.quill!.insertEmbed(range.index, "image", url, "user");
        } catch (error) {
          console.error("Image upload failed:", error);
        }
      } else if (file) {
        // 默认处理：使用base64
        const reader = new FileReader();
        reader.onload = (event) => {
          const range = this.quill!.getSelection(true);
          this.quill!.insertEmbed(
            range.index,
            "image",
            event.target?.result,
            "user",
          );
        };
        reader.readAsDataURL(file);
      }
    };

    input.click();
  }

  private applyDarkTheme() {
    if (!this.container) return;

    const style = document.createElement("style");
    style.textContent = `
      .ql-container.ql-snow {
        border: 1px solid #1a1a2e !important;
        background-color: #16213e !important;
        color: #eee !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      }
      
      .ql-toolbar.ql-snow {
        border: 1px solid #1a1a2e !important;
        background-color: #0f3460 !important;
        border-bottom: none !important;
      }
      
      .ql-editor.ql-blank::before {
        color: #666 !important;
        font-style: normal !important;
      }
      
      .ql-snow .ql-stroke {
        stroke: #00d9ff !important;
      }
      
      .ql-snow .ql-fill {
        fill: #00d9ff !important;
      }
      
      .ql-snow .ql-picker-label {
        color: #eee !important;
      }
      
      .ql-snow .ql-picker-options {
        background-color: #1a1a2e !important;
        border: 1px solid #0f3460 !important;
      }
      
      .ql-snow .ql-picker-item {
        color: #eee !important;
      }
      
      .ql-snow .ql-picker-item:hover {
        background-color: #0f3460 !important;
        color: #00d9ff !important;
      }
      
      .ql-snow button:hover,
      .ql-snow .ql-picker-label:hover {
        color: #00d9ff !important;
      }
      
      .ql-snow .ql-active {
        color: #00d9ff !important;
      }
      
      .ql-snow .ql-active .ql-stroke {
        stroke: #00d9ff !important;
      }
      
      .ql-snow .ql-active .ql-fill {
        fill: #00d9ff !important;
      }
      
      .ql-editor {
        min-height: 400px;
        padding: 20px;
        line-height: 1.6;
      }
      
      .ql-editor img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        margin: 10px 0;
      }
      
      body {
        margin: 0;
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
      }
    `;
    document.head.appendChild(style);
  }

  setContent(html: string) {
    if (this.quill) {
      this.quill.root.innerHTML = html;
    }
  }

  getContent(): string {
    return this.quill ? this.quill.root.innerHTML : "";
  }

  getText(): string {
    return this.quill ? this.quill.getText() : "";
  }

  getDelta(): any {
    return this.quill ? this.quill.getContents() : null;
  }

  applyStyle(style: FontStyle) {
    if (!this.quill) return;

    const selection = this.quill.getSelection(true);

    if (style.bold !== undefined) {
      this.quill.format("bold", style.bold);
    }
    if (style.italic !== undefined) {
      this.quill.format("italic", style.italic);
    }
    if (style.underline !== undefined) {
      this.quill.format("underline", style.underline);
    }
    if (style.strike !== undefined) {
      this.quill.format("strike", style.strike);
    }
    if (style.size) {
      this.quill.format("size", style.size);
    }
    if (style.color) {
      this.quill.format("color", style.color);
    }
    if (style.background) {
      this.quill.format("background", style.background);
    }
    if (style.align) {
      this.quill.format("align", style.align);
    }
    if (style.font) {
      this.quill.format("font", style.font);
    }
  }

  insertImage(url: string) {
    if (this.quill) {
      const range = this.quill.getSelection(true);
      this.quill.insertEmbed(range.index, "image", url, "user");
    }
  }

  replaceImage(oldUrl: string, newUrl: string) {
    if (!this.quill) return;

    const delta = this.quill.getContents();
    delta.ops.forEach((op: any, index: number) => {
      if (op.insert && op.insert.image === oldUrl) {
        this.quill!.deleteText(index, 1);
        this.quill!.insertEmbed(index, "image", newUrl, "user");
      }
    });
  }

  findAndReplace(searchText: string, replaceText: string) {
    if (!this.quill) return;

    const content = this.quill.root.innerHTML;
    const updatedContent = content.replaceAll(searchText, replaceText);
    this.quill.root.innerHTML = updatedContent;
  }

  enableEditMode() {
    if (this.quill) {
      this.quill.enable(true);
    }
  }

  disableEditMode() {
    if (this.quill) {
      this.quill.enable(false);
    }
  }

  focus() {
    if (this.quill) {
      this.quill.focus();
    }
  }

  clear() {
    if (this.quill) {
      this.quill.setText("");
    }
  }

  destroy() {
    if (this.quill) {
      this.quill = null;
    }
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}
