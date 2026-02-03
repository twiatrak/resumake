/**
 * TailorPanel component for CV tailoring feature
 * Allows users to paste job descriptions and get analysis/suggestions
 */

import React, { useState } from 'react';
import { aiTailorResume, applyTailorSuggestions, Suggestion } from '../services/aiClient';
import { ResumeData } from '../types/resume';

interface TailorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: ResumeData | null;
  onApplyTailoredResume: (updatedResume: ResumeData, notes?: string) => void;
}

interface ParsedSuggestion extends Suggestion {
  index: number;
}

// Pattern for parsing string-based suggestions: [Section - type] text
const SUGGESTION_PATTERN = /^\[(Skills|Experience)\s*-\s*(add|rewrite)\]\s*(.+)$/i;

const TailorPanel: React.FC<TailorPanelProps> = ({ isOpen, onClose, resumeData, onApplyTailoredResume }) => {
  const [jobText, setJobText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [results, setResults] = useState<{
    keywords: string[];
    coverage: {
      score: number;
      hits: string[];
      missing: string[];
      missingTop: string[];
    };
    suggestions: string[];
    structuredSuggestions?: Suggestion[];
  } | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [parsedSuggestions, setParsedSuggestions] = useState<ParsedSuggestion[]>([]);
  const [tailoredResume, setTailoredResume] = useState<any>(null);
  const [applyNotes, setApplyNotes] = useState<string>('');
  
  // Length preference state
  const [lengthPolicy, setLengthPolicy] = useState<'reduce' | 'maintain' | 'expand'>('maintain');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customWordDelta, setCustomWordDelta] = useState<number | null>(null);

  if (!isOpen) {
    return null;
  }

  // Parse string-based suggestions into structured format
  const parseStringSuggestions = (suggestions: string[]): ParsedSuggestion[] => {
    const parsed: ParsedSuggestion[] = [];
    let currentIndex = 0;

    for (let i = 0; i < suggestions.length; i++) {
      const line = suggestions[i].trim();
      
      // Match pattern: [Section - type] text
      const match = line.match(SUGGESTION_PATTERN);
      if (match) {
        const suggestion: ParsedSuggestion = {
          section: match[1] as 'Skills' | 'Experience',
          type: match[2].toLowerCase() as 'add' | 'rewrite',
          text: match[3],
          index: currentIndex++,
        };
        
        // Check if next line is a rationale (starts with →)
        if (i + 1 < suggestions.length && suggestions[i + 1].trim().startsWith('→')) {
          suggestion.rationale = suggestions[i + 1].trim().substring(1).trim();
          i++; // Skip the rationale line
        }
        
        parsed.push(suggestion);
      }
    }

    return parsed;
  };

  const handleAnalyze = async () => {
    if (!jobText.trim()) {
      return;
    }

    if (!resumeData) {
      alert('No resume data available. Please load a resume first.');
      return;
    }

    setIsAnalyzing(true);
    setTailoredResume(null);
    setApplyNotes('');
    try {
      // Run analysis with resume from props
      const result = await aiTailorResume({
        settings: resumeData,
        jobText,
      });

      setResults(result);
      
      // Parse suggestions
      let structured: ParsedSuggestion[];
      if (result.structuredSuggestions && result.structuredSuggestions.length > 0) {
        structured = result.structuredSuggestions.map((s, i) => ({ ...s, index: i }));
      } else {
        structured = parseStringSuggestions(result.suggestions);
      }
      setParsedSuggestions(structured);
      setSelectedSuggestions(new Set());
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Failed to analyze job description. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setJobText('');
    setResults(null);
    setParsedSuggestions([]);
    setSelectedSuggestions(new Set());
    setTailoredResume(null);
    setApplyNotes('');
  };

  const toggleSuggestion = (index: number) => {
    const newSet = new Set(selectedSuggestions);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedSuggestions(newSet);
  };

  const handleApplySelected = async () => {
    if (selectedSuggestions.size === 0) {
      alert('Please select at least one suggestion to apply.');
      return;
    }

    if (!resumeData) {
      alert('No resume data available. Please load a resume first.');
      return;
    }

    setIsApplying(true);
    setApplyNotes('');
    try {
      // Get selected suggestions
      const selections = parsedSuggestions.filter(s => selectedSuggestions.has(s.index));

      // Call apply endpoint
      const result = await applyTailorSuggestions({
        resume: resumeData,
        jobText,
        selections,
        options: {
          strength: 'conservative',
          maxChanges: 12,
          lengthPolicy,
          wordDeltaPercent: customWordDelta ?? undefined,
        },
      });

      setTailoredResume(result.resume);
      if (result.notes) {
        setApplyNotes(result.notes);
      }

      // Apply to current CV immediately
      onApplyTailoredResume(result.resume, result.notes);

      // Show success message and close panel
      if (result.meta.provider === 'openai') {
        alert(`Successfully applied ${result.patch.length} changes to your resume!`);
        // Close panel after successful apply
        onClose();
      } else {
        alert('Could not apply changes. See notes below.');
      }
    } catch (error) {
      console.error('Apply failed:', error);
      alert(`Failed to apply suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsApplying(false);
    }
  };

  const handleDownloadResume = () => {
    if (!tailoredResume) return;

    const blob = new Blob([JSON.stringify(tailoredResume, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tailored-resume.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 print:hidden overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 my-8 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Tailor CV</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            title="Close"
          >
            ×
          </button>
        </div>

        <p className="text-gray-700 mb-4">
          Paste a job description below to analyze how well your resume matches and get suggestions for improvement.
        </p>

        {/* Job Description Input */}
        <div className="mb-6">
          <label htmlFor="job-description" className="block text-sm font-medium text-gray-700 mb-2">
            Job Description
          </label>
          <textarea
            id="job-description"
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="Paste the job description here..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleAnalyze}
            disabled={!jobText.trim() || isAnalyzing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze (Local)'}
          </button>
          <button
            onClick={handleReset}
            disabled={isAnalyzing}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
        </div>

        {/* Results */}
        {results && (
          <div className="border-t pt-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Analysis Results</h3>

            {/* Coverage Score */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Keyword Coverage</span>
                <span className={`text-2xl font-bold ${
                  results.coverage.score >= 75 ? 'text-green-600' :
                  results.coverage.score >= 50 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {results.coverage.score}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    results.coverage.score >= 75 ? 'bg-green-600' :
                    results.coverage.score >= 50 ? 'bg-yellow-600' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${results.coverage.score}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {results.coverage.hits.length} of {results.keywords.length} top keywords found in your resume
              </p>
            </div>

            {/* Top Keywords */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Top Keywords from Job Description</h4>
              <div className="flex flex-wrap gap-2">
                {results.keywords.slice(0, 15).map((keyword, index) => (
                  <span
                    key={index}
                    className={`px-3 py-1 rounded-full text-sm ${
                      results.coverage.hits.includes(keyword)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {keyword}
                    {results.coverage.hits.includes(keyword) && ' ✓'}
                  </span>
                ))}
              </div>
            </div>

            {/* Missing Keywords */}
            {results.coverage.missingTop.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Top Missing Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {results.coverage.missingTop.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {parsedSuggestions.length > 0 && (
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Suggestions</h4>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded space-y-3">
                  {parsedSuggestions.map((suggestion) => (
                    <div key={suggestion.index} className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id={`suggestion-${suggestion.index}`}
                        checked={selectedSuggestions.has(suggestion.index)}
                        onChange={() => toggleSuggestion(suggestion.index)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`suggestion-${suggestion.index}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          [{suggestion.section} - {suggestion.type}] {suggestion.text}
                        </div>
                        {suggestion.rationale && (
                          <div className="text-xs text-gray-600 mt-1">
                            → {suggestion.rationale}
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
                
                {/* Length Preference Controls */}
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                  <h5 className="text-sm font-semibold text-gray-900 mb-3">Length Preference</h5>
                  
                  {/* Length Policy Radio Buttons */}
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="lengthPolicy"
                        value="reduce"
                        checked={lengthPolicy === 'reduce'}
                        onChange={() => {
                          setLengthPolicy('reduce');
                          setCustomWordDelta(null);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700">
                        Reduce <span className="text-xs text-gray-500">(~-10% words)</span>
                      </span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="lengthPolicy"
                        value="maintain"
                        checked={lengthPolicy === 'maintain'}
                        onChange={() => {
                          setLengthPolicy('maintain');
                          setCustomWordDelta(null);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700">
                        Maintain <span className="text-xs text-gray-500">(±5% words)</span>
                      </span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="lengthPolicy"
                        value="expand"
                        checked={lengthPolicy === 'expand'}
                        onChange={() => {
                          setLengthPolicy('expand');
                          setCustomWordDelta(null);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700">
                        Expand <span className="text-xs text-gray-500">(~+10% words)</span>
                      </span>
                    </label>
                  </div>
                  
                  {/* Help Text */}
                  <p className="text-xs text-gray-600 mb-2">
                    {lengthPolicy === 'reduce' && 'AI will favor replacements and removals to reduce word count.'}
                    {lengthPolicy === 'maintain' && 'AI will keep word count similar to original, preferring replacements.'}
                    {lengthPolicy === 'expand' && 'AI will allow additions when content is clearly missing, avoiding redundancy.'}
                  </p>
                  
                  {/* Advanced Controls Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-blue-600 hover:text-blue-700 underline mt-1"
                  >
                    {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                  </button>
                  
                  {/* Advanced: Custom Word Delta Slider */}
                  {showAdvanced && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Word Change Boundary: {customWordDelta ?? (lengthPolicy === 'reduce' ? -10 : lengthPolicy === 'expand' ? 10 : 0)}%
                      </label>
                      <input
                        type="range"
                        min="-30"
                        max="30"
                        step="5"
                        value={customWordDelta ?? (lengthPolicy === 'reduce' ? -10 : lengthPolicy === 'expand' ? 10 : 0)}
                        onChange={(e) => setCustomWordDelta(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>-30%</span>
                        <span>0%</span>
                        <span>+30%</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        Customize the target word count change. Negative values reduce, positive values expand.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Apply Button */}
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleApplySelected}
                    disabled={selectedSuggestions.size === 0 || isApplying}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isApplying ? 'Applying...' : `Apply Selected (${selectedSuggestions.size})`}
                  </button>
                  {tailoredResume && (
                    <button
                      onClick={handleDownloadResume}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Download Tailored Resume
                    </button>
                  )}
                </div>
                
                {/* Apply Notes */}
                {applyNotes && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-gray-700">
                    <strong>Note:</strong> {applyNotes}
                  </div>
                )}
                
                {/* Success Message */}
                {tailoredResume && !applyNotes && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                    ✓ Successfully applied changes! Download your tailored resume above.
                  </div>
                )}
              </div>
            )}

            {/* Fallback suggestions (non-structured) */}
            {parsedSuggestions.length === 0 && results.suggestions.length > 0 && (
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Suggestions</h4>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  {results.suggestions.map((suggestion, index) => (
                    <p key={index} className="text-sm text-gray-700 mb-1">
                      {suggestion}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-600 mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
              <strong>Note:</strong> This analysis is performed locally using deterministic keyword matching.
              Future versions may include AI-powered suggestions via a hosted API endpoint.
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TailorPanel;
