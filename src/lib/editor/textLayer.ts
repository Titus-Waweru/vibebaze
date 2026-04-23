export type VibePreset =
  | "classic"
  | "neon"
  | "glass"
  | "caption"
  | "kenya";

export interface TextLayer {
  id: string;
  text: string;
  // Position as fraction of canvas (0-1) so it scales with any resolution
  x: number;
  y: number;
  // Font size as fraction of min(canvas width, height)
  fontSizeRatio: number;
  fontFamily: string;
  fontWeight: "normal" | "bold";
  italic: boolean;
  color: string;
  // Optional gradient (overrides color when set)
  gradient: { from: string; to: string } | null;
  strokeColor: string | null;
  strokeWidth: number; // px relative to font size (0-0.15)
  shadow: boolean;
  glow: boolean; // neon glow
  background: string | null; // pill background
  rotation: number; // radians
  align: "left" | "center" | "right";
  preset: VibePreset;
}

export const FONT_OPTIONS = [
  { label: "Sans", value: "'Inter', system-ui, sans-serif" },
  { label: "Display", value: "'Poppins', sans-serif" },
  { label: "Serif", value: "'Playfair Display', Georgia, serif" },
  { label: "Mono", value: "'JetBrains Mono', monospace" },
  { label: "Script", value: "'Pacifico', cursive" },
  { label: "Bold", value: "'Archivo Black', sans-serif" },
  { label: "Round", value: "'Nunito', sans-serif" },
  { label: "Slab", value: "'Roboto Slab', serif" },
];

export const COLOR_SWATCHES = [
  "#FFFFFF",
  "#000000",
  "#FF3B6B", // VibeBaze pink
  "#FFD93D",
  "#6BCB77",
  "#4D96FF",
  "#9B5DE5",
  "#FF8C42",
];

export const VIBE_PRESETS: Record<VibePreset, Partial<TextLayer>> = {
  classic: {
    color: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 0.06,
    shadow: true,
    glow: false,
    background: null,
    fontFamily: "'Inter', system-ui, sans-serif",
    fontWeight: "bold",
  },
  neon: {
    color: "#FFFFFF",
    strokeColor: null,
    strokeWidth: 0,
    shadow: false,
    glow: true,
    background: null,
    fontFamily: "'Archivo Black', sans-serif",
    fontWeight: "bold",
    gradient: { from: "#FF3B6B", to: "#9B5DE5" },
  },
  glass: {
    color: "#FFFFFF",
    strokeColor: null,
    strokeWidth: 0,
    shadow: true,
    glow: false,
    background: "rgba(255,255,255,0.18)",
    fontFamily: "'Inter', system-ui, sans-serif",
    fontWeight: "bold",
  },
  caption: {
    color: "#FFFFFF",
    strokeColor: null,
    strokeWidth: 0,
    shadow: false,
    glow: false,
    background: "rgba(0,0,0,0.85)",
    fontFamily: "'Inter', system-ui, sans-serif",
    fontWeight: "bold",
  },
  kenya: {
    color: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 0.05,
    shadow: true,
    glow: false,
    background: null,
    fontFamily: "'Archivo Black', sans-serif",
    fontWeight: "bold",
    gradient: { from: "#006B3F", to: "#BB0000" }, // green→red flag vibe
  },
};

export function createTextLayer(text = "Tap to edit"): TextLayer {
  return {
    id: crypto.randomUUID(),
    text,
    x: 0.5,
    y: 0.5,
    fontSizeRatio: 0.07,
    fontFamily: "'Inter', system-ui, sans-serif",
    fontWeight: "bold",
    italic: false,
    color: "#FFFFFF",
    gradient: null,
    strokeColor: "#000000",
    strokeWidth: 0.06,
    shadow: true,
    glow: false,
    background: null,
    rotation: 0,
    align: "center",
    preset: "classic",
  };
}

export function applyPreset(layer: TextLayer, preset: VibePreset): TextLayer {
  return { ...layer, ...VIBE_PRESETS[preset], preset };
}

/**
 * Draw a single text layer onto a canvas context.
 * Coordinates are normalized; canvasW/H are pixel dimensions.
 */
export function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  canvasW: number,
  canvasH: number
) {
  const fontPx = Math.max(12, Math.round(Math.min(canvasW, canvasH) * layer.fontSizeRatio));
  const x = layer.x * canvasW;
  const y = layer.y * canvasH;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(layer.rotation);

  const fontStyle = layer.italic ? "italic" : "normal";
  ctx.font = `${fontStyle} ${layer.fontWeight} ${fontPx}px ${layer.fontFamily}`;
  ctx.textAlign = layer.align as CanvasTextAlign;
  ctx.textBaseline = "middle";

  const lines = layer.text.split("\n");
  const lineHeight = fontPx * 1.2;
  const totalH = lines.length * lineHeight;

  // Background pill
  if (layer.background) {
    const padX = fontPx * 0.5;
    const padY = fontPx * 0.25;
    const widths = lines.map((l) => ctx.measureText(l).width);
    const maxW = Math.max(...widths);
    const bgW = maxW + padX * 2;
    const bgH = totalH + padY * 2;
    let bgX = -bgW / 2;
    if (layer.align === "left") bgX = -padX;
    if (layer.align === "right") bgX = -bgW + padX;
    ctx.fillStyle = layer.background;
    const r = fontPx * 0.3;
    roundRect(ctx, bgX, -bgH / 2, bgW, bgH, r);
    ctx.fill();
  }

  // Glow (neon)
  if (layer.glow) {
    ctx.shadowColor = layer.gradient?.from || layer.color;
    ctx.shadowBlur = fontPx * 0.6;
  } else if (layer.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = fontPx * 0.15;
    ctx.shadowOffsetY = fontPx * 0.05;
  }

  // Stroke first (so fill sits on top)
  if (layer.strokeColor && layer.strokeWidth > 0) {
    ctx.strokeStyle = layer.strokeColor;
    ctx.lineWidth = fontPx * layer.strokeWidth;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    lines.forEach((line, i) => {
      const ly = -totalH / 2 + lineHeight / 2 + i * lineHeight;
      ctx.strokeText(line, 0, ly);
    });
  }

  // Fill (gradient or solid)
  if (layer.gradient) {
    const widths = lines.map((l) => ctx.measureText(l).width);
    const maxW = Math.max(...widths, 1);
    const grad = ctx.createLinearGradient(-maxW / 2, -totalH / 2, maxW / 2, totalH / 2);
    grad.addColorStop(0, layer.gradient.from);
    grad.addColorStop(1, layer.gradient.to);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = layer.color;
  }

  // Drop glow shadow only on fill once stroke is drawn (re-apply for second pass clarity)
  lines.forEach((line, i) => {
    const ly = -totalH / 2 + lineHeight / 2 + i * lineHeight;
    ctx.fillText(line, 0, ly);
  });

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}