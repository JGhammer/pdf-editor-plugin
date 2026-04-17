import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import Quill from "quill";
import "quill/dist/quill.snow.css";

export interface EditorElement {
  id: string;
  type: "text" | "image" | "rect";
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bgColor: string;
  opacity: number;
  dataUrl?: string;
  isOriginal?: boolean;
  deleted?: boolean;
}

export interface CanvasEditorCallbacks {
  onElementSelect?: (el: EditorElement | null) => void;
  onElementsChange?: (els: EditorElement[]) => void;
}

let _wInit = false;
function ensureWorker() {
  if (_wInit) return;
  _wInit = true;
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.js",
      import.meta.url,
    ).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
}

export class PDFCanvasEditor {
  private container: HTMLElement;
  private pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
  private pdfBytes: Uint8Array | null = null;
  private elements: EditorElement[] = [];
  private selectedId: string | null = null;
  private currentPage = 0;
  private totalPages = 0;
  private scale: number;
  private overlays: HTMLDivElement[] = [];
  private pageWrappers: HTMLDivElement[] = [];
  private dragging = false;
  private resizing = false;
  private resizeDir = "";
  private sx = 0;
  private sy = 0;
  private sEx = 0;
  private sEy = 0;
  private sEw = 0;
  private sEh = 0;
  private cb: CanvasEditorCallbacks;
  private quillInstance: Quill | null = null;
  private quillContainer: HTMLDivElement | null = null;
  private editingElId: string | null = null;
  private styleEl: HTMLElement | null = null;
  private isEditing = false;

  constructor(
    container: HTMLElement,
    scale = 1.5,
    cb: CanvasEditorCallbacks = {},
  ) {
    this.container = container;
    this.scale = scale;
    this.cb = cb;
    ensureWorker();
    this.injectStyles();
  }

  private injectStyles() {
    if (this.styleEl) return;
    this.styleEl = document.createElement("style");
    this.styleEl.textContent = `
.pdf-ce{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans SC','Microsoft YaHei',sans-serif}
.pdf-ce-page{position:relative;margin:0 auto 20px;box-shadow:0 2px 12px rgba(0,0,0,.3);border-radius:4px}
.pdf-ce-canvas{display:block}
.pdf-ce-overlay{position:absolute;top:0;left:0;width:100%;height:100%;cursor:default}
.pdf-ce-el{position:absolute;cursor:move;min-width:10px;min-height:10px}
.pdf-ce-el.sel{outline:2px solid #00d9ff;outline-offset:1px}
.pdf-ce-el-text{border:1px dashed transparent;padding:2px 4px;white-space:pre-wrap;word-break:break-word;overflow:hidden;line-height:1.4}
.pdf-ce-el-text:hover{border-color:rgba(0,217,255,.4)}
.pdf-ce-el-text.sel{border-color:#00d9ff;background:rgba(0,217,255,.05)}
.pdf-ce-el-img{border:1px dashed transparent}
.pdf-ce-el-img:hover{border-color:rgba(0,217,255,.4)}
.pdf-ce-el-img.sel{border-color:#00d9ff}
.pdf-ce-el-img img{width:100%;height:100%;object-fit:contain;pointer-events:none}
.pdf-ce-el-rect{border:1px dashed transparent}
.pdf-ce-el-rect:hover{border-color:rgba(0,217,255,.4)}
.pdf-ce-el-rect.sel{border-color:#00d9ff}
.pdf-ce-rh{position:absolute;width:10px;height:10px;background:#00d9ff;border:1px solid #fff;border-radius:2px;z-index:10}
.pdf-ce-rh.nw{top:-5px;left:-5px;cursor:nw-resize}.pdf-ce-rh.ne{top:-5px;right:-5px;cursor:ne-resize}
.pdf-ce-rh.sw{bottom:-5px;left:-5px;cursor:sw-resize}.pdf-ce-rh.se{bottom:-5px;right:-5px;cursor:se-resize}
.pdf-ce-del{position:absolute;top:-22px;right:-5px;width:20px;height:20px;background:#f5576c;color:#fff;border:none;border-radius:50%;font-size:12px;line-height:20px;text-align:center;cursor:pointer;z-index:10;display:none}
.pdf-ce-el.sel .pdf-ce-del{display:block}
.pdf-ce-orig{position:absolute;cursor:pointer;border:1px solid transparent;z-index:1}
.pdf-ce-orig:hover{border-color:rgba(255,165,0,.6);background:rgba(255,165,0,.08)}
.pdf-ce-orig.sel{border-color:#ff9500;background:rgba(255,165,0,.12)}
.pdf-ce-quill-wrap{position:absolute;z-index:20;border:2px solid #00d9ff;border-radius:4px;overflow:visible;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.3)}
.pdf-ce-quill-wrap .ql-toolbar.ql-snow{border:none!important;background:#f0f0f0;padding:4px 8px}
.pdf-ce-quill-wrap .ql-container.ql-snow{border:none!important;font-size:14px;min-height:60px}
.pdf-ce-quill-wrap .ql-editor{min-height:60px;padding:8px;color:#000}
.pdf-ce-nav{display:flex;align-items:center;justify-content:center;gap:12px;padding:10px;background:rgba(15,52,96,.8);border-radius:8px;margin-bottom:12px}
.pdf-ce-nav-btn{padding:6px 14px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px}
.pdf-ce-nav-btn:hover{opacity:.9}.pdf-ce-nav-btn:disabled{opacity:.4;cursor:not-allowed}
.pdf-ce-nav-info{color:#00d9ff;font-size:13px;min-width:80px;text-align:center}
.pdf-ce-tools{display:flex;flex-wrap:wrap;gap:8px;padding:10px;background:rgba(15,52,96,.6);border-radius:8px;margin-bottom:12px;align-items:center}
.pdf-ce-tbtn{padding:6px 12px;background:rgba(0,217,255,.15);color:#00d9ff;border:1px solid rgba(0,217,255,.3);border-radius:6px;cursor:pointer;font-size:12px;transition:all .2s}
.pdf-ce-tbtn:hover{background:#00d9ff;color:#1a1a2e}
.pdf-ce-pages{overflow-y:auto;max-height:70vh;padding:10px}
.pdf-ce-ctx-menu{position:fixed;z-index:100;background:#1a1a2e;border:1px solid rgba(0,217,255,.3);border-radius:8px;padding:4px 0;box-shadow:0 4px 16px rgba(0,0,0,.4);min-width:160px}
.pdf-ce-ctx-item{display:block;width:100%;padding:8px 16px;background:none;border:none;color:#eee;font-size:13px;text-align:left;cursor:pointer}
.pdf-ce-ctx-item:hover{background:rgba(0,217,255,.2);color:#00d9ff}
.pdf-ce-ctx-item.danger{color:#f5576c}
.pdf-ce-ctx-item.danger:hover{background:rgba(245,87,108,.15)}
.pdf-ce-ctx-sep{height:1px;background:rgba(255,255,255,.1);margin:4px 0}
`;
    document.head.appendChild(this.styleEl);
  }

