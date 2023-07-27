export class Painter {
    ctx;
    img;
    controlObj;
    PointsCount = 200;
    PointsOffset = 10;
    LinesCount = 5000;
    LineA = 10;
    width;
    height;
    circleR;
    circleStep;
    constructor(ctx, img, controlObj, settings) {
        this.ctx = ctx;
        this.img = img;
        this.controlObj = controlObj;
        this.width = img.width;
        this.height = img.height;
        this.circleR = Math.floor(Math.max(this.width, this.height) / 2 * (1 + Math.SQRT2) / 2);
        this.PointsCount = settings?.pointsCount ?? this.PointsCount;
        this.PointsOffset = settings?.pointsOffset ?? this.PointsOffset;
        this.LinesCount = settings?.linesCount ?? this.LinesCount;
        this.LineA = settings?.lineA ?? this.LineA;
        this.circleR *= settings?.sizeMul ?? 1;
        this.circleStep = Math.PI * 2 / this.PointsCount;
    }
    async draw() {
        this.drawFrame();
        this.drawCircle();
        await waitNextFrame();
        await this.drawLines();
    }
    drawFrame() {
        this.ctx.strokeStyle = "blue";
        this.ctx.lineWidth = 0.1;
        this.ctx.strokeRect(-1, -1, this.width + 2, this.height + 2);
    }
    drawCircle() {
        this.ctx.fillStyle = "blue";
        this.ctx.globalAlpha = 0.5;
        for (let i = 0; i < this.PointsCount; i++) {
            const { x, y } = this.getPointAtCircle(i);
            drawPoint(this.ctx, x, y);
        }
    }
    getPointAtCircle(i, rmul = 1) {
        return getPointAtCircle(this.circleStep * i, this.circleR * rmul, this.width / 2, this.height / 2);
    }
    async drawLines() {
        const data = this.getImgData();
        const dataCur = new Uint8ClampedArray(data.length);
        // for (let i = 0; i < data.length; i++)
        // {
        // 	const v = 1 - data[i] / 255;
        // 	this.drawPixel(i % this.width, Math.floor(i / this.width), v);
        // }
        // return
        let f = randomInt(0, this.PointsCount);
        // let f = 15;
        let c = 0;
        // let t = 0;
        // for (let i = t; i < 16; i++)
        let lastTry = false;
        for (let i = 0; i < this.LinesCount; i++) {
            c++;
            let maxErrorChange = NaN;
            let bestLine = { f, t: f + 1 };
            let bestIndexes = [];
            let bestPoints = [];
            for (let i = f + this.PointsOffset; i < this.PointsCount + f - this.PointsOffset; i++) {
                const t = i % this.PointsCount;
                const line = this.createLine(f, t);
                const indexes = this.lineToIndexes(line);
                const imageErrorChange = this.getImageErrorChange(data, dataCur, indexes);
                if (imageErrorChange > maxErrorChange || isNaN(maxErrorChange)) {
                    bestLine = { f, t };
                    maxErrorChange = imageErrorChange;
                    bestIndexes = indexes;
                    bestPoints = line;
                }
                // line.forEach(p => this.drawPixel(p.x, p.y, 0.2));
            }
            // console.log(c + ":", maxErrorChange);
            f = bestLine.t;
            if (this.controlObj.stopOnZero && maxErrorChange < 0.1) {
                if (lastTry)
                    break;
                lastTry = true;
                f = Math.round(f + this.PointsCount / 4);
            }
            else {
                lastTry = false;
            }
            bestIndexes.forEach(i => {
                if (i >= 0)
                    dataCur[i] = Math.min(dataCur[i] + this.LineA, 255);
            });
            const animSkipSteps = this.controlObj.animSkipSteps ?? 0;
            const anim = animSkipSteps == 0 || c % animSkipSteps == 0;
            if (this.controlObj.fullAnim || anim) {
                const pf = this.getPointAtCircle(bestLine.f, 1.1);
                const pt = this.getPointAtCircle(bestLine.t, 1.1);
                this.controlObj.animateLine(pf, pt);
            }
            await this.drawPixels(dataCur, bestPoints, bestIndexes, anim);
            if (this.controlObj.stop) {
                console.log("Stop!");
                return;
            }
        }
        console.log("Lines:", c);
    }
    createLine(f, t) {
        const p1 = this.getPointAtCircle(f);
        const p2 = this.getPointAtCircle(t);
        p1.x = Math.round(p1.x);
        p2.x = Math.round(p2.x);
        p1.y = Math.round(p1.y);
        p2.y = Math.round(p2.y);
        return plotLine(p1.x, p1.y, p2.x, p2.y);
    }
    lineToIndexes(line) {
        return line
            // .filter(p => p.x >= 0 && p.x < this.size && p.y >= 0 && p.y < this.size)
            // .map(p => p.y * this.size + p.x);
            .map(p => (p.x >= 0 && p.x < this.width && p.y >= 0 && p.y < this.height)
            ? p.y * this.width + p.x
            : -1);
    }
    getImageErrorChange(dataImg, dataCur, indexes) {
        return indexes.reduce((v, i) => {
            if (i < 0)
                return v;
            const iv = (255 - dataImg[i]);
            const nv = Math.min(dataCur[i] + this.LineA, 255);
            const error = (iv - dataCur[i]) / 255;
            const newError = (iv - nv) / 255;
            const change = Math.abs(error - newError);
            // return v + change;
            if (newError > 0)
                return v + change;
            // if (iv > 100)
            // 	return v - 100;
            // return v - change;
            return v;
        }, 0);
    }
    getImgData() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error("ctx is null");
        canvas.width = this.width;
        canvas.height = this.height;
        ctx.drawImage(this.img, 0, 0);
        const data = ctx.getImageData(0, 0, this.width, this.height).data;
        const dataNew = new Uint8ClampedArray(data.length / 4);
        for (let i = 0; i < data.length / 4; i++) {
            const r = data[i * 4 + 0];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            const a = data[i * 4 + 3];
            const light = Math.min(Math.round((0.299 * r + 0.587 * g + 0.114 * b) + (255 - a)), 255);
            dataNew[i] = light;
        }
        return dataNew;
    }
    async drawPixel(x, y, a) {
        this.ctx.save();
        this.ctx.globalAlpha = a;
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(x, y, 1, 1);
        this.ctx.restore();
    }
    async drawPixels(dataCur, pixels, indexes, anim = true) {
        this.ctx.save();
        for (let i = 0; i < indexes.length; i++) {
            const index = indexes[i];
            const pixel = pixels[i];
            if (index > 0) {
                this.ctx.clearRect(pixel.x, pixel.y, 1, 1);
                this.ctx.globalAlpha = dataCur[index] / 255;
            }
            else {
                this.ctx.globalAlpha = this.LineA / 255;
            }
            this.ctx.fillStyle = "black";
            this.ctx.fillRect(pixel.x, pixel.y, 1, 1);
            if (this.controlObj.fullAnim) {
                anim = this.controlObj.animSkipSteps == 0 || i % this.controlObj.animSkipSteps == 0;
                if (anim)
                    await waitNextFrame();
                this.controlObj.animatePen(pixel);
                if (this.controlObj.stop)
                    return;
            }
        }
        this.ctx.restore();
        if (anim)
            await waitNextFrame();
    }
}
function drawPoint(ctx, x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
}
function getPointAtCircle(a, r, dx = 0, dy = 0) {
    return {
        x: Math.cos(a) * r + dx,
        y: Math.sin(a) * r + dy,
    };
}
function randomInt(min, max) {
    return Math.floor(Math.random() * (min - max)) + max;
}
async function waitNextFrame() {
    return new Promise(res => setTimeout(res, 0));
}
function plotLine(x0, y0, x1, y1) {
    let dx = Math.abs(x1 - x0);
    let sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0);
    let sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    const points = [];
    while (true) {
        points.push({ x: x0, y: y0 });
        if (x0 == x1 && y0 == y1)
            break;
        let e2 = 2 * error;
        if (e2 >= dy) {
            if (x0 == x1)
                break;
            error += dy;
            x0 += sx;
        }
        if (e2 <= dx) {
            if (y0 == y1)
                break;
            error += dx;
            y0 += sy;
        }
    }
    return points;
}
