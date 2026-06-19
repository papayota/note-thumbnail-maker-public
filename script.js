"use strict";

const canvas = document.getElementById("thumbnailCanvas");
const ctx = canvas.getContext("2d");
const titleInput = document.getElementById("titleInput");
const downloadButton = document.getElementById("downloadButton");
const fitStatus = document.getElementById("fitStatus");
const categoryInputs = document.querySelectorAll('input[name="category"]');

const templates = {
  claude: {
    label: "Claude",
    background: "assets/claude.png",
    textColor: "#f28c28",
    strokeColor: "#000000",
    strokeWidth: 2,
    shadowColor: "rgba(0, 0, 0, 0.82)",
    shadowBlur: 8,
    shadowOffsetX: 3,
    shadowOffsetY: 4,
    fontSize: 84,
    minFontSize: 44,
    fontFamily: '"Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif',
    fontWeight: 800,
    bandTop: 114,
    bandHeight: 386,
    maxWidth: 1040,
    lineHeightRatio: 1.46
  },
  codex: {
    label: "Codex",
    background: "assets/codex.png",
    textColor: "#111111",
    strokeColor: "#f28c28",
    strokeWidth: 2,
    shadowColor: "rgba(242, 140, 40, 0.9)",
    shadowBlur: 9,
    shadowOffsetX: 3,
    shadowOffsetY: 4,
    fontSize: 84,
    minFontSize: 44,
    fontFamily: '"Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif',
    fontWeight: 800,
    bandTop: 114,
    bandHeight: 386,
    maxWidth: 1040,
    lineHeightRatio: 1.46
  },
  zatsudan: {
    label: "雑談",
    background: "assets/zatsudan.png",
    textColor: "#ffffff",
    shadowColor: "rgba(0, 0, 0, 0.88)",
    shadowBlur: 9,
    shadowOffsetX: 3,
    shadowOffsetY: 4,
    fontSize: 80,
    minFontSize: 42,
    fontFamily: '"Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif',
    fontWeight: 800,
    bandTop: 212,
    bandHeight: 290,
    maxWidth: 1040,
    lineHeightRatio: 1.48
  }
};

const imageCache = new Map();
let currentCategory = "claude";
let currentImage = null;

function getSelectedCategory() {
  const selected = document.querySelector('input[name="category"]:checked');
  return selected ? selected.value : "claude";
}

function normalizeTitle(text) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .trim();
}

