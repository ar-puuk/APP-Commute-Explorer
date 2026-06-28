// Categorical point colours — distinguishable under deuteranopia
export const POINT_COLORS = [
  '#4e79a7', '#f28e2b', '#76b7b2', '#59a14f',
  '#edc948', '#b07aa1', '#ff9da7', '#9c755f',
  '#bab0ac', '#e15759', '#499894', '#86bcb6',
];

export function pointColor(index) {
  return POINT_COLORS[index % POINT_COLORS.length];
}

// GnBu colour stops for flow arcs (low → high volume)
const GNBU = ['#f7fcf0', '#ccebc5', '#7bccc4', '#2b8cbe', '#084081'];

// White → dark teal for OD matrix cells
const TEAL = ['#ffffff', '#b2e2e2', '#66c2a4', '#2ca25f', '#006d2c'];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerp(stops, t) {
  t = Math.max(0, Math.min(1, t));
  const n = stops.length - 1;
  const i = Math.min(Math.floor(t * n), n - 1);
  const f = t * n - i;
  const [r1, g1, b1] = hexToRgb(stops[i]);
  const [r2, g2, b2] = hexToRgb(stops[i + 1]);
  return [
    Math.round(r1 + f * (r2 - r1)),
    Math.round(g1 + f * (g2 - g1)),
    Math.round(b1 + f * (b2 - b1)),
  ];
}

export function gnbuColor(value, min, max) {
  if (max <= min) return GNBU[0];
  const t = (value - min) / (max - min);
  const [r, g, b] = lerp(GNBU, t);
  return `rgb(${r},${g},${b})`;
}

// Returns [r, g, b] array for deck.gl / flowmap.gl
export function gnbuColorRgb(value, min, max) {
  if (max <= min) return hexToRgb(GNBU[0]);
  const t = (value - min) / (max - min);
  return lerp(GNBU, t);
}

export function matrixColor(value, max) {
  if (!value || max <= 0) return null; // zero cell — no fill
  const t = Math.sqrt(value / max); // sqrt for perceptual balance
  const [r, g, b] = lerp(TEAL, t);
  return `rgb(${r},${g},${b})`;
}

// Dark-theme OD matrix fill — transparent → bright teal.
// Works on both dark and light backgrounds (opacity-based).
export function matrixColorDark(value, max) {
  if (!value || max <= 0) return null;
  const t = Math.sqrt(value / max); // sqrt for perceptual balance
  const opacity = 0.12 + t * 0.78; // range: 0.12 → 0.90
  return `rgba(34, 181, 168, ${opacity.toFixed(2)})`;
}
