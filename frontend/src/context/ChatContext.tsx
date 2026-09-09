'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { 
  Conversation, 
  Message, 
  OnboardingState,
  ChatMessageRequest
} from '../lib/types';
import * as api from '../lib/api';
import { getUserId } from '../lib/api';

interface ChatContextType {
  // Conversation state
  conversations: Conversation[];
  activeConversation: Conversation | null;
  setActiveConversationId: (id: string | null) => void;
  createNewConversation: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  
  // Message state
  messages: Message[];
  isTyping: boolean;
  processingState: string | null;
  setProcessingState: (state: string | null) => void;
  engineState: { active: boolean; progress: number; status: string; logs: { time: string; message: string }[]; startTime: number } | null;
  sendMessage: (request: ChatMessageRequest) => Promise<void>;
  
  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  // App state
  onboardingState: OnboardingState | null;
  refreshOnboardingState: () => Promise<void>;
  
  // User identity
  userId: string;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [processingState, setProcessingState] = useState<string | null>(null);
  const [engineState, setEngineState] = useState<{ active: boolean; progress: number; status: string; logs: { time: string; message: string }[]; startTime: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);
  const [userId] = useState<string>(() => getUserId());

  const activeConversation = conversations.find(c => c.conversationId === activeConversationId) || null;

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
    refreshOnboardingState();
  }, []);

  // Update messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadConversationMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadConversationMessages = async (id: string) => {
    try {
      const conversation = await api.getConversation(id);
      setMessages(conversation.messages || []);
    } catch (error) {
      console.error(`Failed to load conversation ${id}:`, error);
    }
  };

  const refreshOnboardingState = async () => {
    try {
      const state = await api.getOnboardingStatus();
      setOnboardingState(state);
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
    }
  };

  const createNewConversation = async () => {
    try {
      const newConv = await api.createConversation();
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.conversationId);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.conversationId !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const sendMessage = async (request: ChatMessageRequest) => {
    // Determine the target conversation ID
    let currentConvId = request.conversationId || activeConversationId;
    
    // Optimistic UI update for user message
    const tempUserMsg: Message = {
      messageId: `temp-${Date.now()}`,
      role: 'USER',
      content: request.message,
      timestamp: new Date().toISOString(),
      attachments: request.attachments
    };
    
    setMessages(prev => [...prev, tempUserMsg]);
    setIsTyping(true);

    try {
      // If no active conversation, we still send without ID, 
      // the backend should create one and return it
      const finalRequest = {
        ...request,
        conversationId: currentConvId || undefined
      };
      
      const response = await api.sendMessage(finalRequest);
      
      // If a new conversation was created on the backend
      if (response.conversationId && response.conversationId !== currentConvId) {
        currentConvId = response.conversationId;
        setActiveConversationId(currentConvId);
        // We should refresh conversation list to get the new title
        await loadConversations();
      }

      // Add assistant response
      const assistantMsg: Message = {
        messageId: response.messageId,
        role: 'ASSISTANT',
        content: response.content,
        timestamp: new Date().toISOString(),
        metadata: {
          intent: response.intent,
          command: response.command,
          structuredData: response.structuredData
        }
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Check if onboarding state was updated in the response
      if (response.structuredData?.onboardingState) {
        setOnboardingState(response.structuredData.onboardingState as OnboardingState);
      }

      // Handle backend action triggers (Phase 3/4 integration)
      if (response.structuredData?.actions?.triggerApi) {
        const endpoint = response.structuredData.actions.triggerApi;
        const jobUrl = response.structuredData?.data?.jobUrl;
        
        const requiresJobUrl = endpoint === '/api/resumes/analyze' || endpoint === '/api/resumes/generate';
        
        if (!requiresJobUrl || jobUrl) {
          setIsTyping(false); // Hide the dots, show the processing state instead
          
          try {
            let resultData = null;
          if (endpoint === '/api/resumes/analyze') {
            setProcessingState("Analyzing job description and matching with your profile...");
            resultData = { matchReport: await api.analyzeResume(jobUrl) };
          } else if (endpoint === '/api/resumes/generate') {
            // Handle SSE Streaming Generation
            resultData = await new Promise((resolve, reject) => {
              setEngineState({
                active: true,
                progress: 0,
                status: "Initializing engine...",
                logs: [],
                startTime: Date.now()
              });
              
              const eventSource = new EventSource(api.getGenerateResumeStreamUrl(jobUrl));
              
              let isResolved = false;
              
              eventSource.onmessage = (e) => {
                const data = JSON.parse(e.data);
                const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                
                if (data.type === 'log') {
                  setEngineState(prev => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      progress: data.progress || prev.progress,
                      status: data.message || prev.status,
                      logs: [...prev.logs, { time: timeStr, message: data.message }]
                    };
                  });
                } else if (data.type === 'result') {
                  isResolved = true;
                  eventSource.close();
                  setEngineState(prev => prev ? { ...prev, active: false } : null);
                  resolve({ generatedResume: data.data });
                } else if (data.type === 'error') {
                  isResolved = true;
                  eventSource.close();
                  setEngineState(prev => prev ? {
                    ...prev,
                    status: "Failed",
                    logs: [...prev.logs, { time: timeStr, message: "Error: " + data.message }]
                  } : null);
                  setTimeout(() => setEngineState(null), 3000);
                  reject(new Error(data.message));
                }
              };
              
              eventSource.onerror = (e) => {
                if (!isResolved) {
                  eventSource.close();
                  setEngineState(prev => prev ? {
                    ...prev,
                    status: "Connection lost",
                    logs: [...prev.logs, { time: new Date().toLocaleTimeString(), message: "Error: Connection lost" }]
                  } : null);
                  setTimeout(() => setEngineState(null), 3000);
                  reject(new Error("Generation connection lost."));
                }
              };
            });
          } else if (endpoint === '/api/resumes/improve') {
            setProcessingState("Applying AI improvements to your master resume...");
            resultData = { improvements: await api.improveResume("overall") };
          }

          if (resultData) {
            const resultMsg: Message = {
              messageId: `api-result-${Date.now()}`,
              role: 'ASSISTANT',
              content: "Here are the results of the analysis:",
              timestamp: new Date().toISOString(),
              metadata: { structuredData: resultData as any }
            };
            setMessages(prev => [...prev, resultMsg]);
          }
        } catch (apiError) {
          console.error("Failed to execute API action", apiError);
          setMessages(prev => [...prev, {
            messageId: `error-api-${Date.now()}`,
            role: 'SYSTEM',
            content: 'Failed to complete the requested action. Please try again.',
            timestamp: new Date().toISOString(),
          }]);
          } finally {
            setIsTyping(false);
            setProcessingState(null);
          }
        }
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      setMessages(prev => [...prev, {
        messageId: `error-${Date.now()}`,
        role: 'SYSTEM',
        content: 'Failed to send message. Please try again.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        setActiveConversationId,
        createNewConversation,
        deleteConversation,
        messages,
        isTyping,
        processingState,
        setProcessingState,
        engineState,
        sendMessage,
        sidebarOpen,
        setSidebarOpen,
        onboardingState,
        refreshOnboardingState,
        userId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
