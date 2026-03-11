import { useState, useEffect } from 'react';

export type ListLayout = 'compact' | 'relaxed';
export type ListStyle = 'bulleted' | 'plain';

export interface SidebarDisplayOptions {
  layout: ListLayout;
  style: ListStyle;
}

const STORAGE_KEY = 'resumake-sidebar-display-options';

const DEFAULT_OPTIONS: SidebarDisplayOptions = {
  layout: 'relaxed',
  style: 'bulleted',
};

export function useSidebarDisplayOptions() {
  const [options, setOptions] = useState<SidebarDisplayOptions>(() => {
    // Load from localStorage on mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migrate old keys if they exist
        if ('density' in parsed) {
          parsed.layout = parsed.density;
          delete parsed.density;
        }
        if (parsed.style === 'inline') {
          // Old 'inline' style is now 'plain' in relaxed layout
          parsed.style = 'plain';
        }
        return { ...DEFAULT_OPTIONS, ...parsed };
      }
    } catch (e) {
      console.error('Failed to load sidebar display options:', e);
    }
    return DEFAULT_OPTIONS;
  });

  // Persist to localStorage whenever options change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
      
      // Update global attributes on document body for CSS
      const sidebar = document.querySelector('[data-sidebar]');
      if (sidebar) {
        sidebar.setAttribute('data-sidebar-layout', options.layout);
        sidebar.setAttribute('data-sidebar-style', options.style);
      }
    } catch (e) {
      console.error('Failed to save sidebar display options:', e);
    }
  }, [options]);

  const setLayout = (layout: ListLayout) => {
    setOptions((prev) => ({ ...prev, layout }));
  };

  const setStyle = (style: ListStyle) => {
    setOptions((prev) => ({ ...prev, style }));
  };

  return {
    options,
    setLayout,
    setStyle,
  };
}
