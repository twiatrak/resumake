import { useEffect, useState, useRef } from 'react';

export type ListLayoutMode = 'stacked' | 'inline';

interface UseAutoCompactListOptions {
  enabled?: boolean;
  debounceMs?: number;
}

const DEFAULT_OPTIONS: Required<UseAutoCompactListOptions> = {
  enabled: true,
  debounceMs: 100,
};

/**
 * Hook to automatically choose between stacked and inline list layouts
 * based on which produces less vertical height.
 * 
 * @param listRef - Reference to the UL element with data-auto-compact attribute
 * @param options - Configuration options
 * @returns The optimal layout mode ('stacked' or 'inline')
 */
export function useAutoCompactList(
  listRef: React.RefObject<HTMLUListElement | null>,
  options: UseAutoCompactListOptions = {}
): ListLayoutMode {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [mode, setMode] = useState<ListLayoutMode>('stacked');
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!opts.enabled || !listRef.current) {
      return;
    }

    const measureAndSelectLayout = () => {
      const list = listRef.current;
      if (!list) return;

      // Store original classes
      const originalClasses = list.className;

      // Measure stacked height
      list.className = originalClasses.replace(/list--(inline|stacked)/g, '').trim() + ' list--stacked';
      const stackedHeight = list.offsetHeight;

      // Measure inline height
      list.className = originalClasses.replace(/list--(inline|stacked)/g, '').trim() + ' list--inline';
      const inlineHeight = list.offsetHeight;

      // Choose the layout with minimum height
      const optimalMode: ListLayoutMode = inlineHeight < stackedHeight ? 'inline' : 'stacked';
      
      // Apply the optimal layout
      list.className = originalClasses.replace(/list--(inline|stacked)/g, '').trim() + ` list--${optimalMode}`;
      setMode(optimalMode);
    };

    const debouncedMeasure = () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(measureAndSelectLayout, opts.debounceMs);
    };

    // Initial measurement after fonts are loaded
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        measureAndSelectLayout();
      });
    } else {
      // Fallback if fonts API is not available
      window.setTimeout(measureAndSelectLayout, opts.debounceMs);
    }

    // Listen to resize events
    const resizeObserver = new ResizeObserver(debouncedMeasure);
    resizeObserver.observe(listRef.current);

    // Listen to print media changes
    const printMediaQuery = window.matchMedia('print');
    const handlePrintChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        // Before print, re-evaluate
        measureAndSelectLayout();
      }
    };

    // Modern browsers
    if (printMediaQuery.addEventListener) {
      printMediaQuery.addEventListener('change', handlePrintChange);
    } else {
      // Fallback for older browsers
      printMediaQuery.addListener(handlePrintChange as (e: MediaQueryListEvent) => void);
    }

    // Listen for beforeprint event
    const handleBeforePrint = () => {
      measureAndSelectLayout();
    };
    window.addEventListener('beforeprint', handleBeforePrint);

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
      resizeObserver.disconnect();
      
      if (printMediaQuery.removeEventListener) {
        printMediaQuery.removeEventListener('change', handlePrintChange);
      } else {
        printMediaQuery.removeListener(handlePrintChange as (e: MediaQueryListEvent) => void);
      }
      
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, [opts.enabled, opts.debounceMs, listRef]);

  return mode;
}
