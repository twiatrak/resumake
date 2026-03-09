import React, { useRef } from 'react';
import { ResumeData, TemplateType, SectionPlacement, PhotoShape, PhotoPosition, PhotoSize } from '../types/resume';
import { COLOR_SCHEMES } from '../config/customization';
import Header from './Header';
import Experience from './Experience';
import Education from './Education';
import Skills from './Skills';
import Footer from './Footer';
import CustomSectionComponent from './CustomSection';
import ContactInfo from './ContactInfo';
import { useContentDensity } from '../hooks/useContentDensity';

interface TemplateProps {
  resumeData: ResumeData;
  template: TemplateType;
  colorScheme: string;
  fontFamily: string;
  sectionOrder: string[];
  sectionPlacement?: Record<string, SectionPlacement>;
  globalFontSizeMultiplier?: number;
  photoShape?: PhotoShape;
  photoPosition?: PhotoPosition;
  photoSize?: PhotoSize;
}

/* ------------------------------ Helpers ------------------------------ */

function usePhotoShapeClass(shape?: PhotoShape) {
  switch (shape) {
    case 'circle': return 'rounded-full';
    case 'square': return 'rounded-none';
    case 'rounded-square':
    default:
      return 'rounded-lg';
  }
}

function usePhotoSizeClasses(size?: PhotoSize, variant: 'default' | 'accent' = 'default') {
  if (variant === 'accent') {
    switch (size) {
      case 'small': return 'w-16 h-16';
      case 'large': return 'w-36 h-36';
      case 'medium':
      default:
        return 'w-24 h-24';
    }
  }
  switch (size) {
    case 'small': return 'w-20 h-20';
    case 'large': return 'w-44 h-44';
    case 'medium':
    default:
      return 'w-32 h-32';
  }
}

// Convert "rgb(r, g, b)" to "rgba(r, g, b, alpha)"
function withAlpha(rgb: string, alpha: number): string {
  const m = rgb.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (!m) return rgb; // fallback if a different format is ever passed
  const [, r, g, b] = m;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Recognize both "profile" (preferred) and "summary" (back-compat) as the same section
const isProfileSection = (sectionId: string) => sectionId === 'profile' || sectionId === 'summary';
// Prefer resumeData.profile, fall back to resumeData.summary (cast to any to avoid type changes here)
const getProfileText = (resumeData: ResumeData): string | undefined => (resumeData as any).profile ?? resumeData.summary;

/* ------------------------------ Modern ------------------------------ */

const ModernTemplate: React.FC<TemplateProps> = ({
  resumeData,
  colorScheme,
  fontFamily,
  sectionOrder,
  globalFontSizeMultiplier = 1,
  photoShape,
  photoPosition,
  photoSize,
}) => {
  const colors = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES];

  const renderSection = (sectionId: string) => {
    if (isProfileSection(sectionId)) {
      const profileText = getProfileText(resumeData);
      if (!profileText) return null;
      return (
        <section key={sectionId} className="mb-6 section-block">
          <h3
            className="text-lg font-semibold mb-3 uppercase tracking-wide border-b pb-1"
            style={{
              color: colors.primary,
              borderColor: colors.accent,
              fontSize: `calc(1.125rem * ${globalFontSizeMultiplier})`,
            }}
          >
            Profile
          </h3>
          <p
            className="text-sm text-gray-700 leading-relaxed"
            style={{ fontSize: `calc(0.875rem * ${globalFontSizeMultiplier})` }}
          >
            {profileText}
          </p>
        </section>
      );
    }
    if (sectionId === 'experience') {
      return <Experience key={sectionId} experiences={resumeData.experience} colorScheme={colorScheme} />;
    }
    if (sectionId === 'education') {
      return <Education key={sectionId} education={resumeData.education} colorScheme={colorScheme} />;
    }
    if (sectionId === 'skills') {
      return <Skills key={sectionId} skills={resumeData.skills} colorScheme={colorScheme} />;
    }
    if (sectionId === 'contact') {
      return <ContactInfo key={sectionId} {...resumeData.header} colorScheme={colorScheme} />;
    }
    if (sectionId.startsWith('custom-')) {
      const customSection = resumeData.customSections?.find(s => `custom-${s.id}` === sectionId);
      if (customSection) {
        return <CustomSectionComponent key={sectionId} section={customSection} colorScheme={colorScheme} />;
      }
    }
    return null;
  };

  return (
    <div
      className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none p-8"
      style={{ fontFamily, fontSize: `calc(1rem * ${globalFontSizeMultiplier})` }}
    >
      <div data-area="main">
        <Header {...resumeData.header} colorScheme={colorScheme} photoShape={photoShape} photoPosition={photoPosition} photoSize={photoSize} />
        {sectionOrder.map(renderSection)}
        <Footer />
      </div>
    </div>
  );
};

