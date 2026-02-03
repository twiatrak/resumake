import React from 'react';
import { Experience as ExperienceType } from '../types/resume';
import { COLOR_SCHEMES } from '../config/customization';

interface ExperienceProps {
  experiences: ExperienceType[];
  colorScheme?: string;
  compact?: boolean;
  spacingMultiplier?: number;
  fontSizeMultiplier?: number;
  light?: boolean;
}

const Experience: React.FC<ExperienceProps> = ({ 
  experiences, 
  colorScheme = 'blue',
  compact = false,
  spacingMultiplier = 1,
  fontSizeMultiplier = 1,
  light = false,
}) => {
  const colors = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES];

  if (compact) {
    const textColorClass = light ? 'text-white' : 'text-gray-700';
    const secondaryTextColorClass = light ? 'text-white' : 'text-gray-600';
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
            fontSize: `calc(0.875rem * ${fontSizeMultiplier})`,
          }}
        >
          Experience
        </h3>
        <div className="space-y-3" style={{ gap: `${0.9 * spacingMultiplier}em` }}>
          {experiences.map((exp, index) => (
            <div key={index}>
              <div className="flex justify-between items-baseline" style={{ marginBottom: `calc(0.25rem * ${spacingMultiplier})` }}>
                <h4 
                  className={`text-xs font-bold ${textColorClass}`}
                  style={{ fontSize: `calc(0.78rem * ${fontSizeMultiplier})`, color: titleColor }}
                >
                  {exp.position}
                </h4>
                <div className={`text-[0.68rem] ${secondaryTextColorClass}`}>{exp.startDate} - {exp.endDate}</div>
              </div>
              <div className={`text-xs ${textColorClass}`} style={{ fontSize: `calc(0.74rem * ${fontSizeMultiplier})`, marginBottom: `calc(0.25rem * ${spacingMultiplier})` }}>
                {exp.company}
              </div>
              <ul 
                className={`list-disc list-inside text-xs ${textColorClass}`}
                style={{ 
                  fontSize: `calc(0.72rem * ${fontSizeMultiplier})`,
                  lineHeight: `calc(1.5 * ${spacingMultiplier})`,
                }}
              >
                {exp.highlights.map((highlight, idx) => (
                  <li key={idx} style={{ marginBlock: `calc(0.25rem * ${spacingMultiplier})` }}>{highlight}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Main area: keep spacing homogeneous with Education
  return (
    <section className="mb-6 section-block" data-area="main">
      <h3
        className="text-lg font-semibold mb-3 uppercase tracking-wide border-b pb-1"
        style={{ color: colors.primary, borderColor: colors.accent }}
      >
        Experience
      </h3>
      <div className="space-y-3">
        {experiences.map((exp, index) => (
          <div key={index}>
            <div className="flex justify-between items-baseline" style={{ marginBottom: '0.25rem' }}>
              <div>
                <h4 className="text-base font-bold" style={{ color: colors.primary }}>{exp.position}</h4>
                <div className="text-sm text-gray-700">{exp.company}</div>
              </div>
              <div className="text-sm text-gray-600">{exp.startDate} - {exp.endDate}</div>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-700">
              {exp.highlights.map((h, i) => (
                <li key={i} style={{ marginBlock: '0.25rem' }}>{h}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Experience;
