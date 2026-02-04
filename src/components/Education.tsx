import React from 'react';
import { Education as EducationType } from '../types/resume';
import { COLOR_SCHEMES } from '../config/customization';

interface EducationProps {
  education: EducationType[];
  colorScheme?: string;
  compact?: boolean;
  spacingMultiplier?: number;
  fontSizeMultiplier?: number;
  light?: boolean;
}

const Education: React.FC<EducationProps> = ({ 
  education, 
  colorScheme = 'blue',
  compact = false,
  spacingMultiplier = 1,
  fontSizeMultiplier = 1,
  light = false,
}) => {
  const colors = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES];

  if (compact) {
    const textColorClass = light ? 'text-white' : 'text-gray-700';
    const secondaryTextColorClass = light ? 'text-white/90' : 'text-gray-600';
    const titleColor = light ? 'white' : colors.primary;
    
    return (
      <section 
        className="mb-6 section-block"
        style={{ marginBottom: `calc(1.25rem * ${spacingMultiplier})` }}
      >
        <h3
          className="text-sm font-semibold mb-3 uppercase tracking-wide"
          style={{ 
            color: titleColor,
            marginBottom: `calc(0.6rem * ${spacingMultiplier})`,
            fontSize: `calc(0.95rem * ${fontSizeMultiplier})`,
          }}
        >
          Education
        </h3>
        <div className="space-y-2" style={{ gap: `${0.4 * spacingMultiplier}em` }}>
          {education.map((edu, index) => (
            <div key={index}>
              <div className="flex justify-between items-baseline" style={{ marginBottom: `calc(0.25rem * ${spacingMultiplier})` }}>
                <h4
                  className={`font-semibold text-xs ${textColorClass}`}
                  style={{ fontSize: `calc(0.82rem * ${fontSizeMultiplier})`, color: titleColor }}
                >
                  {edu.institution}
                </h4>
                <div
                  className={`text-[0.65rem] ${secondaryTextColorClass}`}
                  style={{ fontSize: `calc(0.66rem * ${fontSizeMultiplier})` }}
                >
                  {edu.startDate} - {edu.endDate}
                </div>
              </div>
              <div
                className={`text-[0.72rem] ${secondaryTextColorClass}`}
                style={{ fontSize: `calc(0.74rem * ${fontSizeMultiplier})` }}
              >
                {edu.degree} in {edu.field}
              </div>
              {edu.description && (
                <div
                  className={`text-[0.68rem] ${textColorClass} sidebar-education-description`}
                  style={{
                    fontSize: `calc(0.68rem * ${fontSizeMultiplier})`,
                    lineHeight: `calc(1.28 * ${spacingMultiplier})`,
                    marginTop: `calc(0.05rem * ${spacingMultiplier})`,
                    marginLeft: 0,
                    paddingLeft: 0,
                    textIndent: 0,
                    maxWidth: '100%',
                  }}
                >
                  {edu.description
                    .replace(/[•·]/g, ' ')
                    .split(/\n+|;\s+/)
                    .map(t => t.trim().replace(/^[-]+\s*/, ''))
                    .filter(Boolean)
                    .join(' ')
                    .replace(/\s{2,}/g, ' ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Main area: spacing mirrors Experience for homogeneity
  return (
    <section className="mb-6 section-block" data-area="main">
      <h3
        className="text-lg font-semibold mb-3 uppercase tracking-wide border-b pb-1"
        style={{ color: colors.primary, borderColor: colors.accent }}
      >
        Education
      </h3>
      <div className="space-y-3">
        {education.map((edu, index) => (
          <div key={index}>
            <div className="flex justify-between items-baseline" style={{ marginBottom: '0.25rem' }}>
              <div>
                <h4 className="font-semibold" style={{ color: colors.primary }}>{edu.institution}</h4>
                <div className="text-sm text-gray-700">{edu.degree} in {edu.field}</div>
              </div>
              <div className="text-sm text-gray-600">{edu.startDate} - {edu.endDate}</div>
            </div>
            {edu.description && (
              <ul className="list-disc list-inside text-sm text-gray-700">
                {edu.description.split(/\n+|;\s+|·\s+|•\s+/).filter(Boolean).map((t, i) => (
                  <li key={i} style={{ marginBlock: '0.25rem' }}>{t.trim()}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default Education;
