import ThemeSwitcher from './ThemeSwitcher.jsx';
import YearSelector  from './YearSelector.jsx';
import RingSelector  from './RingSelector.jsx';
import ViewToggle    from './ViewToggle.jsx';
import { WarningIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import logoColor from '../../assets/logo/WFRC_logo_abbreviated_color_transparent.png';
import logoWhite from '../../assets/logo/WFRC_logo_abbreviated_white_transparent.png';

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
  const { resolvedTheme } = useTheme();

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
        {/* ── Left zone: theme switcher + WFRC logo + title ── */}
        <ThemeSwitcher />

        <img
          src={resolvedTheme === 'dark' ? logoWhite : logoColor}
          alt="WFRC"
          height="28"
          style={{ display: 'block', flexShrink: 0 }}
        />

        <div style={{ width: 1, height: 24, background: 'var(--color-border)', flexShrink: 0 }} />

        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
          Commute Flow Explorer
        </span>

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
