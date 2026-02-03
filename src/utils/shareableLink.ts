/**
 * Shareable link utilities for encoding/decoding settings into URL hashes
 */

import LZString from 'lz-string';
import { PersistedSettings, validateAndMigrateSettings } from './settingsSchema';

// Size limit for encoded payload (in bytes)
export const MAX_ENCODED_SIZE = 8192; // 8 KB
export const WARN_ENCODED_SIZE = 5120; // 5 KB

/**
 * Encode settings into a URL-safe compressed string
 * @param settings - Settings to encode
 * @returns Encoded string
 */
export function encodeSettings(settings: PersistedSettings): string {
  try {
    // Convert to JSON
    const json = JSON.stringify(settings);
    
    // Compress using LZ-String with URL-safe base64
    const compressed = LZString.compressToEncodedURIComponent(json);
    
    return compressed;
  } catch (error) {
    throw new Error(`Failed to encode settings: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

/**
 * Decode settings from a URL-safe compressed string
 * @param encoded - Encoded string
 * @returns Decoded settings or null if invalid
 */
export function decodeSettings(encoded: string): { valid: boolean; settings?: PersistedSettings; error?: string } {
  try {
    // Decompress
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    
    if (!decompressed) {
      return { valid: false, error: 'Failed to decompress settings data' };
    }
    
    // Parse JSON
    const parsed = JSON.parse(decompressed);
    
    // Validate and migrate
    return validateAndMigrateSettings(parsed);
  } catch (error) {
    return {
      valid: false,
      error: `Failed to decode settings: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }
}

/**
 * Check the size of an encoded string
 * @param encoded - Encoded string
 * @returns Size in bytes
 */
export function getEncodedSize(encoded: string): number {
  return new Blob([encoded]).size;
}

/**
 * Generate a shareable URL with encoded settings
 * @param settings - Settings to encode
 * @param baseUrl - Base URL (defaults to current location)
 * @returns Object with URL and size information
 */
export function generateShareableUrl(
  settings: PersistedSettings,
  baseUrl?: string
): { url: string; size: number; tooLarge: boolean; shouldWarn: boolean } {
  const encoded = encodeSettings(settings);
  const size = getEncodedSize(encoded);
  
  const base = baseUrl || window.location.href.split('#')[0];
  const url = `${base}#s=${encoded}`;
  
  return {
    url,
    size,
    tooLarge: size > MAX_ENCODED_SIZE,
    shouldWarn: size > WARN_ENCODED_SIZE,
  };
}

/**
 * Parse settings from current URL hash
 * @returns Decoded settings or null if no hash or invalid
 */
export function parseSettingsFromHash(): { valid: boolean; settings?: PersistedSettings; error?: string } | null {
  const hash = window.location.hash;
  
  if (!hash || !hash.startsWith('#')) {
    return null;
  }
  
  // Parse hash parameters
  const params = new URLSearchParams(hash.substring(1));
  const encoded = params.get('s');
  
  if (!encoded) {
    return null;
  }
  
  return decodeSettings(encoded);
}

/**
 * Clear the settings hash from the URL
 */
export function clearSettingsHash(): void {
  if (window.location.hash) {
    // Remove hash without reloading the page
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves when copied
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(textArea);
      }
    }
  } catch (error) {
    throw new Error(`Failed to copy to clipboard: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}
