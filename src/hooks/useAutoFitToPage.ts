import { useEffect, RefObject } from 'react';

interface AutoFitOptions {
  enabled?: boolean;
  minFontScale?: number;
  minLeadingScale?: number;
  minSpacingScale?: number;
  fontStep?: number;
  leadingStep?: number;
  spacingStep?: number;
  minBlockPx?: number; // threshold for non-orphan logic
}
// excerpt: updated defaults + compression scales + applyCompressionScales

/* More assertive defaults to bias internal spacing over font-size */
const DEFAULT_OPTIONS: Required<AutoFitOptions> = {
  enabled: true,
  minFontScale: 0.90,
  minLeadingScale: 0.80,
  minSpacingScale: 0.50, // base floor used for spacing scales
  fontStep: 0.02,
  leadingStep: 0.02,
  spacingStep: 0.05,
  minBlockPx: 48,
};

// Easing to compress spacing faster than font
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInQuad = (t: number) => t * t;

/**
 * Map compression factor c [0..1] to controlled print variables.
 * We compress internal spacing most, section gaps a bit less, and font least.
 */
export function compressionToScales(
  c: number,
  minSpacing = 0.50,
  minLeading = 0.90,
  minFont = 0.92
): {
  spacing: number;         // kept for backward compatibility (maps to inside)
  inside: number;          // new: internal stack spacing (p/li/heading stacks)
  sectionGap: number;      // new: section-to-section gap
  leading: number;
  font: number;
} {
  const t = Math.max(0, Math.min(1, c));

  const inside = 1 - (1 - minSpacing) * easeOutCubic(t); // strongest
  const sectionGap = 1 - (1 - Math.max(minSpacing, 0.65)) * easeOutQuad(t); // gentler floor
  const leading = 1 - (1 - minLeading) * easeOutQuad(t); // medium
  const font = 1 - (1 - minFont) * easeInQuad(Math.min(1, t * 0.9)); // gentle

  return {
    spacing: inside,
    inside,
    sectionGap,
    leading,
    font,
  };
}

/**
 * Apply the compression scales to the DOM for measuring.
 * Adds inside/section-gap variables so CSS can compress differently.
 */
function applyCompressionScales(
  container: HTMLElement,
  c: number,
  minSpacing: number,
  minLeading: number,
  minFont: number
): void {
  const scales = compressionToScales(c, minSpacing, minLeading, minFont);
  // Back-compat + new, more granular variables:
  container.style.setProperty('--spacing-scale', scales.inside.toString());
  container.style.setProperty('--inside-spacing-scale', scales.inside.toString());
  container.style.setProperty('--section-gap-scale', scales.sectionGap.toString());
  container.style.setProperty('--leading-scale', scales.leading.toString());
  document.documentElement.style.setProperty('--font-scale', scales.font.toString());
}

// CSS px at 96dpi standard
const mmToPx = (mm: number) => (mm / 25.4) * 96;
const PAGE_HEIGHT_MM = 297;
const FALLBACK_PAGE_HEIGHT_PX = mmToPx(PAGE_HEIGHT_MM);

function getMaxPrintableHeightPx(container: HTMLElement): number {
  const h = container.clientHeight || container.offsetHeight;
  return h > 0 ? h : FALLBACK_PAGE_HEIGHT_PX;
}

function getContentElement(container: HTMLElement): HTMLElement {
  // Prefer a known inner wrapper if present
  return container.querySelector<HTMLElement>('.content') || container;
}

/**
 * Mark missing section elements so break-inside can apply uniformly.
 * We add .section-block.__auto to plausible top-level sections and clean them later.
 */
function tagSectionBlocks(container: HTMLElement) {
  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>(
      // common top-level blocks that represent sections
      'section, [data-section], .resume-section, .section'
    )
  );
  candidates.forEach((el) => {
    if (!el.classList.contains('section-block')) {
      el.classList.add('section-block', '__auto');
    }
  });
}

function clearAutoTaggedSections(container: HTMLElement) {
  container.querySelectorAll('.section-block.__auto').forEach((el) => {
    el.classList.remove('section-block', '__auto');
  });
}

/**
 * Binary search to find the minimal compression factor c that fits content on one page.
 * Returns the optimal c value in [0..1].
 */
