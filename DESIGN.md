# UI/UX Design Proposal — Commute Flow Explorer

**Status**: v2 — updated after design discussion  
**Audience**: Transport planners + GIS analysts on desktop (Chrome/Firefox/Edge)  
**Scope**: Visual design system, layout, component redesign  
**No code has been changed.**

---

## 1. Design Audit — What We Have Today

The app works but reads as a functional prototype, not a polished product. Six specific issues:

1. **No design system.** All styles are inline objects in JSX. Colors, spacing, and radii are redeclared in every component — no shared tokens, no CSS file.
2. **Flat information hierarchy.** The toolbar packs brand, controls, status, and mode buttons at the same visual weight. The eye has nowhere to anchor.
3. **Cramped sidebar (240 px, 12 px padding).** Point cards use 12 px text and 12 px color dots — too small for the primary analysis object.
4. **No map legend.** The GnBu arc scale is invisible to the user; there is no way to know what "light blue" vs "dark blue" means.
5. **Loading states are text snippets.** `"Loading region flows…"` at far right of the toolbar disappears behind other controls on narrower monitors.
6. **Single theme.** Light-only UI. No dark mode for low-light environments or GIS dashboard contexts.

---

## 2. Design Principles

| # | Principle | What it means in this app |
|---|-----------|---------------------------|
| 1 | **Map-first** | The map is the product. Every chrome element should shrink to the minimum needed and get out of the map's way. |
| 2 | **Data at a glance** | Key numbers (total commuters, year, ring size) are always visible without hunting. |
| 3 | **Progressive disclosure** | Controls that only matter in select mode don't appear in overview mode. Empty states guide the user to the next action. |
| 4 | **Accessible by default** | WCAG 2.1 AA contrast in both light and dark themes. Keyboard-reachable controls. Color never the only signal. |
| 5 | **Consistent tokens** | One shared set of CSS custom properties for color, spacing, and radius — no more per-component constants. Dark mode is a second token layer, not a second stylesheet. |
| 6 | **GIS dashboard quality** | Tooltips, legends, and panel layouts are as polished as Carto, Kepler.gl, or Mapbox Studio. The app serves both planning workflows and exploratory GIS analysis. |

---

## 3. Design Tokens

### 3a. Light Theme (default)

```css
:root {
  /* Brand */
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-50:  #eff6ff;

  /* Surfaces */
  --color-surface:          #ffffff;
  --color-surface-subtle:   #f8fafc;   /* sidebar background */
  --color-surface-raised:   #f1f5f9;   /* card / well */
  --color-surface-elevated: #ffffff;   /* tooltip */

  /* Borders */
  --color-border:        #e2e8f0;
  --color-border-strong: #cbd5e1;

  /* Text */
  --color-text-primary:   #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted:     #94a3b8;
  --color-text-disabled:  #cbd5e1;

  /* Status */
  --color-warning:        #f59e0b;
  --color-warning-bg:     #fffbeb;
  --color-warning-border: #fde68a;
  --color-error:          #ef4444;
  --color-success:        #10b981;

  /* Spacing (4-pt grid) */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-5: 20px; --space-6: 24px;

  /* Radii */
  --radius-sm:   4px;
  --radius-md:   6px;
  --radius-lg:   8px;
  --radius-xl:   12px;
  --radius-pill: 9999px;

  /* Elevation */
  --shadow-sm:      0 1px 2px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.10);
  --shadow-md:      0 4px 6px rgba(0,0,0,.07), 0 2px 4px rgba(0,0,0,.06);
  --shadow-lg:      0 10px 15px rgba(0,0,0,.08), 0 4px 6px rgba(0,0,0,.05);
  --shadow-tooltip: 0 8px 24px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.08);

  /* Layout */
  --header-height: 52px;
  --sidebar-width: 280px;
}
```

### 3b. Dark Theme

Applied by setting `data-theme="dark"` on `<html>`. All other tokens — brand, spacing, radii — are inherited unchanged. Only surface/text/border tokens are overridden.

```css
[data-theme="dark"] {
  /* Surfaces — Slate scale */
  --color-surface:          #0f172a;   /* Slate 900 — main bg */
  --color-surface-subtle:   #1e293b;   /* Slate 800 — sidebar */
  --color-surface-raised:   #334155;   /* Slate 700 — card bg */
  --color-surface-elevated: #1e293b;   /* Slate 800 — tooltip bg */

  /* Borders */
  --color-border:        #334155;   /* Slate 700 */
  --color-border-strong: #475569;   /* Slate 600 */

  /* Text */
  --color-text-primary:   #f1f5f9;   /* Slate 100 */
  --color-text-secondary: #94a3b8;   /* Slate 400 */
  --color-text-muted:     #64748b;   /* Slate 500 */
  --color-text-disabled:  #334155;   /* Slate 700 */

  /* Status */
  --color-warning-bg:     #1c1a09;
  --color-warning-border: #78350f;

  /* Elevation — heavier shadows on dark bg */
  --shadow-sm:      0 1px 2px rgba(0,0,0,.4),  0 1px 3px rgba(0,0,0,.3);
  --shadow-md:      0 4px 6px rgba(0,0,0,.35), 0 2px 4px rgba(0,0,0,.25);
  --shadow-tooltip: 0 8px 24px rgba(0,0,0,.55), 0 2px 8px rgba(0,0,0,.4);
}
```

