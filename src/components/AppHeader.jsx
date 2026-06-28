import ThemeSwitcher from './ThemeSwitcher.jsx';
import YearSelector  from './YearSelector.jsx';
import RingSelector  from './RingSelector.jsx';
import ViewToggle    from './ViewToggle.jsx';
import { WarningIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons.jsx';

function HexLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <polygon
        points="11,2 19.66,6.5 19.66,15.5 11,20 2.34,15.5 2.34,6.5"
        stroke="var(--color-brand-600)"
        strokeWidth="1.8"
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <div
      aria-label="Loading"
      style={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        border: '2px solid var(--color-border)',
        borderTopColor: 'var(--color-brand-600)',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}

export default function AppHeader({
  year, kRing, activeView, appMode,
  loading, overviewLoading, error, dbReady,
  points,
  onYearChange, onKRingChange, onViewChange,
  onEnterSelect, onEnterOverview,
}) {
  const isSelect  = appMode === 'select';
  const isLoading = loading || overviewLoading || (!dbReady && !error);

  return (
    <>
      {/* Keyframe for spinner — injected once */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <header
        style={{
          height: 'var(--header-height)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 14px',
          background: 'var(--color-surface)',
          boxShadow: 'var(--shadow-sm)',
          zIndex: 20,
          position: 'relative',
        }}
      >
        {/* ── Left zone: theme switcher + logo + title ── */}
        <ThemeSwitcher />

        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <HexLogo />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
            Commute Flow Explorer
          </span>
          {/* WFRC agency badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 7px',
            background: 'var(--color-brand-50)',
            border: '1px solid rgba(224, 123, 44, 0.3)',
            borderRadius: 'var(--radius-sm)',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-brand-600)', letterSpacing: '0.06em' }}>
              WFRC
            </span>
          </div>
        </div>

        {/* Vertical divider */}
        <div style={{ width: 1, height: 24, background: 'var(--color-border)', flexShrink: 0 }} />

        {/* ── Data controls zone ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <YearSelector year={year} onChange={onYearChange} />

          {isSelect && (
            <>
              {/* Subtle separator */}
              <div style={{ width: 1, height: 16, background: 'var(--color-border)' }} />
              <RingSelector kRing={kRing} onChange={onKRingChange} />
            </>
          )}
        </div>

        {/* Flex spacer */}
        <div style={{ flex: 1 }} />

        {/* ── Right zone: status + view toggle + mode button ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Error message */}
          {error && (
            <span style={{ fontSize: 13, color: 'var(--color-error)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <WarningIcon size={13} /> {error}
            </span>
          )}

          {/* Loading spinner */}
          {isLoading && !error && <Spinner />}

          {/* View toggle — only in select mode with ≥2 points */}
          {isSelect && points.length >= 2 && (
            <ViewToggle activeView={activeView} onChange={onViewChange} />
          )}

          {/* Mode button */}
          {isSelect ? (
            <button onClick={onEnterOverview} className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>
              <ChevronLeftIcon size={13} /> Overview
            </button>
          ) : (
            <button
              onClick={onEnterSelect}
              disabled={!dbReady}
              className="btn-primary"
              style={{ whiteSpace: 'nowrap' }}
            >
              Select Points <ChevronRightIcon size={13} />
            </button>
          )}
        </div>
      </header>
    </>
  );
}
