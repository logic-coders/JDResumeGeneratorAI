/**
 * API client for communicating with the Spring Boot backend.
 */

import type {
  ChatMessageRequest,
  ChatMessageResponse,
  Conversation,
  UserProfile,
  OnboardingState,
  Resume,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Generic fetch wrapper with error handling.
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
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

export async function getGeneratedResumes(): Promise<
  Array<{ id: string; name: string; hasPdf: string }>
> {
  return apiFetch('/api/resumes/generated');
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

export async function improveResume(focusArea: string = "overall"): Promise<Record<string, any>> {
  return apiFetch('/api/resumes/improve', {
    method: 'POST',
    body: JSON.stringify({ focusArea }),
  });
}
