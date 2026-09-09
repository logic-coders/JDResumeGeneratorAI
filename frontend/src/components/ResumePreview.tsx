import React from 'react';
import { getResumePdfUrl, getResumeTexUrl } from '../lib/api';

interface ResumePreviewProps {
  data: {
    resumeId?: string;
    company?: string;
    jobTitle?: string;
    jobId?: string;
    folderPath?: string;
    version?: number;
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
                <div className="mt-2 text-xs text-red-400 line-through opacity-70 whitespace-pre-wrap">
                  {typeof sug.original === 'object' ? JSON.stringify(sug.original, null, 2) : String(sug.original)}
                </div>
              )}
              {sug.improved && (
                <div className="mt-1 text-xs text-green-400 whitespace-pre-wrap">
                  {typeof sug.improved === 'object' ? JSON.stringify(sug.improved, null, 2) : String(sug.improved)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const resumeId = data.resumeId || '';
  const pdfUrl = getResumePdfUrl(resumeId);
  const texUrl = getResumeTexUrl(resumeId);

  // It's a generated custom resume
  return (
    <div className="w-full mt-4 space-y-4 font-sans">
      <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] p-6 rounded-xl shadow-lg border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2.414L18.586 10H13V4.414zM18 20H6V4h5v7h7v9z"/></svg>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-xl font-bold text-white">Resume Generated!</h3>
            {data.company && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 text-white font-medium backdrop-blur-sm">
                🏢 {data.company}
              </span>
            )}
            {data.version && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 font-medium">
                Latest (v{data.version})
              </span>
            )}
          </div>

          {data.jobTitle && (
            <p className="text-white/95 text-sm font-semibold mb-1">
              {data.jobTitle}
            </p>
          )}

          <p className="text-white/80 text-sm max-w-md mb-3">
            We've tailored your master resume to highlight the requirements and skills for this role.
          </p>

          {data.folderPath && (
            <div className="mb-4 bg-black/25 backdrop-blur-sm border border-white/15 px-3 py-1.5 rounded-lg text-xs font-mono text-blue-100 flex items-center gap-2 max-w-lg truncate">
              <span>📂</span>
              <span className="truncate">Saved to: {data.folderPath}</span>
            </div>
          )}
          
          <div className="flex gap-3 flex-wrap">
            <a 
              href={pdfUrl}
              download={`${data.company || 'Company'}_Resume.pdf`}
              className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm"
            >
              <span>⬇️</span> Download PDF
            </a>
            
            <button 
              className="bg-black/30 backdrop-blur-sm text-white border border-white/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-black/40 transition-colors flex items-center gap-2"
              onClick={() => {
                window.open(pdfUrl, '_blank');
              }}
            >
              <span>👁️</span> Preview
            </button>

            <a
              href={texUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-black/20 backdrop-blur-sm text-white/90 border border-white/15 px-3 py-2 rounded-lg text-sm font-medium hover:bg-black/30 transition-colors flex items-center gap-2"
            >
              <span>📄</span> LaTeX
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
