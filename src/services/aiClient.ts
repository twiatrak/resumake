/**
 * AI client for CV tailoring
 * Tries hosted API endpoint if configured, otherwise falls back to local analysis
 */

import { extractKeywords, rankCoverage } from '../utils/jd';

export interface TailorRequest {
  settings: any;
  jobText: string;
}

export interface Suggestion {
  section: 'Skills' | 'Experience';
  type: 'add' | 'rewrite';
  text: string;
  rationale?: string;
}

export interface TailorResponse {
  keywords: string[];
  coverage: {
    score: number;
    hits: string[];
    missing: string[];
    missingTop: string[];
  };
  suggestions: string[];
  structuredSuggestions?: Suggestion[];
}

export interface JsonPatchOp {
  op: 'add' | 'replace' | 'remove';
  path: string;
  value?: any;
}

export interface ApplyRequest {
  resume: any;
  jobText: string;
  selections: Suggestion[];
  options?: {
    strength?: 'conservative' | 'balanced' | 'assertive';
    maxChanges?: number;
    lengthPolicy?: 'reduce' | 'maintain' | 'expand';
    wordDeltaPercent?: number;
  };
}

export interface ApplyResponse {
  resume: any;
  patch: JsonPatchOp[];
  meta: {
    provider: 'openai' | 'fallback';
    model?: string;
    elapsedMs?: number;
  };
  notes?: string;
}

/**
 * Tailor resume to job description
 * Attempts to use API endpoint if configured, falls back to local analysis
 */
export async function aiTailorResume(request: TailorRequest): Promise<TailorResponse> {
  const apiUrl = import.meta.env.VITE_TAILOR_API_URL || '/api/tailor';
  
  // Try API endpoint first
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    
    // If API fails, fall through to local analysis
    console.log('API endpoint not available, using local analysis');
  } catch (error) {
    // Network error or API not available, use local fallback
    console.log('Failed to reach API, using local analysis:', error);
  }
  
  // Fallback: Use local deterministic analysis
  return localTailorResume(request);
}

/**
 * Local deterministic CV tailoring
 * Uses keyword extraction and coverage analysis
 */
function localTailorResume(request: TailorRequest): TailorResponse {
  const { settings, jobText } = request;
  
  // Extract keywords from job description
  const keywords = extractKeywords(jobText);
  
  // Compute coverage
  const coverage = rankCoverage(settings, keywords);
  
  // Generate suggestions based on missing top keywords
  const suggestions: string[] = [];
  
  if (coverage.missingTop.length > 0) {
    suggestions.push('Consider adding the following keywords to your Skills section:');
    coverage.missingTop.slice(0, 10).forEach(keyword => {
      suggestions.push(`• ${keyword}`);
    });
  }
  
  if (coverage.score < 50) {
    suggestions.push('');
    suggestions.push('Your resume has low coverage of the job description keywords. Try to:');
    suggestions.push('• Review the job description and incorporate relevant terms');
    suggestions.push('• Highlight experiences that match the job requirements');
    suggestions.push('• Add relevant skills mentioned in the job posting');
  } else if (coverage.score < 75) {
    suggestions.push('');
    suggestions.push('Your resume has moderate coverage. To improve:');
    suggestions.push('• Consider emphasizing experiences related to the missing keywords');
    suggestions.push('• Add any relevant skills you possess that appear in the job description');
  } else {
    suggestions.push('');
    suggestions.push('Great job! Your resume has good keyword coverage for this position.');
  }
  
  return {
    keywords: keywords.slice(0, 20), // Return top 20 keywords
    coverage,
    suggestions,
  };
}

/**
 * Apply selected tailor suggestions to resume
 * Calls the tailor-apply API endpoint to generate a modified resume
 */
export async function applyTailorSuggestions(request: ApplyRequest): Promise<ApplyResponse> {
  const apiUrl = import.meta.env.VITE_TAILOR_APPLY_API_URL || '/api/tailor-apply';
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API request failed with status ${response.status}`);
  }
  
  return await response.json();
}
