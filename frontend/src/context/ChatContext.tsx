'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { 
  Conversation, 
  Message, 
  OnboardingState,
  ChatMessageRequest
} from '../lib/types';
import * as api from '../lib/api';

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
  sendMessage: (request: ChatMessageRequest) => Promise<void>;
  
  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  // App state
  onboardingState: OnboardingState | null;
  refreshOnboardingState: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [processingState, setProcessingState] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);

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
      if (response.structuredData?.actions?.triggerApi && response.structuredData?.data?.jobUrl) {
        setIsTyping(false); // Hide the dots, show the processing state instead
        const endpoint = response.structuredData.actions.triggerApi;
        const jobUrl = response.structuredData.data.jobUrl;
        
        try {
          let resultData = null;
          if (endpoint === '/api/resumes/analyze') {
            setProcessingState("Analyzing job description and matching with your profile...");
            resultData = { matchReport: await api.analyzeResume(jobUrl) };
          } else if (endpoint === '/api/resumes/generate') {
            setProcessingState("Drafting your highly tailored resume...");
            resultData = { generatedResume: await api.generateCustomResume(jobUrl) };
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
              metadata: { structuredData: resultData }
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
        sendMessage,
        sidebarOpen,
        setSidebarOpen,
        onboardingState,
        refreshOnboardingState,
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
