export interface ResumeData {
  header: {
    name: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    github?: string;
    website?: string;
    photo?: string;
  };
  profile?: string;   // New primary field
  summary?: string;   // Back-compat fallback
  experience: Experience[];
  education: Education[];
  skills: Skills;
  customSections?: CustomSection[];
  customization?: Customization;
}

export interface Experience {
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  highlights: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  gpa?: string;
  description?: string;
}

export interface Skills {
  technical: string[];
  languages?: string[];
  tools?: string[];
}

export interface CustomSection {
  id: string;
  title: string;
  content: string;
}

export type TemplateType = 'modern' | 'classic' | 'creative' | 'skills-sidebar' | 'modern-split' | 'accent-sidebar';
export type ColorScheme = 'blue' | 'green' | 'purple' | 'orange' | 'gray';
export type FontFamily = 'inter' | 'roboto' | 'open-sans' | 'lato' | 'montserrat';
export type SectionPlacement = 'main' | 'sidebar';
export type PhotoShape = 'circle' | 'square' | 'rounded-square';
export type PhotoPosition = 'center' | 'right-corner';
export type PhotoSize = 'small' | 'medium' | 'large';

export interface SectionPlacementConfig {
  [sectionId: string]: SectionPlacement;
}

export interface Customization {
  template?: TemplateType;
  colorScheme?: ColorScheme;
  fontFamily?: FontFamily;
  sectionOrder?: string[];
  sectionPlacement?: SectionPlacementConfig;
  photoShape?: PhotoShape;
  photoPosition?: PhotoPosition;
  photoSize?: PhotoSize;
}

export type SectionType =
  | 'profile'   // New primary id
  | 'summary'   // Back-compat id
  | 'experience'
  | 'education'
  | 'skills'
  | 'custom';
