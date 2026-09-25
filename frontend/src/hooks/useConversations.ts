import { useState, useCallback, useEffect } from 'react';
import { Conversation, ChatMessage, SourceRef } from '../types/conversation';

const STORAGE_KEY = 'rag_conversations';

function loadFromStorage(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(conversations: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

function generateId(): string {
  return crypto.randomUUID();
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadFromStorage());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Persist changes
  useEffect(() => {
    saveToStorage(conversations);
  }, [conversations]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null;

  const createConversation = useCallback((title?: string): string => {
    const id = generateId();
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id,
      title: title || `Conversation ${new Date().toLocaleString()}`,
      createdAt: now,
      updatedAt: now,
      messages: [],
      documentScope: 'all',
      selectedDocumentIds: [],
    };
    setConversations((prev) => [conversation, ...prev]);
    setActiveConversationId(id);
    return id;
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveConversationId((prev) => (prev === id ? null : prev));
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  const addUserMessage = useCallback(
    (conversationId: string, content: string): ChatMessage => {
      const msg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          // Auto-title from first user message
          const title =
            c.messages.length === 0
              ? content.length > 60
                ? content.slice(0, 57) + '...'
                : content
              : c.title;
          return {
            ...c,
            title,
            messages: [...c.messages, msg],
            updatedAt: new Date().toISOString(),
          };
        })
      );
      return msg;
    },
    []
  );

  const addAssistantMessage = useCallback(
    (conversationId: string, content: string, sources?: SourceRef[], isError?: boolean) => {
      const msg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content,
        sources,
        isError,
        timestamp: new Date().toISOString(),
      };
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          return {
            ...c,
            messages: [...c.messages, msg],
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    []
  );

  const updateDocumentScope = useCallback(
    (
      conversationId: string,
      scope: 'all' | 'selected',
      selectedDocumentIds: string[]
    ) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, documentScope: scope, selectedDocumentIds }
            : c
        )
      );
    },
    []
  );

  const clearConversations = useCallback(() => {
    setConversations([]);
    setActiveConversationId(null);
  }, []);

  return {
    conversations,
    activeConversationId,
    activeConversation,
    createConversation,
    deleteConversation,
    selectConversation,
    addUserMessage,
    addAssistantMessage,
    updateDocumentScope,
    clearConversations,
  };
}
