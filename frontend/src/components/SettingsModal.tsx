'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Bot, Palette, User, Bell, Shield, Key, Globe,
  Search, Check, Trash2, RotateCcw, Sun, Moon,
  Monitor, Volume2, VolumeX, AlertTriangle, ChevronDown,
  Settings, Cpu, Database
} from 'lucide-react';
import * as api from '../lib/api';
import type { UserProfile } from '../lib/types';

// ─── Settings shape ───────────────────────────────────────────────
export interface AppSettings {
  aiProvider: 'openai' | 'anthropic';
  aiModel: string;
  apiKeyOverride: string;
  theme: 'dark' | 'light' | 'system';
  resumeTemplate: 'minimal' | 'classic' | 'modern';
  soundEnabled: boolean;
  language: string;
}

const SETTINGS_KEY = 'resume_agent_settings';
const DEFAULT_SETTINGS: AppSettings = {
  aiProvider: 'openai',
  aiModel: 'gpt-4o',
  apiKeyOverride: '',
  theme: 'dark',
  resumeTemplate: 'modern',
  soundEnabled: true,
  language: 'en',
};

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}
export function persistSettings(s: AppSettings) {
  if (typeof window !== 'undefined') localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
function applyTheme(theme: AppSettings['theme']) {
  const root = document.documentElement;
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
}

// ─── Nav sections ─────────────────────────────────────────────────
type Section = 'ai' | 'appearance' | 'profile' | 'notifications' | 'language' | 'privacy';

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'ai',             label: 'AI Model',       icon: <Cpu size={15} /> },
  { id: 'appearance',    label: 'Appearance',      icon: <Palette size={15} /> },
  { id: 'profile',       label: 'Profile',         icon: <User size={15} /> },
  { id: 'notifications', label: 'Notifications',   icon: <Bell size={15} /> },
  { id: 'language',      label: 'Language',        icon: <Globe size={15} /> },
  { id: 'privacy',       label: 'Data & Privacy',  icon: <Shield size={15} /> },
];

const OPENAI_MODELS    = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
const ANTHROPIC_MODELS = ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'];
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'pt', label: 'Portuguese' },
];

// ─── Props ────────────────────────────────────────────────────────
interface Props { isOpen: boolean; onClose: () => void; }

