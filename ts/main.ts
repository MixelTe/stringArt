import "./log.js";
import { Painter, Point } from "./painter.js";
import * as Lib from "./littleLib.js";
import { clearLog } from "./log.js";
import { ImageCroper } from "./imageCroper.js";

const canvas = Lib.get.canvas("canvas");

const imgs: ImageBitmap[] = [];
const imgCount = 16;
let imgsLoaded = false;
loadImgs();

const inp_pointsCount = Lib.get.input("pointsCount");
const inp_pointsCount_display = Lib.getEl("pointsCount_display", HTMLSpanElement);
inp_pointsCount.addEventListener("input", () => inp_pointsCount_display.innerText = inp_pointsCount.value);
inp_pointsCount.addEventListener("change", draw);

const inp_pointsOffset = Lib.get.input("pointsOffset");
const inp_pointsOffset_display = Lib.getEl("pointsOffset_display", HTMLSpanElement);
inp_pointsOffset.addEventListener("input", () => inp_pointsOffset_display.innerText = inp_pointsOffset.value);
inp_pointsOffset.addEventListener("change", draw);

const inp_linesCount = Lib.get.input("linesCount");
const inp_linesCount_display = Lib.getEl("linesCount_display", HTMLSpanElement);
inp_linesCount.addEventListener("input", () => inp_linesCount_display.innerText = inp_linesCount.value);
inp_linesCount.addEventListener("change", draw);

const inp_lineA = Lib.get.input("lineA");
const inp_lineA_display = Lib.getEl("lineA_display", HTMLSpanElement);
inp_lineA.addEventListener("input", () => inp_lineA_display.innerText = inp_lineA.value);
inp_lineA.addEventListener("change", draw);

const inp_sizeMul = Lib.get.input("sizeMul");
const inp_sizeMul_display = Lib.getEl("sizeMul_display", HTMLSpanElement);
inp_sizeMul.addEventListener("input", () => inp_sizeMul_display.innerText = inp_sizeMul.value);
inp_sizeMul.addEventListener("change", draw);

const inp_contrast = Lib.get.input("contrast");
const inp_contrast_display = Lib.getEl("contrast_display", HTMLSpanElement);
inp_contrast.addEventListener("input", () => inp_contrast_display.innerText = inp_contrast.value);
inp_contrast.addEventListener("change", draw);

const inp_lightness = Lib.get.input("lightness");
const inp_lightness_display = Lib.getEl("lightness_display", HTMLSpanElement);
inp_lightness.addEventListener("input", () => inp_lightness_display.innerText = inp_lightness.value);
inp_lightness.addEventListener("change", draw);

const inp_animSkipSteps = Lib.get.input("animSkipSteps");
const inp_animSkipSteps_display = Lib.getEl("animSkipSteps_display", HTMLSpanElement);
inp_animSkipSteps.addEventListener("input", () => inp_animSkipSteps_display.innerText = inp_animSkipSteps.value);
inp_animSkipSteps.addEventListener("change", () => controlObj.animSkipSteps = inp_animSkipSteps.valueAsNumber);

const inp_stopOnZero = Lib.get.input("stopOnZero");
inp_stopOnZero.addEventListener("change", () => controlObj.stopOnZero = inp_stopOnZero.checked);

const inp_anim = Lib.get.input("anim");
inp_anim.addEventListener("change", () =>
{
	controlObj.fullAnim = inp_anim.checked;
	inp_animSkipSteps.max = controlObj.fullAnim ? "16" : "64";

	const past = controlObj.animSkipSteps;
	controlObj.animSkipSteps = animSkipSteps_past;
	inp_animSkipSteps.valueAsNumber = animSkipSteps_past;
	inp_animSkipSteps_display.innerText = inp_animSkipSteps.value;
	animSkipSteps_past = past;

	setTimeout(() => lineAnim3.style.opacity = "0", 100);
});
let animSkipSteps_past = 0;

