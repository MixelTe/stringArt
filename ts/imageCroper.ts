import { Popup } from "./popup.js";

export class ImageCroper
{
	private popup = new Popup();
	private ctx: CanvasRenderingContext2D;
	private imageTranslate: Rect;
	private cropArea: Rect;
	private cropAreaOld: Rect;
	private cropAreaSize = 64;
	private startPos: Point | null = null;
	private handle: Handle = "n";
	private onUpEvent: (e: MouseEvent) => void;

	constructor(private image: ImageBitmap, onEnd: (img: ImageBitmap | null) => void)
	{
		const canvas = document.createElement("canvas");
		canvas.width = Math.min(600, window.innerWidth - 32);
		canvas.height = Math.min(400, window.innerHeight - 64);
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error(`ctx is null`);
		this.ctx = ctx;
		const padding = 4;
		const imgMaxScale = Math.min(Math.min((canvas.width - padding * 2) / image.width, (canvas.height - padding * 2) / image.height), 1);
		const imgW = image.width * imgMaxScale;
		const imgH = image.height * imgMaxScale;
		canvas.width = imgW + padding * 2;
		canvas.height = imgH + padding * 2;
		this.imageTranslate = { x: (canvas.width - imgW) / 2, y: (canvas.height - imgH) / 2, w: imgW, h: imgH };
		this.cropArea = { ...this.imageTranslate };
		this.cropAreaOld = { ...this.cropArea };

		canvas.addEventListener("mousedown", e => this.onDown(e));
		canvas.addEventListener("mousemove", e => this.onMove(e));
		this.onUpEvent = (e: MouseEvent) => this.onUp(e);

		this.popup.content.appendChild(canvas);
		this.popup.addListener("close", (p, r) =>
		{
			window.removeEventListener("mouseup", this.onUpEvent);
			if (!r)
			{
				onEnd(null);
				return;
			}
			const img = this.getCropedImage();
			createImageBitmap(img).then(bitmap => onEnd(bitmap));
		})
		this.popup.closeOnBackClick = false;

		canvas.style.userSelect = "none";

		this.cropArea.x += 25;
		this.cropArea.y += 25;
		this.cropArea.w -= 50;
		this.cropArea.h -= 50;
	}

	public crop()
	{
		window.addEventListener("mouseup", this.onUpEvent);
		this.popup.open();
		this.draw();
	}

	private draw()
	{
		this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

		this.ctx.drawImage(this.image, this.imageTranslate.x, this.imageTranslate.y, this.imageTranslate.w, this.imageTranslate.h);

		this.ctx.fillStyle = "gray";
		this.ctx.globalAlpha = 0.3;
		this.ctx.fillRect(this.imageTranslate.x, this.imageTranslate.y, this.imageTranslate.w, this.imageTranslate.h);
		this.ctx.globalAlpha = 1;

		this.ctx.save();
		this.ctx.beginPath();
		this.ctx.rect(this.cropArea.x, this.cropArea.y, this.cropArea.w, this.cropArea.h);
		this.ctx.clip();
		this.ctx.drawImage(this.image, this.imageTranslate.x, this.imageTranslate.y, this.imageTranslate.w, this.imageTranslate.h);
		this.ctx.restore();

		this.ctx.strokeStyle = "orange";
		this.ctx.lineWidth = 6;
		this.drawHandles(this.cropArea, this.cropAreaSize);

		this.ctx.strokeStyle = "blue";
		this.ctx.lineWidth = 3;
		this.drawHandles(this.cropArea, this.cropAreaSize);
	}