/* ------------------------------ Classic ------------------------------ */

const ClassicTemplate: React.FC<TemplateProps> = ({
  resumeData,
  colorScheme,
  fontFamily,
  sectionOrder,
  globalFontSizeMultiplier = 1,
  photoShape,
  photoPosition,
  photoSize,
}) => {
  const colors = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES];

  const renderSection = (sectionId: string) => {
    if (isProfileSection(sectionId)) {
      const profileText = getProfileText(resumeData);
      if (!profileText) return null;
      return (
        <section key={sectionId} className="mb-6 section-block">
          <h3
            className="text-base font-bold mb-3 uppercase tracking-wider"
            style={{
              color: colors.primary,
              fontSize: `calc(1rem * ${globalFontSizeMultiplier})`,
            }}
          >
            Profile
          </h3>
          <p
            className="text-sm text-gray-700 leading-relaxed"
            style={{ fontSize: `calc(0.875rem * ${globalFontSizeMultiplier})` }}
          >
            {profileText}
          </p>
        </section>
      );
    }
    if (sectionId === 'experience') {
      return <Experience key={sectionId} experiences={resumeData.experience} colorScheme={colorScheme} />;
    }
    if (sectionId === 'education') {
      return <Education key={sectionId} education={resumeData.education} colorScheme={colorScheme} />;
    }
    if (sectionId === 'skills') {
      return <Skills key={sectionId} skills={resumeData.skills} colorScheme={colorScheme} />;
    }
    if (sectionId === 'contact') {
      return <ContactInfo key={sectionId} {...resumeData.header} colorScheme={colorScheme} />;
    }
    if (sectionId.startsWith('custom-')) {
      const customSection = resumeData.customSections?.find(s => `custom-${s.id}` === sectionId);
      if (customSection) {
        return <CustomSectionComponent key={sectionId} section={customSection} colorScheme={colorScheme} />;
      }
    }
    return null;
  };

  return (
    <div
      className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none p-8 border-t-4"
      style={{
        fontFamily,
        borderTopColor: colors.primary,
        fontSize: `calc(1rem * ${globalFontSizeMultiplier})`,
      }}
    >
      <div data-area="main">
        <Header
          {...resumeData.header}
          colorScheme={colorScheme}
          template="classic"
          photoShape={photoShape}
          photoPosition={photoPosition}
          photoSize={photoSize}
        />
        {sectionOrder.map(renderSection)}
        <Footer />
      </div>
    </div>
  );
};

/* ------------------------------ Creative ------------------------------ */

