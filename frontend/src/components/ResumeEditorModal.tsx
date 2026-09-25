'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Plus, Trash2, ChevronDown, ChevronUp, Save,
  Briefcase, Code2, Wrench, GraduationCap, Award,
  Star, FileText, Check, Loader2, GripVertical, Edit3,
  Eye, EyeOff, Download
} from 'lucide-react';
import * as api from '../lib/api';
import type { Resume, Experience, Project, Education, Skills } from '../lib/types';

// ─── Section IDs ──────────────────────────────────────────────────
type Section = 'summary' | 'experience' | 'projects' | 'skills' | 'education' | 'certifications' | 'achievements';

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'summary',        label: 'Summary',        icon: <FileText size={15} /> },
  { id: 'experience',     label: 'Experience',     icon: <Briefcase size={15} /> },
  { id: 'projects',       label: 'Projects',       icon: <Code2 size={15} /> },
  { id: 'skills',         label: 'Skills',         icon: <Wrench size={15} /> },
  { id: 'achievements',   label: 'Achievements',   icon: <Star size={15} /> },
  { id: 'certifications', label: 'Certifications', icon: <Award size={15} /> },
  { id: 'education',      label: 'Education',      icon: <GraduationCap size={15} /> },
];

const SKILL_CATEGORIES: (keyof Skills)[] = ['languages', 'frameworks', 'databases', 'cloud', 'tools', 'aiml'];
const SKILL_LABELS: Record<keyof Skills, string> = {
  languages: 'Languages',
  frameworks: 'Frameworks & Libraries',
  databases: 'Databases',
  cloud: 'Cloud & DevOps',
  tools: 'Tools',
  aiml: 'AI/LLM Engineering',
};

// ─── Empty factories ──────────────────────────────────────────────
const emptyExp   = (): Experience  => ({ company: '', title: '', location: '', startDate: '', endDate: '', bullets: [] });
const emptyProj  = (): Project    => ({ name: '', technologies: '', url: '', bullets: [] });
const emptyEdu   = (): Education  => ({ institution: '', degree: '', field: '', startDate: '', endDate: '', gpa: '' });
const emptyResume = (): Resume    => ({
  experience: [], projects: [], education: [],
  certifications: [], achievements: [],
  skills: { languages: [], frameworks: [], databases: [], cloud: [], tools: [], aiml: [] },
});

// ─── Props ────────────────────────────────────────────────────────
interface Props { isOpen: boolean; onClose: () => void; }

