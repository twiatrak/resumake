/**
 * Deterministic job description analysis utilities
 * Provides keyword extraction, resume term collection, and coverage scoring
 */

// Common English stopwords to filter out
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
  'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how', 'or',
  'can', 'could', 'would', 'should', 'may', 'might', 'must', 'shall',
  'do', 'does', 'did', 'our', 'we', 'you', 'your', 'their', 'them',
  'these', 'those', 'such', 'than', 'then', 'there', 'here', 'all',
  'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'been', 'being', 'am', 'if', 'into', 'out', 'over', 'under', 'again',
]);

/**
 * Normalize and tokenize text
 */
function tokenize(text: string): string[] {
  // Convert to lowercase and split on non-alphanumeric characters
  return text
    .toLowerCase()
    .split(/[^a-z0-9#+.]+/)
    .filter(token => token.length > 0);
}

/**
 * Strip version numbers from a token (e.g., "java17" → "java", "python3" → "python")
 */
function stripVersion(token: string): string {
  // Remove trailing digits and dots
  return token.replace(/[\d.]+$/, '');
}

/**
 * Expand a token to include base and versionless forms
 */
function expandToken(token: string): Set<string> {
  const expanded = new Set<string>();
  expanded.add(token); // Original token
  
  // Add versionless form
  const versionless = stripVersion(token);
  if (versionless && versionless !== token) {
    expanded.add(versionless);
  }
  
  return expanded;
}

/**
 * Extract keywords from job description text
 * Uses frequency-based ranking after stopword removal
 */
export function extractKeywords(text: string): string[] {
  const tokens = tokenize(text);
  
  // Count frequencies, excluding stopwords and short tokens
  const frequency: Record<string, number> = {};
  
  for (const token of tokens) {
    // Skip stopwords and very short tokens (< 2 chars)
    if (STOPWORDS.has(token) || token.length < 2) {
      continue;
    }
    
    frequency[token] = (frequency[token] || 0) + 1;
  }
  
  // Sort by frequency and return top keywords
  const sorted = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
  
  return sorted;
}

/**
 * Collect normalized terms from resume settings
 * Walks through skills and experience bullets to gather tokens
 */
export function collectResumeTerms(settings: any): string[] {
  const terms = new Set<string>();
  
  // Helper to add tokens with expansion
  const addTokens = (text: string) => {
    tokenize(text).forEach(token => {
      if (!STOPWORDS.has(token) && token.length >= 2) {
        // Add all expanded forms: base and versionless
        const expanded = expandToken(token);
        Array.from(expanded).forEach(t => terms.add(t));
      }
    });
  };
  
  // Collect from skills
  if (settings.skills) {
    if (Array.isArray(settings.skills.technical)) {
      settings.skills.technical.forEach((skill: string) => addTokens(skill));
    }
    if (Array.isArray(settings.skills.languages)) {
      settings.skills.languages.forEach((lang: string) => addTokens(lang));
    }
    if (Array.isArray(settings.skills.tools)) {
      settings.skills.tools.forEach((tool: string) => addTokens(tool));
    }
  }
  
  // Collect from experience bullets/highlights
  if (Array.isArray(settings.experience)) {
    settings.experience.forEach((exp: any) => {
      if (Array.isArray(exp.highlights)) {
        exp.highlights.forEach((highlight: string) => addTokens(highlight));
      }
    });
  }
  
  return Array.from(terms);
}

/**
 * Rank coverage of JD keywords in resume
 * Returns coverage score, matching keywords, and missing keywords
 */
export function rankCoverage(
  settings: any,
  jdKeywords: string[]
): {
  score: number;
  hits: string[];
  missing: string[];
  missingTop: string[];
} {
  const resumeTerms = new Set(collectResumeTerms(settings));
  
  const hits: string[] = [];
  const missing: string[] = [];
  
  // Check each JD keyword (treat as phrase) against resume terms
  for (const keyword of jdKeywords) {
    // Tokenize the keyword phrase and check if any token (expanded) matches
    const keywordTokens = tokenize(keyword);
    let matched = false;
    
    for (const token of keywordTokens) {
      if (STOPWORDS.has(token) || token.length < 2) {
        continue;
      }
      
      // Expand token and check for any match
      const expanded = expandToken(token);
      for (const expandedToken of Array.from(expanded)) {
        if (resumeTerms.has(expandedToken)) {
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
    
    if (matched) {
      hits.push(keyword);
    } else {
      missing.push(keyword);
    }
  }
  
  // Calculate coverage score (0-100)
  const score = jdKeywords.length > 0
    ? Math.round((hits.length / jdKeywords.length) * 100)
    : 0;
  
  // Get top 10 missing keywords
  const missingTop = missing.slice(0, 10);
  
  return {
    score,
    hits,
    missing,
    missingTop,
  };
}
