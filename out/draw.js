export class Painter {
    ctx;
    img;
    stopObj;
    PointsCount = 200;
    PointsOffset = 10;
    LinesCount = 5000;
    LineA = 10;
    size;
    circleR;
    circleStep;
    constructor(ctx, img, stopObj, settings) {
        this.ctx = ctx;
        this.img = img;
        this.stopObj = stopObj;
        this.size = img.width;
        this.circleR = Math.floor(this.size / 2 * (1 + Math.SQRT2) / 2);
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
        await this.genLines();
        // this.drawLines(lines);
    }
    drawFrame() {
        this.ctx.strokeStyle = "blue";
        this.ctx.lineWidth = 0.1;
        this.ctx.strokeRect(-1, -1, this.size + 2, this.size + 2);
    }
    drawCircle() {
        this.ctx.fillStyle = "blue";
        this.ctx.globalAlpha = 0.5;
        for (let i = 0; i < this.PointsCount; i++) {
            const { x, y } = this.getPointAtCircle(i);
            drawPoint(this.ctx, x, y);
        }
    }
    drawLines(lines) {
        this.ctx.strokeStyle = "black";
        this.ctx.globalAlpha = this.LineA / 255;
        this.ctx.lineWidth = 1;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const { x: fx, y: fy } = this.getPointAtCircle(line.f);
            const { x: tx, y: ty } = this.getPointAtCircle(line.t);
            this.ctx.beginPath();
            this.ctx.moveTo(fx, fy);
            this.ctx.lineTo(tx, ty);
            this.ctx.stroke();
        }
    }
    getPointAtCircle(i) {
        return getPointAtCircle(this.circleStep * i, this.circleR, this.size / 2, this.size / 2);
    }
    async genLines() {
        const data = this.getImgData();
        if (!data)
            return [];
        const dataCur = new Uint8ClampedArray(data.length);
        // for (let i = 0; i < data.length; i++)
        // {
        // 	const v = 1 - data[i] / 255;
        // 	this.drawPixel(i % this.size, Math.floor(i / this.size), v / 4);
        // }
        // let f = randomInt(0, this.PointsCount);
        let f = 75;
        let c = 0;
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
            console.log(c + ":", maxErrorChange);
            if (this.stopObj.stopOnZero && maxErrorChange == 0)
                break;
            f = bestLine.t;
            bestIndexes.forEach(i => {
                if (i >= 0)
                    dataCur[i] = Math.min(dataCur[i] + this.LineA, 255);
            });
            const animSkipSteps = this.stopObj.animSkipSteps ?? 0;
            await this.drawPixels(bestPoints, animSkipSteps == 0 || c % animSkipSteps == 0);
            if (this.stopObj.stop) {
                console.log("Stop!");
                return;
            }
        }
        console.log(c);
    }
    createLine(f, t) {
        const p1 = this.getPointAtCircle(f);
        const p2 = this.getPointAtCircle(t);
        const k = (p2.y - p1.y) / (p2.x - p1.x);
        const b = p1.y - k * p1.x;
        const Y = (x) => k * x + b;
        const X = isFinite(k) ? (y) => (y - b) / k : (y) => p1.x;
        const points = [];
        const pointsY = [];
        for (let x = Math.round(Math.min(p1.x, p2.x)); x <= Math.max(p1.x, p2.x); x++)
            points.push({ x, y: Math.round(Y(x)) });
        for (let y = Math.round(Math.min(p1.y, p2.y)); y <= Math.max(p1.y, p2.y); y++)
            pointsY.push({ x: Math.round(X(y)), y });
        if (pointsY.length == 0)
            return points;
        let lastXI = 0;
        const lastXLargestInY = pointsY[pointsY.length - 1].x > pointsY[0].x;
        for (let i = 0; i < pointsY.length; i++) {
            const p = pointsY[lastXLargestInY ? i : pointsY.length - i - 1];
            if (points[lastXI]?.x < p.x) {
                for (let j = lastXI; j < points.length; j++) {
                    if (points[j].x >= p.x) {
                        lastXI = j;
                        break;
                    }
                }
            }
            let notExist = true;
            if (points[lastXI]?.x == p.x) {
                for (let j = lastXI; j < points.length; j++) {
                    if (points[j].x > p.x)
                        break;
                    else if (points[j].y == p.y) {
                        notExist = false;
                        break;
                    }
                }
            }
            if (notExist)
                points.push(p);
        }
        return points;
    }
    lineToIndexes(line) {
        return line
            // .filter(p => p.x >= 0 && p.x < this.size && p.y >= 0 && p.y < this.size)
            // .map(p => p.y * this.size + p.x);
            .map(p => (p.x >= 0 && p.x < this.size && p.y >= 0 && p.y < this.size)
            ? p.y * this.size + p.x
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
            return;
        canvas.width = this.size;
        canvas.height = this.size;
        ctx.drawImage(this.img, 0, 0);
        const data = ctx.getImageData(0, 0, this.size, this.size).data;
        const dataNew = new Uint8ClampedArray(data.length / 4);
        for (let i = 0; i < data.length / 4; i++) {
            const r = data[i * 4 + 0];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            const a = data[i * 4 + 3];
            const light = Math.min(Math.round((0.299 * r + 0.587 * g + 0.114 * b) * a / 255), 255);
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
    async drawPixels(pixels, anim = true) {
        return new Promise(res => {
            this.ctx.save();
            this.ctx.globalAlpha = this.LineA / 255;
            this.ctx.fillStyle = "black";
            for (let i = 0; i < pixels.length; i++) {
                const pixel = pixels[i];
                this.ctx.fillRect(pixel.x, pixel.y, 1, 1);
            }
            this.ctx.restore();
            if (anim)
                setTimeout(res, 0);
            else
                res(null);
        });
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