  async loadPDF(file: File | ArrayBuffer): Promise<void> {
    if (file instanceof File) {
      const buf = await file.arrayBuffer();
      this.pdfBytes = new Uint8Array(buf);
    } else {
      this.pdfBytes = new Uint8Array(file);
    }
    const task = pdfjsLib.getDocument({ data: this.pdfBytes.slice() });
    this.pdfDoc = await task.promise;
    this.totalPages = this.pdfDoc.numPages;
    this.currentPage = 0;
    this.elements = [];
    this.selectedId = null;
    await this.renderAll();
  }

  private async renderAll() {
    this.container.innerHTML = "";
    this.overlays = [];
    this.pageWrappers = [];

    const root = document.createElement("div");
    root.className = "pdf-ce";
    root.appendChild(this.buildNav());
    root.appendChild(this.buildTools());

    const pages = document.createElement("div");
    pages.className = "pdf-ce-pages";

    for (let i = 0; i < this.totalPages; i++) {
      const page = await this.pdfDoc!.getPage(i + 1);
      const vp = page.getViewport({ scale: this.scale });
      const wrap = document.createElement("div");
      wrap.className = "pdf-ce-page";
      wrap.style.width = vp.width + "px";
      wrap.style.height = vp.height + "px";

      const canvas = document.createElement("canvas");
      canvas.className = "pdf-ce-canvas";
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({
        canvasContext: canvas.getContext("2d")!,
        viewport: vp,
      }).promise;

      const ov = document.createElement("div");
      ov.className = "pdf-ce-overlay";
      ov.addEventListener("mousedown", (e) => {
        if (e.target === ov) this.deselect();
        this.currentPage = i;
        this.updateNav();
      });
      ov.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.showContextMenu(e, i, e.offsetX, e.offsetY);
      });

      wrap.appendChild(canvas);
      wrap.appendChild(ov);
      pages.appendChild(wrap);
      this.overlays.push(ov);
      this.pageWrappers.push(wrap);