const inp_imgfile = Lib.get.input("imgfile");
inp_imgfile.addEventListener("change", loadCustomImg);

const startValues = {
	pointsCount: 96,
	pointsOffset: 16,
	linesCount: 99999,
	lineA: 16,
	sizeMul: 1,
	contrast: 0.05,
	lightness: 0.05,
	animSkipSteps: 8,
	fullAnim: true,
}

const testing = false;
const testingValues = {
	pointsCount: 256,
	pointsOffset: 16,
	linesCount: 2048,
	lineA: 8,
	sizeMul: 1,
	contrast: 0.05,
	lightness: 0.05,
	animSkipSteps: 99999,
	fullAnim: false,
}

inp_pointsCount.value = `${startValues.pointsCount}`;
// inp_pointsOffset.value = `${startValues.pointsOffset}`;
inp_linesCount.value = `${startValues.linesCount}`;
inp_lineA.value = `${startValues.lineA}`;
inp_sizeMul.value = `${startValues.sizeMul}`;
inp_contrast.value = `${startValues.contrast}`;
inp_lightness.value = `${startValues.lightness}`;
inp_animSkipSteps.value = `${startValues.animSkipSteps}`;
inp_stopOnZero.checked = true;
inp_anim.checked = startValues.fullAnim;
inp_pointsCount_display.innerText = inp_pointsCount.value;
inp_pointsOffset_display.innerText = inp_pointsOffset.value;
inp_linesCount_display.innerText = inp_linesCount.value;
inp_lineA_display.innerText = inp_lineA.value;
inp_sizeMul_display.innerText = inp_sizeMul.value;
inp_contrast_display.innerText = inp_contrast.value;
inp_lightness_display.innerText = inp_lightness.value;
inp_animSkipSteps_display.innerText = inp_animSkipSteps.value;


const imgSelect = Lib.getEl("img", HTMLSelectElement);
const selectImg = Lib.get.div("selectImg");
let useCustomImg = false;
let customImg: ImageBitmap;

for (let i = 0; i < imgCount; i++)
{
	const option = Lib.initEl("option");
	option.value = `${i}`;
	option.innerText = `Img ${i + 1}`;
	imgSelect.appendChild(option);

	const img = Lib.initEl("img")
	img.src = "./images/img_" + (i + 1) + ".png";
	const btn = Lib.initEl("button");
	btn.appendChild(img);
	btn.addEventListener("click", () =>
	{
		imgSelect.value = `${i}`;
		useCustomImg = false;
		draw();
	});
	selectImg.appendChild(btn);
}
imgSelect.value = "6";
imgSelect.addEventListener("change", () => { useCustomImg = false; draw(); });

const currentImage = Lib.get.canvas("currentImage");
const currentImageCtx = Lib.canvas.getContext2d(currentImage);

let controlObj = { stop: true, animSkipSteps: startValues.animSkipSteps, fullAnim: false, stopOnZero: true, animateLine, animatePen };
let canvasTranslate = { x: 0, y: 0 };

async function draw()
{
	if (!controlObj.stop) controlObj.stop = true;
	if (!imgsLoaded) return;

	inp_pointsOffset.valueAsNumber = inp_pointsCount.valueAsNumber * 0.1;
	inp_pointsOffset_display.innerText = inp_pointsOffset.value

	Lib.canvas.fitToParent.ClientWH(canvas);
	let img = useCustomImg && customImg ? customImg : imgs[parseInt(imgSelect.value, 10)];
	img = await applyFilterToImage(img);
	const w = canvas.width;
	const h = canvas.height;

	currentImage.width = img.width;
	currentImage.height = img.height;
	currentImageCtx.drawImage(img, 0, 0);

	const ctx = Lib.canvas.getContext2d(canvas);
	canvasTranslate = { x: (w - img.width) / 2, y: (h - img.height) / 2 };
	canvasTranslate.x = Math.round(canvasTranslate.x);
	canvasTranslate.y = Math.round(canvasTranslate.y);
	ctx.translate(canvasTranslate.x, canvasTranslate.y);

	controlObj = { stop: false, animSkipSteps: controlObj.animSkipSteps, fullAnim: inp_anim.checked, stopOnZero: controlObj.stopOnZero, animateLine, animatePen };
	if (testing) controlObj.animSkipSteps = testingValues.animSkipSteps;
	if (testing) controlObj.fullAnim = testingValues.fullAnim;
	const ts = new Date();
	await new Painter(ctx, img, controlObj, testing ? testingValues : {
		pointsCount: inp_pointsCount.valueAsNumber,
		pointsOffset: inp_pointsOffset.valueAsNumber,
		linesCount: inp_linesCount.valueAsNumber,
		lineA: inp_lineA.valueAsNumber,
		sizeMul: inp_sizeMul.valueAsNumber,
	}).draw();
	lineAnim3.style.opacity = "0";
	console.log("Time:", +new Date() - +ts, "ms");
}