### 3c. Basemap per Theme

| Theme | Basemap | URL |
|-------|---------|-----|
| Light | Carto Positron (current fallback) | `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json` |
| Light | UGRC LiteBase + LiteLabels (preferred, Utah-specific) | Built by `agrcStyle.js` |
| **Dark** | **Carto Dark Matter** | `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json` |
| System | Resolved at runtime from `prefers-color-scheme` | — |

`agrcStyle.js` gains a `buildBasemapStyle(resolvedTheme)` signature. When `resolvedTheme === 'dark'`, it returns `CARTO_DARK_MATTER` directly, bypassing the UGRC fetch entirely. The UGRC basemap has no dark-mode equivalent.

---

## 4. Typography Scale

Font: `Inter, system-ui, sans-serif`. Both themes use the same scale; text color tokens handle the contrast flip.

| Role | Size | Weight | Color token | Example use |
|------|------|--------|-------------|-------------|
| Page title | 16px | 700 | `text-primary` | "Commute Flow Explorer" |
| Section label | 11px, UPPERCASE, 0.06em tracking | 600 | `text-secondary` | "ANALYSIS ZONES", "WAGES" |
| Body / control | 13px | 400–500 | `text-primary` | Sidebar items, labels |
| Point name | 13px | 600 | `text-primary` | Editable zone label |
| Tooltip headline | 14px | 700 | `text-primary` | "Downtown SLC → West Valley" |
| Tooltip section | 11px, UPPERCASE | 600 | `text-secondary` | "COMMUTER VOLUME", "WAGES" |
| County / meta | 11px | 400 | `text-muted` | "Salt Lake County, Utah" |
| Stat number | 24px | 700 | `text-primary` | "43,218" |
| Caption | 11px | 400 | `text-muted` | Tooltip footnotes |

---

## 5. Theme Switching

### 5a. ThemeProvider (new)

`src/contexts/ThemeContext.jsx` — a React context that owns theme state.

```
ThemeProvider
  value: { theme, setTheme, resolvedTheme }
  theme:         'light' | 'dark' | 'system'   (user preference, persisted to localStorage)
  resolvedTheme: 'light' | 'dark'               (actual applied theme)
```

On mount:
1. Read `localStorage.getItem('theme')` → if absent, default to `'system'`.
2. If `'system'`, read `window.matchMedia('(prefers-color-scheme: dark)').matches`.
3. Set `document.documentElement.setAttribute('data-theme', resolvedTheme)`.
4. Add `matchMedia` change listener to re-resolve when OS preference changes.

On `setTheme(value)`:
1. Write to `localStorage`.
2. Re-derive `resolvedTheme`.
3. Update `data-theme` attribute.
4. Trigger a basemap swap in MapView via a shared `mapStyleRef` callback.

### 5b. ThemeSwitcher (new header component)

A three-segment icon control in the header far left (after the logo):

```
[ ☀ | ⊙ | ☾ ]
  Light Sys Dark
```

- Each segment is 32×32px, icon-only, `aria-label="Light theme"` / `"System theme"` / `"Dark theme"`.
- Active segment: `background: var(--color-brand-600); color: #fff` with icon in white.
- Tooltip on hover shows the label text.
- No text label next to the group — the icons are sufficient once the user learns them. A `title` attribute provides the fallback.

**Icon choices**: Sun (☀), half-circle/monitor (⊙), moon (☾) — these are the standard system theme icons used by VS Code, GitHub, Vercel, and Linear. Users recognize them immediately.

### 5c. Basemap Swap on Theme Change

When `resolvedTheme` changes:
1. `MapView` receives a new `basemapUrl` prop derived from `resolvedTheme`.
2. It calls `map.setStyle(basemapUrl)` — MapLibre handles a style swap gracefully; GeoJSON layers are re-added on the `style.load` event.
3. The county overlay, hex cluster layer, and flow layer are re-added in the `style.load` handler (same code as the current `m.on('load', ...)` block, extracted into a function).

This means theme switching also updates the map background, which is essential — a dark sidebar against a light map (or vice versa) would look broken.

---

## 6. Layout Architecture

### 6a. Overview Mode (full-screen)

```
┌─────────────────────────────── HEADER · 52px ──────────────────────────────────┐
│  [☀|⊙|☾] ⬡ Commute Flow Explorer  │  [Year: 2023 ▾] [⚠ COVID]  │  [Select →] │
└─────────────────────────────────────────────────────────────────────────────────┘
│                                                                                 │
│                           FULL-SCREEN MAP                                       │
│                       (overview flow arcs, all counties)                        │
│                                                                                 │
│  ┌───────────────────────────────────────────┐                                 │
│  │  WASATCH FRONT COMMUTER FLOWS             │  ← frosted glass card,          │
│  │  LODES · 2023 · 8 counties                │    bottom-left, 320px wide      │
│  │  ─────────────────────────────────────    │    backdrop-filter: blur(8px)   │
│  │  Click anywhere on the map to explore     │    adapts to light/dark theme   │
│  │  commuter flows between locations.        │                                 │
│  │                                           │                                 │
│  │        [ Select Analysis Points → ]       │                                 │
│  └───────────────────────────────────────────┘                                 │
│                                                                                 │
```