const CreativeTemplate: React.FC<TemplateProps> = ({
  resumeData,
  colorScheme,
  fontFamily,
  sectionOrder,
  globalFontSizeMultiplier = 1,
  photoShape,
  photoPosition,
  photoSize,
}) => {
  const colors = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES];

  const renderSection = (sectionId: string) => {
    if (isProfileSection(sectionId)) {
      const profileText = getProfileText(resumeData);
      if (!profileText) return null;
      return (
        <section key={sectionId} className="mb-6 section-block">
          <h3
            className="text-xl font-bold mb-3"
            style={{
              color: colors.primary,
              fontSize: `calc(1.25rem * ${globalFontSizeMultiplier})`,
            }}
          >
            Profile
          </h3>
          <div className="border-l-4 pl-4" style={{ borderColor: colors.accent }}>
            <p
              className="text-sm text-gray-700 leading-relaxed"
              style={{ fontSize: `calc(0.875rem * ${globalFontSizeMultiplier})` }}
            >
              {profileText}
            </p>
          </div>
        </section>
      );
    }
    if (sectionId === 'experience') {
      return <Experience key={sectionId} experiences={resumeData.experience} colorScheme={colorScheme} />;
    }
    if (sectionId === 'education') {
      return <Education key={sectionId} education={resumeData.education} colorScheme={colorScheme} />;
    }
    if (sectionId === 'skills') {
      return <Skills key={sectionId} skills={resumeData.skills} colorScheme={colorScheme} />;
    }
    if (sectionId === 'contact') {
      return <ContactInfo key={sectionId} {...resumeData.header} colorScheme={colorScheme} />;
    }
    if (sectionId.startsWith('custom-')) {
      const customSection = resumeData.customSections?.find(s => `custom-${s.id}` === sectionId);
      if (customSection) {
        return <CustomSectionComponent key={sectionId} section={customSection} colorScheme={colorScheme} />;
      }
    }
    return null;
  };

  return (
    <div
      className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none p-8"
      style={{ fontFamily, fontSize: `calc(1rem * ${globalFontSizeMultiplier})` }}
    >
      <div className="relative" data-area="main">
        <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: colors.primary }} />
        <div className="pl-6">
          <Header
            {...resumeData.header}
            colorScheme={colorScheme}
            template="creative"
            photoShape={photoShape}
            photoPosition={photoPosition}
            photoSize={photoSize}
          />
          {sectionOrder.map(renderSection)}
          <Footer />
        </div>
      </div>
    </div>
  );
};

/* ------------------------------ Skills Sidebar ------------------------------ */

