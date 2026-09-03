'use client';

import React from 'react';
import { ChatProvider, useChat } from '../context/ChatContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import ChatInput from '../components/ChatInput';

function ChatLayout() {
  const { sidebarOpen } = useChat();

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      {/* Sidebar */}
      <div 
        className={`${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full'
        } transition-all duration-300 ease-in-out shrink-0 z-40`}
      >
        <Sidebar />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden transition-all duration-300">
        
        {/* Header - visible mostly on mobile or when sidebar is closed */}
        <header className="h-14 glass-panel border-b border-[var(--color-panel-border)] flex items-center px-4 shrink-0 justify-center">
          <h1 className="font-semibold text-[var(--color-foreground)]">AI Resume Agent</h1>
        </header>
        
        <main className="flex-1 flex flex-col overflow-hidden relative z-10">
          <ChatWindow />
          <div className="shrink-0 w-full max-w-4xl mx-auto z-20 w-full px-2">
            <ChatInput />
          </div>
        </main>
        
        {/* Background decorative elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ChatProvider>
      <ChatLayout />
    </ChatProvider>
  );
}