- The floating card uses `backdrop-filter: blur(8px)` +  
  Light: `rgba(255,255,255,0.85)` / Dark: `rgba(15,23,42,0.85)` — controlled by tokens.
- Year selector is visible here; Ring selector is hidden (irrelevant in overview mode).
- The "Select Analysis Points →" CTA appears both in the header (right) and in the card — two affordances for discoverability.

---

### 6b. Select Mode

```
┌─────────────────────────────── HEADER · 52px ──────────────────────────────────┐
│  [☀|⊙|☾]  ⬡ Commute Flow Explorer  │  [2023 ▾][⚠]  Ring [− k=2 +] 19 cells  │
│                                                   ● [Map | Matrix]  [← Back]  │
└─────────────────────────────────────────────────────────────────────────────────┘
┌── SIDEBAR · 280px ──────────────┬──────────────── MAP or MATRIX ──────────────┐
│                                  │                                             │
│  ANALYSIS ZONES            (2)   │   (MapLibre + HexLayer + FlowLayer)        │
│  ──────────────────────────────  │                                             │
│  ┌──────────────────────────┐   │                                             │
│  │ ■  1  Downtown SLC   [↑]│   │                                             │
│  │       Salt Lake Co., UT [↓]│  │   ┌──────────────────────────────────┐    │
│  │                       [✎]│   │   │  FLOW VOLUME                     │    │
│  │                       [×]│   │   │  ──────────────────────────────  │    │
│  └──────────────────────────┘   │   │  █░░░░░░░░░░░░░░░░░░░░░░░░░░░█  │    │
│  ┌──────────────────────────┐   │   │  Low                      High  │    │
│  │ ■  2  West Valley    [↑]│   │   │  1,240 ────────── 12,400       │    │
│  │       Salt Lake Co., UT [↓]│  │   └──────────────────────────────────┘    │
│  │                       [✎]│   │                                             │
│  │                       [×]│   │                                             │
│  └──────────────────────────┘   │                                             │
│                                  │                                             │
│  ──────────────────────────────  │                                             │
│  TOTAL COMMUTERS                 │                                             │
│  43,218                          │                                             │
│  from 2 zones · 2023             │                                             │
│                                  │                                             │
│  ┌── ⚠ OVERLAP ──────────────┐  │                                             │
│  │  Zones 1 & 2 share cells.  │  │                                             │
│  │  Reduce Ring size or space │  │                                             │
│  │  zones further apart.      │  │                                             │
│  └────────────────────────────┘  │                                             │
└──────────────────────────────────┴─────────────────────────────────────────────┘
```

---

### 6c. Empty State (< 2 points)

```
┌── SIDEBAR · 280px ──────────────┬─────────────────────────────────────────────┐
│  ANALYSIS ZONES            (1)   │                                             │
│  ──────────────────────────────  │                                             │
│  ┌──────────────────────────┐   │                                             │
│  │ ■  1  Downtown SLC   ... │   │    ┌──────────────────────────────────┐    │
│  └──────────────────────────┘   │    │                                  │    │
│                                  │    │   ⬡                              │    │
│  Add one more zone to see        │    │                                  │    │
│  commuter flows.                 │    │   Add one more zone              │    │
│                                  │    │   to see flow arcs.             │    │
│                                  │    │                                  │    │
│                                  │    │   Click anywhere on the map     │    │
│                                  │    │   to place a second zone.       │    │
│                                  │    │                                  │    │
│                                  │    └──────────────────────────────────┘    │
└──────────────────────────────────┴─────────────────────────────────────────────┘
```

The empty-state card is centered in the map area (not full-screen). It adapts: 0 points shows "Click anywhere to add your first zone"; 1 point shows "Add one more zone to see flows." The basemap is always visible behind it.

---

## 7. Component-by-Component Design Decisions

### 7a. AppHeader

Header zones (left → right):

```
[ThemeSwitcher] | ⬡ title | ─── | [Year][COVID] [RingSelector]  ·  [spinner] [ViewToggle] [ModeBtn]
  left zone       brand       divider   data controls zone              right zone
```

- **Theme switcher**: Far left, before the logo. 3-segment icon pill.
- **Logo**: SVG inline hexagon `⬡`, 22×22px, `--color-brand-600`. No image file.
- **Title**: "Commute Flow Explorer" 16px 700. Not a link.
- **Vertical divider**: `1px solid var(--color-border)`, height 24px.
- **Data controls zone**: Year + COVID badge + Ring stepper (select mode only).
- **Spinner**: Small 16px spinner dot visible only when loading. No text.
- **View toggle**: Map|Matrix pill (select mode with ≥2 points only).
- **Mode button**: "Select Points →" (overview) or "← Back" (select mode).
- **Header elevation**: `box-shadow: var(--shadow-sm)` + `z-index: 20`.

---

### 7b. YearSelector

