import React from 'react';
import DOMPurify from 'dompurify';
import { CustomSection } from '../types/resume';
import { COLOR_SCHEMES } from '../config/customization';

interface CustomSectionProps {
  section: CustomSection;
  colorScheme: string;
  compact?: boolean;
  spacingMultiplier?: number;
  fontSizeMultiplier?: number;
  light?: boolean;
}

// Helper function to add sidebar-list class to ul tags in compact mode
const processCompactListHTML = (html: string): string => {
  return html.replace(/<ul>/gi, '<ul class="sidebar-list">');
};

const CustomSectionComponent: React.FC<CustomSectionProps> = ({ 
  section, 
  colorScheme, 
  compact = false,
  spacingMultiplier = 1,
  fontSizeMultiplier = 1,
  light = false,
}) => {
  const colors = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES];

  if (compact) {
    const textColorClass = light ? 'text-white' : 'text-gray-700';
    const titleColor = light ? 'white' : colors.primary;
    const safeContent = DOMPurify.sanitize(section.content);
    const processedContent = processCompactListHTML(safeContent);
    
    return (
      <section 
        className="mb-6 print:mb-4 section-block"
        style={{ 
          marginBottom: `calc(1.5rem * ${spacingMultiplier})`,
        }}
      >
        <h3
          className="text-sm font-semibold mb-3 uppercase tracking-wide print:text-xs print:mb-2"
          style={{ 
            color: titleColor,
            marginBottom: `calc(0.75rem * ${spacingMultiplier})`,
            fontSize: `calc(0.875rem * ${fontSizeMultiplier})`,
          }}
        >
          {section.title}
        </h3>
        <div 
          className={`text-xs leading-relaxed print:text-[10px] whitespace-pre-wrap ${textColorClass}`}
          style={{ 
            fontSize: `calc(0.75rem * ${fontSizeMultiplier})`,
            lineHeight: `calc(1.625 * ${spacingMultiplier})`,
          }}
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />
      </section>
    );
  }

  const safeContent = DOMPurify.sanitize(section.content);
  
  return (
    <section className="mb-6 print:mb-4 section-block">
      <h3
        className="text-lg font-semibold mb-3 uppercase tracking-wide border-b pb-1 print:text-base print:mb-2"
        style={{ color: colors.primary, borderColor: colors.accent }}
      >
        {section.title}
      </h3>
      <div className="text-sm text-gray-700 leading-relaxed print:text-xs whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: safeContent }} />
    </section>
  );
};

export default CustomSectionComponent;