const lineAnim1 = Lib.get.div("lineAnim1");
const lineAnim2 = Lib.get.div("lineAnim2");
const lineAnim3 = Lib.get.div("lineAnim3");

function animateLine(s: Point, e: Point)
{
	lineAnim1.style.left = `${s.x + canvasTranslate.x}px`;
	lineAnim1.style.top = `${s.y + canvasTranslate.y}px`;
	lineAnim2.style.left = `${e.x + canvasTranslate.x}px`;
	lineAnim2.style.top = `${e.y + canvasTranslate.y}px`;
}
function animatePen(p: Point)
{
	lineAnim3.style.opacity = "1";
	lineAnim3.style.left = `${p.x + canvasTranslate.x}px`;
	lineAnim3.style.top = `${p.y + canvasTranslate.y}px`;
}

function loadImgs()
{
	let loaded = 0;
	for (let i = 0; i < imgCount; i++)
	{
		const img = new Image();
		img.onload = onLoad;
		img.src = "./images/img_" + (i + 1) + ".png";

		function onLoad()
		{
			createImageBitmap(img).then(sprite =>
			{
				loaded++;
				imgs[i] = sprite;
				if (loaded == imgCount)
				{
					imgsLoaded = true;
					draw();
				}
			});
		}
	}
}

function loadCustomImg()
{
	const file = inp_imgfile.files?.[0];
	inp_imgfile.value = "";
	if (!file) return;

	const img = new Image();
	img.onload = () =>
	{
		URL.revokeObjectURL(img.src);
		createImageBitmap(img).then(sprite =>
		{
			new ImageCroper(sprite, croped =>
			{
				if (!croped) return;
				customImg = croped;
				useCustomImg = true;
				draw();
			}).crop();
		});
	};
	img.src = URL.createObjectURL(file);
}

async function applyFilterToImage(image: ImageBitmap): Promise<ImageBitmap>
{
	return new Promise(res =>
	{
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error("ctx is null");
		canvas.width = image.width;
		canvas.height = image.height;
		ctx.drawImage(image, 0, 0);
		const img = ctx.getImageData(0, 0, image.width, image.height);

		const L = inp_lightness.valueAsNumber * 1.5;
		const unlinear = (v: number) => v;
		const C = unlinear(inp_contrast.valueAsNumber) * 255;
		const F = 259 * (C + 255) / (255 * (259 - C));

		const effect = (v: number) => (F * (v - 128) + 128) * (L + 1);
		const normalize = (v: number) => Math.min(Math.max(Math.round(v), 0), 255);
		for (let i = 0; i < img.data.length / 4; i++)
		{
			img.data[i * 4 + 0] = normalize(effect(img.data[i * 4 + 0]));
			img.data[i * 4 + 1] = normalize(effect(img.data[i * 4 + 1]));
			img.data[i * 4 + 2] = normalize(effect(img.data[i * 4 + 2]));
		}
		createImageBitmap(img).then(bitmap => res(bitmap));
	});
}