**Proposed**: Styled `<select>` with `appearance: none` + custom chevron SVG + COVID badge.

```
[  2023 ▾  ]  [⚠ COVID-era data]
```

- No "Year:" label — the control is self-labeling; `aria-label="Data year"` for screen readers.
- Custom chevron is a 10×6px SVG inline `data:` URI — no icon dependency.
- COVID badge: amber pill, text "⚠ COVID-era data", appears only for 2020 and 2021.
- In dark mode: the badge uses `--color-warning` text on `--color-warning-bg` background (inverted from light).

**Rationale for keeping `<select>`**: A temporal slider would be visually richer but requires custom ARIA role="slider" + keyboard handling to meet SC-006. The styled native `<select>` covers all 22 years, is fully keyboard-accessible, and is trivially implemented.

---

### 7c. RingSelector — Numeric Stepper (replaces fixed segmented control)

**Previous proposal**: A four-segment `[k=0][k=1][k=2][k=3]` control. This has a hard ceiling at k=3.

**Updated**: An open-ended numeric stepper. No fixed maximum in the UI; practical guidance is shown inline.

```
Ring   [ − ]  k = 2  [ + ]   19 cells
              ↑ editable
```

**Detailed layout:**
```
Ring   [−]  k = 2  [+]   19 cells  (≈ 2.1 km²)
  ↑      ↑          ↑        ↑              ↑
label  dec btn   value    inc btn    cell count + area hint
```

- The `k = {n}` span is also a direct `<input type="number" min="0" step="1">` that accepts keyboard entry, so the user can type `k=6` directly without clicking `[+]` six times.
- `[−]` and `[+]` are 28×28px buttons with `var(--radius-sm)` borders. The `[−]` button is disabled (opacity 0.4) when k=0.
- **Cell count** is computed client-side: `k === 0 ? 1 : 3*k*(k+1) + 1`. This updates live as k changes.
- **Area hint** in parentheses: approximate area at H3 resolution 9. Values: k=0 ~0.1 km², k=1 ~0.8 km², k=2 ~2.1 km², k=3 ~4.1 km², k=4 ~6.7 km², k=5 ~10 km², k=6 ~14 km². These are derived from the H3 specification and shown in a muted color.
- **Tooltip on "Ring" label**: "Number of H3 rings expanded around each clicked cell. Larger rings capture wider catchment areas but increase overlap risk and query time."
- **Performance warning**: If k > 5, show a subtle `⚠ Large ring — query may be slow` in amber text below the control. k=5 yields 91 cells × N points in the `IN` clause — still within the performance budget but worth flagging.
- No hard maximum enforced; the user is trusted to manage their analysis.

**Cell count formula table** (shown in the Ring tooltip):

| k | Cells | Approx area |
|---|-------|-------------|
| 0 | 1     | ~0.1 km²    |
| 1 | 7     | ~0.8 km²    |
| 2 | 19    | ~2.1 km²    |
| 3 | 37    | ~4.1 km²    |
| 4 | 61    | ~6.7 km²    |
| 5 | 91    | ~10 km²     |
| 6 | 127   | ~14 km²     |

---

### 7d. ViewToggle

Pill segmented control with inline SVG icons:

```
[ ▣ Map  |  ⊞ Matrix ]
```

- Outer: `border-radius: var(--radius-pill)`, `border: 1px solid var(--color-border)`, `display: inline-flex`, `overflow: hidden`.
- Each segment: icon (16×16 SVG) + label text, `padding: 5px 14px`, `font-size: 13px`, `font-weight: 600`.
- Active: `background: var(--color-brand-600)`, `color: #fff`.
- Inactive: `background: var(--color-surface)`, `color: var(--color-text-secondary)`.
- Transition: `background 0.15s, color 0.15s`.
- Only visible when `appMode === 'select'` and `points.length >= 2`.

---

### 7e. AnalysisPanel (sidebar restructure)

The sidebar is a single `<AnalysisPanel>` component. `PointList` becomes a list of `<PointCard>` child components.

**PointCard:**

```
┌────────────────────────────────────────────────────────────┐
│  ■ (swatch)  1  Downtown SLC                  [↑][↓][✎][×] │
│                 Salt Lake County, Utah                      │
│                 ● Overlaps with West Valley    (amber)      │
└────────────────────────────────────────────────────────────┘
```

- Color swatch: `16×16px`, `border-radius: var(--radius-sm)` (rounded square, not circle).
- Index: `13px`, `font-weight: 700`, `color: var(--color-text-muted)`.
- Name: `13px`, `font-weight: 600`, `color: var(--color-text-primary)`. Truncates at one line.
- County: `11px`, `color: var(--color-text-muted)`. Format: "{County}, {State abbreviation}" — include state so cross-state counties are unambiguous.
- Overlap badge: amber dot + "Overlaps with {name}", `11px`, inline under county.
- Action buttons: vertically stacked or horizontal 2×2 grid, `28×28px` touch targets.  
  `[↑]` / `[↓]` use arrow SVG icons. `[✎]` and `[×]` use Unicode for now.
