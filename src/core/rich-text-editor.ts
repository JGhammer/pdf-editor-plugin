import Quill from "quill";
import "quill/dist/quill.snow.css";

export interface EditorStyle {
  width?: string;
  height?: string;
  minHeight?: string;
  background?: string;
  borderColor?: string;
  borderRadius?: string;
  padding?: string;
  fontSize?: string;
  fontFamily?: string;
  textColor?: string;
}

export interface EditorConfig {
  theme?: string;
  placeholder?: string;
  readOnly?: boolean;
  style?: EditorStyle;
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

const TOOLBAR_LABELS: Record<string, string> = {
  header: "标题",
  bold: "加粗",
  italic: "斜体",
  underline: "下划线",
  strike: "删除线",
  color: "字体颜色",
  background: "背景色",
  align: "对齐",
  list: "列表",
  indent: "缩进",
  link: "插入链接",
  image: "插入图片",
  video: "插入视频",
  clean: "清除格式",
};

export class RichTextEditor {
  private quill: Quill | null = null;
  private container: HTMLElement | null = null;
  private config: EditorConfig;
  private styleEl: HTMLElement | null = null;

  constructor(container: HTMLElement | string, config: EditorConfig = {}) {
    this.container =
      typeof container === "string"
        ? document.querySelector(container)
        : container;

    this.config = {
      theme: "snow",
      placeholder: "请输入内容...",
      readOnly: false,
      style: {},
      ...config,
    };

    this.initEditor();
    this.applyContainerStyle();
    this.applyDarkTheme();
    this.applyToolbarLabels();
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
  }

  private applyToolbarLabels() {
    if (!this.container) return;

    const toolbar = this.container.closest(".pdf-editor-wrapper")?.querySelector(".ql-toolbar");
    if (!toolbar) return;

    toolbar.querySelectorAll("button").forEach((btn) => {
      const className = btn.className;
      let label = "";

      if (className.includes("ql-bold")) label = TOOLBAR_LABELS.bold;
      else if (className.includes("ql-italic")) label = TOOLBAR_LABELS.italic;
      else if (className.includes("ql-underline")) label = TOOLBAR_LABELS.underline;
      else if (className.includes("ql-strike")) label = TOOLBAR_LABELS.strike;
      else if (className.includes("ql-link")) label = TOOLBAR_LABELS.link;
      else if (className.includes("ql-image")) label = TOOLBAR_LABELS.image;
      else if (className.includes("ql-video")) label = TOOLBAR_LABELS.video;
      else if (className.includes("ql-clean")) label = TOOLBAR_LABELS.clean;
      else if (className.includes("ql-list")) {
        label = btn.getAttribute("value") === "ordered" ? "有序列表" : "无序列表";
      }
      else if (className.includes("ql-indent")) {
        label = btn.getAttribute("value") === "-1" ? "减少缩进" : "增加缩进";
      }
      else if (className.includes("ql-align")) label = TOOLBAR_LABELS.align;
      else if (className.includes("ql-direction")) label = "文字方向";

      if (label) {
        btn.setAttribute("title", label);
        const existing = btn.querySelector(".ql-tooltip-label");
        if (!existing) {
          const span = document.createElement("span");
          span.className = "ql-tooltip-label";
          span.textContent = label;
          span.style.cssText = `
            position: absolute;
            bottom: -28px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: #fff;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 3px;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 100;
          `;
          btn.style.position = "relative";
          btn.appendChild(span);

          btn.addEventListener("mouseenter", () => {
            span.style.opacity = "1";
          });
          btn.addEventListener("mouseleave", () => {
            span.style.opacity = "0";
          });
        }
      }
    });

    toolbar.querySelectorAll(".ql-picker").forEach((picker) => {
      let label = "";
      const cls = picker.className;

      if (cls.includes("ql-header")) label = "标题大小";
      else if (cls.includes("ql-color")) label = "字体颜色";
      else if (cls.includes("ql-background")) label = "背景颜色";
      else if (cls.includes("ql-align")) label = "对齐方式";
      else if (cls.includes("ql-font")) label = "字体";
      else if (cls.includes("ql-size")) label = "字号";

      if (label) {
        picker.setAttribute("title", label);
      }
    });

    const headerPicker = toolbar.querySelector(".ql-header .ql-picker-label");
    if (headerPicker) {
      const headerItems = toolbar.querySelectorAll(".ql-header .ql-picker-item");
      const headerLabels: Record<string, string> = {
        "1": "标题1",
        "2": "标题2",
        "3": "标题3",
        "false": "正文",
      };
      headerItems.forEach((item) => {
        const val = item.getAttribute("data-value") || "false";
        const text = headerLabels[val];
        if (text) {
          item.textContent = text;
        }
      });
    }
  }

  private applyContainerStyle() {
    if (!this.container || !this.config.style) return;

    const s = this.config.style;
    const container = this.container as HTMLElement;

    if (s.width) container.style.width = s.width;
    if (s.height) container.style.height = s.height;
    if (s.minHeight) container.style.minHeight = s.minHeight;
    if (s.background) container.style.backgroundColor = s.background;
    if (s.borderColor) container.style.borderColor = s.borderColor;
    if (s.borderRadius) container.style.borderRadius = s.borderRadius;
    if (s.padding) container.style.padding = s.padding;
    if (s.fontSize) container.style.fontSize = s.fontSize;
    if (s.fontFamily) container.style.fontFamily = s.fontFamily;
    if (s.textColor) container.style.color = s.textColor;

    const editorEl = container.querySelector(".ql-editor") as HTMLElement;
    if (editorEl) {
      if (s.minHeight) editorEl.style.minHeight = s.minHeight;
      if (s.height) editorEl.style.height = s.height;
      if (s.background) editorEl.style.backgroundColor = s.background;
      if (s.fontSize) editorEl.style.fontSize = s.fontSize;
      if (s.fontFamily) editorEl.style.fontFamily = s.fontFamily;
      if (s.textColor) editorEl.style.color = s.textColor;
      if (s.padding) editorEl.style.padding = s.padding;
    }
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

    if (this.styleEl) {
      this.styleEl.remove();
    }

    this.styleEl = document.createElement("style");
    this.styleEl.textContent = `
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
        flex-wrap: wrap;
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
        cursor: pointer;
        transition: opacity 0.2s;
      }

      .ql-editor img:hover {
        opacity: 0.8;
      }

      .ql-toolbar button {
        position: relative;
      }
    `;
    document.head.appendChild(this.styleEl);
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

    const content = this.quill.root.innerHTML;
    const updatedContent = content.replace(
      new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
      newUrl,
    );
    this.quill.root.innerHTML = updatedContent;
  }

  getAllImages(): string[] {
    if (!this.quill) return [];
    const imgs = this.quill.root.querySelectorAll("img");
    return Array.from(imgs).map((img) => img.getAttribute("src") || "");
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

  updateStyle(style: EditorStyle) {
    this.config.style = { ...this.config.style, ...style };
    this.applyContainerStyle();
  }

  destroy() {
    if (this.styleEl) {
      this.styleEl.remove();
      this.styleEl = null;
    }
    if (this.quill) {
      this.quill = null;
    }
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}
