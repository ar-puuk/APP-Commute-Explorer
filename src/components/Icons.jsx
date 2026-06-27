/* Central SVG icon library — 16×16 viewport, stroke="currentColor", strokeWidth="1.5" */

const props = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 16 16',
  fill: 'none',
  'aria-hidden': true,
});

export function WarningIcon({ size = 14 }) {
  return (
    <svg {...props(size)}>
      <path d="M8 2.5L14 13.5H2L8 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="8" y1="6.5" x2="8" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.85" fill="currentColor" />
    </svg>
  );
}

export function InfoIcon({ size = 13 }) {
  return (
    <svg {...props(size)}>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="7" x2="8" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="4.75" r="0.85" fill="currentColor" />
    </svg>
  );
}

export function PencilIcon({ size = 13 }) {
  return (
    <svg {...props(size)}>
      <path
        d="M11 2.5L13.5 5L5 13.5H2.5V11L11 2.5Z"
        stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrashIcon({ size = 13 }) {
  return (
    <svg {...props(size)}>
      <path d="M2.5 4.5H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5.5 4.5V3C5.5 2.7 5.8 2.5 6 2.5H10C10.3 2.5 10.5 2.7 10.5 3V4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 4.5L4.75 13H11.25L12 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlusIcon({ size = 14 }) {
  return (
    <svg {...props(size)}>
      <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function MinusIcon({ size = 14 }) {
  return (
    <svg {...props(size)}>
      <path d="M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 14 }) {
  return (
    <svg {...props(size)}>
      <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 14 }) {
  return (
    <svg {...props(size)}>
      <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 13 }) {
  return (
    <svg {...props(size)}>
      <path d="M2 8H13M9.5 4.5L13 8L9.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 13 }) {
  return (
    <svg {...props(size)}>
      <path d="M14 8H3M6.5 4.5L3 8L6.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PinIcon({ size = 14 }) {
  return (
    <svg {...props(size)} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 1.5h5l1 4.5-3.5 2.5-3.5-2.5z" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="8.5" x2="8" y2="14.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="3.5" y1="6" x2="12.5" y2="6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/* Inline SVG strings for HTML tooltip templates (FlowTooltip buildFlowTooltipHTML) */
export const SVG_FLOW_ARROW = `<svg width="18" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true" style="vertical-align:middle;flex-shrink:0;margin:0 4px"><path d="M1 7h16M13 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const SVG_ARROW_RIGHT = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="vertical-align:middle;flex-shrink:0"><path d="M2 8H13M9.5 4.5L13 8L9.5 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const SVG_ARROW_LEFT  = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="vertical-align:middle;flex-shrink:0"><path d="M14 8H3M6.5 4.5L3 8L6.5 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const SVG_INFO        = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="vertical-align:middle;flex-shrink:0"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="7" x2="8" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="4.75" r="0.85" fill="currentColor"/></svg>`;
export const SVG_PIN         = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 1.5h5l1 4.5-3.5 2.5-3.5-2.5z"/><line x1="8" y1="8.5" x2="8" y2="14.5"/><line x1="3.5" y1="6" x2="12.5" y2="6"/></svg>`;
export const SVG_UNPIN       = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>`;