const SkillsSidebarTemplate: React.FC<TemplateProps> = ({
  resumeData,
  colorScheme,
  fontFamily,
  sectionOrder,
  sectionPlacement = {},
  globalFontSizeMultiplier = 1,
  photoShape = 'rounded-square',
  photoPosition = 'center',
  photoSize = 'medium',
}) => {
  const colors = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES];
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const sidebarDensity = useContentDensity(sidebarRef, {
    enabled: true,
    otherColumnRef: mainRef,
  });


  const renderSection = (sectionId: string, placement: 'main' | 'sidebar') => {
    const actualPlacement = sectionPlacement[sectionId] || 'main';
    if (actualPlacement !== placement) return null;

    if (isProfileSection(sectionId)) {
      const profileText = getProfileText(resumeData);
      if (!profileText) return null;
      const isSidebar = placement === 'sidebar';
      const densitySettings = isSidebar ? sidebarDensity : { spacingMultiplier: 1, fontSizeMultiplier: 1 };
      const titleColor = isSidebar ? 'white' : colors.primary;
      const profileTextClass = isSidebar ? 'text-xs text-white leading-relaxed' : 'text-sm text-gray-700 leading-relaxed';
      return (
        <section key={sectionId} className="mb-6 section-block">
          <h3
            className={
              placement === 'sidebar'
                ? 'text-sm font-semibold mb-3 uppercase tracking-wide'
                : 'text-lg font-semibold mb-3 uppercase tracking-wide border-b pb-1'
            }
            style={{
              color: titleColor,
              ...(placement === 'main' ? { borderColor: colors.accent } : {}),
              ...(isSidebar
                ? {
                    marginBottom: `calc(0.75rem * ${densitySettings.spacingMultiplier})`,
                    fontSize: `calc(0.875rem * ${densitySettings.fontSizeMultiplier})`,
                  }
                : {}),
            }}
          >
            Profile
          </h3>
          <p
            className={profileTextClass}
            style={
              isSidebar
                ? {
                    fontSize: `calc(0.75rem * ${densitySettings.fontSizeMultiplier})`,
                    lineHeight: `calc(1.625 * ${densitySettings.spacingMultiplier})`,
                  }
                : {}
            }
          >
            {profileText}
          </p>
        </section>
      );
    }
    if (sectionId === 'experience') {
      return (
        <Experience
          key={sectionId}
          experiences={resumeData.experience}
          colorScheme={colorScheme}
          compact={placement === 'sidebar'}
          spacingMultiplier={placement === 'sidebar' ? sidebarDensity.spacingMultiplier : 1}
          fontSizeMultiplier={placement === 'sidebar' ? sidebarDensity.fontSizeMultiplier : 1}
          light={placement === 'sidebar'}
        />
      );
    }
    if (sectionId === 'education') {
      return (
        <Education
          key={sectionId}
          education={resumeData.education}
          colorScheme={colorScheme}
          compact={placement === 'sidebar'}
          spacingMultiplier={placement === 'sidebar' ? sidebarDensity.spacingMultiplier : 1}
          fontSizeMultiplier={placement === 'sidebar' ? sidebarDensity.fontSizeMultiplier : 1}
          light={placement === 'sidebar'}
        />
      );
    }
    if (sectionId === 'skills') {
      return (
        <Skills
          key={sectionId}
          skills={resumeData.skills}
          colorScheme={colorScheme}
          compact={placement === 'sidebar'}
          spacingMultiplier={placement === 'sidebar' ? sidebarDensity.spacingMultiplier : 1}
          fontSizeMultiplier={placement === 'sidebar' ? sidebarDensity.fontSizeMultiplier : 1}
          light={placement === 'sidebar'}
        />
      );
    }
    if (sectionId === 'contact') {
      return (
        <ContactInfo
          key={sectionId}
          {...resumeData.header}
          colorScheme={colorScheme}
          light={placement === 'sidebar'}
          spacingMultiplier={placement === 'sidebar' ? sidebarDensity.spacingMultiplier : 1}
          fontSizeMultiplier={placement === 'sidebar' ? sidebarDensity.fontSizeMultiplier : 1}
        />
      );
    }
    if (sectionId.startsWith('custom-')) {
      const customSection = resumeData.customSections?.find(s => `custom-${s.id}` === sectionId);
      if (customSection) {
        return (
          <CustomSectionComponent
            key={sectionId}
            section={customSection}
            colorScheme={colorScheme}
            compact={placement === 'sidebar'}
            spacingMultiplier={placement === 'sidebar' ? sidebarDensity.spacingMultiplier : 1}
            fontSizeMultiplier={placement === 'sidebar' ? sidebarDensity.fontSizeMultiplier : 1}
            light={placement === 'sidebar'}
          />
        );
      }
    }
    return null;
  };

  const photoShapeClass = usePhotoShapeClass(photoShape);
  const photoSizeClasses = usePhotoSizeClasses(photoSize);

  return (
    <div
      className="max-w-5xl mx-auto bg-white shadow-lg print:shadow-none"
      style={{ fontFamily, fontSize: `calc(1rem * ${globalFontSizeMultiplier})` }}
    >
      <div className="flex flex-col md:flex-row print:flex-row">
        {/* Sidebar */}
        <div
          ref={sidebarRef}
          className="w-full md:w-2/5 print:w-2/5 p-6 sidebar flex flex-col"
          data-sidebar
          data-sidebar-layout="relaxed"
          data-sidebar-style="bulleted"
          style={{ backgroundColor: colors.secondary }}
        >
          {resumeData.header.photo && photoPosition !== 'right-corner' && (
            <div className="mb-6 flex justify-center">
              <img
                src={resumeData.header.photo}
                alt={resumeData.header.name}
                className={`object-cover ${photoShapeClass} ${photoSizeClasses}`}
              />
            </div>
          )}
          {sectionOrder.map(sectionId => renderSection(sectionId, 'sidebar'))}
          <div className="mt-auto pt-4 text-xs text-white/80">
            Generated with Resumake • {new Date().getFullYear()}
          </div>
        </div>

        {/* Main Content */}
        <div ref={mainRef} className="w-full md:w-3/5 print:w-3/5 p-8 relative" data-area="main">
          {resumeData.header.photo && photoPosition === 'right-corner' && (
            <img
              src={resumeData.header.photo}
              alt={resumeData.header.name}
              className={`absolute top-6 right-6 object-cover ${photoShapeClass} ${photoSizeClasses}`}
            />
          )}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2" style={{ color: colors.primary }}>
              {resumeData.header.name}
            </h1>
            <h2 className="text-lg mb-4" style={{ color: colors.secondary }}>
              {resumeData.header.title}
            </h2>
          </div>
          {sectionOrder.map(sectionId => renderSection(sectionId, 'main'))}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------ Modern Split ------------------------------ */

const ModernSplitTemplate: React.FC<TemplateProps> = ({
  resumeData,
  colorScheme,
  fontFamily,
  sectionOrder,
  sectionPlacement = {},
  globalFontSizeMultiplier = 1,
  photoShape = 'circle',
  photoPosition = 'center',
  photoSize = 'medium',
}) => {
  const colors = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES];
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const sidebarDensity = useContentDensity(sidebarRef, {
    enabled: true,
    otherColumnRef: mainRef,
  });


  const renderSection = (sectionId: string, placement: 'main' | 'sidebar') => {
    const actualPlacement = sectionPlacement[sectionId] || 'main';
    if (actualPlacement !== placement) return null;

    if (isProfileSection(sectionId)) {
      const profileText = getProfileText(resumeData);
      if (!profileText) return null;
      const isSidebar = placement === 'sidebar';
      const densitySettings = isSidebar ? sidebarDensity : { spacingMultiplier: 1, fontSizeMultiplier: 1 };

      return (
        <section key={sectionId} className="mb-6 section-block">
          <h3
            className={
              placement === 'sidebar'
                ? 'text-sm font-semibold mb-3 uppercase tracking-wide'
                : 'text-lg font-semibold mb-3 uppercase tracking-wide border-b pb-1'
            }
            style={{
              color: titleColor,
              ...(placement === 'main' ? { borderColor: colors.accent } : {}),
              ...(isSidebar
                ? {
                    marginBottom: `calc(0.75rem * ${densitySettings.spacingMultiplier})`,
                    fontSize: `calc(0.875rem * ${densitySettings.fontSizeMultiplier})`,
                  }
                : {}),
            }}
          >
            Profile
          </h3>
          <p
            className={profileTextClass}
            style={
              isSidebar
                ? {
                    fontSize: `calc(0.75rem * ${densitySettings.fontSizeMultiplier})`,
                    lineHeight: `calc(1.625 * ${densitySettings.spacingMultiplier})`,
                  }
                : {}
            }
          >
            {profileText}
          </p>
        </section>
      );
    }
    if (sectionId === 'experience') {
      return (
        <Experience
          key={sectionId}
          experiences={resumeData.experience}
          colorScheme={colorScheme}
          compact={placement === 'sidebar'}
          spacingMultiplier={placement === 'sidebar' ? sidebarDensity.spacingMultiplier : 1}
          fontSizeMultiplier={placement === 'sidebar' ? sidebarDensity.fontSizeMultiplier : 1}
          light={placement === 'sidebar'}
        />
      );
    }
    if (sectionId === 'education') {
      return (
        <Education
          key={sectionId}
          education={resumeData.education}
          colorScheme={colorScheme}
          compact={placement === 'sidebar'}
          spacingMultiplier={placement === 'sidebar' ? sidebarDensity.spacingMultiplier : 1}
          fontSizeMultiplier={placement === 'sidebar' ? sidebarDensity.fontSizeMultiplier : 1}
          light={placement === 'sidebar'}
        />
      );
    }
    if (sectionId === 'skills') {
      return (
        <Skills
          key={sectionId}
          skills={resumeData.skills}
          colorScheme={colorScheme}
          compact={placement === 'sidebar'}
          spacingMultiplier={placement === 'sidebar' ? sidebarDensity.spacingMultiplier : 1}
          fontSizeMultiplier={placement === 'sidebar' ? sidebarDensity.fontSizeMultiplier : 1}
          light={placement === 'sidebar'}
        />
      );
    }
    if (sectionId === 'contact') {
      return (
        <ContactInfo
          key={sectionId}
          {...resumeData.header}
          colorScheme={colorScheme}
          light={placement === 'sidebar'}
          spacingMultiplier={placement === 'sidebar' ? sidebarDensity.spacingMultiplier : 1}
          fontSizeMultiplier={placement === 'sidebar' ? sidebarDensity.fontSizeMultiplier : 1}
        />
      );
    }
    if (sectionId.startsWith('custom-')) {
      const customSection = resumeData.customSections?.find(s => `custom-${s.id}` === sectionId);
      if (customSection) {
        return (
          <CustomSectionComponent
            key={sectionId}
            section={customSection}
            colorScheme={colorScheme}
            compact={placement === 'sidebar'}
            spacingMultiplier={placement === 'sidebar' ? sidebarDensity.spacingMultiplier : 1}
            fontSizeMultiplier={placement === 'sidebar' ? sidebarDensity.fontSizeMultiplier : 1}
            light={placement === 'sidebar'}
          />
        );
      }
    }
    return null;
  };

  const photoShapeClass = usePhotoShapeClass(photoShape);
  const photoSizeClasses = usePhotoSizeClasses(photoSize);

  return (
    <div
      className="max-w-5xl mx-auto bg-white shadow-lg print:shadow-none"
      style={{ fontFamily, fontSize: `calc(1rem * ${globalFontSizeMultiplier})` }}
    >
      {/* Split Header */}
      <div className="flex flex-col md:flex-row border-b-2" style={{ borderColor: colors.accent }}>
        <div className="md:w-1/3 p-8 flex flex-col items-center justify-center" style={{ backgroundColor: colors.primary }}>
          {resumeData.header.photo && photoPosition !== 'right-corner' && (
            <img
              src={resumeData.header.photo}
              alt={resumeData.header.name}
              className={`object-cover ${photoShapeClass} ${photoSizeClasses}`}
            />
          )}
        </div>
        <div className="md:w-2/3 p-8 flex flex-col justify-center relative" data-area="main">
          {resumeData.header.photo && photoPosition === 'right-corner' && (
            <img
              src={resumeData.header.photo}
              alt={resumeData.header.name}
              className={`absolute top-4 right-6 object-cover ${photoShapeClass} ${photoSizeClasses}`}
            />
          )}
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: colors.primary }}>
              {resumeData.header.name}
            </h1>
            <h2 className="text-xl" style={{ color: colors.secondary }}>
              {resumeData.header.title}
            </h2>
          </div>
        </div>
      </div>

      {/* Two Column Content */}
      <div className="flex flex-col md:flex-row print:flex-row">
        {/* Sidebar */}
        <div 
          ref={sidebarRef} 
          className="w-full md:w-1/3 print:w-1/3 p-6 sidebar" 
          data-sidebar 
          data-sidebar-layout="relaxed"
          data-sidebar-style="bulleted"
          style={{ backgroundColor: colors.primary }}
        >
          {sectionOrder.map(sectionId => renderSection(sectionId, 'sidebar'))}
        </div>

        {/* Main Content */}
        <div ref={mainRef} className="w-full md:w-2/3 print:w-2/3 p-8" data-area="main">
          {sectionOrder.map(sectionId => renderSection(sectionId, 'main'))}
          <Footer />
        </div>
      </div>
    </div>
  );
};

