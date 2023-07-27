import { Popup } from "./popup.js";
export class ImageCroper {
    image;
    popup = new Popup();
    ctx;
    imageRect;
    canvasRect;
    zoom = 0;
    zoomOffset = null;
    padding = 4;
    cropArea;
    moveRectOld;
    cropAreaSize = 64;
    startPos = null;
    handle = "n";
    onUpEvent;
    maxCanvasSize = () => ({ w: Math.min(800, window.innerWidth - 32), h: Math.min(800, window.innerHeight - 128) });
    constructor(image, onEnd) {
        this.image = image;
        const canvas = document.createElement("canvas");
        const maxCanvasSize = this.maxCanvasSize();
        canvas.width = maxCanvasSize.w;
        canvas.height = maxCanvasSize.h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx)
            throw new Error(`ctx is null`);
        this.ctx = ctx;
        this.imageRect = this.getImageRect();
        canvas.width = this.imageRect.w + this.padding * 2;
        canvas.height = this.imageRect.h + this.padding * 2;
        this.cropArea = { ...this.imageRect };
        this.moveRectOld = { ...this.imageRect };
        this.canvasRect = { ...this.imageRect };
        canvas.addEventListener("mousedown", e => this.onDown(e));
        canvas.addEventListener("mousemove", e => this.onMove(e));
        canvas.addEventListener("wheel", e => this.onWheel(e));
        canvas.addEventListener("contextmenu", e => e.preventDefault());
        this.onUpEvent = (e) => this.onUp(e);
        this.popup.content.appendChild(canvas);
        this.popup.addListener("close", (p, r) => {
            window.removeEventListener("mouseup", this.onUpEvent);
            if (!r) {
                onEnd(null);
                return;
            }
            const img = this.getCropedImage();
            createImageBitmap(img).then(bitmap => onEnd(bitmap));
        });
        this.popup.closeOnBackClick = false;
        canvas.style.userSelect = "none";
        canvas.style.width = `${canvas.width}px`;
        canvas.style.height = `${canvas.height}px`;
        this.cropArea.x += 25;
        this.cropArea.y += 25;
        this.cropArea.w -= 50;
        this.cropArea.h -= 50;
        const div = document.createElement("div");
        div.innerText = "Mouse wheel - zoom; Right click - move image";
        div.style.marginBottom = "8px";
        this.popup.content.appendChild(div);
    }
    crop() {
        window.addEventListener("mouseup", this.onUpEvent);
        this.popup.open();
        this.draw();
    }
    getImageRect() {
        const canvas = this.ctx.canvas;
        const image = this.image;
        const imgMaxScale = Math.min(Math.min((canvas.width - this.padding * 2) / image.width, (canvas.height - this.padding * 2) / image.height), 1);
        const zoom = Math.pow(1.2, this.zoom);
        const imgW = image.width * imgMaxScale * zoom;
        const imgH = image.height * imgMaxScale * zoom;
        this.imageRect = { x: this.imageRect?.x || this.padding, y: this.imageRect?.y || this.padding, w: imgW, h: imgH };
        if (this.zoomOffset) {
            const zoomPrev = Math.pow(1.2, this.zoomOffset.zoom);
            const imgX = (this.zoomOffset.x - this.imageRect.x) / zoomPrev;
            const imgY = (this.zoomOffset.y - this.imageRect.y) / zoomPrev;
            this.imageRect.x = -imgX * zoom + this.zoomOffset.x;
            this.imageRect.y = -imgY * zoom + this.zoomOffset.y;
        }
        if (this.canvasRect) {
            this.imageRect.x = Math.max(this.imageRect.x, this.canvasRect.x + this.canvasRect.w - this.imageRect.w);
            this.imageRect.x = Math.min(this.imageRect.x, this.canvasRect.x);
            this.imageRect.y = Math.max(this.imageRect.y, this.canvasRect.y + this.canvasRect.h - this.imageRect.h);
            this.imageRect.y = Math.min(this.imageRect.y, this.canvasRect.y);
        }
        return this.imageRect;
    }
    draw() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.ctx.drawImage(this.image, ...rectToArray(this.imageRect));
        this.ctx.fillStyle = "gray";
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillRect(...rectToArray(this.imageRect));
        this.ctx.globalAlpha = 1;
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(this.cropArea.x, this.cropArea.y, this.cropArea.w, this.cropArea.h);
        this.ctx.clip();
        this.ctx.drawImage(this.image, ...rectToArray(this.imageRect));
        this.ctx.restore();
        this.ctx.strokeStyle = "orange";
        this.ctx.lineWidth = 6;
        this.drawHandles(this.cropArea, this.cropAreaSize);
        this.ctx.strokeStyle = "blue";
        this.ctx.lineWidth = 3;
        this.drawHandles(this.cropArea, this.cropAreaSize);
    }
    drawHandles(rect, size) {
        this.ctx.beginPath();
        this.ctx.moveTo(rect.x, rect.y + size);
        this.ctx.lineTo(rect.x, rect.y);
        this.ctx.lineTo(rect.x + size, rect.y);
        this.ctx.moveTo(rect.x + rect.w - size, rect.y);
        this.ctx.lineTo(rect.x + rect.w, rect.y);
        this.ctx.lineTo(rect.x + rect.w, rect.y + size);
        this.ctx.moveTo(rect.x + rect.w, rect.y + rect.h - size);
        this.ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
        this.ctx.lineTo(rect.x + rect.w - size, rect.y + rect.h);
        this.ctx.moveTo(rect.x + size, rect.y + rect.h);
        this.ctx.lineTo(rect.x, rect.y + rect.h);
        this.ctx.lineTo(rect.x, rect.y + rect.h - size);
        this.ctx.stroke();
    }
    onDown(e) {
        const cursor = { x: e.offsetX, y: e.offsetY };
        if (e.button == 0) {
            const handle = this.getHandle(cursor);
            this.handle = handle;
            if (handle == "n")
                return;
            this.startPos = cursor;
            this.moveRectOld = { ...this.cropArea };
        }
        if (e.button == 2) {
            e.preventDefault();
            this.startPos = cursor;
            this.handle = "ci";
            this.moveRectOld = { ...this.imageRect };
        }
    }
    onMove(e) {
        const cursor = { x: e.offsetX, y: e.offsetY };
        if (!this.startPos) {
            const handle = this.getHandle(cursor);
            this.setCursor(handle);
            return;
        }
        const d = { x: cursor.x - this.startPos.x, y: cursor.y - this.startPos.y };
        if (this.handle == "c") {
            this.cropArea.x = this.moveRectOld.x + d.x;
            this.cropArea.y = this.moveRectOld.y + d.y;
            this.cropArea.x = Math.max(this.cropArea.x, this.canvasRect.x);
            this.cropArea.x = Math.min(this.cropArea.x, this.canvasRect.x + this.canvasRect.w - this.moveRectOld.w);
            this.cropArea.y = Math.max(this.cropArea.y, this.canvasRect.y);
            this.cropArea.y = Math.min(this.cropArea.y, this.canvasRect.y + this.canvasRect.h - this.moveRectOld.h);
        }
        if (this.handle == "ci") {
            this.imageRect.x = this.moveRectOld.x + d.x;
            this.imageRect.y = this.moveRectOld.y + d.y;
            this.imageRect.x = Math.max(this.imageRect.x, this.canvasRect.x + this.canvasRect.w - this.imageRect.w);
            this.imageRect.x = Math.min(this.imageRect.x, this.canvasRect.x);
            this.imageRect.y = Math.max(this.imageRect.y, this.canvasRect.y + this.canvasRect.h - this.imageRect.h);
            this.imageRect.y = Math.min(this.imageRect.y, this.canvasRect.y);
        }
        if (this.handle == "tl" || this.handle == "bl") {
            this.cropArea.x = this.moveRectOld.x + d.x;
            this.cropArea.x = Math.max(this.cropArea.x, this.canvasRect.x);
            this.cropArea.x = Math.min(this.cropArea.x, this.moveRectOld.x + this.moveRectOld.w - this.cropAreaSize);
            this.cropArea.w += (this.moveRectOld.x + this.moveRectOld.w) - (this.cropArea.x + this.cropArea.w);
        }
        else if (this.handle == "tr" || this.handle == "br") {
            this.cropArea.w = this.moveRectOld.w + d.x;
            this.cropArea.w = Math.min(this.cropArea.w, this.canvasRect.x + this.canvasRect.w - this.cropArea.x);
            this.cropArea.w = Math.max(this.cropArea.w, this.cropAreaSize);
        }
        if (this.handle == "tl" || this.handle == "tr") {
            this.cropArea.y = this.moveRectOld.y + d.y;
            this.cropArea.y = Math.max(this.cropArea.y, this.canvasRect.y);
            this.cropArea.y = Math.min(this.cropArea.y, this.moveRectOld.y + this.moveRectOld.h - this.cropAreaSize);
            this.cropArea.h += (this.moveRectOld.y + this.moveRectOld.h) - (this.cropArea.y + this.cropArea.h);
        }
        else if (this.handle == "bl" || this.handle == "br") {
            this.cropArea.h = this.moveRectOld.h + d.y;
            this.cropArea.h = Math.min(this.cropArea.h, this.canvasRect.y + this.canvasRect.h - this.cropArea.y);
            this.cropArea.h = Math.max(this.cropArea.h, this.cropAreaSize);
        }
        this.draw();
    }
    onUp(e) {
        this.startPos = null;
    }
    onWheel(e) {
        this.zoomOffset = { x: e.offsetX, y: e.offsetY, zoom: this.zoom };
        this.zoom = Math.max(this.zoom - Math.sign(e.deltaY), 0);
        this.imageRect = this.getImageRect();
        this.draw();
    }
    setCursor(cursor) {
        this.ctx.canvas.style.cursor = {
            "tr": "ne-resize",
            "tl": "nw-resize",
            "br": "nw-resize",
            "bl": "ne-resize",
            "c": "move",
            "ci": "move",
            "n": "auto",
        }[cursor];
    }
    getHandle(pos) {
        if (pos.x > this.cropArea.x && pos.x < this.cropArea.x + this.cropAreaSize) {
            if (pos.y > this.cropArea.y && pos.y < this.cropArea.y + this.cropAreaSize)
                return "tl";
            if (pos.y > this.cropArea.y + this.cropArea.h - this.cropAreaSize && pos.y < this.cropArea.y + this.cropArea.h)
                return "bl";
        }
        if (pos.x > this.cropArea.x + this.cropArea.w - this.cropAreaSize && pos.x < this.cropArea.x + this.cropArea.w) {
            if (pos.y > this.cropArea.y && pos.y < this.cropArea.y + this.cropAreaSize)
                return "tr";
            if (pos.y > this.cropArea.y + this.cropArea.h - this.cropAreaSize && pos.y < this.cropArea.y + this.cropArea.h)
                return "br";
        }
        if (pos.x > this.cropArea.x && pos.x < this.cropArea.x + this.cropArea.w &&
            pos.y > this.cropArea.y && pos.y < this.cropArea.y + this.cropArea.h)
            return "c";
        return "n";
    }
    getCropedImage() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.ctx.drawImage(this.image, ...rectToArray(this.imageRect));
        const img = this.ctx.getImageData(...rectToArray(this.cropArea));
        this.draw();
        return img;
    }
}
function rectToArray(rect) {
    return [rect.x, rect.y, rect.w, rect.h];
}
