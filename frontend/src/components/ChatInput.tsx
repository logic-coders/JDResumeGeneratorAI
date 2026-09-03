'use client';

import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import SlashCommandMenu from './SlashCommandMenu';
import * as api from '../lib/api';

export default function ChatInput() {
  const { sendMessage, isTyping } = useChat();
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Slash command state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [menuPosition, setMenuPosition] = useState({ bottom: 0, left: 0 });
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);

    // Check for slash command trigger
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPosition);
    
    // Regex matches a '/' followed by word characters at the end of the string
    const match = textBeforeCursor.match(/(^|\s)\/([\w-]*)$/);
    
    if (match) {
      setSlashQuery(match[2]);
      
      // Calculate position
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMenuPosition({
          bottom: window.innerHeight - rect.top + 10,
          left: rect.left + 20,
        });
      }
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleSelectCommand = (command: string) => {
    // Replace the partial slash command with the full command
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = message.slice(0, cursorPosition);
    const textAfterCursor = message.slice(cursorPosition);
    
    const newTextBeforeCursor = textBeforeCursor.replace(/(^|\s)\/[\w-]*$/, `$1${command} `);
    const newMessage = newTextBeforeCursor + textAfterCursor;
    
    setMessage(newMessage);
    setShowSlashMenu(false);
    
    // Focus and move cursor to end of command
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = newTextBeforeCursor.length;
        textareaRef.current.selectionEnd = newTextBeforeCursor.length;
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu) {
      // Let the menu handle navigation keys
      if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
        // We don't preventDefault here, the menu component does it via global listener
        // But we want to prevent the textarea from handling Enter
        if (e.key === 'Enter') e.preventDefault();
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

    const handleSend = async () => {
    if ((!message.trim() && !file) || isTyping || isUploading) return;

    let attachmentPath = null;
    let parsedResumeData = null;
    
    // If there's a file, upload it first
    if (file) {
      setIsUploading(true);
      try {
        const result = await api.uploadResume(file);
        attachmentPath = result.originalPath as string;
        if (result.parsedResume) {
          parsedResumeData = result.parsedResume;
        }
      } catch (error) {
        console.error('File upload failed:', error);
        alert('Failed to upload file. Please try again.');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
      setFile(null);
    }

    const attachments = attachmentPath ? [attachmentPath] : undefined;
    
    // For now, if it's just a file upload without text, we send a default message
    let msgText = message.trim();
    if (!msgText && parsedResumeData) {
      msgText = JSON.stringify(parsedResumeData);
    } else if (!msgText && file) {
      msgText = `Uploaded file: ${file.name}`;
    }
    
    if (msgText || attachments) {
      sendMessage({ message: msgText, attachments });
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.type !== 'application/pdf') {
        alert('Currently, only PDF files are supported for resumes.');
        return;
      }
      if (selected.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }
      setFile(selected);
    }
    // Reset input so the same file can be selected again if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative p-4 md:p-6 pt-0" ref={containerRef}>
      {/* File Preview */}
      {file && (
        <div className="mb-3 flex items-center gap-2 bg-[var(--color-secondary)] border border-[var(--color-panel-border)] px-3 py-2 rounded-lg w-fit animate-fade-in">
          <div className="p-2 bg-blue-500/20 text-blue-400 rounded-md">
            <Paperclip size={16} />
          </div>
          <div className="text-sm">
            <p className="font-medium truncate max-w-[200px]">{file.name}</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button 
            onClick={() => setFile(null)}
            className="ml-2 p-1 text-[var(--color-muted-foreground)] hover:text-white rounded-md hover:bg-[var(--color-muted)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Slash Command Menu */}
      {showSlashMenu && (
        <SlashCommandMenu 
          query={slashQuery}
          position={menuPosition}
          onSelect={handleSelectCommand}
          onClose={() => setShowSlashMenu(false)}
        />
      )}

      {/* Input Area */}
      <div className={`glass-card rounded-2xl flex items-end p-2 transition-all ${
        isTyping ? 'opacity-70' : ''
      }`}>
        <button 
          className="p-3 text-[var(--color-muted-foreground)] hover:text-white hover:bg-[var(--color-secondary)] rounded-xl transition-colors shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isTyping || isUploading}
          title="Upload Resume (PDF)"
        >
          <Paperclip size={20} />
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".pdf"
          onChange={handleFileChange}
        />
        
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={isUploading ? "Uploading file..." : "Type a message or use '/' for commands..."}
          className="flex-1 max-h-[200px] bg-transparent border-none focus:ring-0 resize-none py-3 px-2 text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)] text-base"
          rows={1}
          disabled={isTyping || isUploading}
        />
        
        <button 
          onClick={handleSend}
          disabled={(!message.trim() && !file) || isTyping || isUploading}
          className={`p-3 rounded-xl transition-all shrink-0 ml-2 ${
            (!message.trim() && !file) || isTyping || isUploading
              ? 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] cursor-not-allowed'
              : 'bg-[var(--color-primary)] text-white hover:bg-blue-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
          }`}
        >
          <Send size={20} className={(!message.trim() && !file) || isTyping || isUploading ? '' : 'translate-x-0.5 -translate-y-0.5'} />
        </button>
      </div>
      
      <div className="text-center mt-2">
        <p className="text-[11px] text-[var(--color-muted-foreground)]">
          AI Resume Agent can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  );
}
