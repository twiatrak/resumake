import { useEffect, useState, RefObject } from 'react';

interface PageOverflowResult {
  isOverflowing: boolean;
  contentHeight: number;
  maxHeight: number;
  overflowPercentage: number;
}

/**
 * Hook to detect if content overflows the A4 page height
 * A4 dimensions: 210mm x 297mm
 * With 0.5cm (5mm) margins on all sides, the content area is:
 * Width: 200mm, Height: 287mm
 */
export function usePageOverflow(
  containerRef: RefObject<HTMLElement | null>,
  options: {
    enabled?: boolean;
    checkInterval?: number; // ms to check for overflow
  } = {}
): PageOverflowResult {
  const { enabled = true, checkInterval = 500 } = options;
  
  const [overflowState, setOverflowState] = useState<PageOverflowResult>({
    isOverflowing: false,
    contentHeight: 0,
    maxHeight: 0,
    overflowPercentage: 0,
  });

  useEffect(() => {
    if (!enabled || !containerRef.current) {
      return;
    }

    const checkOverflow = () => {
      const container = containerRef.current;
      if (!container) return;

      // The container has a fixed height, and we need to check if the inner content overflows
      // We look for the first child div which contains the actual content
      const innerContent = container.querySelector('div');
      
      if (!innerContent) return;

      // Get the container's fixed height
      const containerHeight = container.offsetHeight;
      // Get the actual content height (including overflow)
      const contentHeight = innerContent.scrollHeight;
      
      // Calculate if content is overflowing
      const isOverflowing = contentHeight > containerHeight;
      const overflowAmount = Math.max(0, contentHeight - containerHeight);
      const overflowPercentage = containerHeight > 0 
        ? Math.round((overflowAmount / containerHeight) * 100) 
        : 0;

      setOverflowState({
        isOverflowing,
        contentHeight,
        maxHeight: containerHeight,
        overflowPercentage,
      });
    };

    // Initial check
    checkOverflow();

    // Set up interval for periodic checks
    const intervalId = setInterval(checkOverflow, checkInterval);

    // Set up ResizeObserver for responsive checks
    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(containerRef.current);

    // Also observe mutations in the container
    const mutationObserver = new MutationObserver(checkOverflow);
    mutationObserver.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    return () => {
      clearInterval(intervalId);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [enabled, containerRef, checkInterval]);

  return overflowState;
}