// ─── Component ────────────────────────────────────────────────────
export default function ResumeEditorModal({ isOpen, onClose }: Props) {
  const [section, setSection]   = useState<Section>('experience');
  const [resume, setResume]     = useState<Resume>(emptyResume());
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState<Section | null>(null);
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Load on open
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.getResumeData()
      .then(r => setResume(r ?? emptyResume()))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  // Escape
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  // ── Section-specific save ─────────────────────────────────────
  const saveSection = async (sec: Section) => {
    setSaving(sec);
    try {
      let payload: any;
      switch (sec) {
        case 'summary':
          await api.updateResumeData(resume);
          break;
        case 'experience':      payload = resume.experience;      await api.patchResumeSection('experience', payload); break;
        case 'projects':        payload = resume.projects;        await api.patchResumeSection('projects', payload); break;
        case 'skills':          payload = resume.skills;          await api.patchResumeSection('skills', payload); break;
        case 'education':       payload = resume.education;       await api.patchResumeSection('education', payload); break;
        case 'certifications':  payload = resume.certifications;  await api.patchResumeSection('certifications', payload); break;
        case 'achievements':    payload = resume.achievements;    await api.patchResumeSection('achievements', payload); break;
      }
      showToast(`${NAV.find(n => n.id === sec)?.label} saved ✓`);
      // Close the modal shortly after so the user sees the success toast
      setTimeout(() => onClose(), 900);
    } catch {
      showToast('Save failed — check connection', false);
    } finally {
      setSaving(null);
    }
  };

  // ── Generic updaters ─────────────────────────────────────────
  const updExp = (i: number, patch: Partial<Experience>) =>
    setResume(r => ({ ...r, experience: r.experience.map((e, idx) => idx === i ? { ...e, ...patch } : e) }));
  const delExp = (i: number) =>
    setResume(r => ({ ...r, experience: r.experience.filter((_, idx) => idx !== i) }));
  const addExpBullet = (i: number) =>
    updExp(i, { bullets: [...resume.experience[i].bullets, ''] });
  const updExpBullet = (ei: number, bi: number, val: string) => {
    const bullets = [...resume.experience[ei].bullets];
    bullets[bi] = val;
    updExp(ei, { bullets });
  };
  const delExpBullet = (ei: number, bi: number) =>
    updExp(ei, { bullets: resume.experience[ei].bullets.filter((_, i) => i !== bi) });

  const updProj = (i: number, patch: Partial<Project>) =>
    setResume(r => ({ ...r, projects: r.projects.map((p, idx) => idx === i ? { ...p, ...patch } : p) }));
  const delProj = (i: number) =>
    setResume(r => ({ ...r, projects: r.projects.filter((_, idx) => idx !== i) }));
  const addProjBullet = (i: number) =>
    updProj(i, { bullets: [...resume.projects[i].bullets, ''] });
  const updProjBullet = (pi: number, bi: number, val: string) => {
    const bullets = [...resume.projects[pi].bullets];
    bullets[bi] = val;
    updProj(pi, { bullets });
  };
  const delProjBullet = (pi: number, bi: number) =>
    updProj(pi, { bullets: resume.projects[pi].bullets.filter((_, i) => i !== bi) });

  const updEdu = (i: number, patch: Partial<Education>) =>
    setResume(r => ({ ...r, education: r.education.map((e, idx) => idx === i ? { ...e, ...patch } : e) }));
  const delEdu = (i: number) =>
    setResume(r => ({ ...r, education: r.education.filter((_, idx) => idx !== i) }));

  const updSkillCat = (cat: keyof Skills, items: string[]) =>
    setResume(r => ({ ...r, skills: { ...(r.skills ?? { languages:[], frameworks:[], databases:[], cloud:[], tools:[] }), [cat]: items } }));

  const updList = (field: 'certifications' | 'achievements', i: number, val: string) =>
    setResume(r => ({ ...r, [field]: (r[field] as string[]).map((v, idx) => idx === i ? val : v) }));
  const addListItem = (field: 'certifications' | 'achievements') =>
    setResume(r => ({ ...r, [field]: [...(r[field] as string[]), ''] }));
  const delListItem = (field: 'certifications' | 'achievements', i: number) =>
    setResume(r => ({ ...r, [field]: (r[field] as string[]).filter((_, idx) => idx !== i) }));

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const countBadge = (n: number) => n > 0 ? (
    <span style={{
      background: '#10a37f22', color: '#10a37f',
      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
    }}>{n}</span>
  ) : null;

  const modal = (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
      }} />

      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          width: showPreview ? 1320 : 860,
          maxWidth: 'calc(100vw - 32px)',
          height: showPreview ? 'calc(100vh - 48px)' : 600,
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          background: '#1e1e1e',
          borderRadius: 16,
          border: '1px solid #333',
          boxShadow: '0 32px 80px rgba(0,0,0,0.85)',
          overflow: 'hidden',
          transition: 'width 0.3s ease, height 0.3s ease',
        }}
      >
        {/* ── Left nav ──────────────────────────────────────── */}
        <div style={{
          width: 210, flexShrink: 0,
          background: '#161616',
          borderRight: '1px solid #2a2a2a',
          display: 'flex', flexDirection: 'column',
          padding: '16px 8px',
        }}>
          <div style={{ fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: '0.08em', padding: '0 8px 10px', textTransform: 'uppercase' }}>
            Resume Editor
          </div>
          {NAV.map(n => {
            const active = section === n.id;
            const count =
              n.id === 'experience'     ? resume.experience?.length :
              n.id === 'projects'       ? resume.projects?.length :
              n.id === 'education'      ? resume.education?.length :
              n.id === 'certifications' ? resume.certifications?.length :
              n.id === 'achievements'   ? resume.achievements?.length : undefined;
            return (
              <button key={n.id} onClick={() => setSection(n.id)} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 12px', borderRadius: 8, marginBottom: 1,
                background: active ? '#2a2a2a' : 'transparent',
                color: active ? 'white' : '#888',
                border: 'none', cursor: 'pointer',
                fontSize: 13.5, fontWeight: active ? 600 : 400,
                transition: 'all 0.12s', textAlign: 'left', width: '100%',
              }}>
                <span style={{ opacity: active ? 1 : 0.6 }}>{n.icon}</span>
                <span style={{ flex: 1 }}>{n.label}</span>
                {count !== undefined && countBadge(count)}
              </button>
            );
          })}
        </div>

        {/* ── Right panel ───────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 24px', borderBottom: '1px solid #2a2a2a', flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
                {NAV.find(n => n.id === section)?.label}
              </div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                Changes save to your master resume
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Preview toggle */}
              <button
                onClick={() => setShowPreview(p => !p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 8,
                  background: showPreview ? '#3b82f622' : '#2a2a2a',
                  border: showPreview ? '1px solid #3b82f644' : '1px solid #333',
                  color: showPreview ? '#60a5fa' : '#888',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                {showPreview ? 'Hide Preview' : 'Preview'}
              </button>
              {/* Download button */}
              <button
                onClick={() => window.open(api.getMasterResumePdfUrl(), '_blank')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 8,
                  background: '#2a2a2a', border: '1px solid #333', color: '#ccc',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#333'; e.currentTarget.style.color = '#fff'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#2a2a2a'; e.currentTarget.style.color = '#ccc'; }}
              >
                <Download size={13} />
                Download PDF
              </button>
              {/* Save section button */}
              <button
                onClick={() => saveSection(section)}
                disabled={!!saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 8,
                  background: '#10a37f', border: 'none', color: 'white',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving === section
                  ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Save size={13} />}
                Save
              </button>
              <button onClick={onClose} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, borderRadius: 7,
                background: '#2a2a2a', border: '1px solid #333',
                color: '#888', cursor: 'pointer',
              }}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#555', gap: 10 }}>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                Loading resume…
              </div>
            ) : (
              <>
                {/* ── SUMMARY ────────────────────────────────── */}
                {section === 'summary' && (
                  <div>
                    <Label>Professional Summary</Label>
                    <textarea
                      value={resume.summary || ''}
                      onChange={e => setResume(r => ({ ...r, summary: e.target.value }))}
                      placeholder="Write a compelling 2–4 sentence professional summary that highlights your expertise and key achievements…"
                      rows={8}
                      style={{ ...textareaStyle, width: '100%', resize: 'vertical' }}
                    />
                    <Hint>This summary appears at the top of every generated resume.</Hint>
                  </div>
                )}

                {/* ── EXPERIENCE ─────────────────────────────── */}
                {section === 'experience' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {resume.experience?.map((exp, ei) => (
                      <ExpCard key={ei}>
                        <CardHeader
                          title={exp.company || `Experience ${ei + 1}`}
                          subtitle={exp.title}
                          onDelete={() => delExp(ei)}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                          <Field label="Company"    value={exp.company    || ''} onChange={v => updExp(ei, { company: v })}    placeholder="Google" />
                          <Field label="Job Title"  value={exp.title      || ''} onChange={v => updExp(ei, { title: v })}      placeholder="Software Engineer" />
                          <Field label="Location"   value={exp.location   || ''} onChange={v => updExp(ei, { location: v })}   placeholder="Bangalore, India" />
                          <Field label="Start Date" value={exp.startDate  || ''} onChange={v => updExp(ei, { startDate: v })}  placeholder="Jan 2023" />
                          <Field label="End Date"   value={exp.endDate    || ''} onChange={v => updExp(ei, { endDate: v })}    placeholder="Present" />
                        </div>
                        <Label>Bullet Points</Label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {exp.bullets.map((b, bi) => (
                            <BulletRow
                              key={bi}
                              value={b}
                              onChange={v => updExpBullet(ei, bi, v)}
                              onDelete={() => delExpBullet(ei, bi)}
                            />
                          ))}
                          <AddBtn onClick={() => addExpBullet(ei)} label="Add bullet point" />
                        </div>
                      </ExpCard>
                    ))}
                    <AddCardBtn onClick={() => setResume(r => ({ ...r, experience: [...r.experience, emptyExp()] }))} label="+ Add Experience" />
                  </div>
                )}

                {/* ── PROJECTS ───────────────────────────────── */}
                {section === 'projects' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {resume.projects?.map((proj, pi) => (
                      <ExpCard key={pi}>
                        <CardHeader
                          title={proj.name || `Project ${pi + 1}`}
                          subtitle={proj.technologies}
                          onDelete={() => delProj(pi)}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                          <Field label="Project Name"  value={proj.name         || ''} onChange={v => updProj(pi, { name: v })}         placeholder="AI Resume Agent" />
                          <Field label="Technologies"  value={proj.technologies || ''} onChange={v => updProj(pi, { technologies: v })} placeholder="Java, Spring Boot, React" />
                          <Field label="URL (optional)" value={proj.url          || ''} onChange={v => updProj(pi, { url: v })}          placeholder="github.com/you/project" />
                        </div>
                        <Label>Bullet Points</Label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {proj.bullets.map((b, bi) => (
                            <BulletRow
                              key={bi}
                              value={b}
                              onChange={v => updProjBullet(pi, bi, v)}
                              onDelete={() => delProjBullet(pi, bi)}
                            />
                          ))}
                          <AddBtn onClick={() => addProjBullet(pi)} label="Add bullet point" />
                        </div>
                      </ExpCard>
                    ))}
                    <AddCardBtn onClick={() => setResume(r => ({ ...r, projects: [...r.projects, emptyProj()] }))} label="+ Add Project" />
                  </div>
                )}

                {/* ── SKILLS ─────────────────────────────────── */}
                {section === 'skills' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {SKILL_CATEGORIES.map(cat => (
                      <SkillCategory
                        key={cat}
                        label={SKILL_LABELS[cat]}
                        items={(resume.skills as any)?.[cat] || []}
                        onChange={items => updSkillCat(cat, items)}
                      />
                    ))}
                  </div>
                )}

                {/* ── EDUCATION ──────────────────────────────── */}
                {section === 'education' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {resume.education?.map((edu, ei) => (
                      <ExpCard key={ei}>
                        <CardHeader
                          title={edu.institution || `Education ${ei + 1}`}
                          subtitle={edu.degree}
                          onDelete={() => delEdu(ei)}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <Field label="Institution" value={edu.institution || ''} onChange={v => updEdu(ei, { institution: v })} placeholder="IIT Bombay" />
                          <Field label="Degree"      value={edu.degree      || ''} onChange={v => updEdu(ei, { degree: v })}      placeholder="B.Tech" />
                          <Field label="Field"       value={edu.field       || ''} onChange={v => updEdu(ei, { field: v })}       placeholder="Computer Science" />
                          <Field label="GPA"         value={edu.gpa         || ''} onChange={v => updEdu(ei, { gpa: v })}         placeholder="8.5 / 10" />
                          <Field label="Start Date"  value={edu.startDate   || ''} onChange={v => updEdu(ei, { startDate: v })}   placeholder="2019" />
                          <Field label="End Date"    value={edu.endDate     || ''} onChange={v => updEdu(ei, { endDate: v })}     placeholder="2023" />
                        </div>
                      </ExpCard>
                    ))}
                    <AddCardBtn onClick={() => setResume(r => ({ ...r, education: [...r.education, emptyEdu()] }))} label="+ Add Education" />
                  </div>
                )}

                {/* ── CERTIFICATIONS ─────────────────────────── */}
                {section === 'certifications' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Hint>Add certifications like "AWS Certified Solutions Architect", "Google Cloud Professional", etc.</Hint>
                    {resume.certifications?.map((c, i) => (
                      <BulletRow key={i} value={c} onChange={v => updList('certifications', i, v)} onDelete={() => delListItem('certifications', i)} placeholder="AWS Certified Solutions Architect – Associate" />
                    ))}
                    <AddBtn onClick={() => addListItem('certifications')} label="Add certification" />
                  </div>
                )}

                {/* ── ACHIEVEMENTS ───────────────────────────── */}
                {section === 'achievements' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Hint>Add awards, honors, hackathon wins, open-source contributions, publications, etc.</Hint>
                    {resume.achievements?.map((a, i) => (
                      <BulletRow key={i} value={a} onChange={v => updList('achievements', i, v)} onDelete={() => delListItem('achievements', i)} placeholder="Winner — Smart India Hackathon 2023" />
                    ))}
                    <AddBtn onClick={() => addListItem('achievements')} label="Add achievement" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Preview panel ─────────────────────────────── */}
        {showPreview && (
          <div style={{
            width: 460, flexShrink: 0,
            borderLeft: '1px solid #2a2a2a',
            display: 'flex', flexDirection: 'column',
            background: '#fafafa',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e5e5e5',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#f0f0f0',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={14} color="#3b82f6" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#333', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Live Preview</span>
              </div>
              <span style={{ fontSize: 10, color: '#888' }}>Updates as you type</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
              <MasterResumePreviewPanel resume={resume} />
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10000,
          background: toast.ok ? '#1a3a2a' : '#3a1a1a',
          border: `1px solid ${toast.ok ? '#10a37f44' : '#f8717144'}`,
          color: 'white', fontSize: 13, padding: '10px 20px', borderRadius: 999,
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Check size={14} color={toast.ok ? '#4ade80' : '#f87171'} />
          {toast.msg}
        </div>
      )}

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );

  return createPortal(modal, document.body);
}