- Card background: `var(--color-surface)` → `var(--color-surface-raised)` on hover.
- Card border: `1px solid var(--color-border)`, `border-radius: var(--radius-md)`.
- Box shadow: `var(--shadow-sm)`.

**Editing state:**
```
┌────────────────────────────────────────────────────────────┐
│  ■  1  [ Downtown SLC        ▌ ]            [✎ commit] [×] │
│         Input bordered in brand-600                        │
│         "Name already in use" ← error in red below input   │
└────────────────────────────────────────────────────────────┘
```
Input: `border: 2px solid var(--color-brand-600)`, `border-radius: var(--radius-sm)`, `padding: 2px 6px`.

**Totals section:**
```
──────────────────────────────────────
TOTAL COMMUTERS
43,218
from 2 zones · 2023
──────────────────────────────────────
```
- "TOTAL COMMUTERS": section-label style (11px uppercase, 0.06em tracking, `text-secondary`).
- `43,218`: `24px`, `font-weight: 700`, `color: var(--color-text-primary)`.
- Context line: `11px`, `text-muted`. Only visible when ≥2 points.

**Overlap alert:**
```
┌──────────────────────────────────────────────────────────┐
│ ⚠  Overlapping zones                                     │
│    Zones 1 & 2 share H3 cells. Flows in shared cells     │
│    are attributed to both zones.                         │
│    Reduce Ring size or space zones further apart.        │
└──────────────────────────────────────────────────────────┘
```
- `background: var(--color-warning-bg)`, `border: 1px solid var(--color-warning-border)`.
- `border-radius: var(--radius-md)`, `padding: 10px 12px`, `font-size: 12px`.

---

### 7f. FlowLegend (new component)

Floating card overlaid on the map, positioned above the MapLibre navigation controls (bottom-right).

```
┌─────────────────────────────────────────┐
│  FLOW VOLUME                            │
│  ─────────────────────────────────────  │
│  ░░░▒▒▒▒████████████████████████████   │
│  1,240                          12,400  │
└─────────────────────────────────────────┘
```

- Width: `180px`. `backdrop-filter: blur(6px)`.  
  Light: `background: rgba(255,255,255,0.88)`.  
  Dark: `background: rgba(15,23,42,0.88)`.
- Gradient bar: `12px` tall, `border-radius: var(--radius-sm)`.  
  `background: linear-gradient(to right, #f7fcf0, #ccebc5, #7bccc4, #2b8cbe, #084081)` — exact GNBU stops.
- Min/Max labels: actual computed values from `flows` (not "Low"/"High") — "1,240" and "12,400". More informative.
- Position: `position: absolute; bottom: 96px; right: 12px` (above the MapLibre NavigationControl stack).
- Only rendered when `appMode === 'select'` and `points.length >= 2`.
- In dark mode: gradient is unchanged (GnBu reads well on dark backgrounds). Labels use `--color-text-primary`.

---

## 8. Tooltip System

### 8a. Design Philosophy

All tooltips — map arc hover, location node hover, hex cluster hover, and OD matrix cell hover — share a single visual language:

- Frosted glass background (adapts to theme).
- Left colored accent bar (3px vertical, matching the primary point color or brand color).
- Section headers in UPPERCASE 11px tracking style.
- Mini bar charts for proportional data (wages, industry).
- Fixed width: `260px`.
- Positioned 14px to the right and 8px above the cursor.

### 8b. Flow Arc Tooltip (origin → destination)

```
╔══════════════════════════════════════════════════════════╗
║ ▌                                                        ║  ← 3px left accent bar (brand-600)
║   ● Downtown SLC  ──▶  ● West Valley                    ║  ← colored dots + arrow
║   ──────────────────────────────────────────────────     ║
║   COMMUTER VOLUME                                        ║
║   12,400                                                 ║  ← 24px bold
║   ──────────────────────────────────────────────────     ║
║   WAGES                                     count    %   ║  ← section header
║   Low  (SA01)  ████████████░░░░░░░░░  4,200  34%        ║  ← bar + value + pct
║   Mid  (SA02)  █████████████░░░░░░░░  3,800  31%        ║
║   High (SA03)  ██████████████░░░░░░░  4,400  35%        ║
║   ──────────────────────────────────────────────────     ║
║   INDUSTRY (at destination)                              ║
║   Goods-producing   ████░░░░░░░░░░░░  2,100  17%        ║
║   Trade/transport   ████████░░░░░░░░  4,500  36%        ║
║   Other services    ██████████░░░░░░  5,800  47%        ║
║   ──────────────────────────────────────────────────     ║
║   ⓘ Industry reflects job type at destination           ║  ← 11px muted caption
╚══════════════════════════════════════════════════════════╝
```

**Mini bar construction:**
- Container: `width: 100px; height: 4px; border-radius: 2px; background: var(--color-border)`.
- Fill: `width: calc({pct}% * 1)` (bar scales to container width), `background: var(--color-brand-600)` for wages, `background: #76b7b2` (teal) for industry.
- The bar + number + pct are in a three-column flex row: `[bar]  [count]  [pct]`.

**Colored origin/destination dots:**
- Each dot is a `12×12px` inline `<span>` with `border-radius: 50%` and `background: {point.color}`.
- The arrow `──▶` is a Unicode em-dash + right arrow, `color: var(--color-text-muted)`.

