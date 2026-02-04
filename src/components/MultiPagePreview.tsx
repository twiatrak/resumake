import React, { useEffect, useState, useRef } from 'react';

interface MultiPagePreviewProps {
  children: React.ReactNode;
}

interface SingleColumnPage {
  pageNumber: number;
  isTwoColumn: false;
  content: string;
}

interface TwoColumnPage {
  pageNumber: number;
  isTwoColumn: true;
  preludeContent?: string; // Full-width header/prelude content (only on page 1)
  sidebarContent: string;
  mainContent: string;
  sidebarWidth: string;
  mainWidth: string;
  sidebarBg: string;
  sidebarPadding: string;
  mainPadding: string;
  dataSidebarPresent: boolean;
  dataSidebarLayout: string | null;
  dataSidebarStyle: string | null;
}

type Page = SingleColumnPage | TwoColumnPage;

type BlockItem = {
  el: HTMLElement;
  html: string;
  height: number; // outer height incl. margins
};

type PageBin = {
  items: BlockItem[];
  total: number;
};

const A4_HEIGHT_MM = 297;

/* --------- measurement helpers ---------- */

function mmToPx(mm: number, host: HTMLElement): number {
  const ruler = document.createElement('div');
  ruler.style.height = `${mm}mm`;
  ruler.style.position = 'absolute';
  ruler.style.visibility = 'hidden';
  host.appendChild(ruler);
  const px = ruler.offsetHeight;
  host.removeChild(ruler);
  return px;
}

function parseMm(val: string | null | undefined, fallbackMm = 0): number {
  if (!val) return fallbackMm;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : fallbackMm;
}

function readCssVar(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}



function blockOuterHeight(el: HTMLElement): number {
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const mt = parseFloat(cs.marginTop) || 0;
  const mb = parseFloat(cs.marginBottom) || 0;
  // Ceil to avoid under-measurement from subpixels
  return Math.ceil(rect.height + mt + mb);
}

/* --------- packing & backfill ---------- */

function packBlocks(blocks: HTMLElement[], available: number): PageBin[] {
  const pages: PageBin[] = [];
  let cur: PageBin = { items: [], total: 0 };

  for (const el of blocks) {
    const item: BlockItem = { el, html: el.outerHTML, height: blockOuterHeight(el) };
    const TOL = 0.5; // was 1

    if (cur.items.length > 0 && (cur.total + item.height > available - TOL)) {
      pages.push(cur);
      cur = { items: [item], total: item.height };
    } else {
      cur.items.push(item);
      cur.total += item.height;
    }
  }
  if (cur.items.length > 0) pages.push(cur);
  return pages;
}

function backfillPages(bins: PageBin[], available: number): PageBin[] {
  // shallow copy to avoid mutating the original arrays
  const pages = bins.map(b => ({ items: [...b.items], total: b.total }));
  const TOL = 0.5; // was 1

  for (let i = 0; i < pages.length - 1; i++) {
    const cur = pages[i];
    const next = pages[i + 1];

    // Move as many top items as possible from next to current
    while (next.items.length > 0) {
      const candidate = next.items[0];
      if (cur.total + candidate.height <= available - TOL) {
        cur.items.push(candidate);
        cur.total += candidate.height;
        next.items.shift();
        next.total -= candidate.height;
      } else {
        break;
      }
    }

    // Remove empty next page and re-evaluate with the new neighbor
    if (next.items.length === 0) {
      pages.splice(i + 1, 1);
      i -= 1;
    }
  }
  return pages;
}

/* --------- component ---------- */

