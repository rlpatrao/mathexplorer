const GRID_LIMIT = 150;
const GRID_ROWS = 10;
const GRID_COLUMNS = Math.ceil(GRID_LIMIT / GRID_ROWS);
const MAX_TABLE = 20;
const EXTRA_HOLD = 260; // keep the ball resting briefly on each cell
const DEFAULT_VOLUME_PERCENT = 60;

type TableStep = {
  multiplier: number;
  product: number;
};

type Palette = {
  runColor: string;
  runShadow: string;
  runShadowStrong: string;
  ballLight: string;
  ballBorder: string;
  ballGlow: string;
};

let runToken = 0;
let activeCell: HTMLElement | null = null;

const board = document.getElementById('board') as HTMLDivElement | null;
const ball = document.getElementById('ball') as HTMLDivElement | null;
const select = document.getElementById('table-select') as HTMLSelectElement | null;
const startButton = document.getElementById('start-button') as HTMLButtonElement | null;
const stopButton = document.getElementById('stop-button') as HTMLButtonElement | null;
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement | null;
const speedLabel = document.getElementById('speed-label') as HTMLSpanElement | null;
const productDisplay = document.getElementById('product-display') as HTMLSpanElement | null;
const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement | null;
const volumeLabel = document.getElementById('volume-label') as HTMLSpanElement | null;
const backgroundAudio = document.getElementById('background-audio') as HTMLAudioElement | null;

if (
  !board ||
  !ball ||
  !select ||
  !startButton ||
  !stopButton ||
  !speedSlider ||
  !speedLabel ||
  !productDisplay ||
  !volumeSlider ||
  !volumeLabel ||
  !backgroundAudio
) {
  throw new Error('Expected application elements were not found in the DOM.');
}

const cellsByValue = new Map<number, HTMLElement>();
const visitedCells = new Set<HTMLElement>();
const paletteByTable = new Map<number, Palette>();

function clearVisited(): void {
  visitedCells.forEach((cell) => {
    cell.classList.remove('visited');
    cell.classList.remove('active');
  });
  visitedCells.clear();
  activeCell = null;
  resetProductDisplay();
}

function createPalette(): Palette {
  const hue = Math.floor(Math.random() * 360);

  return {
    runColor: `hsla(${hue}, 85%, 68%, 0.95)`,
    runShadow: `hsla(${hue}, 80%, 35%, 0.35)`,
    runShadowStrong: `hsla(${hue}, 82%, 32%, 0.45)`,
    ballLight: `hsla(${hue}, 95%, 88%, 0.85)`,
    ballBorder: `hsla(${hue}, 85%, 65%, 0.6)`,
    ballGlow: `hsla(${hue}, 85%, 52%, 0.4)`,
  };
}

function applyPalette(palette: Palette): void {
  board.style.setProperty('--run-color', palette.runColor);
  board.style.setProperty('--run-color-shadow', palette.runShadow);
  board.style.setProperty('--run-color-shadow-strong', palette.runShadowStrong);
  board.style.setProperty('--ball-color-light', palette.ballLight);
  board.style.setProperty('--ball-border-color', palette.ballBorder);
  board.style.setProperty('--ball-glow', palette.ballGlow);
}

function getPaletteFor(base: number): Palette {
  let palette = paletteByTable.get(base) ?? null;
  if (!palette) {
    palette = createPalette();
    paletteByTable.set(base, palette);
  }
  applyPalette(palette);
  return palette;
}

function stopMusic(): void {
  backgroundAudio.pause();
  backgroundAudio.currentTime = 0;
}

async function startMusic(): Promise<void> {
  backgroundAudio.pause();
  backgroundAudio.currentTime = 0;
  backgroundAudio.load();
  applyVolume();
  try {
    await backgroundAudio.play();
  } catch (error) {
    console.warn('Background audio play request was blocked or failed:', error);
  }
}

function applyVolume(): void {
  const level = currentVolume();
  const shaped = Math.pow(level, 0.8);
  const musicVolume = level <= 0.01 ? 0 : 0.15 + shaped * 0.75;
  backgroundAudio.volume = Math.max(0, Math.min(1, musicVolume));
}

function currentVolume(): number {
  const value = Number(volumeSlider.value);
  if (!Number.isFinite(value)) {
    return DEFAULT_VOLUME_PERCENT / 100;
  }
  return Math.max(0, Math.min(1, value / 100));
}

function resetProductDisplay(): void {
  productDisplay.textContent = '';
}

function updateProductDisplay(base: number, multiplier: number, product: number): void {
  productDisplay.textContent = `${base} x ${multiplier} = ${product}`;
}

function initialiseSelect(): void {
  // Ensure options run from 1 up to MAX_TABLE; skip duplicates that might exist already.
  const existing = new Set<string>();
  Array.from(select.options).forEach((option) => {
    existing.add(option.value);
  });

  for (let value = 1; value <= MAX_TABLE; value += 1) {
    if (!existing.has(String(value))) {
      const option = document.createElement('option');
      option.value = String(value);
      option.textContent = String(value);
      select.append(option);
    }
  }
}