### 8c. Location Node Tooltip (point hover on map)

```
╔══════════════════════════════════════════════════════════╗
║ ▌                                                        ║  ← accent bar in point color
║   ■ Downtown SLC                                         ║  ← swatch + name, 14px bold
║     Salt Lake County, Utah                              ║  ← 11px muted
║   ──────────────────────────────────────────────────     ║
║   FLOWS                                                  ║
║   → Outbound  ████████████░░░░░░░  11,343               ║  ← bar scaled to max(in,out)
║   ← Inbound   ████████████████░░░  16,000               ║
║   ──────────────────────────────────────────────────     ║
║   Net inbound   +4,657                                   ║  ← signed, green if +, red if −
╚══════════════════════════════════════════════════════════╝
```

- Net inbound: `+4,657` in `--color-success` (green); net outbound: `-4,657` in `--color-error` (red). The sign makes the commute direction immediately readable.
- The accent bar uses the point's own color (not brand-600).

### 8d. Hex Cluster Hover Tooltip

Small, lightweight — this fires frequently as the user moves over hex cells.

```
╔══════════════════════════════════════╗
║ ▌  ■ Downtown SLC                   ║
║      Salt Lake County, Utah         ║
║      H3 res-9 · ring k = 2          ║
╚══════════════════════════════════════╝
```

Width: `180px`. No sections, no bars — just identity information.

### 8e. ODMatrix Cell Tooltip

Uses the same arc tooltip layout (8b), since a matrix cell is conceptually identical to a directional flow arc. Rendered as JSX (not innerHTML).

```
╔══════════════════════════════════════════════════════════╗
║ ▌                                                        ║  ← brand-600 accent
║   ● Downtown SLC  ──▶  ● West Valley                    ║
║   COMMUTER VOLUME                                        ║
║   8,241                                                  ║
║   WAGES                                     count    %   ║
║   Low  (SA01)  ████████░░░░░░░░  2,800  34%             ║
║   Mid  (SA02)  ████████░░░░░░░░  2,700  33%             ║
║   High (SA03)  ████████░░░░░░░░  2,741  33%             ║
║   INDUSTRY (at destination)                              ║
║   Goods-producing   ████░░░░░░░  1,400  17%             ║
║   Trade/transport   ████████░░░  2,900  35%             ║
║   Other services    ██████████░  3,941  48%             ║
║   ⓘ Industry reflects job type at destination           ║
╚══════════════════════════════════════════════════════════╝
```

### 8f. Tooltip Implementation

**FlowLayer tooltip** (`FlowLayer.jsx`): Currently a raw DOM element with `innerHTML`. It gains a CSS class `.flow-tooltip` defined in `src/styles/tooltips.css`. The `innerHTML` string is replaced by a template-function `buildFlowTooltipHTML(obj, points, matrixCells)` that returns structured HTML matching the designs above. The `background`, `border-radius`, and `box-shadow` come from CSS, not inline strings.

**ODMatrix tooltip**: Converted to a shared `<FlowTooltip>` JSX component in `src/components/FlowTooltip.jsx`. Both `ODMatrix.jsx` and `MapView.jsx` (hex hover) import from this file.

**Dark mode adaptation**: The `.flow-tooltip` CSS class uses `var(--color-surface-elevated)` for background, `var(--color-text-primary)` for text, `var(--color-border)` for dividers — all theme-aware automatically.

---

## 9. OD Matrix — Professional Layout

### 9a. Visual Design

The matrix gains explicit, permanent axis labels — the most common source of confusion in OD tables.

```
                        ← D E S T I N A T I O N →
                        (where workers are employed)
           ┌──────────────────────────────────────────────────┬──────────────┐
           │                │ ● Downtown │ ● West Valley │ ● Sandy │ OUTBOUND │
           │                │    SLC     │               │         │   TOTAL  │
     O     ├────────────────┼────────────┼───────────────┼─────────┼──────────┤
     R  ↑  │  ● Downtown SLC│     —      │  ████  8,241  │ █ 3,102 │  11,343  │
     I  G  │ ● West Valley  │ ████12,400 │      —        │ █ 4,800 │  17,200  │
     G  I  │ ● Sandy        │  █  3,600  │  ██   2,100   │    —    │   5,700  │
     I  N  ├────────────────┼────────────┼───────────────┼─────────┼──────────┤
     N  ↓  │ INBOUND TOTAL  │   16,000   │    10,341     │  7,902  │          │
           │ (workers dest) │            │               │         │          │
           └──────────────────────────────────────────────────────┴──────────────┘
                                  (where workers live)
```

**Structural decisions:**

1. **"ORIGIN" axis label**: Rotated 90° text on the far left, spanning all data rows. Text: "ORIGIN — where workers live". `font-size: 11px`, UPPERCASE, `color: var(--color-text-secondary)`, `letter-spacing: 0.1em`. Uses CSS `writing-mode: vertical-rl; transform: rotate(180deg)`.

2. **"DESTINATION" axis label**: Centered above the column headers, spanning all data columns (not the row-header column). Text: "DESTINATION — where workers are employed". Same style as above.

