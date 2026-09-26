import { useState, useCallback, useEffect, useRef } from 'react';
import { Conversation, ChatMessage, SourceRef } from '../types/conversation';
import {
  conversationService,
  ConversationItem,
  ConversationDetail,
  StoredMessage,
} from '../services/conversationService';

function mapStoredMessageToChatMessage(m: StoredMessage): ChatMessage {
  return {
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    sources: m.sources?.map((s) => ({
      document_id: s.document_id,
      filename: s.filename,
      chunk_index: s.chunk_index ?? 0,
      page: s.page,
      similarity: s.similarity ?? 1,
    })),
    timestamp: m.created_at,
  };
}

function mapConversationItemToConversation(
  c: ConversationItem | ConversationDetail,
  messages: ChatMessage[] = []
): Conversation {
  return {
    id: c.id,
    title: c.title,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    messages: 'messages' in c && c.messages ? c.messages.map(mapStoredMessageToChatMessage) : messages,
    documentScope: 'all',
    selectedDocumentIds: [],
  };
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isInitialFetchDone = useRef(false);

  // Fetch conversations from PostgreSQL on mount
  const refreshConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await conversationService.listConversations('rag', 0, 50);
      setConversations((prev) => {
        const prevMap = new Map(prev.map((c) => [c.id, c]));
        return res.items.map((item) => {
          const existing = prevMap.get(item.id);
          return mapConversationItemToConversation(item, existing ? existing.messages : []);
        });
      });
    } catch (err) {
      console.error('Failed to fetch RAG conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialFetchDone.current) {
      isInitialFetchDone.current = true;
      refreshConversations();
    }
  }, [refreshConversations]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null;

  // Load complete conversation messages when activeConversationId changes
  const selectConversation = useCallback(
    async (id: string) => {
      setActiveConversationId(id);
      try {
        const detail = await conversationService.getConversation(id);
        const mapped = mapConversationItemToConversation(detail);
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === id);
          if (exists) {
            return prev.map((c) => (c.id === id ? { ...c, ...mapped } : c));
          }
          return [mapped, ...prev];
        });
      } catch (err) {
        console.error('Failed to load conversation details:', err);
      }
    },
    []
  );

  const createConversation = useCallback(
    async (title?: string): Promise<string> => {
      try {
        const item = await conversationService.createConversation(title, 'rag');
        const conv = mapConversationItemToConversation(item);
        setConversations((prev) => [conv, ...prev]);
        setActiveConversationId(conv.id);
        return conv.id;
      } catch (err) {
        console.error('Failed to create conversation in backend:', err);
        // Fallback local creation if needed
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const fallbackConv: Conversation = {
          id,
          title: title || `Conversation ${new Date().toLocaleString()}`,
          createdAt: now,
          updatedAt: now,
          messages: [],
          documentScope: 'all',
          selectedDocumentIds: [],
        };
        setConversations((prev) => [fallbackConv, ...prev]);
        setActiveConversationId(id);
        return id;
      }
    },
    []
  );

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await conversationService.deleteConversation(id);
    } catch (err) {
      console.error('Failed to delete conversation on backend:', err);
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveConversationId((prev) => (prev === id ? null : prev));
  }, []);

  const renameConversation = useCallback(async (id: string, title: string) => {
    try {
      await conversationService.renameConversation(id, title);
    } catch (err) {
      console.error('Failed to rename conversation on backend:', err);
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
  }, []);

  const addUserMessage = useCallback(
    (conversationId: string, content: string): ChatMessage => {
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          const title =
            c.messages.length === 0
              ? content.length > 50
                ? content.slice(0, 47) + '...'
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
        id: crypto.randomUUID(),
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

  const clearConversations = useCallback(async () => {
    setConversations([]);
    setActiveConversationId(null);
  }, []);

  return {
    conversations,
    activeConversationId,
    activeConversation,
    isLoading,
    createConversation,
    deleteConversation,
    renameConversation,
    selectConversation,
    refreshConversations,
    addUserMessage,
    addAssistantMessage,
    updateDocumentScope,
    clearConversations,
  };
}

