import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { agentService, AgentEvent } from '../services/agentService';
import { conversationService } from '../services/conversationService';

export interface McpMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  events?: AgentEvent[];
  requiresConfirmation?: boolean;
  pendingAction?: string;
  sessionId?: string;
  toolCallsMade?: number;
  isLoading?: boolean;
  timestamp: Date;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

const DEFAULT_MESSAGES: McpMessage[] = [
  {
    id: 'sys-init',
    role: 'system',
    content: 'MCP Tool-Calling Agent — connected',
    timestamp: new Date(),
  },
  {
    id: 'agent-welcome',
    role: 'agent',
    content:
      "Hi! I'm your MCP agent. I can search your documents, recall memories, manage tasks, and more. What would you like me to help with?",
    timestamp: new Date(),
  },
];

interface AgentContextType {
  messages: McpMessage[];
  sending: boolean;
  confirming: boolean;
  activeSession: string | undefined;
  sendMessage: (text: string) => Promise<void>;
  confirmAction: (confirmed: boolean) => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  startNewChat: () => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<McpMessage[]>(DEFAULT_MESSAGES);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [activeSession, setActiveSession] = useState<string | undefined>();
  const activeSessionRef = useRef<string | undefined>(activeSession);
  activeSessionRef.current = activeSession;

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: McpMessage = {
      id: uid(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    const loadingId = uid();
    const loadingMsg: McpMessage = {
      id: loadingId,
      role: 'agent',
      content: '',
      isLoading: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setSending(true);

    try {
      const resp = await agentService.chat(trimmed, activeSessionRef.current);
      setActiveSession(resp.session_id);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                content: resp.answer,
                events: resp.events,
                requiresConfirmation: resp.requires_confirmation,
                pendingAction: resp.pending_action,
                sessionId: resp.session_id,
                toolCallsMade: resp.tool_calls_made,
                isLoading: false,
                timestamp: new Date(),
              }
            : m
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                content: `Error: ${err.message || 'An internal server error occurred. Please try again later.'}`,
                isLoading: false,
                timestamp: new Date(),
              }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  }, []);

  const confirmAction = useCallback(async (confirmed: boolean) => {
    const currentSession = activeSessionRef.current;
    if (!currentSession) return;

    setConfirming(true);
    try {
      const resp = await agentService.confirm(currentSession, confirmed);
      setMessages((prev) => [
        ...prev.map((m) => (m.requiresConfirmation ? { ...m, requiresConfirmation: false } : m)),
        {
          id: uid(),
          role: 'agent',
          content: resp.answer,
          events: resp.events,
          sessionId: resp.session_id,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'agent',
          content: `Action failed: ${err.message || 'Unknown error'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setConfirming(false);
    }
  }, []);

  const selectConversation = useCallback(async (conversationId: string) => {
    try {
      const conv = await conversationService.getConversation(conversationId);
      setActiveSession(conv.id);

      const loadedMessages: McpMessage[] = [
        {
          id: uid(),
          role: 'system',
          content: 'MCP Tool-Calling Agent — connected',
          timestamp: new Date(conv.created_at),
        },
      ];

      (conv.messages || []).forEach((msg) => {
        const events = msg.events as any;
        const toolCallsMade = Array.isArray(events)
          ? events.filter((e: any) => e.type === 'tool_result').length
          : 0;
        loadedMessages.push({
          id: msg.id,
          role: msg.role === 'user' ? 'user' : 'agent',
          content: msg.content,
          events: events,
          toolCallsMade: toolCallsMade > 0 ? toolCallsMade : undefined,
          sessionId: conv.id,
          timestamp: new Date(msg.created_at),
        });
      });

      setMessages(loadedMessages);
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
    }
  }, []);

  const startNewChat = useCallback(() => {
    setActiveSession(undefined);
    setMessages([
      {
        id: uid(),
        role: 'system',
        content: 'MCP Tool-Calling Agent — connected',
        timestamp: new Date(),
      },
      {
        id: uid(),
        role: 'agent',
        content:
          "Hi! I'm your MCP agent. I can search your documents, recall memories, manage tasks, and more. What would you like me to help with?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  return (
    <AgentContext.Provider
      value={{
        messages,
        sending,
        confirming,
        activeSession,
        sendMessage,
        confirmAction,
        selectConversation,
        startNewChat,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
};

export const useAgent = (): AgentContextType => {
  const ctx = useContext(AgentContext);
  if (!ctx) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return ctx;
};
