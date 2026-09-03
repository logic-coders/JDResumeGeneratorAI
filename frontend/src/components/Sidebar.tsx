'use client';

import React from 'react';
import { useChat } from '../context/ChatContext';
import { 
  MessageSquare, 
  PlusCircle, 
  FileText, 
  Settings, 
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Sidebar() {
  const { 
    conversations, 
    activeConversation, 
    setActiveConversationId,
    createNewConversation,
    deleteConversation,
    sidebarOpen,
    setSidebarOpen,
    sendMessage
  } = useChat();

  if (!sidebarOpen) {
    return (
      <button 
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-[var(--color-panel)] border border-[var(--color-panel-border)] hover:bg-[var(--color-secondary)] transition-colors"
      >
        <ChevronRight size={20} />
      </button>
    );
  }

  return (
    <div className="w-64 h-full glass-panel flex flex-col transition-all duration-300 relative border-r border-[var(--color-panel-border)] shrink-0">
      <div className="p-4 flex items-center justify-between border-b border-[var(--color-panel-border)]">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          AI Resume Agent
        </h2>
        <button 
          onClick={() => setSidebarOpen(false)}
          className="p-1 rounded-md hover:bg-[var(--color-secondary)] transition-colors text-[var(--color-muted-foreground)] hover:text-white"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="p-4">
        <button
          onClick={createNewConversation}
          className="w-full flex items-center gap-2 bg-[var(--color-primary)] hover:bg-blue-600 text-white p-2 rounded-md transition-colors"
        >
          <PlusCircle size={18} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-6">
        <div>
          <h3 className="px-2 text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider mb-2">
            My Resume
          </h3>
          <button 
            onClick={() => sendMessage({ message: '/profile' })}
            className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-[var(--color-secondary)] transition-colors text-sm text-left"
          >
            <FileText size={16} className="text-yellow-500" />
            Master Resume
          </button>
        </div>

        <div>
          <h3 className="px-2 text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider mb-2">
            Recent Chats
          </h3>
          <div className="space-y-1">
            {conversations.length === 0 ? (
              <p className="px-2 text-sm text-[var(--color-muted-foreground)] italic">No recent chats</p>
            ) : (
              conversations.map((conv) => (
                <div 
                  key={conv.conversationId}
                  className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-sm ${
                    activeConversation?.conversationId === conv.conversationId 
                      ? 'bg-[var(--color-secondary)] text-white' 
                      : 'hover:bg-[var(--color-secondary)] text-[var(--color-foreground)]'
                  }`}
                  onClick={() => setActiveConversationId(conv.conversationId)}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare size={16} className="text-[var(--color-muted-foreground)]" />
                    <span className="truncate">{conv.title || 'New Chat'}</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.conversationId);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-muted-foreground)] hover:text-red-400 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[var(--color-panel-border)]">
        <button className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-[var(--color-secondary)] transition-colors text-sm text-left text-[var(--color-muted-foreground)] hover:text-white">
          <Settings size={18} />
          Settings
        </button>
      </div>
    </div>
  );
}