export function binarySearchToFit(
  container: HTMLElement,
  maxHeight: number,
  minSpacing: number,
  minLeading: number,
  minFont: number,
  maxIterations = 15
): number {
  const measureEl = getContentElement(container);
  
  const contentFits = (c: number): boolean => {
    applyCompressionScales(container, c, minSpacing, minLeading, minFont);
    // Force reflow
    void measureEl.offsetHeight;
    return measureEl.scrollHeight <= maxHeight;
  };

  // Check if it fits without compression
  if (contentFits(0)) {
    return 0;
  }

  // Check if even full compression isn't enough
  if (!contentFits(1)) {
    return 1; // Allow 2+ pages but keep section integrity
  }

  // Binary search for minimal c
  let low = 0;
  let high = 1;
  let best = 1;

  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    if (contentFits(mid)) {
      best = mid;
      high = mid;
    } else {
      low = mid;
    }
    
    // Stop if the range is small enough
    if (high - low < 0.01) break;
  }

  return best;
}

/**
 * Applies page-break-before to sections that would orphan at page bottom,
 * without over-breaking.
 */
export function applyNonOrphanBreaks(
  container: HTMLElement,
  minBlockPx: number = DEFAULT_OPTIONS.minBlockPx
): void {
  const maxHeight = getMaxPrintableHeightPx(container);
  const cRect = container.getBoundingClientRect();

  // Clean previous temporary markers (only those we added)
  container.querySelectorAll('.page-break-before.__tmp').forEach((el) => {
    el.classList.remove('page-break-before', '__tmp');
  });

  const sections = container.querySelectorAll<HTMLElement>('.section-block');
  sections.forEach((section) => {
    const sRect = section.getBoundingClientRect();
    const relativeTop = sRect.top - cRect.top;

    // Normalize modulo for negative positions
    const positionOnPage = ((relativeTop % maxHeight) + maxHeight) % maxHeight;
    const distanceToBottom = maxHeight - positionOnPage;
    const sectionHeight = sRect.height;

    // If already near top of a page, don't force a break
    if (positionOnPage < 8) return;

    // Only break when the remainder is small AND the section truly can't fit.
    const TOLERANCE = 6; // break only when truly necessary
    const needsBreak =
      distanceToBottom < minBlockPx &&
      sectionHeight > distanceToBottom + TOLERANCE;

    if (needsBreak) {
      section.classList.add('page-break-before', '__tmp');
    }
  });
}

/** Remove temporary page-breaks and scaling vars */
export function clearAutoFitArtifacts(container: HTMLElement): void {
  container.querySelectorAll('.page-break-before.__tmp').forEach((el) => {
    el.classList.remove('page-break-before', '__tmp');
  });
  clearAutoTaggedSections(container);

  // Print-time variables
  document.documentElement.style.removeProperty('--font-scale');
  container.style.removeProperty('--leading-scale');
  container.style.removeProperty('--spacing-scale');
}

/**
 * Try to pull the next section onto page 1 if there is a large blank gap.
 * This only affects the first page and prevents the “Summary only” issue.
 */
function fitFirstPageToIncludeNextSection(
  container: HTMLElement,
  opts: Required<AutoFitOptions>
) {
  const maxHeight = getMaxPrintableHeightPx(container);
  const cRect = container.getBoundingClientRect();
  const sections = Array.from(container.querySelectorAll<HTMLElement>('.section-block'));
  if (sections.length === 0) return;

  // Find the first section that starts on page 1 but pushes its end to page 2.
  let nextSection: HTMLElement | null = null;
  for (const s of sections) {
    const r = s.getBoundingClientRect();
    const top = r.top - cRect.top;
    const bottom = r.bottom - cRect.top;

    if (top >= 0 && top < maxHeight && bottom > maxHeight) {
      nextSection = s;
      break;
    }
    if (top >= maxHeight) break; // past first page
  }
  if (!nextSection) return;

  // We want the bottom of nextSection to be <= maxHeight
  const measure = () => {
    const r = nextSection!.getBoundingClientRect();
    return r.bottom - cRect.top;
  };

  // Use binary search to find minimal compression for first page
  let low = 0;
  let high = 1;
  let best = 1;

  for (let i = 0; i < 15; i++) {
    const mid = (low + high) / 2;
    applyCompressionScales(container, mid, opts.minSpacingScale, opts.minLeadingScale, opts.minFontScale);
    void container.offsetHeight; // force reflow
    
    if (measure() <= maxHeight) {
      best = mid;
      high = mid;
    } else {
      low = mid;
    }

    if (high - low < 0.01) break;
  }

  // Apply best compression
  applyCompressionScales(container, best, opts.minSpacingScale, opts.minLeadingScale, opts.minFontScale);
}

