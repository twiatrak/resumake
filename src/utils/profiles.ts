/**
 * Profile management utilities for multi-profile support
 */

import { PersistedSettings, isValidPersistedSettings, migrateSettings } from './settingsSchema';
import * as storage from './storage';

// Storage keys
export const PROFILES_KEY = 'resumake:v1:profiles';
export const ACTIVE_PROFILE_KEY = 'resumake:v1:activeProfile';
const LEGACY_SETTINGS_KEY = 'resumake:v1:settings';

// Profile data structure
export interface ProfileData {
  name: string;
  settings: PersistedSettings;
  createdAt: string;
  updatedAt: string;
}

// Map of profile IDs to profile data
export type ProfilesMap = Record<string, ProfileData>;

/**
 * Generate a unique profile ID
 */
export function generateProfileId(): string {
  return `profile-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get all profiles from localStorage
 */
export function getProfiles(): ProfilesMap {
  const profiles = storage.getItem<ProfilesMap>(PROFILES_KEY);
  return profiles || {};
}

/**
 * Save all profiles to localStorage
 */
export function setProfiles(profiles: ProfilesMap): boolean {
  return storage.setItem(PROFILES_KEY, profiles);
}

/**
 * Get the active profile ID
 */
export function getActiveProfileId(): string | null {
  return storage.getItem<string>(ACTIVE_PROFILE_KEY);
}

/**
 * Set the active profile ID
 */
export function setActiveProfileId(profileId: string): boolean {
  return storage.setItem(ACTIVE_PROFILE_KEY, profileId);
}

/**
 * Get a specific profile by ID
 */
export function getProfile(profileId: string): ProfileData | null {
  const profiles = getProfiles();
  return profiles[profileId] || null;
}

/**
 * Get the active profile data
 */
export function getActiveProfile(): { id: string; data: ProfileData } | null {
  const activeId = getActiveProfileId();
  if (!activeId) return null;

  const profile = getProfile(activeId);
  if (!profile) return null;

  return { id: activeId, data: profile };
}

/**
 * Create a new profile
 */
export function createProfile(name: string, settings: PersistedSettings): string {
  const profiles = getProfiles();
  const profileId = generateProfileId();
  const now = new Date().toISOString();

  profiles[profileId] = {
    name,
    settings,
    createdAt: now,
    updatedAt: now,
  };

  setProfiles(profiles);
  return profileId;
}

/**
 * Update an existing profile's settings
 */
export function updateProfile(profileId: string, settings: PersistedSettings): boolean {
  const profiles = getProfiles();
  const profile = profiles[profileId];

  if (!profile) {
    return false;
  }

  profiles[profileId] = {
    ...profile,
    settings,
    updatedAt: new Date().toISOString(),
  };

  return setProfiles(profiles);
}

/**
 * Rename a profile
 */
export function renameProfile(profileId: string, newName: string): boolean {
  const profiles = getProfiles();
  const profile = profiles[profileId];

  if (!profile) {
    return false;
  }

  profiles[profileId] = {
    ...profile,
    name: newName,
    updatedAt: new Date().toISOString(),
  };

  return setProfiles(profiles);
}

/**
 * Duplicate a profile
 */
export function duplicateProfile(profileId: string, newName?: string): string | null {
  const profiles = getProfiles();
  const profile = profiles[profileId];

  if (!profile) {
    return null;
  }

  const newProfileId = generateProfileId();
  const now = new Date().toISOString();

  profiles[newProfileId] = {
    name: newName || `${profile.name} (Copy)`,
    settings: { ...profile.settings },
    createdAt: now,
    updatedAt: now,
  };

  setProfiles(profiles);
  return newProfileId;
}

/**
 * Delete a profile
 */
export function deleteProfile(profileId: string): boolean {
  const profiles = getProfiles();

  if (!profiles[profileId]) {
    return false;
  }

  // Prevent deleting the last profile
  const profileIds = Object.keys(profiles);
  if (profileIds.length <= 1) {
    console.error('Cannot delete the last remaining profile');
    return false;
  }

  delete profiles[profileId];

  // If deleting the active profile, switch to the first remaining profile
  const activeId = getActiveProfileId();
  if (activeId === profileId) {
    const remainingIds = Object.keys(profiles);
    if (remainingIds.length > 0) {
      setActiveProfileId(remainingIds[0]);
    }
  }

  return setProfiles(profiles);
}

/**
 * Get default settings
 */
export function getDefaultSettings(): PersistedSettings {
  return {
    schemaVersion: 1,
  };
}

/**
 * Migrate from legacy single-settings storage to profiles
 * This is called on app initialization if profiles don't exist
 */
export function migrateFromLegacySettings(): { id: string; data: ProfileData } | null {
  // Check if we already have profiles
  const existingProfiles = getProfiles();
  if (Object.keys(existingProfiles).length > 0) {
    return null; // Already migrated
  }

  // Try to load legacy settings
  const legacySettings = storage.getItem<PersistedSettings>(LEGACY_SETTINGS_KEY);

  let settings: PersistedSettings;
  if (legacySettings && isValidPersistedSettings(legacySettings)) {
    // Migrate the legacy settings
    settings = migrateSettings(legacySettings);
  } else {
    // No legacy settings, use defaults
    settings = getDefaultSettings();
  }

  // Create default profile
  const profileId = createProfile('My Profile', settings);
  const profile = getProfile(profileId);

  if (!profile) {
    console.error('Failed to create default profile during migration');
    return null;
  }

  // Set as active profile
  setActiveProfileId(profileId);

  return { id: profileId, data: profile };
}

/**
 * Initialize profiles system
 * Handles migration and ensures at least one profile exists
 */
export function initializeProfiles(): { id: string; data: ProfileData } {
  // Try to get active profile
  let active = getActiveProfile();

  if (active) {
    return active;
  }

  // No active profile, try migration
  const migrated = migrateFromLegacySettings();
  if (migrated) {
    return migrated;
  }

  // Still no profiles? Check if any exist but just no active one set
  const profiles = getProfiles();
  const profileIds = Object.keys(profiles);

  if (profileIds.length > 0) {
    // Profiles exist but no active one, set the first as active
    const firstId = profileIds[0];
    setActiveProfileId(firstId);
    return { id: firstId, data: profiles[firstId] };
  }

  // No profiles at all, create a default one
  const defaultSettings = getDefaultSettings();
  const profileId = createProfile('My Profile', defaultSettings);
  setActiveProfileId(profileId);

  const profile = getProfile(profileId);
  if (!profile) {
    throw new Error('Failed to create default profile');
  }

  return { id: profileId, data: profile };
}
