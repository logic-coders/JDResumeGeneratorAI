import React from 'react';

interface MatchReportProps {
  data: {
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    strengths: string[];
    weaknesses: string[];
    overallAnalysis: string;
  };
}

export default function MatchReport({ data }: MatchReportProps) {
  if (!data) return null;
  
  const scoreColor = 
    data.matchScore >= 80 ? 'text-green-500' :
    data.matchScore >= 60 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="w-full mt-4 space-y-4 font-sans">
      <div className="flex items-center justify-between border-b border-[var(--color-panel-border)] pb-2">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Job Match Analysis</h3>
        <div className={`text-2xl font-bold ${scoreColor}`}>
          {data.matchScore}% Match
        </div>
      </div>

      <p className="text-sm text-[var(--color-muted-foreground)]">
        {data.overallAnalysis}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Skills */}
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-green-400 mb-1">Matched Skills</h4>
            <div className="flex flex-wrap gap-1.5">
              {data.matchedSkills?.map((skill, i) => (
                <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                  {skill}
                </span>
              ))}
              {!data.matchedSkills?.length && <span className="text-xs text-gray-500">None</span>}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-red-400 mb-1">Missing Skills</h4>
            <div className="flex flex-wrap gap-1.5">
              {data.missingSkills?.map((skill, i) => (
                <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  {skill}
                </span>
              ))}
              {!data.missingSkills?.length && <span className="text-xs text-gray-500">None</span>}
            </div>
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-[var(--color-foreground)] mb-1">Key Strengths</h4>
            <ul className="text-sm text-[var(--color-muted-foreground)] list-disc pl-4 space-y-1">
              {data.strengths?.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-[var(--color-foreground)] mb-1">Areas for Improvement</h4>
            <ul className="text-sm text-[var(--color-muted-foreground)] list-disc pl-4 space-y-1">
              {data.weaknesses?.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      <div className="pt-2 text-xs text-[var(--color-muted-foreground)] border-t border-[var(--color-panel-border)] flex justify-between">
        <span>Powered by NVIDIA Nemotron-3 550B</span>
      </div>
    </div>
  );
}