	private drawHandles(rect: Rect, size: number)
	{
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

	private onDown(e: MouseEvent)
	{
		const cursor = { x: e.offsetX, y: e.offsetY };
		const handle = this.getHandle(cursor);
		this.handle = handle;
		if (handle == "n") return;
		this.startPos = cursor;
		this.cropAreaOld = { ...this.cropArea };
	}

	private onMove(e: MouseEvent)
	{
		const cursor = { x: e.offsetX, y: e.offsetY };
		if (!this.startPos)
		{
			const handle = this.getHandle(cursor);
			this.setCursor(handle);
			return;
		}

		const d = { x: cursor.x - this.startPos.x, y: cursor.y - this.startPos.y };
		if (this.handle == "c")
		{
			this.cropArea.x = this.cropAreaOld.x + d.x;
			this.cropArea.y = this.cropAreaOld.y + d.y;
			this.cropArea.x = Math.max(this.cropArea.x, this.imageTranslate.x);
			this.cropArea.x = Math.min(this.cropArea.x, this.imageTranslate.x + this.imageTranslate.w - this.cropAreaOld.w);
			this.cropArea.y = Math.max(this.cropArea.y, this.imageTranslate.y);
			this.cropArea.y = Math.min(this.cropArea.y, this.imageTranslate.y + this.imageTranslate.h - this.cropAreaOld.h);
		}

		if (this.handle == "tl" || this.handle == "bl")
		{
			this.cropArea.x = this.cropAreaOld.x + d.x;
			this.cropArea.x = Math.max(this.cropArea.x, this.imageTranslate.x);
			this.cropArea.x = Math.min(this.cropArea.x, this.cropAreaOld.x + this.cropAreaOld.w - this.cropAreaSize);
			this.cropArea.w += (this.cropAreaOld.x + this.cropAreaOld.w) - (this.cropArea.x + this.cropArea.w);
		}
		else if (this.handle == "tr" || this.handle == "br")
		{
			this.cropArea.w = this.cropAreaOld.w + d.x;
			this.cropArea.w = Math.min(this.cropArea.w, this.imageTranslate.x + this.imageTranslate.w - this.cropArea.x);
			this.cropArea.w = Math.max(this.cropArea.w, this.cropAreaSize);
		}

		if (this.handle == "tl" || this.handle == "tr")
		{
			this.cropArea.y = this.cropAreaOld.y + d.y;
			this.cropArea.y = Math.max(this.cropArea.y, this.imageTranslate.y);
			this.cropArea.y = Math.min(this.cropArea.y, this.cropAreaOld.y + this.cropAreaOld.h - this.cropAreaSize);
			this.cropArea.h += (this.cropAreaOld.y + this.cropAreaOld.h) - (this.cropArea.y + this.cropArea.h);
		}
		else if (this.handle == "bl" || this.handle == "br")
		{
			this.cropArea.h = this.cropAreaOld.h + d.y;
			this.cropArea.h = Math.min(this.cropArea.h, this.imageTranslate.y + this.imageTranslate.h - this.cropArea.y);
			this.cropArea.h = Math.max(this.cropArea.h, this.cropAreaSize);
		}


		this.draw();
	}

	private onUp(e: MouseEvent)
	{
		this.startPos = null;
	}

	private setCursor(cursor: Handle)
	{
		this.ctx.canvas.style.cursor = {
			"tr": "ne-resize",
			"tl": "nw-resize",
			"br": "nw-resize",
			"bl": "ne-resize",
			"c": "move",
			"n": "auto",
		}[cursor];
	}

	private getHandle(pos: Point) : Handle
	{
		if (pos.x > this.cropArea.x && pos.x < this.cropArea.x + this.cropAreaSize)
		{
			if (pos.y > this.cropArea.y && pos.y < this.cropArea.y + this.cropAreaSize)
				return "tl";
			if (pos.y > this.cropArea.y + this.cropArea.h - this.cropAreaSize && pos.y < this.cropArea.y + this.cropArea.h)
				return "bl";
		}
		if (pos.x > this.cropArea.x + this.cropArea.w - this.cropAreaSize && pos.x < this.cropArea.x + this.cropArea.w)
		{
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

	private getCropedImage()
	{
		this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
		this.ctx.drawImage(this.image, this.imageTranslate.x, this.imageTranslate.y, this.imageTranslate.w, this.imageTranslate.h);

		const img = this.ctx.getImageData(this.cropArea.x, this.cropArea.y, this.cropArea.w, this.cropArea.h);

		this.draw();

		return img;
	}
}

function strokeRect(ctx: CanvasRenderingContext2D, rect: Rect)
{
	ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
}

type Handle = "tr" | "tl" | "br" | "bl" | "n" | "c";

interface Point
{
	x: number;
	y: number;
}
interface Rect
{
	x: number;
	y: number;
	w: number;
	h: number;
}