/**
 * API client for communicating with the Spring Boot backend.
 * Includes X-User-Id header on every request for multi-user support.
 */

import type {
  ChatMessageRequest,
  ChatMessageResponse,
  Conversation,
  UserProfile,
  OnboardingState,
  Resume,
  GeneratedResumeItem,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// ─── User ID Management ─────────────────────────────────────────

const USER_ID_KEY = 'resume_agent_user_id';

/**
 * Get or create a persistent userId stored in localStorage.
 * Generates a UUID on first visit.
 */
export function getUserId(): string {
  if (typeof window === 'undefined') return 'default_user';
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = `user_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

/**
 * Set a specific userId (e.g., after authentication).
 */
export function setUserId(id: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_ID_KEY, id);
  }
}

// ─── Generic Fetch Wrapper ───────────────────────────────────────

/**
 * Generic fetch wrapper with error handling and user scoping.
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': getUserId(),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }

  return response.json();
}

// ─── Chat ────────────────────────────────────────────────────────

export async function sendMessage(
  request: ChatMessageRequest
): Promise<ChatMessageResponse> {
  return apiFetch<ChatMessageResponse>('/api/chat/messages', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function getConversations(): Promise<Conversation[]> {
  return apiFetch<Conversation[]>('/api/chat/conversations');
}

export async function getConversation(id: string): Promise<Conversation> {
  return apiFetch<Conversation>(`/api/chat/conversations/${id}`);
}

export async function createConversation(): Promise<Conversation> {
  return apiFetch<Conversation>('/api/chat/conversations', {
    method: 'POST',
  });
}

export async function deleteConversation(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/chat/conversations/${id}`, {
    method: 'DELETE',
    headers: { 'X-User-Id': getUserId() },
  });
}

// ─── User ────────────────────────────────────────────────────────

export async function getProfile(): Promise<UserProfile | null> {
  try {
    return await apiFetch<UserProfile>('/api/users/profile');
  } catch {
    return null;
  }
}

export async function updateProfile(profile: UserProfile): Promise<UserProfile> {
  return apiFetch<UserProfile>('/api/users/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
}

export async function getOnboardingStatus(): Promise<OnboardingState> {
  return apiFetch<OnboardingState>('/api/users/onboarding/status');
}

export async function uploadResume(file: File): Promise<Record<string, unknown>> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/users/resume/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': getUserId() },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Resume upload failed');
  }
  return response.json();
}

// ─── Resume ──────────────────────────────────────────────────────

export async function getMasterResume(): Promise<Resume | null> {
  try {
    return await apiFetch<Resume>('/api/resumes/master');
  } catch {
    return null;
  }
}

export async function getGeneratedResumes(): Promise<GeneratedResumeItem[]> {
  return apiFetch('/api/resumes/generated');
}

export function getResumePdfUrl(resumeId: string): string {
  const userId = getUserId();
  return `${API_BASE}/api/resumes/download/pdf?id=${encodeURIComponent(resumeId)}&userId=${encodeURIComponent(userId)}`;
}

export function getResumeTexUrl(resumeId: string): string {
  const userId = getUserId();
  return `${API_BASE}/api/resumes/download/tex?id=${encodeURIComponent(resumeId)}&userId=${encodeURIComponent(userId)}`;
}

export async function deleteGeneratedResume(resumeId: string): Promise<{ status: string; message: string; resumeId: string }> {
  return apiFetch(`/api/resumes/generated/${encodeURIComponent(resumeId)}`, {
    method: 'DELETE',
  });
}

export async function analyzeResume(jobUrl: string): Promise<Record<string, any>> {
  return apiFetch('/api/resumes/analyze', {
    method: 'POST',
    body: JSON.stringify({ jobUrl }),
  });
}

export async function generateCustomResume(jobUrl: string): Promise<Record<string, any>> {
  return apiFetch('/api/resumes/generate', {
    method: 'POST',
    body: JSON.stringify({ jobUrl }),
  });
}

export function getGenerateResumeStreamUrl(jobUrl: string): string {
  const userId = getUserId();
  return `${API_BASE}/api/resumes/stream-generate?jobUrl=${encodeURIComponent(jobUrl)}&userId=${encodeURIComponent(userId)}`;
}

export async function improveResume(focusArea: string = "overall"): Promise<Record<string, any>> {
  return apiFetch('/api/resumes/improve', {
    method: 'POST',
    body: JSON.stringify({ focusArea }),
  });
}

// ─── Resume Data CRUD (§16.1 — Editable Profile) ─────────────────

export async function getResumeData(): Promise<Resume | null> {
  try {
    return await apiFetch<Resume>('/api/users/resume-data');
  } catch {
    return null;
  }
}

export async function updateResumeData(resume: Resume): Promise<Resume> {
  return apiFetch<Resume>('/api/users/resume-data', {
    method: 'PUT',
    body: JSON.stringify(resume),
  });
}

export async function patchResumeSection(
  section: 'experience' | 'projects' | 'skills' | 'education' | 'certifications' | 'achievements',
  data: any
): Promise<Resume> {
  return apiFetch<Resume>(`/api/users/resume-data/${section}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