// Development guard: check preview/print parity
function checkPreviewPrintParity(hostEl: HTMLElement): void {
  // Skip in production - use import.meta.env for Vite
  if (import.meta.env.PROD) return;

  const testBlock = document.createElement('div');
  testBlock.textContent = 'Test block for parity check';
  testBlock.style.padding = '1rem';
  testBlock.style.marginTop = '0.5rem';
  testBlock.style.marginBottom = '0.5rem';
  testBlock.style.lineHeight = '1.5';
  hostEl.appendChild(testBlock);

  // Measure with normalization
  const sheetWrapper = document.createElement('div');
  sheetWrapper.className = 'paged-normalize';
  sheetWrapper.appendChild(testBlock.cloneNode(true));
  hostEl.appendChild(sheetWrapper);
  const normalizedHeight = blockOuterHeight(sheetWrapper.firstChild as HTMLElement);
  hostEl.removeChild(sheetWrapper);

  // Measure without normalization
  const rawHeight = blockOuterHeight(testBlock);
  hostEl.removeChild(testBlock);

  const diff = Math.abs(normalizedHeight - rawHeight);
  const threshold = 2; // Allow 2px difference

  if (diff > threshold) {
    console.warn(
      `[MultiPagePreview] Preview/print parity check: measurement difference ${diff.toFixed(2)}px exceeds threshold ${threshold}px. ` +
      `This may cause preview and print to pack differently.`
    );
  }
}