// ─── Component ────────────────────────────────────────────────────
export default function SettingsModal({ isOpen, onClose }: Props) {
  const [section, setSection]           = useState<Section>('ai');
  const [search, setSearch]             = useState('');
  const [settings, setSettings]         = useState<AppSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile]           = useState<UserProfile>({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [apiKeyVisible, setApiKeyVisible]   = useState(false);
  const [deleteConfirm, setDeleteConfirm]   = useState<'history'|'resumes'|'onboarding'|null>(null);
  const [toast, setToast]               = useState<string|null>(null);
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSettings(loadSettings());
    setSearch('');
    setSection('ai');
    setProfileLoading(true);
    api.getProfile().then(p => { if (p) setProfile(p); }).finally(() => setProfileLoading(false));
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToast(msg); setTimeout(() => setToast(null), 2500);
  };

  const set = useCallback(<K extends keyof AppSettings>(k: K, v: AppSettings[K]) =>
    setSettings(prev => ({ ...prev, [k]: v })), []);

  // Save all & close
  const handleSave = async () => {
    setSaving(true);
    persistSettings(settings);
    applyTheme(settings.theme);
    if (settings.apiKeyOverride) localStorage.setItem('resume_agent_api_key', settings.apiKeyOverride);
    else localStorage.removeItem('resume_agent_api_key');
    try { await api.updateProfile(profile); } catch {}
    setSaving(false);
    showToast('Settings saved');
    setTimeout(() => onClose(), 600);
  };

  // Privacy actions
  const handleClearHistory = () => {
    setDeleteConfirm(null);
    Object.keys(localStorage).filter(k => k.startsWith('chat_') || k.includes('conversation')).forEach(k => localStorage.removeItem(k));
    showToast('Chat history cleared — reloading…');
    setTimeout(() => window.location.reload(), 1200);
  };
  const handleDeleteResumes = async () => {
    setDeleteConfirm(null);
    try {
      const list = await api.getGeneratedResumes();
      await Promise.all(list.map(r => api.deleteGeneratedResume(r.resumeId)));
      showToast(`Deleted ${list.length} resume(s)`);
    } catch { showToast('Could not delete resumes'); }
  };
  const handleResetOnboarding = () => {
    setDeleteConfirm(null);
    showToast('Onboarding reset — type /init to restart');
  };

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const filteredNav = NAV.filter(s => s.label.toLowerCase().includes(search.toLowerCase()));

  const modal = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
        }}
      />

      {/* Modal — ChatGPT style centered card */}
      <div
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          width: 680,
          maxWidth: 'calc(100vw - 32px)',
          height: 520,
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          background: '#1e1e1e',
          borderRadius: 14,
          border: '1px solid #3a3a3a',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Inner layout: left nav + right content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── Left nav ──────────────────────────────────────── */}
          <div style={{
            width: 220, flexShrink: 0,
            background: '#171717',
            borderRight: '1px solid #2e2e2e',
            display: 'flex', flexDirection: 'column',
            padding: '16px 8px',
            gap: 2,
          }}>
            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#2a2a2a', borderRadius: 8,
              padding: '7px 10px', marginBottom: 8,
              border: '1px solid #3a3a3a',
            }}>
              <Search size={13} color="#888" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search settings"
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  color: 'white', fontSize: 13, width: '100%',
                }}
              />
            </div>

            {/* Nav items */}
            {filteredNav.map(s => {
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 8,
                    background: active ? '#2a2a2a' : 'transparent',
                    color: active ? 'white' : '#aaa',
                    border: 'none', cursor: 'pointer',
                    fontSize: 13.5, fontWeight: active ? 500 : 400,
                    transition: 'all 0.12s', textAlign: 'left', width: '100%',
                  }}
                >
                  <span style={{ opacity: active ? 1 : 0.65 }}>{s.icon}</span>
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* ── Right content ──────────────────────────────────── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Header row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px 16px',
              borderBottom: '1px solid #2e2e2e',
              flexShrink: 0,
            }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'white', margin: 0 }}>
                {NAV.find(n => n.id === section)?.label}
              </h2>
              <button
                onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 6,
                  background: '#2a2a2a', border: '1px solid #3a3a3a',
                  color: '#aaa', cursor: 'pointer',
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0 16px' }}>

              {/* ── AI MODEL ─────────────────────────────── */}
              {section === 'ai' && <>
                <Row label="Provider">
                  <SegmentControl
                    options={[{ val: 'openai', label: '🤖 OpenAI' }, { val: 'anthropic', label: '🧠 Anthropic' }]}
                    value={settings.aiProvider}
                    onChange={v => { set('aiProvider', v as any); set('aiModel', v === 'openai' ? OPENAI_MODELS[0] : ANTHROPIC_MODELS[0]); }}
                  />
                </Row>
                <Row label="Model">
                  <NativeSelect
                    value={settings.aiModel}
                    onChange={v => set('aiModel', v)}
                    options={(settings.aiProvider === 'openai' ? OPENAI_MODELS : ANTHROPIC_MODELS).map(m => ({ val: m, label: m }))}
                  />
                </Row>
                <Row label="API Key Override" sub="Stored in your browser only — never sent to our servers.">
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type={apiKeyVisible ? 'text' : 'password'}
                      placeholder="sk-••••••••••••••••"
                      value={settings.apiKeyOverride}
                      onChange={e => set('apiKeyOverride', e.target.value)}
                      style={{ ...ipt, width: 180, fontFamily: 'monospace', fontSize: 12 }}
                    />
                    <button onClick={() => setApiKeyVisible(v => !v)} style={iconBtn}>
                      <Key size={13} />
                    </button>
                  </div>
                </Row>
                {settings.apiKeyOverride && (
                  <div style={{ padding: '4px 24px 8px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#fb923c' }}>
                    <AlertTriangle size={11} /> Key is stored locally — never transmitted
                  </div>
                )}
              </>}

              {/* ── APPEARANCE ───────────────────────────── */}
              {section === 'appearance' && <>
                <Row label="Theme">
                  <SegmentControl
                    options={[
                      { val: 'dark',   label: '🌙 Dark' },
                      { val: 'light',  label: '☀️ Light' },
                      { val: 'system', label: '💻 System' },
                    ]}
                    value={settings.theme}
                    onChange={v => { set('theme', v as any); applyTheme(v as any); }}
                  />
                </Row>
                <Row label="Resume PDF Template" sub="Template used when generating PDF resumes.">
                  <NativeSelect
                    value={settings.resumeTemplate}
                    onChange={v => set('resumeTemplate', v as any)}
                    options={[
                      { val: 'minimal', label: 'Minimal — ATS-friendly single column' },
                      { val: 'classic', label: 'Classic — Traditional two-column' },
                      { val: 'modern',  label: 'Modern — Bold header with accent color' },
                    ]}
                  />
                </Row>
              </>}

              {/* ── PROFILE ──────────────────────────────── */}
              {section === 'profile' && <>
                {profileLoading
                  ? <div style={{ padding: '24px', color: '#888', fontSize: 13 }}>Loading profile…</div>
                  : <>
                    {([
                      { key: 'name',      label: 'Full Name',  ph: 'Chandan Singh' },
                      { key: 'email',     label: 'Email',      ph: 'you@example.com' },
                      { key: 'phone',     label: 'Phone',      ph: '+91 98765 43210' },
                      { key: 'location',  label: 'Location',   ph: 'Bangalore, India' },
                      { key: 'linkedin',  label: 'LinkedIn',   ph: 'linkedin.com/in/you' },
                      { key: 'github',    label: 'GitHub',     ph: 'github.com/you' },
                      { key: 'portfolio', label: 'Portfolio',  ph: 'yoursite.com' },
                      { key: 'leetcode',  label: 'LeetCode',   ph: 'leetcode.com/you' },
                    ] as const).map(({ key, label, ph }) => (
                      <Row key={key} label={label}>
                        <input
                          type="text"
                          placeholder={ph}
                          value={(profile as any)[key] || ''}
                          onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                          style={{ ...ipt, width: 200 }}
                        />
                      </Row>
                    ))}
                    <div style={{ padding: '8px 24px', fontSize: 11, color: '#666' }}>
                      Changes will be saved when you click Save.
                    </div>
                  </>
                }
              </>}

              {/* ── NOTIFICATIONS ────────────────────────── */}
              {section === 'notifications' && <>
                <Row label="Sound effects" sub="Play a soft chime when the AI finishes responding.">
                  <Toggle checked={settings.soundEnabled} onChange={v => set('soundEnabled', v)} />
                </Row>
              </>}

              {/* ── LANGUAGE ─────────────────────────────── */}
              {section === 'language' && <>
                <Row label="Resume content language" sub="Language the AI uses when writing resume content.">
                  <NativeSelect
                    value={settings.language}
                    onChange={v => set('language', v)}
                    options={LANGUAGES.map(l => ({ val: l.code, label: l.label }))}
                  />
                </Row>
              </>}

              {/* ── DATA & PRIVACY ───────────────────────── */}
              {section === 'privacy' && <>
                <Row label="Clear chat history" sub="Delete all local conversation history from your device.">
                  <DangerBtn
                    label="Clear"
                    confirming={deleteConfirm === 'history'}
                    onRequest={() => setDeleteConfirm('history')}
                    onConfirm={handleClearHistory}
                    onCancel={() => setDeleteConfirm(null)}
                  />
                </Row>
                <Row label="Delete generated resumes" sub="Permanently remove all generated resumes from the server.">
                  <DangerBtn
                    label="Delete all"
                    confirming={deleteConfirm === 'resumes'}
                    onRequest={() => setDeleteConfirm('resumes')}
                    onConfirm={handleDeleteResumes}
                    onCancel={() => setDeleteConfirm(null)}
                  />
                </Row>
                <Row label="Reset onboarding" sub="Start the /init wizard from the beginning.">
                  <DangerBtn
                    label="Reset"
                    confirming={deleteConfirm === 'onboarding'}
                    onRequest={() => setDeleteConfirm('onboarding')}
                    onConfirm={handleResetOnboarding}
                    onCancel={() => setDeleteConfirm(null)}
                  />
                </Row>
                <Divider />
                <div style={{ padding: '12px 24px' }}>
                  <p style={{ fontSize: 12, color: '#666', lineHeight: 1.7, margin: 0 }}>
                    All your data is stored <span style={{ color: '#aaa' }}>locally on your device</span> or on your self-hosted backend. Nothing is shared with third parties beyond the LLM provider you configure.
                  </p>
                </div>
              </>}

            </div>

            {/* Footer: Save */}
            <div style={{
              padding: '12px 24px',
              borderTop: '1px solid #2e2e2e',
              display: 'flex', justifyContent: 'flex-end', gap: 8,
              flexShrink: 0,
            }}>
              <button onClick={onClose} style={cancelBtn}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={saveBtn}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10000,
          background: '#2a2a2a', border: '1px solid #3a3a3a',
          color: 'white', fontSize: 13, padding: '9px 18px', borderRadius: 999,
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', gap: 7,
        }}>
          <Check size={13} color="#4ade80" /> {toast}
        </div>
      )}
    </>
  );

  return createPortal(modal, document.body);
}

