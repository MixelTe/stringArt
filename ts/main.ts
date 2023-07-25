import "./log.js";
import { Painter, Point } from "./draw.js";
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

const inp_animSkipSteps = Lib.get.input("animSkipSteps");
const inp_animSkipSteps_display = Lib.getEl("animSkipSteps_display", HTMLSpanElement);
inp_animSkipSteps.addEventListener("input", () => inp_animSkipSteps_display.innerText = inp_animSkipSteps.value);
inp_animSkipSteps.addEventListener("change", () => controlObj.animSkipSteps = inp_animSkipSteps.valueAsNumber);

const inp_stopOnZero = Lib.get.input("stopOnZero");
inp_stopOnZero.addEventListener("change", () => controlObj.stopOnZero = inp_stopOnZero.checked);

const inp_imgfile = Lib.get.input("imgfile");
inp_imgfile.addEventListener("change", loadCustomImg);


inp_pointsCount.value = "100";
inp_pointsOffset.value = "10";
inp_linesCount.value = "500";
inp_lineA.value = "25";
inp_sizeMul.value = "1";
inp_animSkipSteps.value = "0";
inp_stopOnZero.checked = true;
inp_pointsCount_display.innerText = inp_pointsCount.value
inp_pointsOffset_display.innerText = inp_pointsOffset.value
inp_linesCount_display.innerText = inp_linesCount.value
inp_lineA_display.innerText = inp_lineA.value
inp_sizeMul_display.innerText = inp_sizeMul.value
inp_animSkipSteps_display.innerText = inp_animSkipSteps.value


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
	img.addEventListener("click", () =>
	{
		imgSelect.value = `${i}`;
		draw();
	})
	selectImg.appendChild(img);
}
imgSelect.value = "6";
imgSelect.addEventListener("change", () => { useCustomImg = false; draw(); });

let controlObj = { stop: true, animSkipSteps: 0, stopOnZero: true, animateLine };
let canvasTranslate = { x: 0, y: 0 };

async function draw()
{
	clearLog();
	if (!controlObj.stop) controlObj.stop = true;
	if (!imgsLoaded) return;
	Lib.canvas.fitToParent.ClientWH(canvas);
	const img = useCustomImg && customImg ? customImg : imgs[parseInt(imgSelect.value, 10)];
	const w = canvas.width;
	const h = canvas.height;

	const ctx = Lib.canvas.getContext2d(canvas);
	canvasTranslate = { x: (w - img.width) / 2, y: (h - img.height) / 2 };
	ctx.translate(canvasTranslate.x, canvasTranslate.y);

	controlObj = { stop: false, animSkipSteps: controlObj.animSkipSteps, stopOnZero: controlObj.stopOnZero, animateLine };
	await new Painter(ctx, img, controlObj, {
		pointsCount: inp_pointsCount.valueAsNumber,
		pointsOffset: inp_pointsOffset.valueAsNumber,
		linesCount: inp_linesCount.valueAsNumber,
		lineA: inp_lineA.valueAsNumber,
		sizeMul: inp_sizeMul.valueAsNumber,
	}).draw();
}

const lineAnim1 = Lib.get.div("lineAnim1");
const lineAnim2 = Lib.get.div("lineAnim2");

function animateLine(s: Point, e: Point)
{
	lineAnim1.style.left = `${s.x + canvasTranslate.x}px`
	lineAnim1.style.top = `${s.y + canvasTranslate.y}px`
	lineAnim2.style.left = `${e.x + canvasTranslate.x}px`
	lineAnim2.style.top = `${e.y + canvasTranslate.y}px`
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