/**
 * Serverless endpoint for applying tailoring suggestions to resume
 * Uses OpenAI to generate JSON Patch operations that modify resume while preserving truthfulness
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Type definitions
interface Suggestion {
  section: 'Skills' | 'Experience';
  type: 'add' | 'rewrite';
  text: string;
  rationale?: string;
}

interface JsonPatchOp {
  op: 'add' | 'replace' | 'remove';
  path: string;
  value?: any;
}

interface ApplyRequest {
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

interface ApplyResponse {
  resume: any;
  patch: JsonPatchOp[];
  meta: {
    provider: 'openai' | 'fallback';
    model?: string;
    elapsedMs?: number;
  };
  notes?: string;
}

// Allowed paths for JSON Patch operations
const ALLOWED_PATH_PATTERNS = [
  /^\/skills\/technical$/,
  /^\/skills\/technical\/-$/,
  /^\/skills\/technical\/\d+$/,  // For replacing/removing individual technical skills by index
  /^\/skills\/languages$/,
  /^\/skills\/languages\/-$/,
  /^\/skills\/languages\/\d+$/,  // For replacing/removing individual languages by index
  /^\/skills\/tools$/,
  /^\/skills\/tools\/-$/,
  /^\/skills\/tools\/\d+$/,  // For replacing/removing individual tools by index
  /^\/summary$/,
  /^\/profile$/,
  /^\/experience\/\d+\/highlights$/,
  /^\/experience\/\d+\/highlights\/-$/,
  /^\/experience\/\d+\/highlights\/\d+$/,  // For replacing/removing individual highlight items
];

// Array fields that support append operations with /-
const ARRAY_FIELDS = ['technical', 'languages', 'tools', 'highlights'];

// Sanitize a JSON Pointer path by normalizing common issues
function sanitizePointer(path: string): string {
  let sanitized = path;
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Replace Unicode dashes with ASCII hyphen
  // U+2013 (–), U+2014 (—), U+2212 (−)
  sanitized = sanitized.replace(/[\u2013\u2014\u2212]/g, '-');
  
  // Strip trailing punctuation (period, comma, semicolon, colon, exclamation, question mark, closing brackets/parens, quotes)
  // Also strip trailing Unicode punctuation
  sanitized = sanitized.replace(/[\.,;:!?\)\]"'\u2019\u201D\u2026]+$/g, '');
  
  // Remove spaces around trailing dash (e.g., "/ -" or " /-" → "/-")
  sanitized = sanitized.replace(/\s*-\s*$/, '-');
  
  // Collapse duplicate slashes to single slash
  sanitized = sanitized.replace(/\/+/g, '/');
  
  // Ensure single leading slash
  if (!sanitized.startsWith('/')) {
    sanitized = '/' + sanitized;
  }
  
  return sanitized;
}

// Normalize a patch operation, including auto-correcting array append targets
function normalizePatchOp(op: JsonPatchOp): { normalized: JsonPatchOp; changed: boolean; note?: string } {
  const originalPath = op.path;
  let normalizedPath = sanitizePointer(originalPath);
  let normalizedOp = op.op;
  let note: string | undefined;
  
  // Auto-correct array append operations
  // If it's an 'add' operation and the path targets an array field without '/-'
  if (op.op === 'add' && !normalizedPath.endsWith('/-')) {
    // Check if path ends with an array field name (with or without trailing slash)
    const pathWithoutTrailingSlash = normalizedPath.replace(/\/$/, '');
    const lastSegment = pathWithoutTrailingSlash.split('/').pop();
    
    if (lastSegment && ARRAY_FIELDS.includes(lastSegment)) {
      // Auto-correct to array append format
      normalizedPath = pathWithoutTrailingSlash + '/-';
      note = `Auto-corrected array append: "${originalPath}" → "${normalizedPath}"`;
    }
  }
  
  // Auto-convert 'add' at skills index to 'replace'
  // Pattern: /skills/(technical|languages|tools)/{index}
  if (op.op === 'add' && /^\/skills\/(technical|languages|tools)\/\d+$/.test(normalizedPath)) {
    normalizedOp = 'replace';
    note = note 
      ? `${note}; Auto-converted add-at-index to replace: "${normalizedPath}"`
      : `Auto-converted add-at-index to replace: "${normalizedPath}"`;
  }
  
  const changed = normalizedPath !== originalPath || normalizedOp !== op.op;
  if (changed && !note) {
    note = `Normalized path: "${originalPath}" → "${normalizedPath}"`;
  }
  
  return {
    normalized: { ...op, op: normalizedOp, path: normalizedPath },
    changed,
    note,
  };
}

// Validate that a path is in the allow-list
function isPathAllowed(path: string): boolean {
  return ALLOWED_PATH_PATTERNS.some(pattern => pattern.test(path));
}

// Validate and normalize patch operations
function validatePatch(patch: JsonPatchOp[]): { 
  valid: boolean; 
  reason?: string; 
  normalizedPatch?: JsonPatchOp[];
  notes?: string[];
} {
  if (!Array.isArray(patch)) {
    return { valid: false, reason: 'Patch must be an array' };
  }

  const normalizedPatch: JsonPatchOp[] = [];
  const notes: string[] = [];

  for (const op of patch) {
    if (!op.op || !op.path) {
      return { valid: false, reason: 'Each operation must have "op" and "path"' };
    }

    if (!['add', 'replace', 'remove'].includes(op.op)) {
      return { valid: false, reason: `Invalid operation: ${op.op}` };
    }

    // Normalize the operation
    const { normalized, changed, note } = normalizePatchOp(op);
    
    if (changed && note) {
      notes.push(note);
    }

    // Validate the normalized path against allow-list
    if (!isPathAllowed(normalized.path)) {
      return { valid: false, reason: `Path not allowed: ${normalized.path}` };
    }

    // For arrays, ensure we're using append operations with /-
    if (normalized.op === 'add' && !normalized.path.includes('/-')) {
      // Check if the path is targeting an array field
      const pathParts = normalized.path.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (ARRAY_FIELDS.includes(lastPart)) {
        return { valid: false, reason: 'Array additions must use /- to append' };
      }
    }

    // Validate skills values for add/replace operations
    if ((normalized.op === 'add' || normalized.op === 'replace') && normalized.value !== undefined) {
      // Check if this is a skills path
      const isSkillsPath = /^\/skills\/(technical|languages|tools)(\/\d+|\/-)?$/.test(normalized.path);
      
      if (isSkillsPath && typeof normalized.value === 'string') {
        const trimmedValue = normalized.value.trim();
        const wordCount = trimmedValue.split(/\s+/).filter(w => w.length > 0).length;
        
        // Skills must be concise: max 3 words and ≤32 characters
        if (wordCount > 3 || trimmedValue.length > 32) {
          return { 
            valid: false, 
            reason: `Skills entries must be concise (≤3 words, ≤32 chars). Got "${trimmedValue}" (${wordCount} words, ${trimmedValue.length} chars). Long phrases belong in summary or experience bullets, not technical skills.`
          };
        }
      }
    }

    normalizedPatch.push(normalized);
  }

  return { valid: true, normalizedPatch, notes: notes.length > 0 ? notes : undefined };
}

// Apply JSON Patch to resume
function applyPatch(resume: any, patch: JsonPatchOp[]): any {
  // Use JSON parse/stringify for compatibility with older Node.js versions
  const result = JSON.parse(JSON.stringify(resume));

  for (const op of patch) {
    const pathParts = op.path.split('/').filter(p => p);
    
    if (op.op === 'add') {
      // Handle array append with /-
      if (op.path.endsWith('/-')) {
        const arrayPath = pathParts.slice(0, -1);
        let target: any = result;
        
        for (let i = 0; i < arrayPath.length - 1; i++) {
          const part = arrayPath[i];
          const index = parseInt(part);
          target = isNaN(index) ? target[part] : target[index];
        }
        
        const lastKey = arrayPath[arrayPath.length - 1];
        const array = isNaN(parseInt(lastKey)) ? target[lastKey] : target[parseInt(lastKey)];
        
        if (Array.isArray(array)) {
          array.push(op.value);
        }
      } else {
        // Regular add operation
        let target: any = result;
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          const index = parseInt(part);
          target = isNaN(index) ? target[part] : target[index];
        }
        
        const lastKey = pathParts[pathParts.length - 1];
        target[lastKey] = op.value;
      }
    } else if (op.op === 'replace') {
      let target: any = result;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        const index = parseInt(part);
        target = isNaN(index) ? target[part] : target[index];
      }
      
      const lastKey = pathParts[pathParts.length - 1];
      const index = parseInt(lastKey);
      if (isNaN(index)) {
        target[lastKey] = op.value;
      } else {
        target[index] = op.value;
      }
    } else if (op.op === 'remove') {
      // Navigate to the parent of the target element to be removed
      let target: any = result;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        const index = parseInt(part);
        target = isNaN(index) ? target[part] : target[index];
      }
      
      // lastKey is the index/key of the element to remove from its parent
      const lastKey = pathParts[pathParts.length - 1];
      const index = parseInt(lastKey);
      
      if (Array.isArray(target)) {
        // Parent is an array, remove element at index
        if (!isNaN(index)) {
          target.splice(index, 1);
        }
      } else if (typeof target === 'object' && target !== null) {
        // Parent is an object, delete property by key
        delete target[lastKey];
      }
    }
  }

  return result;
}

// Count words in resume content
function countResumeWords(resume: any): number {
  let wordCount = 0;
  
  // Count words in summary/profile
  if (resume.summary && typeof resume.summary === 'string') {
    wordCount += resume.summary.split(/\s+/).filter((w: string) => w.length > 0).length;
  }
  if (resume.profile && typeof resume.profile === 'string') {
    wordCount += resume.profile.split(/\s+/).filter((w: string) => w.length > 0).length;
  }
  
  // Count words in skills arrays
  if (resume.skills) {
    ['technical', 'languages', 'tools'].forEach(key => {
      if (Array.isArray(resume.skills[key])) {
        resume.skills[key].forEach((skill: string) => {
          if (typeof skill === 'string') {
            wordCount += skill.split(/\s+/).filter((w: string) => w.length > 0).length;
          }
        });
      }
    });
  }
  
  // Count words in experience highlights
  if (Array.isArray(resume.experience)) {
    resume.experience.forEach((job: any) => {
      if (Array.isArray(job.highlights)) {
        job.highlights.forEach((highlight: string) => {
          if (typeof highlight === 'string') {
            wordCount += highlight.split(/\s+/).filter((w: string) => w.length > 0).length;
          }
        });
      }
    });
  }
  
  return wordCount;
}

// Calculate target word range based on length policy
function calculateWordRange(
  baselineWords: number,
  lengthPolicy: 'reduce' | 'maintain' | 'expand',
  wordDeltaPercent?: number
): { minWords: number; maxWords: number } {
  let delta = wordDeltaPercent;
  
  // Set default delta based on policy if not provided
  if (delta === undefined) {
    if (lengthPolicy === 'reduce') {
      delta = -10;
    } else if (lengthPolicy === 'expand') {
      delta = 10;
    } else {
      delta = 0;
    }
  }
  
  let minWords: number;
  let maxWords: number;
  
  if (lengthPolicy === 'reduce') {
    const lowerBound = Math.max(delta, -10);
    minWords = Math.round(baselineWords * (1 + lowerBound / 100));
    maxWords = baselineWords;
  } else if (lengthPolicy === 'expand') {
    const upperBound = Math.min(delta, 10);
    minWords = baselineWords;
    maxWords = Math.round(baselineWords * (1 + upperBound / 100));
  } else {
    // maintain: ±5% or custom delta
    const absoluteDelta = Math.abs(delta) || 5;
    minWords = Math.round(baselineWords * (1 - absoluteDelta / 100));
    maxWords = Math.round(baselineWords * (1 + absoluteDelta / 100));
  }
  
  return { minWords, maxWords };
}

// Call OpenAI to generate patch
async function generatePatchWithOpenAI(
  resume: any,
  jobText: string,
  selections: Suggestion[],
  options: ApplyRequest['options']
): Promise<{ patch: JsonPatchOp[]; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const strength = options?.strength || 'conservative';
  const maxChanges = options?.maxChanges || 12;
  const lengthPolicy = options?.lengthPolicy || 'maintain';
  
  // Calculate word count and target range
  const baselineWords = countResumeWords(resume);
  const { minWords, maxWords } = calculateWordRange(baselineWords, lengthPolicy, options?.wordDeltaPercent);
  
  // Bullet length guidance based on policy
  const bulletLength = lengthPolicy === 'reduce' ? '~16 words' : lengthPolicy === 'expand' ? '~24 words' : '~20 words';

  const systemPrompt = `You are an expert resume editor. Generate JSON Patch (RFC 6902) operations to apply user-selected suggestions to a resume.

CRITICAL RULES:
1. Output ONLY valid JSON with a "patch" array of operations
2. Only modify these paths:
   - /skills/technical, /skills/languages, /skills/tools (arrays)
   - /summary or /profile (strings)
   - /experience/{index}/highlights (array)
3. Do NOT invent employment history or experiences
4. Keep tone/style similar to original; use concise bullets (${bulletLength})
5. For arrays: use "op": "add", "path": ".../-" to append (EXACTLY "/-", no trailing punctuation)
6. Use "replace" to reword existing content OR to update a skill with a versioned variant
7. Use "remove" to delete irrelevant or low-priority items (especially in reduce mode)
8. Max ${maxChanges} operations
9. Be ${strength === 'conservative' ? 'very cautious, minimal changes' : strength === 'assertive' ? 'more proactive with improvements' : 'balanced'}

SKILLS ARRAY CONSTRAINTS (CRITICAL):
- Skills items (technical, languages, tools) MUST be short labels: 1-3 words, ≤32 characters
- NEVER add soft skills (e.g., "problem-solving", "teamwork", "communication") to skills arrays
- Soft skills belong in summary/profile or experience bullets, NOT under Skills → Technical/Languages/Tools
- Split compound concepts into concise labels or place them in summary/experience
- When adding a versioned skill (e.g., "Java 17"), use "replace" to update the unversioned duplicate (e.g., "Java") instead of adding a new entry
- Avoid duplicates by base term: if "Java" exists and you want to add "Java 17", replace "Java" with "Java 17"
- Examples of VALID skills: "Java", "Kubernetes", "SQL", "Python 3.11", "React"
- Examples of INVALID skills: "Strong problem-solving abilities", "Excellent communication and teamwork", "Leadership and mentoring junior developers"

LENGTH POLICY (${lengthPolicy.toUpperCase()}):
- Current resume word count: ${baselineWords} words
- Target word range: ${minWords}-${maxWords} words
${lengthPolicy === 'reduce' ? `- PREFER replacements and removals over additions
- Actively REMOVE irrelevant skills not tied to the JD or candidate interests
- Remove or consolidate low-impact items to stay within budget
- When adding versioned skills (e.g., "Java 17"), REPLACE unversioned duplicates (e.g., "Java") instead of adding new entries
- If a proposed add would exceed the word budget, convert it into a replacement or pair it with a removal` : ''}
${lengthPolicy === 'maintain' ? `- PREFER replacements over additions
- If adding content, pair it with a replacement or removal to balance word count
- When adding versioned skills (e.g., "Java 17"), REPLACE unversioned duplicates (e.g., "Java") instead of adding new entries
- Actively remove skills that are weakly tied to the JD when making additions` : ''}
${lengthPolicy === 'expand' ? `- Additions allowed when clearly missing from resume
- AVOID redundancy: deduplicate skills by base term
- When adding versioned skills (e.g., "Java 17"), REPLACE unversioned duplicates (e.g., "Java") instead of adding new entries
- Do NOT add generic filler content` : ''}
- Deduplicate skills: if adding "Java 17" and "Java" exists, replace "Java" with "Java 17" instead of adding a new entry

STRICT PATH REQUIREMENTS (RFC 6901):
- Pointers MUST start with "/"
- Array append MUST use exactly "/-" (not "/ -", "/- ", or "/-.")
- NO trailing punctuation (no periods, commas, or other punctuation at end of path)
- Use ASCII hyphen "-" only (never Unicode dashes like – or —)

Output format:
{
  "patch": [
    {"op": "add", "path": "/skills/technical/-", "value": "NewSkill"},
    {"op": "replace", "path": "/skills/technical/0", "value": "Java 17"},
    {"op": "remove", "path": "/skills/technical/5"},
    {"op": "replace", "path": "/experience/0/highlights/1", "value": "Revised bullet point"}
  ]
}`;

  const userPrompt = `Resume:
${JSON.stringify(resume, null, 2)}

Job Description Context:
${jobText}

Selected Suggestions:
${selections.map((s, i) => `${i + 1}. [${s.section} - ${s.type}] ${s.text}${s.rationale ? '\n   Rationale: ' + s.rationale : ''}`).join('\n')}

Generate a JSON Patch to apply these suggestions while following the rules.`;

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

  const parsed = JSON.parse(content);
  const patch = parsed.patch || [];

  return { patch, model };
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  // Parse body
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
      hint: 'Send { "resume": {...}, "jobText": "...", "selections": [...], "options": {...} }',
    });
  }

  try {
    const { resume, jobText, selections, options } = body as ApplyRequest;

    // Validate required fields
    if (!resume || !jobText || !selections) {
      return res.status(400).json({
        error: 'Missing required fields: resume, jobText, selections',
      });
    }

    if (!Array.isArray(selections)) {
      return res.status(400).json({ error: 'selections must be an array' });
    }

    // Check OpenAI availability
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'OpenAI API not configured' });
    }

    let patch: JsonPatchOp[] = [];
    let model: string | undefined;
    let notes: string[] = [];

    try {
      // Generate patch with OpenAI
      const result = await generatePatchWithOpenAI(resume, jobText, selections, options);
      patch = result.patch;
      model = result.model;

      // Validate and normalize patch
      const validation = validatePatch(patch);
      if (!validation.valid) {
        console.error('Patch validation failed:', validation.reason);
        // Fallback: return original resume with notes
        const elapsedMs = Date.now() - startTime;
        return res.status(200).json({
          resume,
          patch: [],
          meta: { provider: 'fallback', elapsedMs },
          notes: `AI generated invalid patch: ${validation.reason}. No changes applied.`,
        } as ApplyResponse);
      }

      // Use normalized patch
      const normalizedPatch = validation.normalizedPatch || patch;
      if (validation.notes) {
        notes = validation.notes;
      }

      // Apply normalized patch
      const updatedResume = applyPatch(resume, normalizedPatch);
      
      // Validate word count after applying patch
      const lengthPolicy = options?.lengthPolicy || 'maintain';
      const baselineWords = countResumeWords(resume);
      const updatedWords = countResumeWords(updatedResume);
      
      // Calculate target word range
      const { minWords, maxWords } = calculateWordRange(baselineWords, lengthPolicy, options?.wordDeltaPercent);
      
      // Check if updated word count is within target range
      if (updatedWords < minWords || updatedWords > maxWords) {
        console.error(`Word count out of range: ${updatedWords} words (target: ${minWords}-${maxWords})`);
        const elapsedMs = Date.now() - startTime;
        return res.status(200).json({
          resume,
          patch: [],
          meta: { provider: 'fallback', elapsedMs },
          notes: `Changes rejected: word count would be ${updatedWords} words (baseline: ${baselineWords}, target range: ${minWords}-${maxWords} for ${lengthPolicy} policy). The AI needs to ${updatedWords > maxWords ? 'reduce' : 'expand'} content to stay within budget. No changes applied.`,
        } as ApplyResponse);
      }
      
      const elapsedMs = Date.now() - startTime;

      const response: ApplyResponse = {
        resume: updatedResume,
        patch: normalizedPatch,
        meta: { provider: 'openai', model, elapsedMs },
      };

      // Include notes if any normalization occurred
      if (notes.length > 0) {
        response.notes = `Applied with path normalization: ${notes.join('; ')}`;
      }

      return res.status(200).json(response);

    } catch (aiError) {
      console.error('AI generation failed:', aiError);
      // Fallback: return original resume with notes
      const elapsedMs = Date.now() - startTime;
      return res.status(200).json({
        resume,
        patch: [],
        meta: { provider: 'fallback', elapsedMs },
        notes: `Failed to generate changes: ${aiError instanceof Error ? aiError.message : 'Unknown error'}. No changes applied.`,
      } as ApplyResponse);
    }

  } catch (error) {
    console.error('Error in tailor-apply endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