3. **Corner cell**: Contains `Origin \\ Dest` in two lines, 11px muted — a standard diagonal label clarifying row vs column meaning.

4. **Data cells**: Left-aligned mini bar `▉` + right-aligned number in each cell. The bar width is proportional to value within the row's max — providing relative magnitude at a glance without requiring the reader to compare raw numbers across columns. Bar color: `var(--color-brand-600)` at 40% opacity (not teal — reserve teal for the background fill).

5. **Self-diagonal cells**: `background: var(--color-surface-raised)` (slightly gray), content is a centered `—` in `var(--color-text-disabled)`. Not hover-interactive.

6. **Totals row/column**: `background: var(--color-surface-raised)` for visual separation. "OUTBOUND TOTAL" / "INBOUND TOTAL" in section-label style (uppercase, tracked).

7. **Sticky headers**: Column headers (`<thead>`) and the ORIGIN label column use `position: sticky; top: 0` / `position: sticky; left: 0` with `z-index` layering so they freeze during horizontal/vertical scroll on large matrices.

8. **Column header rotation**: When ≥ 4 points, column headers rotate 45° via `transform: rotate(-45deg); transform-origin: bottom left` to prevent column-width explosion. At ≤ 3 points, they sit upright.

9. **Cell hover**: `outline: 2px solid var(--color-brand-600); outline-offset: -1px; z-index: 1` (outline stays within the cell border). This is more visible than a background change, which competes with the heat-map teal fill.

10. **Table caption**: `<caption>` element (semantic HTML), styled above the table:  
    `"ORIGIN-DESTINATION MATRIX · {year} · {n} zones · {totalCommuters.toLocaleString()} total commuters"`

### 9b. Matrix Header Bar

Shown above the `<table>` and sticky at the top of the matrix content area:

```
ORIGIN-DESTINATION MATRIX · 2023 · 3 zones · 34,243 commuters
                                                    [Download ▾]
```

The `[Download ▾]` button opens a small dropdown (not a native `<select>`):

```
[Download ▾]
  ├ Wide format (matrix)  ← default, matches visual layout
  └ Long format (tidy)    ← analysis/R/Python-friendly
```

### 9c. Export — Wide Format (matrix CSV)

Rows = origins, columns = destinations. Self-diagonal cells are empty. A header row and a totals row are included.

```csv
"ORIGIN-DESTINATION MATRIX","","","","",""
"Data year: 2023","","","","",""
"","DESTINATION: Downtown SLC","DESTINATION: West Valley","DESTINATION: Sandy","OUTBOUND TOTAL"
"ORIGIN: Downtown SLC","","8241","3102","11343"
"ORIGIN: West Valley","12400","","4800","17200"
"ORIGIN: Sandy","3600","2100","","5700"
"INBOUND TOTAL","16000","10341","7902",""
```

Full filename: `od_matrix_wide_{year}.csv`

### 9d. Export — Long Format (tidy CSV)

One row per origin-destination pair. All seven LODES fields included. Zero-flow pairs are excluded (same as the `matrixCells` Map which only stores non-zero pairs).

```csv
origin,destination,total_commuters,low_wage_sa01,mid_wage_sa02,high_wage_sa03,goods_producing_si01,trade_transport_si02,other_services_si03
"Downtown SLC","West Valley",8241,2800,2700,2741,1400,2900,3941
"Downtown SLC","Sandy",3102,1050,1020,1032,526,1100,1476
"West Valley","Downtown SLC",12400,4200,4100,4100,2100,4500,5800
"West Valley","Sandy",4800,1630,1580,1590,815,1720,2265
"Sandy","Downtown SLC",3600,1220,1190,1190,612,1296,1692
"Sandy","West Valley",2100,713,694,693,357,756,987
```

Full filename: `od_matrix_long_{year}.csv`

**Implementation note**: `MatrixExport.js` utility — two pure functions `exportWide(points, matrixCells, year)` and `exportLong(points, matrixCells, year)` that return a Blob URL for `<a download>` click simulation. No external library required.

---

## 10. Interaction States

| Element | Default | Hover | Focus (keyboard) | Disabled |
|---------|---------|-------|-----------------|----------|
| Primary button | `brand-600` bg | `brand-700` bg, `transition: 0.15s` | `outline: 2px solid brand-600; outline-offset: 2px` | `opacity: 0.45; cursor: not-allowed` |
| Secondary button | `surface` bg + border | `surface-raised` bg | same outline | `opacity: 0.45` |
| Segmented control | `surface` | `surface-raised` | outline on segment | — |
| Stepper `[−][+]` | outlined border | `surface-raised` | outline | `opacity: 0.4` (at k=0 for `[−]`) |
| Point card | `surface` bg | `surface-raised` bg | — (card not focusable) | — |
| Card action btn | `surface` | `surface-raised` | `outline` | — |
| Matrix cell | teal fill or white | `outline: 2px solid brand-600` | same | `color-disabled` for `—` |
| Year `<select>` | bordered | `border-strong` | `border: 2px solid brand-600` | — |
| Stepper number input | bordered | `border-strong` | `border: 2px solid brand-600` | — |

