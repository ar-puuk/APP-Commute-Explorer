import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext.jsx';

const BASE = import.meta.env.BASE_URL;

export function useFavicon() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const href = resolvedTheme === 'dark'
      ? `${BASE}favicon-dark.png`
      : `${BASE}favicon-light.png`;

    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = href;
  }, [resolvedTheme]);
}