const MultiPagePreview: React.FC<MultiPagePreviewProps> = ({ children }) => {
  const [pages, setPages] = useState<Page[]>([]);
  const hiddenHostRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const resumeRootRef = useRef<HTMLElement | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    resumeRootRef.current = document.querySelector('#resume') as HTMLElement | null;
    
    // Wait for fonts to load before first layout
    document.fonts.ready.then(() => {
      setFontsReady(true);
      // Run parity check in development
      if (hiddenHostRef.current) {
        checkPreviewPrintParity(hiddenHostRef.current);
      }
    });
  }, []);

  // Apply preview rem parity: add paged-root-scale class to match print's @media rule
  useEffect(() => {
    const root = document.documentElement;
    
    // Add class to enable root font-size scaling
    root.classList.add('paged-root-scale');
    
    // Remove class on unmount to restore normal behavior
    return () => {
      root.classList.remove('paged-root-scale');
    };
  }, []);

  useEffect(() => {
    if (!fontsReady) return;
    
    layout();

    // Re-layout on compression or template attribute changes
    const targets: (Node | null)[] = [
      resumeRootRef.current,
      document.documentElement,
      contentRef.current,
    ];
    const observer = new MutationObserver((mutations) => {
      const previewEl = previewRef.current;
      if (previewEl && mutations.length > 0) {
        const allInPreview = mutations.every(m => {
          const target = m.target as Node;
          return previewEl.contains(target);
        });
        if (allInPreview) return;
      }
      requestAnimationFrame(layout);
    });
    for (const t of targets) {
      if (!t) continue;
      observer.observe(t, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'data-sidebar-layout', 'data-sidebar-style'],
      });
    }
    window.addEventListener('resize', layout);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', layout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, fontsReady]);

  useEffect(() => {
    const previewEl = previewRef.current;
    if (!previewEl) return;

    const onToggle = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const label = target.closest('[data-skill-toggle]') as HTMLElement | null;
      if (!label) return;
      const container = label.closest('.skills-toggle') as HTMLElement | null;
      if (!container) return;
      const key = container.getAttribute('data-skill-key');
      if (!key) return;

      container.classList.toggle('skills-toggle--compact');
      const sourceRoot = contentRef.current;
      if (sourceRoot) {
        const sourceMatch = sourceRoot.querySelector(`.skills-toggle[data-skill-key="${key}"]`) as HTMLElement | null;
        if (sourceMatch) {
          sourceMatch.classList.toggle('skills-toggle--compact');
        }
      }
      event.preventDefault();
    };

    previewEl.addEventListener('click', onToggle);
    return () => {
      previewEl.removeEventListener('click', onToggle);
    };
  }, [pages]);

  function computeAvailableHeightPx(source: HTMLElement): number {
    if (!hiddenHostRef.current) return 0;

    const pageHeightPx = mmToPx(A4_HEIGHT_MM, hiddenHostRef.current);

    // Sidebar -> zero inner padding (frame off), else use var or default 6mm
    const hasSidebar = !!source.querySelector('[data-sidebar], .sidebar');
    const root = resumeRootRef.current || document.documentElement;
    const varVal = readCssVar(root, '--page-padding') || '6mm';
    const paddingMm = hasSidebar ? 0 : parseMm(varVal, 6);
    const paddingPx = (paddingMm / A4_HEIGHT_MM) * pageHeightPx;

    return Math.max(0, pageHeightPx - 2 * paddingPx);
  }

  /**
   * Get blocks for packing from a container.
   * Returns all direct children in DOM order, excluding SCRIPT/STYLE tags.
   * This ensures non-marked blocks (like headers) are included in packing.
   */
  function columnBlocks(container: HTMLElement): HTMLElement[] {
    const children = Array.from(container.children) as HTMLElement[];
    // Filter out SCRIPT and STYLE elements only
    return children.filter(el => {
      const tag = el.tagName.toUpperCase();
      return tag !== 'SCRIPT' && tag !== 'STYLE';
    });
  }


  /**
   * Detect and collect prelude blocks that appear before the two-column wrapper
   * and also blocks inside the wrapper that precede the columns.
   * Returns: { preludeHtml, preludeHeight, rowWrapper }
   */
  function detectPrelude(source: HTMLElement): { preludeHtml: string; preludeHeight: number; rowWrapper: HTMLElement | null } {
    // Find the row wrapper that contains sidebar and main columns
    const sidebarContainer = source.querySelector('[data-sidebar], .sidebar') as HTMLElement | null;
    const rowWrapper = sidebarContainer?.parentElement || null;
    const mainContainer = rowWrapper?.querySelector('[data-area="main"]') as HTMLElement | null;
    
    if (!sidebarContainer || !mainContainer || !rowWrapper) {
      return { preludeHtml: '', preludeHeight: 0, rowWrapper: null };
    }

    // 1) Prelude OUTSIDE the row wrapper (siblings before it)
    const preludeOuter: HTMLElement[] = [];
    let node: Element | null = rowWrapper.previousElementSibling;
    while (node) {
      preludeOuter.unshift(node as HTMLElement);
      node = node.previousElementSibling;
    }

    // 2) Prelude INSIDE the row wrapper, before the first column container
    const preludeInner: HTMLElement[] = [];
    let child: Element | null = rowWrapper.firstElementChild;
    while (child) {
      const el = child as HTMLElement;
      if (el.matches('[data-sidebar], .sidebar, [data-area="main"]')) break;
      preludeInner.push(el);
      child = child.nextElementSibling;
    }

    const preludeElements = [...preludeOuter, ...preludeInner];
    if (preludeElements.length === 0) {
      return { preludeHtml: '', preludeHeight: 0, rowWrapper };
    }

    let totalHeight = 0;
    for (const el of preludeElements) {
      totalHeight += blockOuterHeight(el);
    }

    const preludeHtml = preludeElements.map(el => el.outerHTML).join('\n');
    return { preludeHtml, preludeHeight: totalHeight, rowWrapper };
  }



  function layout() {
    if (!hiddenHostRef.current) return;
    const source = contentRef.current;
    if (!source) return;

    // Apply compression variables to the hidden measurement source
    const root = resumeRootRef.current || document.documentElement;
    const compressionVars = [
      '--font-scale',
      '--leading-scale',
      '--spacing-scale',
      '--inside-spacing-scale',
      '--section-gap-scale',
    ];
    for (const varName of compressionVars) {
      const value = readCssVar(root, varName);
      if (value) {
        source.style.setProperty(varName, value);
      }
    }

    const availableHeight = computeAvailableHeightPx(source);

    // Two-column? Find sidebar first, then get main from same parent to avoid prelude confusion
    const sidebarContainer = source.querySelector('[data-sidebar], .sidebar') as HTMLElement | null;
    const mainContainer = sidebarContainer?.parentElement?.querySelector('[data-area="main"]') as HTMLElement | null;

    const canTwoCol =
      !!sidebarContainer &&
      !!mainContainer &&
      !!sidebarContainer.parentElement?.offsetWidth;

    if (canTwoCol) {
      const sidebarComputedStyle = window.getComputedStyle(sidebarContainer);
      const mainComputedStyle = window.getComputedStyle(mainContainer);

      const sidebarBg = sidebarComputedStyle.backgroundColor;
      const sidebarPadding = sidebarComputedStyle.padding;
      const mainPadding = mainComputedStyle.padding;

      const parentWidth = sidebarContainer.parentElement!.offsetWidth;
      const sidebarWidthPercent = ((sidebarContainer.offsetWidth / parentWidth) * 100).toFixed(2) + '%';
      const mainWidthPercent = ((mainContainer.offsetWidth / parentWidth) * 100).toFixed(2) + '%';

      // Detect prelude content (outside and inside the row wrapper) and measure its height
      const { preludeHtml, preludeHeight } = detectPrelude(source);

      // Use atomic blocks per column (now includes non-section children, e.g., headline inside main)
      const sidebarBlocks = columnBlocks(sidebarContainer);
      const mainBlocks = columnBlocks(mainContainer);

      // For page 1, subtract prelude height from available space
      const page1Height = Math.max(0, availableHeight - preludeHeight);
      
      // Pack with adjusted height for page 1
      let sidebarPages = packBlocks(sidebarBlocks, page1Height);
      let mainPages = packBlocks(mainBlocks, page1Height);

      // If content spilled to page 2+, repack those pages with full height
      if (sidebarPages.length > 1) {
        const firstPage = sidebarPages[0];
        const remainingBlocks = sidebarBlocks.slice(firstPage.items.length);
        const restPages = packBlocks(remainingBlocks, availableHeight);
        sidebarPages = [firstPage, ...restPages];
      }
      if (mainPages.length > 1) {
        const firstPage = mainPages[0];
        const remainingBlocks = mainBlocks.slice(firstPage.items.length);
        const restPages = packBlocks(remainingBlocks, availableHeight);
        mainPages = [firstPage, ...restPages];
      }

      // Backfill for page 1 (with reduced height)
      if (sidebarPages.length > 1) {
        const TOL = 0.5; // was 1
        const page1 = sidebarPages[0];
        const page2 = sidebarPages[1];
        while (page2.items.length > 0) {
          const candidate = page2.items[0];
          if (page1.total + candidate.height <= page1Height - TOL) {
            page1.items.push(candidate);
            page1.total += candidate.height;
            page2.items.shift();
            page2.total -= candidate.height;
          } else {
            break;
          }
        }
        if (page2.items.length === 0) {
          sidebarPages.splice(1, 1);
        }
      }

      if (mainPages.length > 1) {
        const TOL = 0.5; // was 1
        const page1 = mainPages[0];
        const page2 = mainPages[1];
        while (page2.items.length > 0) {
          const candidate = page2.items[0];
          if (page1.total + candidate.height <= page1Height - TOL) {
            page1.items.push(candidate);
            page1.total += candidate.height;
            page2.items.shift();
            page2.total -= candidate.height;
          } else {
            break;
          }
        }
        if (page2.items.length === 0) {
          mainPages.splice(1, 1);
        }
      }

      // Backfill for remaining pages (with full height)
      if (sidebarPages.length > 1) {
        const restPages = backfillPages(sidebarPages.slice(1), availableHeight);
        sidebarPages = [sidebarPages[0], ...restPages];
      }
      if (mainPages.length > 1) {
        const restPages = backfillPages(mainPages.slice(1), availableHeight);
        mainPages = [mainPages[0], ...restPages];
      }

      const maxPages = Math.max(sidebarPages.length, mainPages.length);
      const dataSidebarLayout = sidebarContainer.getAttribute('data-sidebar-layout');
      const dataSidebarStyle = sidebarContainer.getAttribute('data-sidebar-style');

      const next: Page[] = [];
      for (let i = 0; i < maxPages; i++) {
        const s = sidebarPages[i];
        const m = mainPages[i];
        next.push({
          pageNumber: i + 1,
          isTwoColumn: true,
          preludeContent: i === 0 ? preludeHtml : undefined, // Only on page 1
          sidebarContent: s ? s.items.map(it => it.html).join('\n') : '',
          mainContent: m ? m.items.map(it => it.html).join('\n') : '',
          sidebarWidth: sidebarWidthPercent,
          mainWidth: mainWidthPercent,
          sidebarBg,
          sidebarPadding,
          mainPadding,
          dataSidebarPresent: true,
          dataSidebarLayout,
          dataSidebarStyle,
        });
      }
      setPages(next);
      return;
    }

    // Single-column fallback: detect main content container and use its children for pagination
    const mainRoot = source.querySelector('[data-area="main"]') as HTMLElement | null;
    const blocks = columnBlocks(mainRoot || source);
    if (blocks.length === 0) {
      setPages([{ content: source.innerHTML, pageNumber: 1, isTwoColumn: false }]);
      return;
    }

    let bins = packBlocks(blocks, availableHeight);
    bins = backfillPages(bins, availableHeight);

    const next: Page[] = [];
    for (let i = 0; i < bins.length; i++) {
      next.push({
        pageNumber: i + 1,
        isTwoColumn: false,
        content: bins[i].items.map(it => it.html).join('\n'),
      });
    }
    setPages(next);
  }

  return (
    <>
      {/* Hidden offscreen host for measurement */}
      <div
        ref={hiddenHostRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '210mm',
          visibility: 'hidden',
        }}
      >
        <div ref={contentRef} className="paged-normalize" data-measure-source>
          {children}
        </div>
      </div>

      {/* Visible multi-page preview */}
      <div ref={previewRef} className="flex flex-col items-center gap-6">
        {pages.map((page) => {
          const isTwoCol = page.isTwoColumn;
          // Remove frame when a sidebar is present
          const pagePadding = isTwoCol ? '0mm' : 'var(--page-padding)';

          // Apply page 1 compression variables if present
          const pageStyles: Record<string, string | number> = {
            width: '210mm',
            height: '297mm',
            overflow: 'hidden',
            padding: pagePadding,
            boxSizing: 'border-box',
          };

          return (
            <div
              key={page.pageNumber}
              className="paged-normalize relative bg-white shadow-lg"
              style={pageStyles}
            >
              {isTwoCol ? (
                <>
                  {/* Prelude content (only on page 1) */}
                  {page.preludeContent && (
                    <div
                      className="prelude-content"
                      style={{ width: '100%' }}
                      dangerouslySetInnerHTML={{ __html: page.preludeContent }}
                    />
                  )}
                  {/* Two-column layout */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      width: '100%',
                      height: page.preludeContent ? 'auto' : '100%',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      data-sidebar=""
                      data-sidebar-layout={page.dataSidebarLayout ?? undefined}
                      data-sidebar-style={page.dataSidebarStyle ?? undefined}
                      style={{
                        flexBasis: page.sidebarWidth,
                        flexShrink: 0,
                        backgroundColor: page.sidebarBg,
                        padding: page.sidebarPadding,
                        overflow: 'hidden',
                      }}
                      dangerouslySetInnerHTML={{ __html: page.sidebarContent }}
                    />
                    <div
                      data-area="main"
                      style={{
                        flexBasis: page.mainWidth,
                        flexShrink: 0,
                        padding: page.mainPadding,
                        overflow: 'hidden',
                      }}
                      dangerouslySetInnerHTML={{ __html: page.mainContent }}
                    />
                  </div>
                </>
              ) : (
                <div
                  dangerouslySetInnerHTML={{ __html: (page as SingleColumnPage).content }}
                  style={{ width: '100%', height: '100%', overflow: 'hidden' }}
                />
              )}
              <div
                className="absolute bottom-2 right-4 text-xs text-gray-400"
                style={{ fontSize: '10px' }}
              >
                Page {page.pageNumber}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default MultiPagePreview;