// ─── Shared styles ────────────────────────────────────────────────
const inputBase: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#252525', border: '1px solid #333',
  borderRadius: 8, padding: '7px 10px',
  fontSize: 13, color: 'white', outline: 'none',
};
const textareaStyle: React.CSSProperties = {
  ...inputBase, fontFamily: 'inherit', lineHeight: 1.6,
  minHeight: 140,
};

// ─── Small helper components ──────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 6 }}>
      {children}
    </div>
  );
}
function Hint({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, color: '#555', marginBottom: 10, lineHeight: 1.6 }}>{children}</div>;
}
function ExpCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#252525', border: '1px solid #333',
      borderRadius: 12, padding: '16px 18px',
    }}>
      {children}
    </div>
  );
}
function CardHeader({ title, subtitle, onDelete }: { title: string; subtitle?: string; onDelete: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: '#888', marginTop: 1 }}>{subtitle}</div>}
      </div>
      <button
        onClick={onDelete}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: 'transparent', border: '1px solid #f8717133', color: '#f87171', cursor: 'pointer', fontSize: 12 }}
      >
        <Trash2 size={12} /> Remove
      </button>
    </div>
  );
}
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <input type="text" value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={inputBase} />
    </div>
  );
}
function BulletRow({ value, onChange, onDelete, placeholder }: { value: string; onChange: (v: string) => void; onDelete: () => void; placeholder?: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
      <span style={{ color: '#10a37f', marginTop: 9, flexShrink: 0, fontSize: 16 }}>•</span>
      <textarea
        value={value}
        placeholder={placeholder || 'Describe your impact with numbers and action verbs…'}
        onChange={e => onChange(e.target.value)}
        rows={2}
        style={{ ...textareaStyle, flex: 1, minHeight: 'unset', resize: 'vertical', fontSize: 13 }}
      />
      <button onClick={onDelete} style={{ marginTop: 6, background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}
function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 7, marginTop: 4,
      background: 'transparent', border: '1px dashed #333',
      color: '#10a37f', cursor: 'pointer', fontSize: 13,
      transition: 'border-color 0.15s',
    }}>
      <Plus size={13} /> {label}
    </button>
  );
}
function AddCardBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '12px', borderRadius: 12,
      background: 'transparent', border: '2px dashed #2a2a2a',
      color: '#10a37f', cursor: 'pointer', fontSize: 14, fontWeight: 500,
      transition: 'border-color 0.15s, background 0.15s',
    }}>
      {label}
    </button>
  );
}

