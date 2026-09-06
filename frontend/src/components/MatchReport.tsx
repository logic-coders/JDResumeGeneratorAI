import React from 'react';

interface MatchReportProps {
  data: {
    matchScore?: number;
    overallMatchScore?: number;
    matchedSkills?: string[];
    strongMatches?: string[];
    partialMatches?: string[];
    missingSkills?: string[];
    strengths?: string[];
    weaknesses?: string[];
    recommendations?: string[];
    overallAnalysis?: string;
  };
}

export default function MatchReport({ data }: MatchReportProps) {
  if (!data) return null;

  const score = data.overallMatchScore ?? data.matchScore ?? 0;
  const matched = data.strongMatches ?? data.matchedSkills ?? [];
  const partial = data.partialMatches ?? [];
  const missing = data.missingSkills ?? [];
  const strengths = data.strengths ?? [];
  const recommendations = data.recommendations ?? data.weaknesses ?? [];
  
  const scoreColor = 
    score >= 80 ? 'text-green-500' :
    score >= 60 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="w-full mt-4 space-y-4 font-sans">
      <div className="flex items-center justify-between border-b border-[var(--color-panel-border)] pb-2">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Job Match Analysis</h3>
        <div className={`text-2xl font-bold ${scoreColor}`}>
          {score}% Match
        </div>
      </div>

      {data.overallAnalysis && (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {data.overallAnalysis}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Skills */}
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-green-400 mb-1">Strong Matches</h4>
            <div className="flex flex-wrap gap-1.5">
              {matched.map((skill, i) => (
                <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                  {skill}
                </span>
              ))}
              {!matched.length && <span className="text-xs text-gray-500">None</span>}
            </div>
          </div>

          {partial.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-yellow-400 mb-1">Partial Matches</h4>
              <div className="flex flex-wrap gap-1.5">
                {partial.map((skill, i) => (
                  <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <h4 className="text-sm font-medium text-red-400 mb-1">Missing Skills</h4>
            <div className="flex flex-wrap gap-1.5">
              {missing.map((skill, i) => (
                <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  {skill}
                </span>
              ))}
              {!missing.length && <span className="text-xs text-gray-500">None</span>}
            </div>
          </div>
        </div>

        {/* Strengths & Recommendations */}
        <div className="space-y-3">
          {strengths.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[var(--color-foreground)] mb-1">Key Strengths</h4>
              <ul className="text-sm text-[var(--color-muted-foreground)] list-disc pl-4 space-y-1">
                {strengths.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          
          {recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[var(--color-foreground)] mb-1">Recommendations</h4>
              <ul className="text-sm text-[var(--color-muted-foreground)] list-disc pl-4 space-y-1">
                {recommendations.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      
      <div className="pt-2 text-xs text-[var(--color-muted-foreground)] border-t border-[var(--color-panel-border)] flex justify-between">
        <span>Powered by NVIDIA Nemotron-3 Super 120B</span>
      </div>
    </div>
  );
}
