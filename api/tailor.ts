/**
 * Serverless AI endpoint for CV tailoring
 * Uses OpenAI (default) or Ollama for intelligent keyword extraction and categorization
 */

//import 'undici/register';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Type definitions
interface KeywordData {
  term: string;
  category: 'language' | 'framework' | 'platform' | 'tool' | 'cert' | 'soft' | 'role' | 'library' | 'cloud' | 'db';
  importance: 1 | 2 | 3 | 4 | 5;
  variants?: string[];
}

interface Suggestion {
  section: 'Skills' | 'Experience';
  type: 'add' | 'rewrite';
  text: string;
  rationale?: string;
}

interface AIResponse {
  keywords: KeywordData[];
  suggestions: Suggestion[];
}

interface TailorRequest {
  settings: any;
  jobText: string;
}

interface TailorResponse {
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

// Category weights for coverage scoring
const CATEGORY_WEIGHTS: Record<string, number> = {
  language: 1.0,
  framework: 0.9,
  platform: 0.9,
  tool: 0.8,
  cloud: 0.9,
  db: 0.9,
  library: 0.7,
  cert: 0.6,
  role: 0.3,
  soft: 0.2,
};

// Synonyms mapping for better matching
const SYNONYMS: Record<string, string[]> = {
  kubernetes: ['k8s', 'kubernetes', 'kube'],
  javascript: ['js', 'javascript', 'ecmascript'],
  typescript: ['ts', 'typescript'],
  node: ['node', 'nodejs', 'node.js'],
  postgresql: ['postgres', 'postgresql', 'psql'],
  'gitlab-ci': ['gitlab-ci', 'gitlab ci'],
  cicd: ['ci/cd', 'cicd', 'ci-cd'],
  docker: ['docker', 'containers'],
  python: ['python', 'py'],
  react: ['react', 'reactjs', 'react.js'],
  vue: ['vue', 'vuejs', 'vue.js'],
  angular: ['angular', 'angularjs'],
  aws: ['aws', 'amazon web services'],
  gcp: ['gcp', 'google cloud', 'google cloud platform'],
  azure: ['azure', 'microsoft azure'],
};

// Normalize a term for matching
function normalizeTerm(term: string): string {
  return term.toLowerCase().trim().replace(/[^a-z0-9#+.]/g, '');
}

// Tokenize text into lowercase tokens
function tokenizeLower(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9#+.]+/)
    .filter(t => t.length >= 2);
}

// Strip version numbers from a token (e.g., "java17" → "java", "react18" → "react")
function stripVersion(token: string): string {
  // Remove trailing digits and dots (e.g., "java17", "node.js", "python3.11")
  return token.replace(/[\d.]+$/, '');
}

// Expand a token to include versionless and canonical forms using synonyms
function expandTokenSynonyms(token: string): Set<string> {
  const expanded = new Set<string>();
  expanded.add(token); // Original token
  
  // Add versionless form
  const versionless = stripVersion(token);
  if (versionless && versionless !== token) {
    expanded.add(versionless);
  }
  
  // Add canonical form(s) via getCanonicalTerm
  const canonical = getCanonicalTerm(token);
  if (canonical !== token) {
    // The canonical itself might be a single word or phrase; tokenize and add all parts
    const canonicalTokens = tokenizeLower(canonical);
    canonicalTokens.forEach(ct => expanded.add(ct));
  }
  
  // Also try canonical of versionless
  if (versionless && versionless !== token) {
    const canonicalVersionless = getCanonicalTerm(versionless);
    if (canonicalVersionless !== versionless) {
      const cvTokens = tokenizeLower(canonicalVersionless);
      cvTokens.forEach(ct => expanded.add(ct));
    }
  }
  
  return expanded;
}

// Convert a phrase to a set of comparable tokens (tokenized and expanded)
function phraseToComparableTokens(phrase: string): Set<string> {
  const comparableTokens = new Set<string>();
  const tokens = tokenizeLower(phrase);
  
  for (const token of tokens) {
    const expanded = expandTokenSynonyms(token);
    Array.from(expanded).forEach(t => comparableTokens.add(t));
  }
  
  return comparableTokens;
}

// Build a reverse synonym map for efficient lookup
function buildSynonymMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const [canonical, variants] of Object.entries(SYNONYMS)) {
    for (const variant of variants) {
      map.set(normalizeTerm(variant), canonical);
    }
  }
  return map;
}

const synonymMap = buildSynonymMap();

// Get canonical term if it's a known synonym
function getCanonicalTerm(term: string): string {
  const normalized = normalizeTerm(term);
  return synonymMap.get(normalized) || term.toLowerCase();
}

// Collect normalized terms from resume settings
function collectResumeTerms(settings: any): Set<string> {
  const terms = new Set<string>();

  // Helper to add tokens from text with expansion
  const addTokens = (text: string) => {
    const tokens = tokenizeLower(text);

    for (const token of tokens) {
      // Add all expanded forms: base, versionless, canonical
      const expanded = expandTokenSynonyms(token);
      Array.from(expanded).forEach(t => terms.add(t));
    }
  };

  // Collect from skills
  if (settings?.skills) {
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

  // Collect from experience
  if (Array.isArray(settings?.experience)) {
    settings.experience.forEach((exp: any) => {
      if (exp?.position) addTokens(exp.position);
      if (Array.isArray(exp?.highlights)) {
        exp.highlights.forEach((h: string) => addTokens(h));
      }
    });
  }

  return terms;
}

// Calculate weighted coverage score
function calculateCoverage(
  keywords: KeywordData[],
  resumeTerms: Set<string>
): TailorResponse['coverage'] {
  const hits: string[] = [];
  const missing: string[] = [];
  let totalWeight = 0;
  let matchedWeight = 0;

  for (const kw of keywords) {
    const weight = (CATEGORY_WEIGHTS[kw.category] || 0.5) * (kw.importance / 5);
    totalWeight += weight;

    // Check if term or any variant has token-level overlap with resume
    const termsToCheck = [kw.term, ...(kw.variants || [])];
    let matched = false;
    
    for (const term of termsToCheck) {
      const comparableTokens = phraseToComparableTokens(term);
      // Match if ANY comparable token exists in resumeTerms
      for (const token of Array.from(comparableTokens)) {
        if (resumeTerms.has(token)) {
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    if (matched) {
      hits.push(kw.term);
      matchedWeight += weight;
    } else {
      missing.push(kw.term);
    }
  }

  const score = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;
  const missingTop = missing.slice(0, 10);

  return { score, hits, missing, missingTop };
}

// Call OpenAI API
async function callOpenAI(jobText: string, settings: any): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const systemPrompt = `You are an expert technical recruiter and career advisor. Your task is to analyze a job description and extract relevant keywords with categorization and importance scoring.

Instructions:
- Extract technical keywords, skills, tools, and requirements
- Categorize each keyword: language, framework, platform, tool, cert, soft, role, library, cloud, db
- Assign importance 1-5 (5=critical, 1=nice-to-have)
- Include common variants (e.g., kubernetes/k8s, javascript/js)
- Generate truthful suggestions for Skills or Experience sections
- Do NOT invent experience; focus on honest rewrites
- Prefer concise bullet points
- Output ONLY valid JSON, no markdown or explanation`;

  const userPrompt = `Job Description:
${jobText}

Current Resume Skills: ${JSON.stringify(settings?.skills || {})}

Analyze the job description and return JSON with this exact structure:
{
  "keywords": [
    {
      "term": "keyword",
      "category": "language|framework|platform|tool|cert|soft|role|library|cloud|db",
      "importance": 1-5,
      "variants": ["optional", "aliases"]
    }
  ],
  "suggestions": [
    {
      "section": "Skills|Experience",
      "type": "add|rewrite",
      "text": "suggestion text",
      "rationale": "optional explanation"
    }
  ]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = (await response.json()) as any;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  return JSON.parse(content);
}

// Call Ollama API
async function callOllama(jobText: string, settings: any): Promise<AIResponse> {
  const ollamaHost = process.env.OLLAMA_HOST;
  if (!ollamaHost) {
    throw new Error('OLLAMA_HOST not configured');
  }

  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';

  const systemPrompt = `You are an expert technical recruiter. Extract keywords from job descriptions with categories and importance. Output ONLY valid JSON.`;

  const userPrompt = `Job Description:
${jobText}

Skills: ${JSON.stringify(settings?.skills || {})}

Return JSON:
{
  "keywords": [{"term": "str", "category": "language|framework|platform|tool|cert|soft|role|library|cloud|db", "importance": 1-5, "variants": []}],
  "suggestions": [{"section": "Skills|Experience", "type": "add|rewrite", "text": "str"}]
}`;

  const response = await fetch(`${ollamaHost}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
      format: 'json',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama API error: ${response.status} ${error}`);
  }

  const data = (await response.json()) as any;
  const content = data.message?.content;

  if (!content) {
    throw new Error('No content in Ollama response');
  }

  return JSON.parse(content);
}

// Fallback to deterministic analysis
function fallbackAnalysis(jobText: string, settings: any): TailorResponse {
  // Simple keyword extraction (copied from jd.ts logic)
  const stopwords = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with']);

  const tokens = tokenizeLower(jobText);

  const frequency: Record<string, number> = {};
  for (const token of tokens) {
    if (token.length >= 2 && !stopwords.has(token)) {
      frequency[token] = (frequency[token] || 0) + 1;
    }
  }

  const keywords = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 30);

  const resumeTerms = collectResumeTerms(settings);
  const hits: string[] = [];
  const missing: string[] = [];

  // Token-level matching: check if any expanded form of keyword is in resumeTerms
  for (const kw of keywords) {
    const expanded = expandTokenSynonyms(kw);
    let matched = false;
    for (const token of Array.from(expanded)) {
      if (resumeTerms.has(token)) {
        matched = true;
        break;
      }
    }
    if (matched) {
      hits.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const score = keywords.length > 0 ? Math.round((hits.length / keywords.length) * 100) : 0;
  const missingTop = missing.slice(0, 10);

  const suggestions: string[] = [];
  if (missingTop.length > 0) {
    suggestions.push('Consider adding the following keywords to your Skills section:');
    missingTop.forEach(kw => suggestions.push(`• ${kw}`));
  }

  return {
    keywords: keywords.slice(0, 20),
    coverage: { score, hits, missing, missingTop },
    suggestions,
  };
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Be defensive about body shape: it may be undefined or a string in some setups.
  let body: any = (req as any).body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Malformed JSON body' });
    }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({
      error: 'Missing JSON body',
      hint: 'Send Content-Type: application/json and include { "settings": {...}, "jobText": "..." }'
    });
  }

  try {
    const { settings, jobText } = body as TailorRequest;

    if (!jobText || !settings) {
      return res.status(400).json({ error: 'Missing required fields: settings, jobText' });
    }

    // Check if any provider is configured
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasOllama = !!process.env.OLLAMA_HOST;

    if (!hasOpenAI && !hasOllama) {
      return res.status(503).json({ error: 'AI provider not configured' });
    }

    let aiResponse: AIResponse;

    try {
      // Try Ollama first if configured, otherwise use OpenAI
      if (hasOllama) {
        console.log('Using Ollama for CV tailoring');
        aiResponse = await callOllama(jobText, settings);
      } else {
        console.log('Using OpenAI for CV tailoring');
        aiResponse = await callOpenAI(jobText, settings);
      }

      // Validate response structure
      if (!aiResponse.keywords || !Array.isArray(aiResponse.keywords)) {
        throw new Error('Invalid AI response structure');
      }

    } catch (aiError) {
      console.error('AI provider failed, falling back to deterministic analysis:', aiError);
      // Fallback to deterministic analysis
      const fallback = fallbackAnalysis(jobText, settings);
      return res.status(200).json(fallback);
    }

    // Collect resume terms
    const resumeTerms = collectResumeTerms(settings);

    // Calculate weighted coverage
    const coverage = calculateCoverage(aiResponse.keywords, resumeTerms);

    // Extract top keywords by weight
    const topKeywords = aiResponse.keywords
      .map(kw => ({
        term: kw.term,
        weight: (CATEGORY_WEIGHTS[kw.category] || 0.5) * (kw.importance / 5),
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 20)
      .map(k => k.term);

    // Format suggestions as strings
    const suggestions: string[] = [];
    if (aiResponse.suggestions && Array.isArray(aiResponse.suggestions)) {
      aiResponse.suggestions.forEach(s => {
        suggestions.push(`[${s.section} - ${s.type}] ${s.text}`);
        if (s.rationale) {
          suggestions.push(`  → ${s.rationale}`);
        }
      });
    }

    // Add coverage-based suggestions if score is low
    if (coverage.score < 50) {
      suggestions.push('');
      suggestions.push('Your resume has low coverage of the job description keywords.');
      suggestions.push('Consider incorporating more relevant terms from the missing keywords list.');
    } else if (coverage.score < 75) {
      suggestions.push('');
      suggestions.push('Your resume has moderate coverage. Focus on the top missing keywords to improve.');
    }

    const response: TailorResponse = {
      keywords: topKeywords,
      coverage,
      suggestions,
      structuredSuggestions: aiResponse.suggestions,
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error in tailor endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
