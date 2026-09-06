'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Download, 
  Eye, 
  FileCode, 
  ExternalLink, 
  Folder, 
  Building2, 
  Search, 
  RefreshCw,
  Sparkles,
  Calendar,
  CheckCircle2,
  FileText,
  Copy,
  Check,
  Trash2
} from 'lucide-react';
import type { GeneratedResumeItem } from '../lib/types';
import * as api from '../lib/api';

interface GeneratedResumesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCountChange?: () => void;
}

export default function GeneratedResumesModal({ isOpen, onClose, onCountChange }: GeneratedResumesModalProps) {
  const [resumes, setResumes] = useState<GeneratedResumeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTex, setSelectedTex] = useState<{ title: string; content: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | string>('all');
  const [mounted, setMounted] = useState<boolean>(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const data = await api.getGeneratedResumes();
      setResumes(data || []);
    } catch (err) {
      console.error('Failed to load generated resumes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchResumes();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (selectedTex) {
          setSelectedTex(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedTex, onClose]);

  if (!isOpen || !mounted) return null;

  // Filter resumes by search query
  const filteredResumes = resumes.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      (r.company && r.company.toLowerCase().includes(q)) ||
      (r.jobTitle && r.jobTitle.toLowerCase().includes(q)) ||
      (r.jobId && r.jobId.toLowerCase().includes(q))
    );
  });

  // Group by Company
  const groupedByCompany: Record<string, GeneratedResumeItem[]> = {};
  filteredResumes.forEach((r) => {
    const comp = r.company || 'General';
    if (!groupedByCompany[comp]) {
      groupedByCompany[comp] = [];
    }
    groupedByCompany[comp].push(r);
  });

  const companies = Object.keys(groupedByCompany);

  const handleViewTex = async (r: GeneratedResumeItem) => {
    try {
      const url = api.getResumeTexUrl(r.resumeId || r.id || '');
      const resp = await fetch(url);
      const text = await resp.text();
      setSelectedTex({
        title: `${r.company} - ${r.jobTitle} (LaTeX Source)`,
        content: text,
      });
    } catch (err) {
      console.error('Failed to fetch TeX source:', err);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const handleDeleteConfirm = async (resume: GeneratedResumeItem) => {
    const id = resume.resumeId || resume.id || '';
    if (!id) return;
    setIsDeleting(true);
    try {
      await api.deleteGeneratedResume(id);
    } catch (err) {
      console.warn('Delete warning (proceeding with local removal):', err);
    } finally {
      setResumes((prev) => prev.filter((r) => (r.resumeId || r.id) !== id));
      onCountChange?.();
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-panel-border)] bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Folder size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Generated Resumes
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-normal border border-blue-500/30">
                  {resumes.length} {resumes.length === 1 ? 'resume' : 'resumes'}
                </span>
              </h2>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Stored company-wise in <code className="text-blue-300 bg-blue-950/40 px-1 py-0.5 rounded">Generated Resumes/</code> with latest versions preserved.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchResumes}
              title="Refresh resumes"
              className="p-2 rounded-lg hover:bg-slate-800 text-[var(--color-muted-foreground)] hover:text-white transition-colors"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-[var(--color-muted-foreground)] hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-[var(--color-panel-border)] bg-slate-900/30 flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
            <input
              type="text"
              placeholder="Search by Company, Role, or Job ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#182030] border border-[var(--color-panel-border)] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          {companies.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto py-1 max-w-md md:max-w-lg scrollbar-thin">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-[var(--color-muted-foreground)] hover:text-white'
                }`}
              >
                All ({filteredResumes.length})
              </button>
              {companies.map((comp) => (
                <button
                  key={comp}
                  onClick={() => setActiveTab(comp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === comp
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-[var(--color-muted-foreground)] hover:text-white'
                  }`}
                >
                  {comp} ({groupedByCompany[comp]?.length || 0})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-sm text-[var(--color-muted-foreground)]">Loading generated resumes...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 bg-slate-900/30 rounded-2xl border border-dashed border-[var(--color-panel-border)]">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-[var(--color-muted-foreground)]">
                <FileText size={24} />
              </div>
              <h3 className="text-base font-semibold text-white">No Generated Resumes Found</h3>
              <p className="text-xs text-[var(--color-muted-foreground)] max-w-sm">
                Generate tailored resumes for job descriptions by typing <code className="text-blue-400 bg-blue-950/50 px-1 py-0.5 rounded font-mono">/resume &lt;url&gt;</code> in chat.
              </p>
            </div>
          ) : (
            companies
              .filter((comp) => activeTab === 'all' || activeTab === comp)
              .map((company) => {
                const items = groupedByCompany[company] || [];
                return (
                  <div key={company} className="space-y-3">
                    {/* Company Header */}
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-blue-400" />
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                          {company}
                        </h3>
                        <span className="text-xs px-2 py-0.2 rounded-full bg-slate-800 text-[var(--color-muted-foreground)]">
                          {items.length} {items.length === 1 ? 'role' : 'roles'}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--color-muted-foreground)] font-mono">
                        Generated Resumes/{company}/
                      </span>
                    </div>

                    {/* Resume Cards */}
                    <div className="grid grid-cols-1 gap-3">
                      {items.map((resume) => {
                        const pdfUrl = api.getResumePdfUrl(resume.resumeId || resume.id || '');
                        const dateFormatted = resume.updatedAt
                          ? new Date(resume.updatedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Recent';

                        return (
                          <div
                            key={resume.resumeId || resume.id}
                            className="bg-[#182234] hover:bg-[#1e2a40] border border-slate-800 hover:border-blue-500/40 p-4 rounded-xl transition-all shadow-sm group"
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm sm:text-base font-semibold text-white truncate max-w-lg">
                                    {resume.jobTitle}
                                  </h4>
                                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-medium shrink-0">
                                    <CheckCircle2 size={12} /> Latest (v{resume.version || 1})
                                  </span>
                                  {resume.matchScore && (
                                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20 font-medium shrink-0">
                                      {resume.matchScore}% Match
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-[var(--color-muted-foreground)] flex-wrap">
                                  {resume.jobId && (
                                    <span className="font-mono bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300">
                                      Job ID: {resume.jobId}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 text-[11px]">
                                    <Calendar size={12} /> {dateFormatted}
                                  </span>
                                  {resume.folderPath && (
                                    <button
                                      onClick={() => handleCopy(resume.folderPath || '')}
                                      className="font-mono text-[11px] text-blue-300/90 hover:text-blue-200 bg-blue-950/40 border border-blue-900/50 px-2 py-0.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                                      title="Click to copy folder path"
                                    >
                                      <span>📂 {resume.folderPath}</span>
                                      {copiedPath === resume.folderPath ? (
                                        <Check size={11} className="text-emerald-400 shrink-0" />
                                      ) : (
                                        <Copy size={11} className="text-blue-400 shrink-0" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80 shrink-0 flex-wrap">
                                {resume.hasPdf && (
                                  <>
                                    <button
                                      onClick={() => window.open(pdfUrl, '_blank')}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm whitespace-nowrap cursor-pointer"
                                      title="Preview PDF in browser"
                                    >
                                      <Eye size={14} /> Preview
                                    </button>
                                    <a
                                      href={pdfUrl}
                                      download={`${resume.company}_Resume.pdf`}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors shadow-sm whitespace-nowrap"
                                      title="Download PDF"
                                    >
                                      <Download size={14} /> Download
                                    </a>
                                  </>
                                )}
                                {resume.hasTex && (
                                  <button
                                    onClick={() => handleViewTex(resume)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors whitespace-nowrap cursor-pointer"
                                    title="View LaTeX Source (.tex)"
                                  >
                                    <FileCode size={14} /> LaTeX
                                  </button>
                                )}
                                {resume.jobUrl && (
                                  <a
                                    href={resume.jobUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white border border-transparent hover:border-slate-700 transition-colors shrink-0"
                                    title="Open Original Job Description"
                                  >
                                    <ExternalLink size={14} />
                                  </a>
                                )}

                                {/* Delete Action */}
                                {deletingId === (resume.resumeId || resume.id) ? (
                                  <div className="flex items-center gap-1.5 bg-red-950/80 border border-red-500/50 rounded-lg px-2 py-1 shadow-sm shrink-0 animate-in fade-in">
                                    <span className="text-[11px] text-red-200 font-medium">Delete?</span>
                                    <button
                                      onClick={() => handleDeleteConfirm(resume)}
                                      disabled={isDeleting}
                                      className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                      {isDeleting ? '...' : 'Yes'}
                                    </button>
                                    <button
                                      onClick={() => setDeletingId(null)}
                                      disabled={isDeleting}
                                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeletingId(resume.resumeId || resume.id || '')}
                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-colors shrink-0 cursor-pointer"
                                    title="Delete this resume"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* LaTeX Modal Viewer Sub-view */}
        {selectedTex && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileCode size={16} className="text-blue-400" />
                  {selectedTex.title}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(selectedTex.content)}
                    className="text-xs px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                  >
                    Copy Code
                  </button>
                  <button
                    onClick={() => setSelectedTex(null)}
                    className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-black/50">
                <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap selection:bg-blue-900">
                  {selectedTex.content}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
          <span className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-yellow-400" />
            Duplicate jobs automatically update to latest version
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
