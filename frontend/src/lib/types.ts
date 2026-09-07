/**
 * TypeScript type definitions for the AI Resume Agent frontend.
 */

// ─── Message & Conversation ──────────────────────────────────────

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export interface Message {
  messageId?: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  timestamp?: string;
  metadata?: {
    intent?: string;
    command?: string;
    structuredData?: Record<string, any>;
  };
  attachments?: string[];
}

export type ConversationStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';

export interface Conversation {
  conversationId: string;
  title: string;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

// ─── Chat ────────────────────────────────────────────────────────

export interface ChatMessageRequest {
  conversationId?: string;
  message: string;
  attachments?: string[];
}

export interface ChatMessageResponse {
  conversationId: string;
  messageId: string;
  content: string;
  intent?: string;
  command?: string;
  structuredData?: {
    onboardingState?: OnboardingState;
    profileUpdate?: Record<string, string>;
    parsedResume?: Record<string, any>;
    matchReport?: any;
    generatedResume?: any;
    improvements?: any;
    actions?: Record<string, any>;
    data?: Record<string, any>;
    [key: string]: any;
  };
}

// ─── User & Onboarding ──────────────────────────────────────────

export interface UserProfile {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  leetcode?: string;
  portfolio?: string;
  website?: string;
}

export type OnboardingStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED';

export type OnboardingStage =
  | 'BASIC_PROFILE'
  | 'PROFESSIONAL_LINKS'
  | 'RESUME_UPLOAD'
  | 'RESUME_REVIEW'
  | 'EXPERIENCE_ENRICHMENT'
  | 'MASTER_GENERATION';

export interface OnboardingState {
  status: OnboardingStatus;
  currentStage?: OnboardingStage;
  completedStages: OnboardingStage[];
}

// ─── Resume ──────────────────────────────────────────────────────

export interface PersonalInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  leetcode?: string;
}

export interface Skills {
  languages: string[];
  frameworks: string[];
  databases: string[];
  cloud: string[];
  tools: string[];
}

export interface Experience {
  company?: string;
  title?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  bullets: string[];
}

export interface Project {
  name?: string;
  technologies?: string;
  url?: string;
  bullets: string[];
}

export interface Education {
  institution?: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
}

export interface Resume {
  personalInfo?: PersonalInfo;
  summary?: string;
  skills?: Skills;
  experience: Experience[];
  projects: Project[];
  education: Education[];
  certifications: string[];
  achievements: string[];
}

// ─── Job ─────────────────────────────────────────────────────────

export interface Job {
  jobId?: string;
  company?: string;
  jobTitle?: string;
  location?: string;
  description?: string;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  minimumExperience?: string;
  educationRequirements: string[];
  sourceUrl?: string;
}

// ─── Match Report ────────────────────────────────────────────────

export interface MatchReport {
  overallMatchScore: number;
  strongMatches: string[];
  partialMatches: string[];
  missingSkills: string[];
  recommendations: string[];
}

// ─── Slash Commands ──────────────────────────────────────────────

export interface SlashCommand {
  command: string;
  description: string;
  category: 'setup' | 'resume' | 'utility';
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { command: '/init', description: 'Start or continue profile setup', category: 'setup' },
  { command: '/profile', description: 'View or update your profile', category: 'setup' },
  { command: '/status', description: 'Check setup progress', category: 'setup' },
  { command: '/resume', description: 'Generate a job-specific resume', category: 'resume' },
  { command: '/analyze', description: 'Analyze resume vs job', category: 'resume' },
  { command: '/improve', description: 'Improve your master resume', category: 'resume' },
  { command: '/help', description: 'Show available commands', category: 'utility' },
  { command: '/cancel', description: 'Cancel current workflow', category: 'utility' },
];

// ─── Generated Resume ────────────────────────────────────────────

export interface GeneratedResumeItem {
  resumeId: string;
  company: string;
  jobTitle: string;
  jobId: string;
  jobUrl?: string;
  folderPath: string;
  hasPdf: boolean;
  hasTex: boolean;
  hasJson: boolean;
  generatedAt?: string;
  updatedAt?: string;
  version?: number;
  matchScore?: number;
  name?: string;
  id?: string;
}

