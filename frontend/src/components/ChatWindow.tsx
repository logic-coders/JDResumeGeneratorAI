'use client';

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChat } from '../context/ChatContext';
import WelcomeScreen from './WelcomeScreen';
import MatchReport from './MatchReport';
import ResumePreview from './ResumePreview';
import GenerationEngineUI from './GenerationEngineUI';

export default function ChatWindow() {
  const { messages, isTyping, processingState, engineState, sendMessage } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <WelcomeScreen />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scroll-smooth p-4 md:p-6 space-y-6">
      {messages.map((msg, idx) => {
        const isUser = msg.role === 'USER';
        const isLatestAssistant = idx === messages.length - 1 && !isUser && !isTyping;
        const lowerContent = msg.content.toLowerCase();
        const hasSkip = lowerContent.includes('skip');
        const hasConfirm = lowerContent.includes('confirm');
        
        return (
          <div 
            key={msg.messageId || idx} 
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
              
              {/* Avatar */}
              <div className="shrink-0 flex items-end">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm
                  ${isUser ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-primary)]'}`}
                >
                  {isUser ? '👤' : '🤖'}
                </div>
              </div>

              {/* Message Bubble */}
              <div className={`p-4 rounded-2xl overflow-hidden break-words break-all max-w-full min-w-0 ${
                isUser 
                  ? 'bg-[var(--color-secondary)] border border-[var(--color-panel-border)] text-[var(--color-foreground)] rounded-br-none' 
                  : 'glass-card text-[var(--color-foreground)] rounded-bl-none'
              }`}>
                {msg.role === 'SYSTEM' ? (
                  <div className="text-red-400 text-sm font-medium">{msg.content}</div>
                ) : (
                  <div className="prose prose-invert prose-sm md:prose-base max-w-full min-w-0 break-words break-all overflow-x-hidden">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}

                {/* Quick Action Chips for Interactive Prompts */}
                {isLatestAssistant && (hasSkip || hasConfirm) && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-[var(--color-panel-border)]/50">
                    {hasSkip && (
                      <button
                        onClick={() => sendMessage({ message: '/skip' })}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-secondary)] hover:bg-[var(--color-primary)]/20 border border-[var(--color-panel-border)] hover:border-[var(--color-primary)] text-[var(--color-foreground)] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 hover:shadow"
                      >
                        <span>⏭️</span> Skip this
                      </button>
                    )}
                    {hasConfirm && (
                      <button
                        onClick={() => sendMessage({ message: 'confirm' })}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/40 border border-[var(--color-primary)] text-[var(--color-foreground)] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 font-medium"
                      >
                        <span>✅</span> Confirm & Continue
                      </button>
                    )}
                  </div>
                )}
                
                {/* Optional structured data rendering would go here (e.g. ActionButtons) */}
                {msg.metadata?.structuredData?.matchReport && (
                  <MatchReport data={msg.metadata.structuredData.matchReport} />
                )}
                
                {(msg.metadata?.structuredData?.generatedResume || msg.metadata?.structuredData?.improvements) && (
                  <ResumePreview data={msg.metadata.structuredData.generatedResume || msg.metadata.structuredData} />
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Typing Indicator */}
      {isTyping && (
        <div className="flex justify-start animate-fade-in">
          <div className="flex max-w-[85%] md:max-w-[75%] flex-row gap-3">
            <div className="shrink-0 flex items-end">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-sm shadow-sm">
                🤖
              </div>
            </div>
            <div className="glass-card p-4 rounded-2xl rounded-bl-none flex items-center gap-1.5 h-12 px-5">
              <div className="w-2 h-2 rounded-full bg-[var(--color-muted-foreground)] typing-dot"></div>
              <div className="w-2 h-2 rounded-full bg-[var(--color-muted-foreground)] typing-dot"></div>
              <div className="w-2 h-2 rounded-full bg-[var(--color-muted-foreground)] typing-dot"></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Engine State Indicator (For Streaming Tasks) */}
      {engineState && engineState.active && (
        <GenerationEngineUI 
          progress={engineState.progress}
          status={engineState.status}
          logs={engineState.logs}
          startTime={engineState.startTime}
        />
      )}
      
      {/* Processing State Indicator (For Simple Async Tasks) */}
      {processingState && !engineState?.active && (
        <div className="flex justify-start animate-fade-in">
          <div className="flex max-w-[85%] md:max-w-[75%] flex-row gap-3">
            <div className="shrink-0 flex items-end">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-sm shadow-sm">
                🤖
              </div>
            </div>
            <div className="glass-card p-4 rounded-2xl rounded-bl-none flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-[var(--color-primary)]">{processingState}</span>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
}