// ─── Shared inline styles ─────────────────────────────────────────
const ipt: React.CSSProperties = {
  background: '#2a2a2a', border: '1px solid #3a3a3a',
  borderRadius: 7, padding: '6px 10px',
  fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box',
};
const iconBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, borderRadius: 7,
  background: '#2a2a2a', border: '1px solid #3a3a3a',
  color: '#aaa', cursor: 'pointer', flexShrink: 0,
};
const cancelBtn: React.CSSProperties = {
  padding: '7px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
  background: '#2a2a2a', border: '1px solid #3a3a3a', color: '#ccc',
};
const saveBtn: React.CSSProperties = {
  padding: '7px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  background: '#10a37f', border: 'none', color: 'white',
};

// ─── Row ──────────────────────────────────────────────────────────
function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 24px', borderBottom: '1px solid #2a2a2a',
      gap: 16,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: '#e5e5e5', fontWeight: 400 }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: '#666', marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: '#2a2a2a', margin: '4px 0' }} />;
}

// ─── NativeSelect ─────────────────────────────────────────────────
function NativeSelect({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { val: string; label: string }[];
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          ...ipt, paddingRight: 28, cursor: 'pointer',
          appearance: 'none', WebkitAppearance: 'none',
          minWidth: 160,
        }}
      >
        {options.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
      </select>
      <ChevronDown size={13} color="#888" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  );
}