function setFont(template, fontSize) {
  ctx.font = `${template.fontWeight} ${fontSize}px ${template.fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
}

const preferredBreakAfter = new Set([
  "、",
  "。",
  "，",
  "．",
  "・",
  "！",
  "？",
  "!",
  "?",
  "を",
  "に",
  "へ",
  "で",
  "と",
  "が",
  "は",
  "も",
  "や",
  "の",
  "て",
  "た"
]);

const badLineStart = new Set(["、", "。", "，", "．", "・", "：", "；", "！", "？", "!", "?", ")", "）", "]", "】", "」", "』"]);
const badLineEnd = new Set(["(", "（", "[", "【", "「", "『"]);

function isAsciiWordChar(char) {
  return /[A-Za-z0-9]/.test(char);
}

function isJapaneseChar(char) {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(char);
}

function getBreakPenalty(firstLine, secondLine) {
  const previousChar = firstLine.at(-1);
  const nextChar = secondLine.at(0);
  let penalty = 0;

  if (badLineStart.has(nextChar)) {
    penalty += 600;
  }

  if (badLineEnd.has(previousChar)) {
    penalty += 600;
  }

  if (isAsciiWordChar(previousChar) && isAsciiWordChar(nextChar)) {
    penalty += 700;
  }

  if (isJapaneseChar(previousChar) && isJapaneseChar(nextChar) && !preferredBreakAfter.has(previousChar)) {
    penalty += 140;
  }

  if (/[A-Za-z0-9][A-Za-z0-9\u3040-\u30ff\u3400-\u9fff]*$/.test(firstLine) && isJapaneseChar(nextChar) && !preferredBreakAfter.has(previousChar)) {
    penalty += 520;
  }

  if (preferredBreakAfter.has(previousChar)) {
    penalty -= 120;
  }

  return penalty;
}

function findBestLineBreak(text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) {
    return {
      lines: [text],
      score: 0
    };
  }

  const chars = Array.from(text);
  let bestLines = [text, ""];
  let bestScore = Infinity;

  for (let index = 1; index < chars.length; index += 1) {
    const firstLine = chars.slice(0, index).join("").trim();
    const secondLine = chars.slice(index).join("").trim();

    if (!firstLine || !secondLine) {
      continue;
    }

    const firstWidth = ctx.measureText(firstLine).width;
    const secondWidth = ctx.measureText(secondLine).width;
    const overflow = Math.max(firstWidth, secondWidth) - maxWidth;
    const balance = Math.abs(firstWidth - secondWidth) * 0.08;
    const score = Math.max(0, overflow) * 16 + balance + getBreakPenalty(firstLine, secondLine);

    if (score < bestScore) {
      bestScore = score;
      bestLines = [firstLine, secondLine];
    }
  }

  return {
    lines: bestLines,
    score: bestScore
  };
}

function splitIntoTwoLines(text, maxWidth) {
  return findBestLineBreak(text, maxWidth).lines;
}

function ellipsize(text, maxWidth) {
  const chars = Array.from(text);
  let shortened = "";

  for (const char of chars) {
    const next = `${shortened}${char}`;
    if (ctx.measureText(`${next}…`).width > maxWidth) {
      return `${shortened}…`;
    }
    shortened = next;
  }

  return shortened;
}

function getManualTitleLines(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 2) {
    return lines;
  }

  return [lines[0], lines.slice(1).join(" ")];
}

function fitManualTitleLines(lines, template) {
  for (let fontSize = template.fontSize; fontSize >= template.minFontSize; fontSize -= 2) {
    setFont(template, fontSize);

    if (lines.every((line) => ctx.measureText(line).width <= template.maxWidth)) {
      return {
        lines,
        fontSize,
        truncated: false,
        placeholder: false
      };
    }
  }

  setFont(template, template.minFontSize);

  return {
    lines: lines.map((line) => ellipsize(line, template.maxWidth)),
    fontSize: template.minFontSize,
    truncated: true,
    placeholder: false
  };
}

function fitTitleLines(text, template) {
  if (!text) {
    return {
      lines: ["タイトルを入力"],
      fontSize: template.fontSize,
      truncated: false,
      placeholder: true
    };
  }

  const manualLines = getManualTitleLines(text);

  if (manualLines.length >= 2) {
    return fitManualTitleLines(manualLines, template);
  }

  let bestFit = null;

  for (let fontSize = template.fontSize; fontSize >= template.minFontSize; fontSize -= 2) {
    setFont(template, fontSize);
    const lineBreak = findBestLineBreak(text, template.maxWidth);
    const lines = lineBreak.lines;
    const fits = lines.length <= 2 && lines.every((line) => ctx.measureText(line).width <= template.maxWidth);

    if (fits) {
      const score = lineBreak.score + (template.fontSize - fontSize) * 8;
      const fit = {
        lines,
        fontSize,
        truncated: false,
        placeholder: false,
        score
      };

      if (!bestFit || fit.score < bestFit.score) {
        bestFit = fit;
      }
    }
  }

  if (bestFit) {
    return bestFit;
  }

  setFont(template, template.minFontSize);
  const lines = splitIntoTwoLines(text, template.maxWidth).slice(0, 2);
  const truncatedLines = lines.map((line) => ellipsize(line, template.maxWidth));

  return {
    lines: truncatedLines,
    fontSize: template.minFontSize,
    truncated: true,
    placeholder: false
  };
}

function drawTitle(template, title) {
  const fitted = fitTitleLines(title, template);
  const lineHeight = fitted.fontSize * template.lineHeightRatio;
  const centerX = canvas.width / 2;
  const centerY = template.bandTop + template.bandHeight / 2;
  const firstY = centerY - ((fitted.lines.length - 1) * lineHeight) / 2;

  setFont(template, fitted.fontSize);
  ctx.fillStyle = template.textColor;
  ctx.strokeStyle = template.strokeColor || "transparent";
  ctx.lineWidth = template.strokeWidth || 0;
  ctx.lineJoin = "round";
  ctx.shadowColor = template.shadowColor;
  ctx.shadowBlur = template.shadowBlur;
  ctx.shadowOffsetX = template.shadowOffsetX;
  ctx.shadowOffsetY = template.shadowOffsetY;

  fitted.lines.forEach((line, index) => {
    const y = firstY + index * lineHeight;

    if (template.strokeWidth) {
      ctx.strokeText(line, centerX, y);
    }

    ctx.fillText(line, centerX, y);
  });

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  if (fitted.truncated) {
    fitStatus.textContent = "タイトルが長いため一部を省略しました。";
  } else if (!fitted.placeholder && fitted.fontSize < template.fontSize) {
    fitStatus.textContent = `長いタイトルのため文字サイズを ${fitted.fontSize}px に調整しました。`;
  } else {
    fitStatus.textContent = "";
  }
}

function draw() {
  const template = templates[currentCategory];
  const title = normalizeTitle(titleInput.value);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (currentImage) {
    ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawTitle(template, title);
}

function loadTemplateImage(category) {
  const template = templates[category];

  if (imageCache.has(category)) {
    currentImage = imageCache.get(category);
    draw();
    return;
  }

  const image = new Image();
  image.onload = () => {
    imageCache.set(category, image);
    currentImage = image;
    draw();
  };
  image.onerror = () => {
    fitStatus.textContent = `${template.background} を読み込めませんでした。`;
    currentImage = null;
    draw();
  };
  image.src = template.background;
}

function changeCategory(category) {
  currentCategory = category;
  loadTemplateImage(category);
}

function buildFileName(category) {
  const date = new Date().toISOString().slice(0, 10);
  return `note-thumbnail-${category}-${date}.png`;
}

function downloadImage() {
  draw();

  const link = document.createElement("a");
  link.download = buildFileName(currentCategory);
  link.href = canvas.toDataURL("image/png");
  link.click();
}

categoryInputs.forEach((input) => {
  input.addEventListener("change", () => {
    changeCategory(getSelectedCategory());
  });
});

titleInput.addEventListener("input", draw);
downloadButton.addEventListener("click", downloadImage);

loadTemplateImage(currentCategory);