// ─── Skill Category ───────────────────────────────────────────────
function SkillCategory({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed || items.includes(trimmed)) return;
    onChange([...items, trimmed]);
    setInput('');
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div style={{ background: '#252525', border: '1px solid #333', borderRadius: 12, padding: '14px 16px' }}>
      <Label>{label}</Label>
      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10, minHeight: 32 }}>
        {items.map((item, i) => (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#1e1e1e', border: '1px solid #444',
            borderRadius: 6, padding: '3px 10px', fontSize: 12.5, color: 'white',
          }}>
            {item}
            <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
              <X size={11} />
            </button>
          </span>
        ))}
        {items.length === 0 && <span style={{ fontSize: 12, color: '#555', lineHeight: '32px' }}>No items yet — add below</span>}
      </div>
      {/* Add input */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={`Add ${label.split(' ')[0].toLowerCase()} (press Enter)`}
          style={{ ...inputBase, flex: 1 }}
        />
        <button onClick={add} style={{
          padding: '7px 14px', borderRadius: 8,
          background: '#10a37f22', border: '1px solid #10a37f44',
          color: '#10a37f', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>
          Add
        </button>
      </div>
    </div>
  );
}

// ─── Master Resume Preview Panel ──────────────────────────────────
function MasterResumePreviewPanel({ resume }: { resume: Resume }) {
  const pi = resume.personalInfo;
  const hasPersonalInfo = pi && (pi.name || pi.email || pi.phone);
  const hasSummary = resume.summary && resume.summary.trim();
  const hasExperience = resume.experience?.length > 0;
  const hasProjects = resume.projects?.length > 0;
  const hasSkills = resume.skills && Object.values(resume.skills).some(arr => arr?.length > 0);
  const hasEducation = resume.education?.length > 0;
  const hasCerts = resume.certifications?.length > 0;
  const hasAchievements = resume.achievements?.length > 0;
  const isEmpty = !hasPersonalInfo && !hasSummary && !hasExperience && !hasProjects && !hasSkills && !hasEducation && !hasCerts && !hasAchievements;

  if (isEmpty) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', textAlign: 'center', padding: 20 }}>
        <FileText size={40} color="#ccc" />
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12, color: '#666' }}>No resume data yet</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Add your details using the editor on the left</div>
      </div>
    );
  }

  const sectionTitle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: '#1a1a1a',
    borderBottom: '1.5px solid #1a1a1a', paddingBottom: 3,
    marginBottom: 8, marginTop: 16,
  };
  const bulletStyle: React.CSSProperties = {
    fontSize: 10, color: '#333', lineHeight: 1.55,
    paddingLeft: 12, position: 'relative', marginBottom: 2,
  };
  const dotStyle: React.CSSProperties = {
    position: 'absolute', left: 0, top: 0, color: '#555',
  };

  return (
    <div style={{
      background: 'white', border: '1px solid #ddd',
      borderRadius: 4, padding: '28px 24px',
      fontFamily: "'Times New Roman', 'Georgia', serif",
      color: '#1a1a1a', lineHeight: 1.4,
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      minHeight: 600,
    }}>
      {/* ── Name & Contact ──────────────────── */}
      {hasPersonalInfo && (
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          {pi?.name && <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.04em' }}>{pi.name}</div>}
          <div style={{ fontSize: 9, color: '#555', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 4 }}>
            {pi?.email && <span>{pi.email}</span>}
            {pi?.phone && <><span>•</span><span>{pi.phone}</span></>}
            {pi?.location && <><span>•</span><span>{pi.location}</span></>}
            {pi?.linkedin && <><span>•</span><a href={pi.linkedin.startsWith('http') ? pi.linkedin : `https://${pi.linkedin}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>LinkedIn</a></>}
            {pi?.github && <><span>•</span><a href={pi.github.startsWith('http') ? pi.github : `https://${pi.github}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>GitHub</a></>}
          </div>
        </div>
      )}

      {/* ── Summary ───────────────────────── */}
      {hasSummary && (
        <>
          <div style={sectionTitle}>Summary</div>
          <div style={{ fontSize: 10, color: '#333', lineHeight: 1.6 }}>{resume.summary}</div>
        </>
      )}

      {/* ── Experience ────────────────────── */}
      {hasExperience && (
        <>
          <div style={sectionTitle}>Experience</div>
          {resume.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{exp.company || 'Company'}</span>
                  {exp.location && <span style={{ fontSize: 10, color: '#555' }}> — {exp.location}</span>}
                </div>
                <span style={{ fontSize: 9, color: '#666', flexShrink: 0 }}>
                  {exp.startDate}{exp.endDate ? ` — ${exp.endDate}` : ''}
                </span>
              </div>
              {exp.title && <div style={{ fontSize: 10, fontStyle: 'italic', color: '#444', marginBottom: 3 }}>{exp.title}</div>}
              {exp.bullets?.map((b, bi) => b.trim() ? (
                <div key={bi} style={bulletStyle}>
                  <span style={dotStyle}>•</span>
                  {b}
                </div>
              ) : null)}
            </div>
          ))}
        </>
      )}

      {/* ── Projects ──────────────────────── */}
      {hasProjects && (
        <>
          <div style={sectionTitle}>Projects</div>
          {resume.projects.map((proj, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{proj.name || 'Project'}</span>
                </div>
                {proj.url && (
                  <a
                    href={proj.url.startsWith('http') ? proj.url : `https://${proj.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 9, color: '#3b82f6', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}
                  >
                    GitHub ↗
                  </a>
                )}
              </div>
              {proj.technologies && <div style={{ fontSize: 10, fontStyle: 'italic', color: '#444', marginBottom: 3 }}>{proj.technologies}</div>}
              {proj.bullets?.map((b, bi) => b.trim() ? (
                <div key={bi} style={bulletStyle}>
                  <span style={dotStyle}>•</span>
                  {b}
                </div>
              ) : null)}
            </div>
          ))}
        </>
      )}

      {/* ── Skills ────────────────────────── */}
      {hasSkills && (
        <>
          <div style={sectionTitle}>Technical Skills</div>
          <div style={{ fontSize: 10, color: '#333', lineHeight: 1.7 }}>
            {Object.entries(resume.skills || {}).map(([cat, items]) => {
              if (!items || items.length === 0) return null;
              const label = SKILL_LABELS[cat as keyof Skills] || cat;
              return (
                <div key={cat} style={{ marginBottom: 2 }}>
                  <span style={{ fontWeight: 700 }}>{label}:</span>{' '}
                  <span>{items.join(', ')}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Achievements ──────────────────── */}
      {hasAchievements && (
        <>
          <div style={sectionTitle}>Achievements</div>
          {resume.achievements.map((a, i) => a.trim() ? (
            <div key={i} style={bulletStyle}>
              <span style={dotStyle}>•</span>
              {a}
            </div>
          ) : null)}
        </>
      )}

      {/* ── Certifications ────────────────── */}
      {hasCerts && (
        <>
          <div style={sectionTitle}>Certifications</div>
          {resume.certifications.map((c, i) => c.trim() ? (
            <div key={i} style={bulletStyle}>
              <span style={dotStyle}>•</span>
              {c}
            </div>
          ) : null)}
        </>
      )}

      {/* ── Education ─────────────────────── */}
      {hasEducation && (
        <>
          <div style={sectionTitle}>Education</div>
          {resume.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{edu.institution || 'Institution'}</span>
                <span style={{ fontSize: 9, color: '#666', flexShrink: 0 }}>
                  {edu.startDate}{edu.endDate ? ` — ${edu.endDate}` : ''}
                </span>
              </div>
              <div style={{ fontSize: 10, fontStyle: 'italic', color: '#444' }}>
                {[edu.degree, edu.field].filter(Boolean).join(' in ')}
                {edu.gpa && <span style={{ color: '#666' }}> — GPA: {edu.gpa}</span>}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