// ─── SegmentControl ───────────────────────────────────────────────
function SegmentControl({ options, value, onChange }: {
  options: { val: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: 'flex', background: '#2a2a2a',
      borderRadius: 8, border: '1px solid #3a3a3a',
      overflow: 'hidden',
    }}>
      {options.map((o, i) => (
        <button
          key={o.val}
          onClick={() => onChange(o.val)}
          style={{
            padding: '6px 14px', fontSize: 12.5, cursor: 'pointer',
            background: value === o.val ? '#404040' : 'transparent',
            color: value === o.val ? 'white' : '#888',
            border: 'none',
            borderLeft: i > 0 ? '1px solid #3a3a3a' : 'none',
            fontWeight: value === o.val ? 500 : 400,
            transition: 'all 0.12s',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative', width: 44, height: 24, borderRadius: 999,
        background: checked ? '#10a37f' : '#3a3a3a',
        border: 'none', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, width: 18, height: 18, borderRadius: 999,
        background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        left: checked ? 22 : 3,
        transition: 'left 0.18s',
      }} />
    </button>
  );
}

// ─── DangerBtn ────────────────────────────────────────────────────
function DangerBtn({ label, confirming, onRequest, onConfirm, onCancel }: {
  label: string; confirming: boolean;
  onRequest: () => void; onConfirm: () => void; onCancel: () => void;
}) {
  if (confirming) return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button onClick={onConfirm} style={{ ...cancelBtn, background: '#dc2626', border: 'none', color: 'white', fontWeight: 600 }}>Confirm</button>
      <button onClick={onCancel}  style={cancelBtn}>Cancel</button>
    </div>
  );
  return (
    <button onClick={onRequest} style={{
      ...cancelBtn, color: '#f87171', borderColor: '#f8717133',
    }}>
      {label}
    </button>
  );
}
