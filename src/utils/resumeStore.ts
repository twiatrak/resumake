/**
 * Resume storage utilities for localStorage-based resume override management
 */

import { ResumeData } from '../types/resume';
import * as storage from './storage';

const RESUME_OVERRIDE_KEY = 'cividussi-resume-override';

/**
 * Get resume override from localStorage
 * @returns ResumeData if override exists, null otherwise
 */
export function getOverride(): ResumeData | null {
  return storage.getItem<ResumeData>(RESUME_OVERRIDE_KEY);
}

/**
 * Set resume override in localStorage
 * @param resume - Resume data to persist
 * @returns true if successful, false otherwise
 */
export function setOverride(resume: ResumeData): boolean {
  try {
    const success = storage.setItem(RESUME_OVERRIDE_KEY, resume);
    if (!success) {
      console.error('Failed to persist resume override - localStorage may be full');
    }
    return success;
  } catch (error) {
    console.error('Error setting resume override:', error);
    return false;
  }
}

/**
 * Clear resume override from localStorage
 * @returns true if successful, false otherwise
 */
export function clearOverride(): boolean {
  return storage.removeItem(RESUME_OVERRIDE_KEY);
}

/**
 * Light validation to check if data looks like a valid resume
 * @param data - Data to validate
 * @returns true if data has required resume structure
 */
export function isValidResumeLike(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Check for required top-level fields
  if (!data.header || typeof data.header !== 'object') {
    return false;
  }

  // Check for required header fields
  if (!data.header.name || !data.header.email) {
    return false;
  }

  // Check for at least one of the main sections
  const hasExperience = Array.isArray(data.experience);
  const hasEducation = Array.isArray(data.education);
  const hasSkills = data.skills && typeof data.skills === 'object';

  if (!hasExperience && !hasEducation && !hasSkills) {
    return false;
  }

  return true;
}