/* ------------------------------ Accent Sidebar ------------------------------ */

const AccentSidebarTemplate: React.FC<TemplateProps> = ({
  resumeData,
  colorScheme,
  fontFamily,
  sectionOrder,
  sectionPlacement = {},
  globalFontSizeMultiplier = 1,
  photoShape = 'circle',
  photoPosition = 'center',
  photoSize = 'medium',
}) => {
  const colors = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES];
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const sidebarDensity = useContentDensity(sidebarRef, {
    enabled: true,
    otherColumnRef: mainRef,
  });


  const renderSection = (sectionId: string, placement: 'main' | 'sidebar') => {
    const actualPlacement = sectionPlacement[sectionId] || 'main';
    if (actualPlacement !== placement) return null;

    if (isProfileSection(sectionId)) {
      const profileText = getProfileText(resumeData);
      if (!profileText) return null;
      const isSidebar = placement === 'sidebar';
      const densitySettings = isSidebar ? sidebarDensity : { spacingMultiplier: 1, fontSizeMultiplier: 1 };

      return (
        <section key={sectionId} className="mb-6 section-block">
          <h3
            className={
              placement === 'sidebar'
                ? 'text-xs font-semibold mb-2 uppercase tracking-wide'
                : 'text-lg font-semibold mb-3 uppercase tracking-wide border-b pb-1'
            }
            style={{
              color: placement === 'sidebar' ? 'white' : colors.primary,
              ...(placement === 'main' ? { borderColor: colors.accent } : {}),
              ...(isSidebar
                ? {
                    marginBottom: `calc(0.5rem * ${densitySettings.spacingMultiplier})`,
                    fontSize: `calc(0.75rem * ${densitySettings.fontSizeMultiplier})`,
                  }
                : {}),
            }}
          >
            Profile
          </h3>
          <p
            className={placement === 'sidebar' ? 'text-xs text-white leading-relaxed' : 'text-sm text-gray-700 leading-relaxed'}
            style={
              isSidebar
                ? {
                    fontSize: `calc(0.75rem * ${densitySettings.fontSizeMultiplier})`,
                    lineHeight: `calc(1.625 * ${densitySettings.spacingMultiplier})`,
                  }
                : {}
            }
          >
            {profileText}
          </p>
        </section>
      );
    }
    if (sectionId === 'experience') {
      return (
        <Experience
          key={sectionId}
          experiences={resumeData.experience}
          colorScheme={colorScheme}
          compact={placement === 'sidebar'}
          spacingMultiplier={placement === 'sidebar' ? sidebarDensity.spacingMultiplier : 1}
          fontSizeMultiplier={placement === 'sidebar' ? sidebarDensity.fontSizeMultiplier : 1}
          light={placement === 'sidebar'}
        />
      );
    }
    if (sectionId === 'education') {
      return (
        <Education
          key={sectionId}
          education={resumeData.education}
          colorScheme={colorScheme}
          compact={placement === 'sidebar'}
          spacingMultiplier={placement === 'sidebar' ? sidebarDensity.spacingMultiplier : 1}
          fontSizeMultiplier={placement === 'sidebar' ? sidebarDensity.fontSizeMultiplier : 1}
          light={placement === 'sidebar'}
        />
      );
    }
    if (sectionId === 'skills') {
      return (
        <Skills
          key={sectionId}
          skills={resumeData.skills}
          colorScheme={colorScheme}
          compact={placement === 'sidebar'}
          spacingMultiplier={placement === 'sidebar' ? sidebarDensity.spacingMultiplier : 1}
          fontSizeMultiplier={placement === 'sidebar' ? sidebarDensity.fontSizeMultiplier : 1}
          light={placement === 'sidebar'}
        />
      );
    }
    if (sectionId === 'contact') {
      return (
        <ContactInfo
          key={sectionId}
          {...resumeData.header}
          colorScheme={colorScheme}
          light={placement === 'sidebar'}
          spacingMultiplier={placement === 'sidebar' ? sidebarDensity.spacingMultiplier : 1}
          fontSizeMultiplier={placement === 'sidebar' ? sidebarDensity.fontSizeMultiplier : 1}
        />
      );
    }
    if (sectionId.startsWith('custom-')) {
      const customSection = resumeData.customSections?.find(s => `custom-${s.id}` === sectionId);
      if (customSection) {
        return (
          <CustomSectionComponent
            key={sectionId}
            section={customSection}
            colorScheme={colorScheme}
            compact={placement === 'sidebar'}
            spacingMultiplier={placement === 'sidebar' ? sidebarDensity.spacingMultiplier : 1}
            fontSizeMultiplier={placement === 'sidebar' ? sidebarDensity.fontSizeMultiplier : 1}
            light={placement === 'sidebar'}
          />
        );
      }
    }
    return null;
  };

  const photoShapeClass = usePhotoShapeClass(photoShape);
  const photoSizeClasses = usePhotoSizeClasses(photoSize, 'accent');

  // Pull the large right-corner photo up to avoid overlapping profile text
  const isRightCornerLarge = photoPosition === 'right-corner' && photoSize === 'large';
  const rightCornerTopClass = isRightCornerLarge ? 'top-0' : 'top-6';

  return (
    <div
      className="max-w-5xl mx-auto bg-white shadow-lg print:shadow-none"
      style={{ fontFamily, fontSize: `calc(1rem * ${globalFontSizeMultiplier})` }}
    >
      <div className="flex flex-col md:flex-row print:flex-row">
        {/* Thin Sidebar with Accent Color */}
        <div 
          ref={sidebarRef} 
          className="w-full md:w-1/5 print:w-1/5 p-4 sidebar" 
          data-sidebar 
          data-sidebar-layout="relaxed"
          data-sidebar-style="bulleted"
          style={{ backgroundColor: colors.primary }}
        >
          {resumeData.header.photo && photoPosition !== 'right-corner' && (
            <div className="mb-6 flex justify-start">
              <img
                src={resumeData.header.photo}
                alt={resumeData.header.name}
                className={`object-cover border-2 border-white ${photoShapeClass} ${photoSizeClasses}`}
              />
            </div>
          )}
          {sectionOrder.map(sectionId => renderSection(sectionId, 'sidebar'))}
        </div>

        {/* Main Content */}
        <div ref={mainRef} className="w-full md:w-4/5 print:w-4/5 p-8 relative" data-area="main">
          {resumeData.header.photo && photoPosition === 'right-corner' && (
            <img
              src={resumeData.header.photo}
              alt={resumeData.header.name}
              className={`absolute ${rightCornerTopClass} right-6 object-cover border-2 ${photoShapeClass} ${photoSizeClasses}`}
              style={{ borderColor: colors.primary }}
            />
          )}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2" style={{ color: colors.primary }}>
              {resumeData.header.name}
            </h1>
            <h2 className="text-lg mb-4" style={{ color: colors.secondary }}>
              {resumeData.header.title}
            </h2>
          </div>
          {sectionOrder.map(sectionId => renderSection(sectionId, 'main'))}
          <Footer />
        </div>
      </div>
    </div>
  );
};

