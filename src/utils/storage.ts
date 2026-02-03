/**
 * Safe localStorage utilities with JSON serialization/deserialization
 */

/**
 * Get an item from localStorage and parse it as JSON
 * @param key - localStorage key
 * @returns parsed value or null if not found or error occurs
 */
export function getItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return null;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error getting item from localStorage (${key}):`, error);
    return null;
  }
}

/**
 * Set an item in localStorage with JSON serialization
 * @param key - localStorage key
 * @param value - value to store (will be JSON stringified)
 * @returns true if successful, false otherwise
 */
export function setItem<T>(key: string, value: T): boolean {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error(`Error setting item in localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Remove an item from localStorage
 * @param key - localStorage key
 * @returns true if successful, false otherwise
 */
export function removeItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing item from localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Export settings as a JSON file download
 * @param settings - settings object to export
 * @param filename - filename for the download (default: cividussi-settings-v1.json)
 */
export function exportSettings(settings: any, filename: string = 'cividussi-settings-v1.json'): void {
  exportJsonFile(filename, settings);
}

/**
 * Import settings from a JSON file
 * @returns Promise that resolves with the parsed settings object
 */
export function importSettings(): Promise<any> {
  return importJsonFile();
}

/**
 * Generic helper to export any data as a JSON file
 * @param name - filename for the download
 * @param data - data to export (will be JSON stringified)
 */
export function exportJsonFile(name: string, data: any): void {
  try {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting JSON file:', error);
    throw new Error('Failed to export JSON file');
  }
}

/**
 * Generic helper to import any JSON file
 * @returns Promise that resolves with the parsed data
 */
export function importJsonFile(): Promise<any> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        resolve(data);
      } catch (error) {
        reject(new Error('Failed to parse JSON file'));
      }
    };
    
    input.oncancel = () => {
      reject(new Error('File selection cancelled'));
    };
    
    input.click();
  });
}
