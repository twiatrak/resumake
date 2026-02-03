import React from 'react';
import { Skills as SkillsType } from '../types/resume';
import { COLOR_SCHEMES } from '../config/customization';
import SidebarList from './SidebarList';

interface SkillsProps {
  skills: SkillsType;
  colorScheme?: string;
  compact?: boolean;
  spacingMultiplier?: number;
  fontSizeMultiplier?: number;
  light?: boolean;
}

const Skills: React.FC<SkillsProps> = ({ 
  skills, 
  colorScheme = 'blue', 
  compact = false,
  spacingMultiplier = 1,
  fontSizeMultiplier = 1,
  light = false,
}) => {
  const colors = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES];

  const dynamicSpacing = `${spacingMultiplier}em`;
  const dynamicFontSize = fontSizeMultiplier;

  if (compact) {
    const textColorClass = light ? 'text-white' : 'text-gray-700';
    const titleColor = light ? 'white' : colors.primary;
    const labelColorClass = light ? 'text-white' : 'text-gray-800';
    
    return (
      <section 
        className="mb-6 section-block"
        style={{ 
          marginBottom: `calc(1.5rem * ${spacingMultiplier})`,
        }}
      >
        <h3
          className="text-sm font-semibold mb-3 uppercase tracking-wide"
          style={{ 
            color: titleColor,
            marginBottom: `calc(0.75rem * ${spacingMultiplier})`,
            fontSize: `calc(0.875rem * ${dynamicFontSize})`,
          }}
        >
          Skills
        </h3>
        <div 
          className="space-y-2"
          style={{ gap: dynamicSpacing }}
        >
          {skills.technical && skills.technical.length > 0 && (
            <div>
              <span 
                className={`font-semibold text-xs ${labelColorClass}`}
                style={{ fontSize: `calc(0.75rem * ${dynamicFontSize})` }}
              >
                Technical
              </span>
              <SidebarList 
                items={skills.technical}
                itemClassName={`text-xs ${textColorClass}`}
              />
            </div>
          )}
          {skills.languages && skills.languages.length > 0 && (
            <div>
              <span 
                className={`font-semibold text-xs ${labelColorClass}`}
                style={{ fontSize: `calc(0.75rem * ${dynamicFontSize})` }}
              >
                Languages
              </span>
              <SidebarList 
                items={skills.languages}
                itemClassName={`text-xs ${textColorClass}`}
              />
            </div>
          )}
          {skills.tools && skills.tools.length > 0 && (
            <div>
              <span 
                className={`font-semibold text-xs ${labelColorClass}`}
                style={{ fontSize: `calc(0.75rem * ${dynamicFontSize})` }}
              >
                Tools
              </span>
              <SidebarList 
                items={skills.tools}
                itemClassName={`text-xs ${textColorClass}`}
              />
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6 section-block">
      <h3
        className="text-lg font-semibold mb-3 uppercase tracking-wide border-b pb-1"
        style={{ color: colors.primary, borderColor: colors.accent }}
      >
        Skills
      </h3>
      <div className="space-y-2">
        {skills.technical && skills.technical.length > 0 && (
          <div>
            <span className="font-semibold text-gray-800 text-sm">Technical: </span>
            <span className="text-sm text-gray-700 inline-flex flex-wrap gap-1">
              {skills.technical.map((skill, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="opacity-60"> • </span>}
                  <span>{skill}</span>
                </React.Fragment>
              ))}
            </span>
          </div>
        )}
        {skills.languages && skills.languages.length > 0 && (
          <div>
            <span className="font-semibold text-gray-800 text-sm">Languages: </span>
            <span className="text-sm text-gray-700 inline-flex flex-wrap gap-1">
              {skills.languages.map((skill, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="opacity-60"> • </span>}
                  <span>{skill}</span>
                </React.Fragment>
              ))}
            </span>
          </div>
        )}
        {skills.tools && skills.tools.length > 0 && (
          <div>
            <span className="font-semibold text-gray-800 text-sm">Tools: </span>
            <span className="text-sm text-gray-700 inline-flex flex-wrap gap-1">
              {skills.tools.map((skill, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="opacity-60"> • </span>}
                  <span>{skill}</span>
                </React.Fragment>
              ))}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

export default Skills;