All transitions: `background 0.12s ease, color 0.12s ease, border-color 0.12s ease`.

---

## 11. Status Indicators

**DuckDB init**: Toast notification at bottom-center.  
  "Initialising data engine…" + spinner. Auto-dismisses on completion. Persistent in `--color-error` on failure.

**Flow loading**: A 16px animated spinner dot immediately to the left of the Year selector — spatially correlated with the control that triggers loading.

**Basemap loading**: No indicator (the map simply renders progressively — standard MapLibre behavior).

**Theme switch**: No loading indicator needed. The style swap and CSS token change are near-instant.

**Fatal DB error**: Full-page error screen stays as-is — it is already an appropriate treatment.

---

## 12. Header Information Architecture

```
[ThemeSwitcher]  ⬡ Commute Flow Explorer  |  [Year ▾][COVID]  [Ring − k=2 +]  ·  [●] [Map|Matrix]  [← Back]
  left zone           brand zone           divider   data controls zone         right zone
```

- **Left zone**: `[☀|⊙|☾]` theme switcher — always visible in both modes.
- **Brand zone**: Logo + title — never interactive.
- **Vertical divider**: Separates brand from controls.
- **Data controls zone**: Year + COVID + Ring stepper (Ring hidden in overview mode).
- **Right zone**: Spinner (conditional) + ViewToggle (select + ≥2pts) + Mode button.

The F-pattern reading direction puts brand identity first (top-left), data context in the center scanning zone, and actions at the end (right). The theme switcher at far-left is a secondary control — not in the primary F-pattern path but always accessible.

---

## 13. Unchanged Decisions

The following design elements are already correctly chosen and will not change:

- **Point color palette**: `POINT_COLORS` (Tableau 10 / ColorBrewer — distinguishable under deuteranopia).
- **Flow arc scale**: GnBu sequential — reads well in dark and light modes.
- **Matrix heat scale**: White → dark teal. In dark mode, the "white" stop becomes `var(--color-surface)` (dark bg), so zero cells match the dark surface rather than clashing as white squares.
- **Overlap hatching**: `repeating-linear-gradient` diagonal hatch for dual-claimed hex cells (not yet implemented — still the right approach).

---

## 14. Implementation Sequence

Apply in this order to minimize merge conflicts and allow incremental review:

| # | File | Change |
|---|------|--------|
| 1 | `src/styles/tokens.css` | Create token file; both light + dark token sets; import in `main.jsx` |
| 2 | `src/styles/tooltips.css` | `.flow-tooltip` class + inner element classes |
| 3 | `src/contexts/ThemeContext.jsx` | ThemeProvider, `useTheme` hook, localStorage + matchMedia |
| 4 | `src/utils/agrcStyle.js` | `buildBasemapStyle(resolvedTheme)` signature; return Carto Dark Matter when dark |
| 5 | `src/components/ThemeSwitcher.jsx` | 3-segment icon pill |
| 6 | `src/components/AppHeader.jsx` | Extract toolbar; integrate zones; add ThemeSwitcher |
| 7 | `src/components/RingSelector.jsx` | Numeric stepper with live cell count |
| 8 | `src/components/ViewToggle.jsx` | Pill segmented with SVG icons |
| 9 | `src/components/FlowTooltip.jsx` | Shared JSX tooltip component (arc, node, hex, matrix) |
| 10 | `src/components/PointCard.jsx` | Single point card |
| 11 | `src/components/AnalysisPanel.jsx` | Full sidebar restructure using PointCard |
| 12 | `src/components/FlowLegend.jsx` | Floating legend with actual min/max values |
| 13 | `src/utils/MatrixExport.js` | `exportWide()` + `exportLong()` pure functions |
| 14 | `src/components/ODMatrix.jsx` | Axis labels, sticky headers, rotated columns, export button, cell bars |
| 15 | `src/components/FlowLayer.jsx` | Replace inline tooltip string with `buildFlowTooltipHTML()` + CSS class |
| 16 | `src/components/MapView.jsx` | Accept `basemapUrl` prop; re-add layers on `style.load`; use `FlowTooltip` for hex hover |
| 17 | `src/App.jsx` | Remove `primaryBtn`/`secondaryBtn`/`selectStyle`; wire `ThemeContext` |

---

## 15. Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| Dark or light sidebar? | **Both** — full light/dark/system theme switching |
| Year slider or select? | Styled `<select>` — preserves SC-006 keyboard accessibility without custom ARIA |
| Ring size: fixed 0–3 or open-ended? | **Open-ended stepper** — no UI ceiling; k>5 shows performance warning |
| Sidebar collapse toggle? | **No** — out of scope v1 |
| Matrix CSV export? | **Yes** — two formats: Wide and Long, user chooses from dropdown |
| Origin/destination labeling in matrix? | **Full axis labels** — "ORIGIN" rotated label + "DESTINATION" spanning header + corner diagonal label |
| Animated transitions? | **150ms CSS opacity fade** on view switches |
| Dark basemap? | **Carto Dark Matter** — free, no API key, standard GIS dashboard choice |

---

*End of design proposal. No code was changed.*