/**
 * Uses binary search to reclaim space efficiently: spacing -> line-height -> font-size
 * until the entire content fits on one page or minimums are reached.
 */
export function autoFitToOnePage(
  containerRef: RefObject<HTMLElement | null>,
  setFontScale?: (scale: number) => void,
  options: AutoFitOptions = {}
): { success: boolean; compressionFactor: number } {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const container = containerRef.current;
  if (!container || !opts.enabled) return { success: false, compressionFactor: 0 };

  const maxHeight = getMaxPrintableHeightPx(container);

  // Use binary search to find minimal compression
  const c = binarySearchToFit(
    container,
    maxHeight,
    opts.minSpacingScale,
    opts.minLeadingScale,
    opts.minFontScale
  );

  // Apply the final compression
  applyCompressionScales(
    container,
    c,
    opts.minSpacingScale,
    opts.minLeadingScale,
    opts.minFontScale
  );

  if (setFontScale) {
    const scales = compressionToScales(c, opts.minSpacingScale, opts.minLeadingScale, opts.minFontScale);
    setFontScale(scales.font);
  }

  const measureEl = getContentElement(container);
  return {
    success: measureEl.scrollHeight <= maxHeight,
    compressionFactor: c,
  };
}

/**
 * Hook: runs on print preview (Ctrl/Cmd+P) and on button-triggered print.
 * Uses both beforeprint/afterprint and matchMedia('print') for robustness.
 */
export function useAutoFitToPage(
  containerRef: RefObject<HTMLElement | null>,
  options: {
    autoFitEnabled?: boolean;
    nonOrphanEnabled?: boolean;
    minFontScale?: number;
    minLeadingScale?: number;
    minSpacingScale?: number;
    minBlockPx?: number;
    manualCompressionFactor?: number; // optional manual override
  } = {}
): void {
  const {
    autoFitEnabled = true,
    nonOrphanEnabled = true,
    minFontScale = DEFAULT_OPTIONS.minFontScale,
    minLeadingScale = DEFAULT_OPTIONS.minLeadingScale,
    minSpacingScale = DEFAULT_OPTIONS.minSpacingScale,
    minBlockPx = DEFAULT_OPTIONS.minBlockPx,
    manualCompressionFactor,
  } = options;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Apply manual compression if provided (for live preview)
    if (manualCompressionFactor !== undefined) {
      applyCompressionScales(container, manualCompressionFactor, minSpacingScale, minLeadingScale, minFontScale);
    }

    // Run in next frame so print CSS has applied in preview.
    const before = () => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          tagSectionBlocks(container);

          // If manual compression is set, use it; otherwise auto-fit
          if (manualCompressionFactor !== undefined) {
            applyCompressionScales(container, manualCompressionFactor, minSpacingScale, minLeadingScale, minFontScale);
          } else {
            // Compact the first page to avoid a large blank after SUMMARY
            fitFirstPageToIncludeNextSection(container, {
              ...DEFAULT_OPTIONS,
              minFontScale,
              minLeadingScale,
              minSpacingScale,
            });
          }

          if (nonOrphanEnabled) {
            applyNonOrphanBreaks(container, minBlockPx);
          }
          if (autoFitEnabled && manualCompressionFactor === undefined) {
            autoFitToOnePage(containerRef, undefined, {
              enabled: true,
              minFontScale,
              minLeadingScale,
              minSpacingScale,
              minBlockPx,
            });
          }
        }, 0);
      });
    };

    const after = () => {
      clearAutoFitArtifacts(container);
    };

    const onBeforePrint = () => before();
    const onAfterPrint = () => after();

    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);

    // Fallback & live preview reaction (Chrome/Safari)
    const m = typeof window.matchMedia === 'function' ? window.matchMedia('print') : null;
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) before();
      else after();
    };
    if (m) {
      if (typeof m.addEventListener === 'function') {
        m.addEventListener('change', onChange as any);
      } else if (typeof m.addListener === 'function') {
        m.addListener(onChange as any);
      }
    }

    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
      if (m) {
        if (typeof m.removeEventListener === 'function') {
          m.removeEventListener('change', onChange as any);
        } else if (typeof m.removeListener === 'function') {
          m.removeListener(onChange as any);
        }
      }
    };
  }, [
    containerRef,
    autoFitEnabled,
    nonOrphanEnabled,
    minFontScale,
    minLeadingScale,
    minSpacingScale,
    minBlockPx,
    manualCompressionFactor,
  ]);
}