      await this.extractPageContent(page, i, vp);
    }

    root.appendChild(pages);
    this.container.appendChild(root);
    this.renderEls();
    this.updateNav();
  }

  private async extractPageContent(
    page: pdfjsLib.PDFPageProxy,
    pageIndex: number,
    viewport: pdfjsLib.PageViewport,
  ) {
    const textContent = await page.getTextContent();
    const lineMap = new Map<
      string,
      Array<{
        str: string;
        x: number;
        y: number;
        w: number;
        h: number;
        fontSize: number;
      }>
    >();

    for (const item of textContent.items as any[]) {
      if (!item.str || !item.str.trim()) continue;
      const tx = item.transform[4];
      const ty = item.transform[5];
      const fontSize =
        Math.abs(item.transform[0]) || Math.abs(item.height) || 12;
      const yKey = Math.round(ty / 3) * 3;
      if (!lineMap.has(String(yKey))) lineMap.set(String(yKey), []);
      lineMap.get(String(yKey))!.push({
        str: item.str,
        x: tx,
        y: ty,
        w: item.width || item.str.length * fontSize * 0.6,
        h: item.height || fontSize,
        fontSize,
      });
    }

    lineMap.forEach((items) => {
      items.sort((a, b) => a.x - b.x);
      const fullText = items.map((it) => it.str).join(" ");
      const minX = Math.min(...items.map((it) => it.x));
      const minY = Math.min(...items.map((it) => it.y));
      const maxX = Math.max(...items.map((it) => it.x + it.w));
      const maxY = Math.max(...items.map((it) => it.y + it.h));
      const avgFontSize =
        items.reduce((s, it) => s + it.fontSize, 0) / items.length;

      const [, , , , , pageHeight] = page.getViewport({ scale: 1 }).transform;
      const s = this.scale;
      const el: EditorElement = {
        id: this.uid(),
        type: "text",
        pageIndex,
        x: minX * s,
        y: (pageHeight - maxY) * s,
        width: (maxX - minX) * s,
        height: (maxY - minY) * s + avgFontSize * s * 0.3,
        content: fullText,
        fontSize: avgFontSize * s,
        fontFamily: "sans-serif",
        color: "#000000",
        bgColor: "transparent",
        opacity: 1,
        isOriginal: true,
      };
      this.elements.push(el);
    });

    const opList = await page.getOperatorList();
    let hasImage = false;
    for (let opIdx = 0; opIdx < opList.fnArray.length; opIdx++) {
      const fn = opList.fnArray[opIdx];
      if (fn === pdfjsLib.OPS.paintImageXObject && !hasImage) {
        hasImage = true;
      }
    }
    if (hasImage) {
      const pageCanvas = this.pageWrappers[pageIndex]?.querySelector(
        ".pdf-ce-canvas",
      ) as HTMLCanvasElement;
      if (pageCanvas) {
        try {
          const imgEl: EditorElement = {
            id: this.uid(),
            type: "image",
            pageIndex,
            x: 0,
            y: 0,
            width: viewport.width,
            height: viewport.height,
            content: "",
            fontSize: 14,
            fontFamily: "sans-serif",
            color: "#000",
            bgColor: "transparent",
            opacity: 1,
            isOriginal: true,
            dataUrl: pageCanvas.toDataURL("image/png"),
          };
          this.elements.push(imgEl);
        } catch {}
      }
    }
  }

  private showContextMenu(
    e: MouseEvent,
    pageIndex: number,
    x: number,
    y: number,
  ) {
    this.closeContextMenu();
    const menu = document.createElement("div");
    menu.className = "pdf-ce-ctx-menu";
    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";

    const addTextItem = document.createElement("button");
    addTextItem.className = "pdf-ce-ctx-item";
    addTextItem.textContent = "📝 添加文字";
    addTextItem.onclick = () => {
      this.closeContextMenu();
      this.addTextAt(pageIndex, x, y);
    };

    const addImageItem = document.createElement("button");
    addImageItem.className = "pdf-ce-ctx-item";
    addImageItem.textContent = "🖼️ 插入图片";
    addImageItem.onclick = () => {
      this.closeContextMenu();
      this.addImageAt(pageIndex, x, y);
    };

    const addRectItem = document.createElement("button");
    addRectItem.className = "pdf-ce-ctx-item";
    addRectItem.textContent = "⬜ 遮盖区域";
    addRectItem.onclick = () => {
      this.closeContextMenu();
      this.addRectAt(pageIndex, x, y);
    };

    menu.append(addTextItem, addImageItem, addRectItem);
    document.body.appendChild(menu);

    const closeHandler = (ev: MouseEvent) => {
      if (!menu.contains(ev.target as Node)) {
        this.closeContextMenu();
        document.removeEventListener("mousedown", closeHandler);
      }
    };
    setTimeout(() => document.addEventListener("mousedown", closeHandler), 0);
  }

  private closeContextMenu() {
    document.querySelectorAll(".pdf-ce-ctx-menu").forEach((m) => m.remove());
  }

  private buildNav(): HTMLDivElement {
    const nav = document.createElement("div");
    nav.className = "pdf-ce-nav";
    const prev = document.createElement("button");
    prev.className = "pdf-ce-nav-btn";
    prev.textContent = "上一页";
    prev.onclick = () => {
      if (this.currentPage > 0) {
        this.currentPage--;
        this.scrollPage();
        this.updateNav();
      }
    };
    const info = document.createElement("span");
    info.className = "pdf-ce-nav-info";
    info.textContent = "1 / " + this.totalPages;
    const next = document.createElement("button");
    next.className = "pdf-ce-nav-btn";
    next.textContent = "下一页";
    next.onclick = () => {
      if (this.currentPage < this.totalPages - 1) {
        this.currentPage++;
        this.scrollPage();
        this.updateNav();
      }
    };
    nav.append(prev, info, next);
    return nav;
  }

  private buildTools(): HTMLDivElement {
    const bar = document.createElement("div");
    bar.className = "pdf-ce-tools";
    const mk = (icon: string, label: string, fn: () => void) => {
      const b = document.createElement("button");
      b.className = "pdf-ce-tbtn";
      b.textContent = icon + " " + label;
      b.onclick = fn;
      return b;
    };
    bar.append(
      mk("📝", "添加文字", () => this.addText()),
      mk("🖼️", "插入图片", () => this.addImage()),
      mk("⬜", "遮盖区域", () => this.addRect()),
      mk("🗑️", "删除选中", () => this.deleteSelected()),
    );
    return bar;
  }

  private updateNav() {
    const info = this.container.querySelector(".pdf-ce-nav-info");
    if (info) info.textContent = `${this.currentPage + 1} / ${this.totalPages}`;
    const btns = this.container.querySelectorAll(".pdf-ce-nav-btn");
    if (btns[0])
      (btns[0] as HTMLButtonElement).disabled = this.currentPage <= 0;
    if (btns[1])
      (btns[1] as HTMLButtonElement).disabled =
        this.currentPage >= this.totalPages - 1;
  }

  private scrollPage() {
    this.pageWrappers[this.currentPage]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  private addText() {
    const ov = this.overlays[this.currentPage];
    if (!ov) return;
    this.addTextAt(
      this.currentPage,
      ov.clientWidth * 0.1,
      ov.clientHeight * 0.1,
    );
  }

  private addTextAt(pi: number, x: number, y: number) {
    const el: EditorElement = {
      id: this.uid(),
      type: "text",
      pageIndex: pi,
      x,
      y,
      width: 300,
      height: 80,
      content: "",
      fontSize: 14,
      fontFamily: "sans-serif",
      color: "#000000",
      bgColor: "transparent",
      opacity: 1,
    };
    this.elements.push(el);
    this.renderEls();
    this.select(el.id);
    this.startRichEdit(el);
    this.cb.onElementsChange?.(this.elements);
  }

  private addImage() {
    this.addImageAt(this.currentPage, 50, 50);
  }

  private addImageAt(pi: number, x: number, y: number) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      const url = await this.readDataURL(f);
      const el: EditorElement = {
        id: this.uid(),
        type: "image",
        pageIndex: pi,
        x,
        y,
        width: 200,
        height: 150,
        content: "",
        fontSize: 14,
        fontFamily: "sans-serif",
        color: "#000",
        bgColor: "transparent",
        opacity: 1,
        dataUrl: url,
      };
      this.elements.push(el);
      this.renderEls();
      this.select(el.id);
      this.cb.onElementsChange?.(this.elements);
    };
    input.click();
  }

  private addRect() {
    this.addRectAt(this.currentPage, 50, 50);
  }

  private addRectAt(pi: number, x: number, y: number) {
    const el: EditorElement = {
      id: this.uid(),
      type: "rect",
      pageIndex: pi,
      x,
      y,
      width: 150,
      height: 40,
      content: "",
      fontSize: 14,
      fontFamily: "sans-serif",
      color: "#000",
      bgColor: "#ffffff",
      opacity: 1,
    };
    this.elements.push(el);
    this.renderEls();
    this.select(el.id);
    this.cb.onElementsChange?.(this.elements);
  }

  private deleteSelected() {
    if (!this.selectedId) return;
    this.finishRichEdit();
    const el = this.elements.find((e) => e.id === this.selectedId);
    if (el?.isOriginal) {
      el.deleted = true;
      const coverEl: EditorElement = {
        id: this.uid(),
        type: "rect",
        pageIndex: el.pageIndex,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        content: "",
        fontSize: 14,
        fontFamily: "sans-serif",
        color: "#fff",
        bgColor: "#ffffff",
        opacity: 1,
      };
      this.elements.push(coverEl);
    } else {
      this.elements = this.elements.filter((e) => e.id !== this.selectedId);
    }
    this.selectedId = null;
    this.renderEls();
    this.cb.onElementSelect?.(null);
    this.cb.onElementsChange?.(this.elements);
  }

  private select(id: string) {
    this.deselect();
    this.selectedId = id;
    const el = this.elements.find((e) => e.id === id);
    if (el?.isOriginal) {
      const dom = this.container.querySelector(
        `[data-oid="${id}"]`,
      ) as HTMLElement;
      if (dom) {
        dom.classList.add("sel");
        this.addHandles(dom, id);
      }
    } else {
      const dom = this.container.querySelector(
        `[data-eid="${id}"]`,
      ) as HTMLElement;
      if (dom) {
        dom.classList.add("sel");
        this.addHandles(dom, id);
      }
    }
    if (el) this.cb.onElementSelect?.(el);
  }

  private deselect() {
    this.selectedId = null;
    if (this.isEditing) this.finishRichEdit();
    this.container
      .querySelectorAll(".pdf-ce-el.sel,.pdf-ce-orig.sel")
      .forEach((d) => {
        d.classList.remove("sel");
        d.querySelectorAll(".pdf-ce-rh,.pdf-ce-del").forEach((h) => h.remove());
      });
  }

  private addHandles(dom: HTMLElement, id: string) {
    dom.querySelectorAll(".pdf-ce-rh,.pdf-ce-del").forEach((h) => h.remove());
    for (const p of ["nw", "ne", "sw", "se"]) {
      const h = document.createElement("div");
      h.className = `pdf-ce-rh ${p}`;
      h.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.startResize(e, id, p);
      });
      dom.appendChild(h);
    }
    const del = document.createElement("button");
    del.className = "pdf-ce-del";
    del.textContent = "×";
    del.addEventListener("mousedown", (e) => e.stopPropagation());
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      this.deleteSelected();
    });
    dom.appendChild(del);
  }

  private renderEls() {
    this.overlays.forEach((ov) => {
      ov.querySelectorAll(".pdf-ce-el,.pdf-ce-orig").forEach((d) => d.remove());
    });

    for (const el of this.elements) {
      if (el.deleted) continue;
      const ov = this.overlays[el.pageIndex];
      if (!ov) continue;

      if (el.isOriginal) {
        const dom = document.createElement("div");
        dom.className = "pdf-ce-orig";
        dom.dataset.oid = el.id;
        dom.style.cssText = `left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px`;
        dom.title =
          el.type === "text" ? el.content.substring(0, 30) : "图片区域";

        dom.addEventListener("mousedown", (e) => {
          e.stopPropagation();
          if (this.isEditing && this.editingElId === el.id) return;
          this.select(el.id);
          this.startDrag(e, el.id);
        });
        dom.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.select(el.id);
          this.showElContextMenu(e, el);
        });

        if (this.selectedId === el.id) {
          dom.classList.add("sel");
          this.addHandles(dom, el.id);
        }
        ov.appendChild(dom);
        continue;
      }

      const dom = document.createElement("div");
      dom.className = `pdf-ce-el pdf-ce-el-${el.type}`;
      dom.dataset.eid = el.id;
      dom.style.cssText = `left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;opacity:${el.opacity}`;

      if (el.type === "text") {
        dom.style.fontSize = el.fontSize + "px";
        dom.style.fontFamily = el.fontFamily;
        dom.style.color = el.color;
        dom.style.backgroundColor = el.bgColor;
        if (el.content) dom.innerHTML = el.content;
      } else if (el.type === "image" && el.dataUrl) {
        const img = document.createElement("img");
        img.src = el.dataUrl;
        dom.appendChild(img);
      } else if (el.type === "rect") {
        dom.style.backgroundColor = el.bgColor;
        dom.style.border = "1px solid " + el.color;
      }

      dom.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        if (this.isEditing && this.editingElId === el.id) return;
        this.select(el.id);
        this.startDrag(e, el.id);
      });
      dom.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        this.select(el.id);
        if (el.type === "text") this.startRichEdit(el);
        else if (el.type === "image") this.replaceImage(el);
      });
      dom.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.select(el.id);
        this.showElContextMenu(e, el);
      });

      if (this.selectedId === el.id && !this.isEditing) {
        dom.classList.add("sel");
        this.addHandles(dom, el.id);
      }
      ov.appendChild(dom);
    }
  }

  private showElContextMenu(e: MouseEvent, el: EditorElement) {
    this.closeContextMenu();
    const menu = document.createElement("div");
    menu.className = "pdf-ce-ctx-menu";
    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";

    if (el.type === "text") {
      const editItem = document.createElement("button");
      editItem.className = "pdf-ce-ctx-item";
      editItem.textContent = "✏️ 编辑文字";
      editItem.onclick = () => {
        this.closeContextMenu();
        this.startRichEdit(el);
      };
      menu.appendChild(editItem);
    }

    if (el.type === "image") {
      const replaceItem = document.createElement("button");
      replaceItem.className = "pdf-ce-ctx-item";
      replaceItem.textContent = "🖼️ 替换图片";
      replaceItem.onclick = () => {
        this.closeContextMenu();
        this.replaceImage(el);
      };
      menu.appendChild(replaceItem);
    }

    const moveItem = document.createElement("button");
    moveItem.className = "pdf-ce-ctx-item";
    moveItem.textContent = "↔️ 移动位置";
    moveItem.onclick = () => {
      this.closeContextMenu();
      this.select(el.id);
    };
    menu.appendChild(moveItem);

    const sep = document.createElement("div");
    sep.className = "pdf-ce-ctx-sep";
    menu.appendChild(sep);

    const delItem = document.createElement("button");
    delItem.className = "pdf-ce-ctx-item danger";
    delItem.textContent = "🗑️ 删除";
    delItem.onclick = () => {
      this.closeContextMenu();
      this.deleteSelected();
    };
    menu.appendChild(delItem);

    document.body.appendChild(menu);
    setTimeout(() => {
      const handler = (ev: MouseEvent) => {
        if (!menu.contains(ev.target as Node)) {
          this.closeContextMenu();
          document.removeEventListener("mousedown", handler);
        }
      };
      document.addEventListener("mousedown", handler);
    }, 0);
  }

  private replaceImage(el: EditorElement) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      el.dataUrl = await this.readDataURL(f);
      if (el.isOriginal) {
        el.isOriginal = false;
      }
      this.renderEls();
      this.select(el.id);
      this.cb.onElementsChange?.(this.elements);
    };
    input.click();
  }

  private startRichEdit(el: EditorElement) {
    this.finishRichEdit();
    this.isEditing = true;
    this.editingElId = el.id;

    const ov = this.overlays[el.pageIndex];
    if (!ov) return;

    const elDom = ov.querySelector(
      `[data-eid="${el.id}"],[data-oid="${el.id}"]`,
    ) as HTMLElement;
    if (elDom) {
      elDom.classList.remove("sel");
      elDom
        .querySelectorAll(".pdf-ce-rh,.pdf-ce-del")
        .forEach((h) => h.remove());
    }

    const wrap = document.createElement("div");
    wrap.className = "pdf-ce-quill-wrap";
    wrap.style.cssText = `left:${el.x}px;top:${el.y}px;width:${Math.max(el.width, 300)}px;`;

    const toolbarDiv = document.createElement("div");
    wrap.appendChild(toolbarDiv);

    const editorDiv = document.createElement("div");
    editorDiv.style.minHeight = Math.max(el.height, 80) + "px";
    wrap.appendChild(editorDiv);

    ov.appendChild(wrap);
    this.quillContainer = wrap;

    this.quillInstance = new Quill(editorDiv, {
      theme: "snow",
      placeholder: "请输入文字...",
      modules: {
        toolbar: {
          container: toolbarDiv,
          handlers: {
            image: () => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = async () => {
                const f = input.files?.[0];
                if (!f) return;
                const url = await this.readDataURL(f);
                const range = this.quillInstance!.getSelection(true);
                this.quillInstance!.insertEmbed(range.index, "image", url);
              };
              input.click();
            },
          },
        },
      },
    });

    const toolbarEl = toolbarDiv.querySelector(".ql-toolbar") as HTMLElement;
    if (toolbarEl) {
      while (toolbarEl.firstChild) toolbarEl.removeChild(toolbarEl.firstChild);

      const fmtGroup = document.createElement("span");
      fmtGroup.className = "ql-formats";
      ["bold", "italic", "underline", "strike"].forEach((fmt) => {
        const b = document.createElement("button");
        b.className = "ql-" + fmt;
        const labels: Record<string, string> = {
          bold: "B",
          italic: "I",
          underline: "U",
          strike: "S",
        };
        b.textContent = labels[fmt];
        fmtGroup.appendChild(b);
      });
      toolbarEl.appendChild(fmtGroup);

      const colorGroup = document.createElement("span");
      colorGroup.className = "ql-formats";
      const colorPicker = document.createElement("select");
      colorPicker.className = "ql-color";
      colorPicker.title = "字体颜色";
      colorGroup.appendChild(colorPicker);
      const bgPicker = document.createElement("select");
      bgPicker.className = "ql-background";
      bgPicker.title = "背景色";
      colorGroup.appendChild(bgPicker);
      toolbarEl.appendChild(colorGroup);

      const sizeGroup = document.createElement("span");
      sizeGroup.className = "ql-formats";
      const sizeSelect = document.createElement("select");
      sizeSelect.className = "ql-size";
      sizeSelect.title = "字号";
      sizeGroup.appendChild(sizeSelect);
      toolbarEl.appendChild(sizeGroup);

      const alignGroup = document.createElement("span");
      alignGroup.className = "ql-formats";
      const alignBtns = document.createElement("span");
      alignBtns.className = "ql-align";
      alignGroup.appendChild(alignBtns);
      toolbarEl.appendChild(alignGroup);

      const imgGroup = document.createElement("span");
      imgGroup.className = "ql-formats";
      const imgBtn = document.createElement("button");
      imgBtn.className = "ql-image";
      imgBtn.textContent = "🖼";
      imgBtn.title = "插入图片";
      imgGroup.appendChild(imgBtn);
      toolbarEl.appendChild(imgGroup);

      const cleanGroup = document.createElement("span");
      cleanGroup.className = "ql-formats";
      const cleanBtn = document.createElement("button");
      cleanBtn.className = "ql-clean";
      cleanBtn.textContent = "🧹";
      cleanBtn.title = "清除格式";
      cleanGroup.appendChild(cleanBtn);
      toolbarEl.appendChild(cleanGroup);
    }

    if (el.content) {
      if (el.isOriginal) {
        this.quillInstance.setText(el.content);
      } else {
        this.quillInstance.root.innerHTML = el.content;
      }
    }

    this.quillInstance.focus();

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "✓ 完成";
    confirmBtn.style.cssText =
      "display:block;width:100%;padding:6px;background:#00d9ff;color:#1a1a2e;border:none;font-size:13px;cursor:pointer;font-weight:500";
    confirmBtn.addEventListener("mousedown", (e) => e.stopPropagation());
    confirmBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.finishRichEdit();
    });
    wrap.appendChild(confirmBtn);

    const handleOutsideClick = (ev: MouseEvent) => {
      if (
        this.quillContainer &&
        !this.quillContainer.contains(ev.target as Node)
      ) {
        this.finishRichEdit();
        document.removeEventListener("mousedown", handleOutsideClick);
      }
    };
    setTimeout(
      () => document.addEventListener("mousedown", handleOutsideClick),
      100,
    );
  }

  private finishRichEdit() {
    if (!this.isEditing || !this.editingElId) {
      this.isEditing = false;
      this.editingElId = null;
      this.quillInstance = null;
      this.quillContainer = null;
      return;
    }

    const el = this.elements.find((e) => e.id === this.editingElId);
    if (el && this.quillInstance) {
      if (el.isOriginal) {
        el.isOriginal = false;
      }
      el.content = this.quillInstance.root.innerHTML;
      const textContent = this.quillInstance.getText();
      if (textContent.trim().length === 0 && !el.isOriginal) {
        this.elements = this.elements.filter((e) => e.id !== this.editingElId);
      }
    }

    if (this.quillContainer && this.quillContainer.parentNode) {
      this.quillContainer.parentNode.removeChild(this.quillContainer);
    }
    this.quillInstance = null;
    this.quillContainer = null;
    this.isEditing = false;
    this.editingElId = null;

    this.renderEls();
    if (el && this.elements.find((e) => e.id === el.id)) {
      this.select(el.id);
    } else {
      this.selectedId = null;
      this.cb.onElementSelect?.(null);
    }
    this.cb.onElementsChange?.(this.elements);
  }

  private startDrag(e: MouseEvent, id: string) {
    const el = this.elements.find((e2) => e2.id === id);
    if (!el) return;
    this.dragging = true;
    this.sx = e.clientX;
    this.sy = e.clientY;
    this.sEx = el.x;
    this.sEy = el.y;
    const move = (ev: MouseEvent) => {
      if (!this.dragging) return;
      el.x = this.sEx + ev.clientX - this.sx;
      el.y = this.sEy + ev.clientY - this.sy;
      const selector = el.isOriginal
        ? `[data-oid="${id}"]`
        : `[data-eid="${id}"]`;
      const d = this.container.querySelector(selector) as HTMLElement;
      if (d) {
        d.style.left = el.x + "px";
        d.style.top = el.y + "px";
      }
    };
    const up = () => {
      this.dragging = false;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      this.renderEls();
      this.select(id);
      this.cb.onElementsChange?.(this.elements);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  }

  private startResize(e: MouseEvent, id: string, dir: string) {
    const el = this.elements.find((e2) => e2.id === id);
    if (!el) return;
    this.resizing = true;
    this.resizeDir = dir;
    this.sx = e.clientX;
    this.sy = e.clientY;
    this.sEx = el.x;
    this.sEy = el.y;
    this.sEw = el.width;
    this.sEh = el.height;
    const move = (ev: MouseEvent) => {
      if (!this.resizing) return;
      const dx = ev.clientX - this.sx;
      const dy = ev.clientY - this.sy;
      if (this.resizeDir.includes("e")) el.width = Math.max(10, this.sEw + dx);
      if (this.resizeDir.includes("w")) {
        const nw = Math.max(10, this.sEw - dx);
        el.x = this.sEx + this.sEw - nw;
        el.width = nw;
      }
      if (this.resizeDir.includes("s")) el.height = Math.max(10, this.sEh + dy);
      if (this.resizeDir.includes("n")) {
        const nh = Math.max(10, this.sEh - dy);
        el.y = this.sEy + this.sEh - nh;
        el.height = nh;
      }
      const selector = el.isOriginal
        ? `[data-oid="${id}"]`
        : `[data-eid="${id}"]`;
      const d = this.container.querySelector(selector) as HTMLElement;
      if (d) {
        d.style.left = el.x + "px";
        d.style.top = el.y + "px";
        d.style.width = el.width + "px";
        d.style.height = el.height + "px";
      }
    };
    const up = () => {
      this.resizing = false;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      this.renderEls();
      this.select(id);
      this.cb.onElementsChange?.(this.elements);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  }

  getElements(): EditorElement[] {
    return [...this.elements];
  }

  getSelectedElement(): EditorElement | null {
    return this.elements.find((e) => e.id === this.selectedId) || null;
  }

  updateElement(id: string, updates: Partial<EditorElement>) {
    const el = this.elements.find((e) => e.id === id);
    if (!el) return;
    Object.assign(el, updates);
    this.renderEls();
    if (this.selectedId === id) this.select(id);
    this.cb.onElementsChange?.(this.elements);
  }

  async exportPDF(): Promise<Uint8Array> {
    if (!this.pdfBytes) throw new Error("No PDF loaded");
    this.finishRichEdit();
    const bytes = this.pdfBytes.slice();
    const doc = await PDFDocument.load(bytes);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pages = doc.getPages();
    const inv = 1 / this.scale;

    const sortedElements = this.elements
      .filter((el) => !el.deleted)
      .sort((a, b) => {
        if (a.isOriginal && !b.isOriginal) return -1;
        if (!a.isOriginal && b.isOriginal) return 1;
        return 0;
      });

    for (const el of sortedElements) {
      if (el.pageIndex >= pages.length) continue;
      const pg = pages[el.pageIndex];
      const ph = pg.getSize().height;
      const px = el.x * inv;
      const py = ph - (el.y + el.height) * inv;
      const pw = el.width * inv;

      if (el.type === "rect") {
        const r = parseInt(el.bgColor.slice(1, 3), 16) / 255;
        const g = parseInt(el.bgColor.slice(3, 5), 16) / 255;
        const b = parseInt(el.bgColor.slice(5, 7), 16) / 255;
        pg.drawRectangle({
          x: px,
          y: py,
          width: pw,
          height: el.height * inv,
          color: rgb(r, g, b),
          opacity: el.opacity,
        });
      } else if (el.type === "text" && el.content && !el.isOriginal) {
        const r = parseInt(el.color.slice(1, 3), 16) / 255;
        const g = parseInt(el.color.slice(3, 5), 16) / 255;
        const b = parseInt(el.color.slice(5, 7), 16) / 255;
        const pfs = el.fontSize * inv;
        const tmp = document.createElement("div");
        tmp.innerHTML = el.content;
        const plainText = tmp.textContent || "";
        plainText.split("\n").forEach((line, i) => {
          try {
            pg.drawText(line.replace(/[^\x20-\x7E]/g, "?"), {
              x: px + 2 * inv,
              y: py + el.height * inv - (i + 1) * pfs * 1.4,
              size: pfs,
              font,
              color: rgb(r, g, b),
              opacity: el.opacity,
            });
          } catch {}
        });
      } else if (el.type === "image" && el.dataUrl && !el.isOriginal) {
        try {
          const ib = this.dataURLtoBytes(el.dataUrl);
          const img = el.dataUrl.includes("image/png")
            ? await doc.embedPng(ib)
            : await doc.embedJpg(ib);
          pg.drawImage(img, {
            x: px,
            y: py,
            width: pw,
            height: el.height * inv,
            opacity: el.opacity,
          });
        } catch {}
      }
    }
    return doc.save();
  }

  static downloadPDF(bytes: Uint8Array, name = "document.pdf") {
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private uid(): string {
    return "e" + Date.now() + Math.random().toString(36).slice(2, 7);
  }
  private readDataURL(f: File): Promise<string> {
    return new Promise((r) => {
      const rd = new FileReader();
      rd.onload = (e) => r(e.target!.result as string);
      rd.readAsDataURL(f);
    });
  }
  private dataURLtoBytes(u: string): Uint8Array {
    const b = atob(u.split(",")[1]);
    const a = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
    return a;
  }

  destroy() {
    this.finishRichEdit();
    this.closeContextMenu();
    if (this.styleEl) {
      this.styleEl.remove();
      this.styleEl = null;
    }
    this.container.innerHTML = "";
    this.pdfDoc = null;
    this.pdfBytes = null;
    this.elements = [];
    this.overlays = [];
    this.pageWrappers = [];
  }
}
