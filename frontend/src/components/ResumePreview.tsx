import React from 'react';

interface ResumePreviewProps {
  data: {
    resumeId?: string;
    resume?: any;
    improvements?: any;
  };
}

export default function ResumePreview({ data }: ResumePreviewProps) {
  if (!data) return null;
  
  const isImprovement = !!data.improvements;
  
  if (isImprovement) {
    return (
      <div className="w-full mt-4 space-y-4 font-sans bg-[var(--color-secondary)] border border-[var(--color-panel-border)] p-4 rounded-xl">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)] flex items-center gap-2">
          <span>✨</span> Resume Improvement Suggestions
        </h3>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {data.improvements.summary}
        </p>
        <div className="space-y-3 mt-4">
          {data.improvements.suggestions?.map((sug: any, i: number) => (
            <div key={i} className="bg-black/20 p-3 rounded-lg border border-[var(--color-panel-border)]">
              <h4 className="text-sm font-medium text-[var(--color-accent)]">{sug.section}</h4>
              <p className="text-sm text-[var(--color-foreground)] mt-1">{sug.suggestion}</p>
              {sug.original && (
                <div className="mt-2 text-xs text-red-400 line-through opacity-70">
                  {sug.original}
                </div>
              )}
              {sug.improved && (
                <div className="mt-1 text-xs text-green-400">
                  {sug.improved}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // It's a generated custom resume
  return (
    <div className="w-full mt-4 space-y-4 font-sans">
      <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] p-6 rounded-xl shadow-lg border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2.414L18.586 10H13V4.414zM18 20H6V4h5v7h7v9z"/></svg>
        </div>
        
        <div className="relative z-10">
          <h3 className="text-xl font-bold text-white mb-2">Resume Generated!</h3>
          <p className="text-white/80 text-sm max-w-md mb-6">
            We've tailored your master resume to specifically highlight the skills and experiences most relevant to this job description. A customized PDF has been compiled via LaTeX.
          </p>
          
          <div className="flex gap-3">
            <button 
              className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm"
              onClick={() => {
                // In a real app, this would trigger a download via API
                alert(`Downloading PDF for ${data.resumeId}...`);
              }}
            >
              <span>⬇️</span> Download PDF
            </button>
            
            <button 
              className="bg-black/30 backdrop-blur-sm text-white border border-white/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-black/40 transition-colors flex items-center gap-2"
              onClick={() => {
                alert(`Opening preview for ${data.resumeId}...`);
              }}
            >
              <span>👁️</span> Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
