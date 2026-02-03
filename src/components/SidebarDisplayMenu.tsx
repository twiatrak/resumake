import React, { useState, useRef, useEffect } from 'react';
import { ListLayout, ListStyle } from '../hooks/useSidebarDisplayOptions';

interface SidebarDisplayMenuProps {
  layout: ListLayout;
  style: ListStyle;
  onLayoutChange: (layout: ListLayout) => void;
  onStyleChange: (style: ListStyle) => void;
  iconColor?: string;
}

const SidebarDisplayMenu: React.FC<SidebarDisplayMenuProps> = ({
  layout,
  style,
  onLayoutChange,
  onStyleChange,
  iconColor = '#4A90E2',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="relative print:hidden" style={{ zIndex: 10 }}>
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className="p-1.5 rounded-md hover:bg-black hover:bg-opacity-10 transition-colors"
        aria-label="Display options"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Display options"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M8 4.5C8.828 4.5 9.5 3.828 9.5 3C9.5 2.172 8.828 1.5 8 1.5C7.172 1.5 6.5 2.172 6.5 3C6.5 3.828 7.172 4.5 8 4.5ZM8 6.5C7.172 6.5 6.5 7.172 6.5 8C6.5 8.828 7.172 9.5 8 9.5C8.828 9.5 9.5 8.828 9.5 8C9.5 7.172 8.828 6.5 8 6.5ZM8 11.5C7.172 11.5 6.5 12.172 6.5 13C6.5 13.828 7.172 14.5 8 14.5C8.828 14.5 9.5 13.828 9.5 13C9.5 12.172 8.828 11.5 8 11.5Z"
            fill={iconColor}
          />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 py-2 px-3 min-w-[200px]"
          role="menu"
          aria-label="Display options menu"
          onKeyDown={handleKeyDown}
        >
          {/* Layout options */}
          <div className="mb-3" role="group" aria-labelledby="layout-label">
            <div id="layout-label" className="text-xs font-semibold text-gray-700 mb-1.5">
              Layout
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onLayoutChange('compact')}
                className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
                  layout === 'compact'
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                role="menuitemradio"
                aria-checked={layout === 'compact'}
              >
                Compact
              </button>
              <button
                onClick={() => onLayoutChange('relaxed')}
                className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
                  layout === 'relaxed'
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                role="menuitemradio"
                aria-checked={layout === 'relaxed'}
              >
                Relaxed
              </button>
            </div>
          </div>

          {/* List Style options */}
          <div role="group" aria-labelledby="style-label">
            <div id="style-label" className="text-xs font-semibold text-gray-700 mb-1.5">
              List Style {layout === 'compact' && <span className="text-[10px] text-gray-500">(Relaxed only)</span>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onStyleChange('bulleted')}
                disabled={layout === 'compact'}
                className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
                  style === 'bulleted' && layout === 'relaxed'
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : layout === 'compact'
                    ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                role="menuitemradio"
                aria-checked={style === 'bulleted'}
                title={layout === 'compact' ? 'Only applies to Relaxed layout' : 'Show bullet points'}
              >
                Bulleted
              </button>
              <button
                onClick={() => onStyleChange('plain')}
                disabled={layout === 'compact'}
                className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
                  style === 'plain' && layout === 'relaxed'
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : layout === 'compact'
                    ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                role="menuitemradio"
                aria-checked={style === 'plain'}
                title={layout === 'compact' ? 'Only applies to Relaxed layout' : 'No bullet points'}
              >
                Plain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SidebarDisplayMenu;
