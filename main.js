// main.ts
var GRID_LIMIT = 150;
var GRID_ROWS = 10;
var GRID_COLUMNS = Math.ceil(GRID_LIMIT / GRID_ROWS);
var MAX_TABLE = 20;
var EXTRA_HOLD = 260;
var DEFAULT_VOLUME_PERCENT = 60;
var runToken = 0;
var activeCell = null;
var board = document.getElementById("board");
var ball = document.getElementById("ball");
var select = document.getElementById("table-select");
var startButton = document.getElementById("start-button");
var stopButton = document.getElementById("stop-button");
var speedSlider = document.getElementById("speed-slider");
var speedLabel = document.getElementById("speed-label");
var productDisplay = document.getElementById("product-display");
var volumeSlider = document.getElementById("volume-slider");
var volumeLabel = document.getElementById("volume-label");
var backgroundAudio = document.getElementById("background-audio");
if (!board || !ball || !select || !startButton || !stopButton || !speedSlider || !speedLabel || !productDisplay || !volumeSlider || !volumeLabel || !backgroundAudio) {
  throw new Error("Expected application elements were not found in the DOM.");
}
var cellsByValue = /* @__PURE__ */ new Map();
var visitedCells = /* @__PURE__ */ new Set();
var paletteByTable = /* @__PURE__ */ new Map();
function clearVisited() {
  visitedCells.forEach((cell) => {
    cell.classList.remove("visited");
    cell.classList.remove("active");
  });
  visitedCells.clear();
  activeCell = null;
  resetProductDisplay();
}
function createPalette() {
  const hue = Math.floor(Math.random() * 360);
  return {
    runColor: `hsla(${hue}, 85%, 68%, 0.95)`,
    runShadow: `hsla(${hue}, 80%, 35%, 0.35)`,
    runShadowStrong: `hsla(${hue}, 82%, 32%, 0.45)`,
    ballLight: `hsla(${hue}, 95%, 88%, 0.85)`,
    ballBorder: `hsla(${hue}, 85%, 65%, 0.6)`,
    ballGlow: `hsla(${hue}, 85%, 52%, 0.4)`
  };
}
function applyPalette(palette) {
  board.style.setProperty("--run-color", palette.runColor);
  board.style.setProperty("--run-color-shadow", palette.runShadow);
  board.style.setProperty("--run-color-shadow-strong", palette.runShadowStrong);
  board.style.setProperty("--ball-color-light", palette.ballLight);
  board.style.setProperty("--ball-border-color", palette.ballBorder);
  board.style.setProperty("--ball-glow", palette.ballGlow);
}
function getPaletteFor(base) {
  var _a;
  let palette = (_a = paletteByTable.get(base)) != null ? _a : null;
  if (!palette) {
    palette = createPalette();
    paletteByTable.set(base, palette);
  }
  applyPalette(palette);
  return palette;
}
function stopMusic() {
  backgroundAudio.pause();
  backgroundAudio.currentTime = 0;
}
async function startMusic() {
  applyVolume();
  try {
    backgroundAudio.currentTime = 0;
    await backgroundAudio.play();
  } catch (error) {
  }
}
function applyVolume() {
  const level = currentVolume();
  const musicVolume = Math.pow(level, 0.8) * 0.6;
  backgroundAudio.volume = Math.max(0, Math.min(1, musicVolume));
}
function currentVolume() {
  const value = Number(volumeSlider.value);
  if (!Number.isFinite(value)) {
    return DEFAULT_VOLUME_PERCENT / 100;
  }
  return Math.max(0, Math.min(1, value / 100));
}
function resetProductDisplay() {
  productDisplay.textContent = "";
}
function updateProductDisplay(base, multiplier, product) {
  productDisplay.textContent = `${base} x ${multiplier} = ${product}`;
}
function initialiseSelect() {
  const existing = /* @__PURE__ */ new Set();
  Array.from(select.options).forEach((option) => {
    existing.add(option.value);
  });
  for (let value = 1; value <= MAX_TABLE; value += 1) {
    if (!existing.has(String(value))) {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = String(value);
      select.append(option);
    }
  }
}
function buildBoard() {
  board.innerHTML = "";
  cellsByValue.clear();
  clearVisited();
  board.style.setProperty("--grid-columns", String(GRID_COLUMNS));
  board.style.setProperty("--grid-rows", String(GRID_ROWS));
  const fragment = document.createDocumentFragment();
  for (let value = 1; value <= GRID_LIMIT; value += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.value = String(value);
    cell.textContent = String(value);
    fragment.append(cell);
    cellsByValue.set(value, cell);
  }
  fragment.append(ball);
  board.append(fragment);
}
function updateSpeedLabel() {
  const durationMs = Number(speedSlider.value);
  const seconds = (durationMs / 1e3).toFixed(1);
  speedLabel.textContent = `${seconds}s`;
}
function currentHopDuration() {
  return Number(speedSlider.value);
}
function updateVolumeLabel() {
  const percent = Math.round(currentVolume() * 100);
  volumeLabel.textContent = `${percent}%`;
  applyVolume();
}
function setRunningState(running) {
  startButton.disabled = running;
  stopButton.disabled = !running;
}
function setActiveCell(cell) {
  if (activeCell && activeCell !== cell) {
    activeCell.classList.remove("active");
  }
  if (!cell) {
    activeCell = null;
    resetProductDisplay();
    return;
  }
  activeCell = cell;
  activeCell.classList.add("visited");
  activeCell.classList.add("active");
  visitedCells.add(activeCell);
}
function positionBall(cell, animate = true) {
  if (!cell) {
    ball.classList.remove("visible");
    return;
  }
  const duration = animate ? currentHopDuration() : 0;
  ball.style.setProperty("--hop-duration", `${duration}ms`);
  const width = cell.offsetWidth;
  const height = cell.offsetHeight;
  ball.style.width = `${width}px`;
  ball.style.height = `${height}px`;
  const targetX = cell.offsetLeft;
  const targetY = cell.offsetTop;
  ball.classList.add("visible");
  ball.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
  if (!animate) {
    requestAnimationFrame(() => {
      ball.style.setProperty("--hop-duration", `${currentHopDuration()}ms`);
    });
  }
}
function speak(base, multiplier, product) {
  if (!("speechSynthesis" in window)) {
    return;
  }
  const quickHop = currentHopDuration() < 1500;
  const message = quickHop ? `${product}` : `${base} times ${multiplier} is ${product}`;
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "en-US";
  utterance.rate = quickHop ? 1.05 : 0.95;
  utterance.pitch = 1.05;
  utterance.volume = Math.max(0, Math.min(1, currentVolume()));
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
function buildSteps(base) {
  const steps = [];
  for (let multiplier = 1; multiplier <= 12; multiplier += 1) {
    const product = base * multiplier;
    if (product > GRID_LIMIT) {
      break;
    }
    steps.push({ multiplier, product });
  }
  return steps;
}
function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
function cleanup(aborted) {
  var _a, _b;
  setRunningState(false);
  stopMusic();
  setActiveCell(null);
  if (aborted) {
    ball.classList.remove("visible");
    (_b = (_a = window.speechSynthesis) == null ? void 0 : _a.cancel) == null ? void 0 : _b.call(_a);
  }
}
async function playTable(base, token) {
  var _a;
  const steps = buildSteps(base);
  setActiveCell(null);
  positionBall(null);
  await wait(150);
  for (const step of steps) {
    if (token !== runToken) {
      return;
    }
    const cell = (_a = cellsByValue.get(step.product)) != null ? _a : null;
    if (!cell) {
      continue;
    }
    setActiveCell(cell);
    updateProductDisplay(base, step.multiplier, step.product);
    positionBall(cell);
    speak(base, step.multiplier, step.product);
    const dwell = currentHopDuration() + EXTRA_HOLD;
    await wait(dwell);
  }
  if (token === runToken) {
    cleanup(false);
  }
}
function handleStart() {
  var _a, _b;
  const selected = Number(select.value);
  if (!Number.isFinite(selected) || selected < 1) {
    return;
  }
  clearVisited();
  positionBall(null);
  getPaletteFor(selected);
  void startMusic();
  runToken += 1;
  const token = runToken;
  setRunningState(true);
  (_b = (_a = window.speechSynthesis) == null ? void 0 : _a.cancel) == null ? void 0 : _b.call(_a);
  void playTable(selected, token).catch((error) => {
    console.error(error);
    cleanup(true);
  });
}
function handleStop() {
  runToken += 1;
  cleanup(true);
}
function handleSliderInput() {
  updateSpeedLabel();
  if (activeCell) {
    positionBall(activeCell, false);
  }
}
function handleVolumeInput() {
  updateVolumeLabel();
}
function handleResize() {
  if (activeCell) {
    positionBall(activeCell, false);
  }
}
function init() {
  initialiseSelect();
  buildBoard();
  updateSpeedLabel();
  updateVolumeLabel();
  setRunningState(false);
  startButton.addEventListener("click", handleStart);
  stopButton.addEventListener("click", handleStop);
  speedSlider.addEventListener("input", handleSliderInput);
  volumeSlider.addEventListener("input", handleVolumeInput);
  window.addEventListener("resize", handleResize);
}
init();
