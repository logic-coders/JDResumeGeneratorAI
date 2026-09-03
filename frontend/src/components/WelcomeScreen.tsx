'use client';

import React from 'react';
import { useChat } from '../context/ChatContext';

export default function WelcomeScreen() {
  const { onboardingState, sendMessage } = useChat();

  const handleStartOnboarding = () => {
    sendMessage({ message: '/init' });
  };

  const isCompleted = onboardingState?.status === 'COMPLETED';
  const isInProgress = onboardingState?.status === 'IN_PROGRESS';

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in">
      <div className="w-20 h-20 bg-[var(--color-secondary)] rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-lg border border-[var(--color-panel-border)]">
        🤖
      </div>
      
      <h1 className="text-3xl font-bold mb-4 text-white">
        Welcome to AI Resume Agent
      </h1>
      
      <p className="text-lg text-[var(--color-muted-foreground)] mb-8 max-w-lg leading-relaxed">
        I can help you build a professional profile, generate a master resume, 
        analyze job descriptions, and tailor your resume for specific roles.
      </p>

      {!isCompleted && (
        <div className="glass-card p-6 rounded-xl max-w-md w-full">
          <h2 className="text-xl font-semibold text-white mb-2">
            {isInProgress ? 'Resume Profile Setup' : 'Let\'s get started'}
          </h2>
          <p className="text-sm text-[var(--color-muted-foreground)] mb-6">
            {isInProgress 
              ? 'You have an incomplete profile setup. Continue to unlock all features.' 
              : 'Set up your professional profile to generate optimized resumes.'}
          </p>
          
          <button 
            onClick={handleStartOnboarding}
            className="w-full py-3 px-4 bg-[var(--color-primary)] hover:bg-blue-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            {isInProgress ? 'Continue Profile Setup' : 'Set Up My Profile'}
          </button>
        </div>
      )}

      {isCompleted && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full text-left">
          <div className="glass-card p-5 rounded-xl cursor-pointer hover:bg-[var(--color-secondary)] transition-colors"
               onClick={() => sendMessage({ message: '/resume' })}>
            <div className="text-xl mb-2">📄</div>
            <h3 className="font-semibold text-white mb-1">Generate Resume</h3>
            <p className="text-xs text-[var(--color-muted-foreground)]">Create a targeted resume for a specific job description</p>
          </div>
          
          <div className="glass-card p-5 rounded-xl cursor-pointer hover:bg-[var(--color-secondary)] transition-colors"
               onClick={() => sendMessage({ message: '/analyze' })}>
            <div className="text-xl mb-2">🔍</div>
            <h3 className="font-semibold text-white mb-1">Analyze Job Match</h3>
            <p className="text-xs text-[var(--color-muted-foreground)]">See how well your master resume matches a job</p>
          </div>
        </div>
      )}
    </div>
  );
}
