/**
 * Settings schema validation and versioning utilities
 */

import {
  TemplateType,
  ColorScheme,
  FontFamily,
  CustomSection,
  SectionPlacementConfig,
  PhotoShape,
  PhotoPosition,
  PhotoSize,
} from '../types/resume';

// Current schema version
export const CURRENT_SCHEMA_VERSION = 1;

// Interface for persisted settings with schema version
export interface PersistedSettings {
  schemaVersion?: number;
  template?: TemplateType;
  colorScheme?: ColorScheme;
  fontFamily?: FontFamily;
  sectionOrder?: string[];
  sectionPlacement?: SectionPlacementConfig;
  globalFontSizeMultiplier?: number;
  photoShape?: PhotoShape;
  photoPosition?: PhotoPosition;
  photoSize?: PhotoSize;
  photo?: string | null;
  customSections?: CustomSection[];
  autoFitEnabled?: boolean;
  nonOrphanEnabled?: boolean;
  compressionFactor?: number;
  pagedPreviewEnabled?: boolean;
  separatePagesEnabled?: boolean;
  mainSpacingMult?: number;
  sidebarSpacingMult?: number;
}

/**
 * Type guard to validate if an object is a valid PersistedSettings
 */
export function isValidPersistedSettings(obj: any): obj is PersistedSettings {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  // Schema version should be a number if present
  if (obj.schemaVersion !== undefined && typeof obj.schemaVersion !== 'number') {
    return false;
  }

  // Validate template type
  if (obj.template !== undefined) {
    const validTemplates: TemplateType[] = ['modern', 'classic', 'creative', 'skills-sidebar', 'modern-split', 'accent-sidebar'];
    if (!validTemplates.includes(obj.template)) {
      return false;
    }
  }

  // Validate color scheme
  if (obj.colorScheme !== undefined) {
    const validColorSchemes: ColorScheme[] = ['blue', 'green', 'purple', 'orange', 'gray'];
    if (!validColorSchemes.includes(obj.colorScheme)) {
      return false;
    }
  }

  // Validate font family
  if (obj.fontFamily !== undefined) {
    const validFonts: FontFamily[] = ['inter', 'roboto', 'open-sans', 'lato', 'montserrat'];
    if (!validFonts.includes(obj.fontFamily)) {
      return false;
    }
  }

  // Validate photo shape
  if (obj.photoShape !== undefined) {
    const validShapes: PhotoShape[] = ['circle', 'square', 'rounded-square'];
    if (!validShapes.includes(obj.photoShape)) {
      return false;
    }
  }

  // Validate photo position
  if (obj.photoPosition !== undefined) {
    const validPositions: PhotoPosition[] = ['center', 'right-corner'];
    if (!validPositions.includes(obj.photoPosition)) {
      return false;
    }
  }

  // Validate photo size
  if (obj.photoSize !== undefined) {
    const validSizes: PhotoSize[] = ['small', 'medium', 'large'];
    if (!validSizes.includes(obj.photoSize)) {
      return false;
    }
  }

  // Validate array fields
  if (obj.sectionOrder !== undefined && !Array.isArray(obj.sectionOrder)) {
    return false;
  }

  if (obj.customSections !== undefined && !Array.isArray(obj.customSections)) {
    return false;
  }

  // Validate section placement
  if (obj.sectionPlacement !== undefined) {
    if (typeof obj.sectionPlacement !== 'object' || obj.sectionPlacement === null) {
      return false;
    }
    // Check that all values are either 'main' or 'sidebar'
    for (const value of Object.values(obj.sectionPlacement)) {
      if (value !== 'main' && value !== 'sidebar') {
        return false;
      }
    }
  }

  // Validate numeric fields
  if (obj.globalFontSizeMultiplier !== undefined && typeof obj.globalFontSizeMultiplier !== 'number') {
    return false;
  }
  if (obj.compressionFactor !== undefined && typeof obj.compressionFactor !== 'number') {
    return false;
  }
  if (obj.mainSpacingMult !== undefined && typeof obj.mainSpacingMult !== 'number') {
    return false;
  }
  if (obj.sidebarSpacingMult !== undefined && typeof obj.sidebarSpacingMult !== 'number') {
    return false;
  }

  // Validate boolean fields
  if (obj.autoFitEnabled !== undefined && typeof obj.autoFitEnabled !== 'boolean') {
    return false;
  }
  if (obj.nonOrphanEnabled !== undefined && typeof obj.nonOrphanEnabled !== 'boolean') {
    return false;
  }
  if (obj.pagedPreviewEnabled !== undefined && typeof obj.pagedPreviewEnabled !== 'boolean') {
    return false;
  }
  if (obj.separatePagesEnabled !== undefined && typeof obj.separatePagesEnabled !== 'boolean') {
    return false;
  }

  // Validate photo (should be string or null)
  if (obj.photo !== undefined && obj.photo !== null && typeof obj.photo !== 'string') {
    return false;
  }

  return true;
}

/**
 * Migrate settings from older versions to current version
 */
export function migrateSettings(settings: any): PersistedSettings {
  // If no schema version, assume version 1 (initial version)
  const version = settings.schemaVersion || 1;

  // Currently we only have version 1, so no migration needed
  // In future versions, add migration logic here
  if (version === 1) {
    return {
      ...settings,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
  }

  // For unknown future versions, attempt best-effort mapping
  console.warn(`Unknown schema version ${version}, attempting best-effort migration`);
  return {
    ...settings,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

/**
 * Validate and migrate settings from imported data
 */
export function validateAndMigrateSettings(data: any): { valid: boolean; settings?: PersistedSettings; error?: string } {
  try {
    // First check if it's valid JSON object
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Invalid settings file: not a valid JSON object' };
    }

    // Check schema version
    const version = data.schemaVersion || 1;
    if (version > CURRENT_SCHEMA_VERSION) {
      return {
        valid: false,
        error: `Settings file is from a newer version (v${version}). Please update the application.`,
      };
    }

    // Migrate if needed
    const migratedSettings = migrateSettings(data);

    // Validate the migrated settings
    if (!isValidPersistedSettings(migratedSettings)) {
      return { valid: false, error: 'Invalid settings file: validation failed' };
    }

    return { valid: true, settings: migratedSettings };
  } catch (error) {
    return {
      valid: false,
      error: `Error validating settings: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }
}