function buildBoard(): void {
  board.innerHTML = ''; // clear any previous render
  cellsByValue.clear();
  clearVisited();
  board.style.setProperty('--grid-columns', String(GRID_COLUMNS));
  board.style.setProperty('--grid-rows', String(GRID_ROWS));
  const fragment = document.createDocumentFragment();

  for (let value = 1; value <= GRID_LIMIT; value += 1) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.value = String(value);
    cell.textContent = String(value);
    fragment.append(cell);
    cellsByValue.set(value, cell);
  }

  fragment.append(ball);
  board.append(fragment);
}

function updateSpeedLabel(): void {
  const durationMs = Number(speedSlider.value);
  const seconds = (durationMs / 1000).toFixed(1);
  speedLabel.textContent = `${seconds}s`;
}

function currentHopDuration(): number {
  return Number(speedSlider.value);
}

function updateVolumeLabel(): void {
  const percent = Math.round(currentVolume() * 100);
  volumeLabel.textContent = `${percent}%`;
  applyVolume();
}

function setRunningState(running: boolean): void {
  startButton.disabled = running;
  stopButton.disabled = !running;
}

function setActiveCell(cell: HTMLElement | null): void {
  if (activeCell && activeCell !== cell) {
    activeCell.classList.remove('active');
  }

  if (!cell) {
    activeCell = null;
    resetProductDisplay();
    return;
  }

  activeCell = cell;
  activeCell.classList.add('visited');
  activeCell.classList.add('active');
  visitedCells.add(activeCell);
}

function positionBall(cell: HTMLElement | null, animate = true): void {
  if (!cell) {
    ball.classList.remove('visible');
    return;
  }

  const duration = animate ? currentHopDuration() : 0;
  ball.style.setProperty('--hop-duration', `${duration}ms`);

  const width = cell.offsetWidth;
  const height = cell.offsetHeight;
  ball.style.width = `${width}px`;
  ball.style.height = `${height}px`;

  const targetX = cell.offsetLeft;
  const targetY = cell.offsetTop;
  ball.classList.add('visible');
  ball.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;

  if (!animate) {
    // Allow transition duration to reset on the next frame.
    requestAnimationFrame(() => {
      ball.style.setProperty('--hop-duration', `${currentHopDuration()}ms`);
    });
  }
}

function speak(base: number, multiplier: number, product: number): void {
  if (!('speechSynthesis' in window)) {
    return;
  }

  const quickHop = currentHopDuration() < 1500;
  const message = quickHop ? `${product}` : `${base} times ${multiplier} is ${product}`;
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = 'en-US';
  utterance.rate = quickHop ? 1.05 : 0.95;
  utterance.pitch = 1.05;
  utterance.volume = Math.max(0, Math.min(1, currentVolume()));

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function buildSteps(base: number): TableStep[] {
  const steps: TableStep[] = [];
  for (let multiplier = 1; multiplier <= 12; multiplier += 1) {
    const product = base * multiplier;
    if (product > GRID_LIMIT) {
      break;
    }
    steps.push({ multiplier, product });
  }
  return steps;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function cleanup(aborted: boolean): void {
  setRunningState(false);
  stopMusic();
  setActiveCell(null);
  if (aborted) {
    ball.classList.remove('visible');
    window.speechSynthesis?.cancel?.();
  }
}

async function playTable(base: number, token: number): Promise<void> {
  const steps = buildSteps(base);
  setActiveCell(null);
  positionBall(null);
  await wait(150); // brief pause before starting

  for (const step of steps) {
    if (token !== runToken) {
      return;
    }

    const cell = cellsByValue.get(step.product) ?? null;
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

function handleStart(): void {
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
  window.speechSynthesis?.cancel?.();

  void playTable(selected, token).catch((error) => {
    console.error(error);
    cleanup(true);
  });
}

function handleStop(): void {
  runToken += 1;
  cleanup(true);
}

function handleSliderInput(): void {
  updateSpeedLabel();
  if (activeCell) {
    positionBall(activeCell, false);
  }
}

function handleVolumeInput(): void {
  updateVolumeLabel();
}

function handleResize(): void {
  if (activeCell) {
    positionBall(activeCell, false);
  }
}

function init(): void {
  initialiseSelect();
  buildBoard();
  updateSpeedLabel();
  updateVolumeLabel();
  setRunningState(false);

  startButton.addEventListener('click', handleStart);
  stopButton.addEventListener('click', handleStop);
  speedSlider.addEventListener('input', handleSliderInput);
  volumeSlider.addEventListener('input', handleVolumeInput);
  window.addEventListener('resize', handleResize);
}

init();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch((error) => console.error('Service worker registration failed:', error));
  });
}