/* ------------------------------ Wrapper ------------------------------ */

interface TemplateWrapperProps {
  resumeData: ResumeData;
  template: TemplateType;
  colorScheme: string;
  fontFamily: string;
  sectionOrder: string[];
  sectionPlacement?: Record<string, SectionPlacement>;
  globalFontSizeMultiplier?: number;
  photoShape?: PhotoShape;
  photoPosition?: PhotoPosition;
  photoSize?: PhotoSize;
}

const TemplateWrapper: React.FC<TemplateWrapperProps> = (props) => {
  const {
    resumeData,
    template,
    colorScheme,
    fontFamily,
    sectionOrder,
    sectionPlacement,
    globalFontSizeMultiplier,
    photoShape,
    photoPosition,
    photoSize,
  } = props;

  switch (template) {
    case 'classic':
      return (
        <ClassicTemplate
          resumeData={resumeData}
          template={template}
          colorScheme={colorScheme}
          fontFamily={fontFamily}
          sectionOrder={sectionOrder}
          globalFontSizeMultiplier={globalFontSizeMultiplier}
          photoShape={photoShape}
          photoPosition={photoPosition}
          photoSize={photoSize}
        />
      );
    case 'creative':
      return (
        <CreativeTemplate
          resumeData={resumeData}
          template={template}
          colorScheme={colorScheme}
          fontFamily={fontFamily}
          sectionOrder={sectionOrder}
          globalFontSizeMultiplier={globalFontSizeMultiplier}
          photoShape={photoShape}
          photoPosition={photoPosition}
          photoSize={photoSize}
        />
      );
    case 'skills-sidebar':
      return (
        <SkillsSidebarTemplate
          resumeData={resumeData}
          template={template}
          colorScheme={colorScheme}
          fontFamily={fontFamily}
          sectionOrder={sectionOrder}
          sectionPlacement={sectionPlacement}
          globalFontSizeMultiplier={globalFontSizeMultiplier}
          photoShape={photoShape}
          photoPosition={photoPosition}
          photoSize={photoSize}
        />
      );
    case 'modern-split':
      return (
        <ModernSplitTemplate
          resumeData={resumeData}
          template={template}
          colorScheme={colorScheme}
          fontFamily={fontFamily}
          sectionOrder={sectionOrder}
          sectionPlacement={sectionPlacement}
          globalFontSizeMultiplier={globalFontSizeMultiplier}
          photoShape={photoShape}
          photoPosition={photoPosition}
          photoSize={photoSize}
        />
      );
    case 'accent-sidebar':
      return (
        <AccentSidebarTemplate
          resumeData={resumeData}
          template={template}
          colorScheme={colorScheme}
          fontFamily={fontFamily}
          sectionOrder={sectionOrder}
          sectionPlacement={sectionPlacement}
          globalFontSizeMultiplier={globalFontSizeMultiplier}
          photoShape={photoShape}
          photoPosition={photoPosition}
          photoSize={photoSize}
        />
      );
    case 'modern':
    default:
      return (
        <ModernTemplate
          resumeData={resumeData}
          template={template}
          colorScheme={colorScheme}
          fontFamily={fontFamily}
          sectionOrder={sectionOrder}
          globalFontSizeMultiplier={globalFontSizeMultiplier}
          photoShape={photoShape}
          photoPosition={photoPosition}
          photoSize={photoSize}
        />
      );
  }
};

export default TemplateWrapper;
