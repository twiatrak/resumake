import React from 'react';

interface SidebarListProps {
  items: string[];
  className?: string;
  itemClassName?: string;
}

/**
 * SidebarList - A reusable component for rendering lists in the sidebar
 * 
 * This component automatically adapts to the global sidebar display settings:
 * - Layout (Compact/Relaxed) controlled via data-sidebar-layout attribute on parent [data-sidebar]
 * - Style (Bulleted/Plain) controlled via data-sidebar-style attribute on parent [data-sidebar]
 * 
 * In Compact layout: Items are displayed inline with comma separators
 * In Relaxed layout: Items are stacked vertically, with or without bullets based on style
 * 
 * Usage:
 * ```tsx
 * <SidebarList items={['Item 1', 'Item 2', 'Item 3']} />
 * ```
 * 
 * For custom sections to adopt this behavior, wrap lists in a [data-sidebar] element
 * and ensure the list has the "sidebar-list" class.
 * 
 * To opt out of global display settings (e.g., for Contact section), add data-sidebar-exempt="true"
 * to the parent section element:
 * ```tsx
 * <section data-sidebar-exempt="true">
 *   <h3>Contact</h3>
 *   <SidebarList items={contactItems} />
 * </section>
 * ```
 */
const SidebarList: React.FC<SidebarListProps> = ({ 
  items, 
  className = '',
  itemClassName = ''
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <ul className={`sidebar-list ${className}`.trim()}>
      {items.map((item, index) => (
        <li key={index} className={itemClassName}>
          {item}
        </li>
      ))}
    </ul>
  );
};

export default SidebarList;
