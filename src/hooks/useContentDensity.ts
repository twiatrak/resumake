import { useEffect, useRef, useState } from 'react';

export interface ContentDensitySettings {
  spacingMultiplier: number;
  fontSizeMultiplier: number;
}

interface UseContentDensityOptions {
  enabled?: boolean;
  emptyThreshold?: number; // percentage of empty space to trigger optimization
  maxFontSizeRatio?: number; // max font size ratio compared to other column
  maxSpacing?: number; // max spacing in em
  otherColumnRef?: React.RefObject<HTMLDivElement | null>;
}

const DEFAULT_OPTIONS: Required<Omit<UseContentDensityOptions, 'otherColumnRef'>> & Pick<UseContentDensityOptions, 'otherColumnRef'> = {
  enabled: true,
  emptyThreshold: 0.3, // 30% empty space
  maxFontSizeRatio: 1.15, // 115% max
  maxSpacing: 2.5, // 2.5em max
  otherColumnRef: undefined,
};

export function useContentDensity(
  columnRef: React.RefObject<HTMLDivElement | null>,
  options: UseContentDensityOptions = {}
): ContentDensitySettings {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [settings, setSettings] = useState<ContentDensitySettings>({
    spacingMultiplier: 1,
    fontSizeMultiplier: 1,
  });

  const previousSettingsRef = useRef<ContentDensitySettings>(settings);

  useEffect(() => {
    if (!opts.enabled || !columnRef.current) {
      return;
    }

    const calculateDensity = () => {
      const column = columnRef.current;
      if (!column) return;

      // Get parent container height (the column container)
      const parentHeight = column.parentElement?.offsetHeight || column.offsetHeight;
      const contentHeight = column.scrollHeight;
      
      // Calculate fill ratio
      const fillRatio = contentHeight / parentHeight;
      const emptyRatio = Math.max(0, 1 - fillRatio);

      // If column has significant empty space, optimize it
      if (emptyRatio > opts.emptyThreshold) {
        const newSettings: ContentDensitySettings = {
          spacingMultiplier: 1,
          fontSizeMultiplier: 1,
        };

        // Step 1: Increase spacing if there's significant empty space
        if (emptyRatio > opts.emptyThreshold * 0.5) {
          // Gradually increase spacing based on empty ratio
          // If 30% empty, increase spacing by 1.5x
          // If 50% empty, increase spacing by 2x
          const spacingIncrease = Math.min(
            1 + (emptyRatio * 1.5),
            opts.maxSpacing
          );
          newSettings.spacingMultiplier = spacingIncrease;
        }

        // Step 2: Increase font size if there's still empty space
        if (emptyRatio > opts.emptyThreshold * 0.6) {
          // Calculate max allowed font size based on other column
          let maxFontSize = opts.maxFontSizeRatio;
          
          if (opts.otherColumnRef?.current) {
            const otherColumnFontSize = parseFloat(
              getComputedStyle(opts.otherColumnRef.current).fontSize
            );
            const currentFontSize = parseFloat(
              getComputedStyle(column).fontSize
            );
            
            if (otherColumnFontSize && currentFontSize) {
              const currentRatio = currentFontSize / otherColumnFontSize;
              // Ensure we don't exceed the max ratio
              maxFontSize = Math.min(
                opts.maxFontSizeRatio / currentRatio,
                opts.maxFontSizeRatio
              );
            }
          }

          const fontIncrease = Math.min(
            1 + (emptyRatio * 0.4),
            maxFontSize
          );
          newSettings.fontSizeMultiplier = fontIncrease;
        }

        // Only update if settings have actually changed to avoid infinite loops
        if (JSON.stringify(newSettings) !== JSON.stringify(previousSettingsRef.current)) {
          previousSettingsRef.current = newSettings;
          setSettings(newSettings);
        }
      } else {
        // Reset to defaults if content is sufficient
        const defaultSettings = {
          spacingMultiplier: 1,
          fontSizeMultiplier: 1,
        };
        
        if (JSON.stringify(defaultSettings) !== JSON.stringify(previousSettingsRef.current)) {
          previousSettingsRef.current = defaultSettings;
          setSettings(defaultSettings);
        }
      }
    };

    // Use a timeout to ensure DOM is fully rendered
    const timeoutId = setTimeout(calculateDensity, 100);

    // Observe size changes
    const resizeObserver = new ResizeObserver(() => {
      // Debounce recalculations
      clearTimeout(timeoutId);
      setTimeout(calculateDensity, 100);
    });

    resizeObserver.observe(columnRef.current);

    // Also observe the other column if provided
    if (opts.otherColumnRef?.current) {
      resizeObserver.observe(opts.otherColumnRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [opts.enabled, opts.emptyThreshold, opts.maxFontSizeRatio, opts.maxSpacing, columnRef, opts.otherColumnRef]);

  return settings;
}
