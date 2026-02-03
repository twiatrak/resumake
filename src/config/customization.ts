import { TemplateType, ColorScheme, FontFamily, SectionPlacement, PhotoShape, PhotoPosition, PhotoSize } from '../types/resume';

export const TEMPLATES: Record<TemplateType, { name: string; description: string }> = {
  modern: {
    name: 'Modern',
    description: 'Clean and contemporary design with bold headers',
  },
  classic: {
    name: 'Classic',
    description: 'Traditional layout with professional styling',
  },
  creative: {
    name: 'Creative',
    description: 'Unique design with visual flair',
  },
  'skills-sidebar': {
    name: 'Skills Sidebar',
    description: 'Two-column layout with skills and contact in sidebar',
  },
  'modern-split': {
    name: 'Modern Split',
    description: 'Split header with two-column content layout',
  },
  'accent-sidebar': {
    name: 'Accent Sidebar',
    description: 'Thin colored sidebar with main content area',
  },
};

export const COLOR_SCHEMES: Record<ColorScheme, { name: string; primary: string; secondary: string; accent: string }> = {
  blue: {
    name: 'Blue',
    primary: 'rgb(37, 99, 235)',
    secondary: 'rgb(59, 130, 246)',
    accent: 'rgb(96, 165, 250)',
  },
  green: {
    name: 'Green',
    primary: 'rgb(22, 163, 74)',
    secondary: 'rgb(34, 197, 94)',
    accent: 'rgb(74, 222, 128)',
  },
  purple: {
    name: 'Purple',
    primary: 'rgb(126, 34, 206)',
    secondary: 'rgb(147, 51, 234)',
    accent: 'rgb(168, 85, 247)',
  },
  orange: {
    name: 'Orange',
    primary: 'rgb(234, 88, 12)',
    secondary: 'rgb(249, 115, 22)',
    accent: 'rgb(251, 146, 60)',
  },
  gray: {
    name: 'Gray',
    primary: 'rgb(31, 41, 55)',
    secondary: 'rgb(55, 65, 81)',
    accent: 'rgb(75, 85, 99)',
  },
};

export const FONTS: Record<FontFamily, { name: string; family: string; googleFontUrl: string }> = {
  inter: {
    name: 'Inter',
    family: "'Inter', sans-serif",
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  },
  roboto: {
    name: 'Roboto',
    family: "'Roboto', sans-serif",
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
  },
  'open-sans': {
    name: 'Open Sans',
    family: "'Open Sans', sans-serif",
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap',
  },
  lato: {
    name: 'Lato',
    family: "'Lato', sans-serif",
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap',
  },
  montserrat: {
    name: 'Montserrat',
    family: "'Montserrat', sans-serif",
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&display=swap',
  },
};

export const DEFAULT_SECTION_ORDER = ['profile', 'experience', 'education', 'skills', 'contact'];

export const DEFAULT_SIDEBAR_PLACEMENT: Record<string, SectionPlacement> = {
  profile: 'main',
  experience: 'main',
  education: 'main',
  skills: 'sidebar',
  contact: 'sidebar',

  // Back-compat so old configs still render
  summary: 'main',
};

export const PHOTO_SHAPES: Record<PhotoShape, { name: string; description: string }> = {
  circle: {
    name: 'Circle',
    description: 'Classic rounded photo',
  },
  square: {
    name: 'Square',
    description: 'Sharp corners',
  },
  'rounded-square': {
    name: 'Rounded Square',
    description: 'Soft rounded corners',
  },
};

export const PHOTO_POSITIONS: Record<PhotoPosition, { name: string; description: string }> = {
  center: {
    name: 'Center',
    description: 'Centered above header',
  },
  'right-corner': {
    name: 'Right Corner',
    description: 'Top-right corner',
  },
};

export const PHOTO_SIZES: Record<PhotoSize, { name: string; sizes: { default: string; print: string } }> = {
  small: {
    name: 'Small',
    sizes: { default: '80px', print: '60px' },
  },
  medium: {
    name: 'Medium',
    sizes: { default: '128px', print: '96px' },
  },
  large: {
    name: 'Large',
    sizes: { default: '160px', print: '120px' },
  },
};
