'use client';
// This file is the main entry point for the chat application, handling user interactions, message sending, and conversation management.
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  ChatBubbleLeftRightIcon,
  Bars3Icon,
  XMarkIcon,
  PlusIcon,
  ArrowRightStartOnRectangleIcon,
  SparklesIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { auth, chat, files } from './services/api';
import ThemeToggle from './components/ThemeToggle';
import MessageCard from './components/MessageCard';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: string;
  metadata?: {
    filename?: string;
    file_size?: number;
    processing_id?: string;
    status?: string;
    error?: string;
  };
}

interface Conversation {
  conversation_id: string;
  last_updated: string;
  preview_text: string;
  message_count: number;
}

export default function Home() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const currentConversationRef = useRef<string | undefined>(undefined);
  const conversationsLoadedRef = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
  const email = localStorage.getItem('email');
  setUserEmail(email);
}, []);

  // Load chat history for a specific conversation
  const loadConversationHistory = async (convId: string) => {
    if (isLoading) return; // Prevent loading if already loading messages

    try {
      const history = await chat.getChatHistory(convId);
      if (history.messages) {
        // Convert timestamp strings to Date objects
        const messagesWithDates = history.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
        setConversationId(convId);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };

  // Manual refresh function for conversations
  const refreshConversations = async () => {
    if (isLoadingConversations) return;

    try {
      setIsLoadingConversations(true);
      const updatedConversations = await chat.getConversations();
      setConversations(updatedConversations);
    } catch (error) {
      console.error('Failed to refresh conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // Delete conversation function
  const handleDeleteConversation = async (conversationIdToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the conversation click

    // Find the conversation to get its name for the confirmation
    const conversationToDelete = conversations.find(conv => conv.conversation_id === conversationIdToDelete);
    const conversationName = conversationToDelete?.preview_text || 'New Chat';
    const displayName = conversationName.length > 30 ? conversationName.substring(0, 30) + '...' : conversationName;

    if (!confirm(`Are you sure you want to delete "${displayName}"?\n\nThis action cannot be undone and will permanently remove all messages in this conversation.`)) {
      return;
    }

    try {
      setDeletingConversationId(conversationIdToDelete);
      await chat.deleteConversation(conversationIdToDelete);

      // Remove the conversation from the local state
      setConversations(prev => prev.filter(conv => conv.conversation_id !== conversationIdToDelete));

      // If the deleted conversation was the current one, clear the current conversation
      if (conversationId === conversationIdToDelete) {
        setConversationId(undefined);
        setMessages([]);
      }

      console.log('Conversation deleted successfully');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    } finally {
      setDeletingConversationId(null);
    }
  };

  console.log('Loading conversations:', conversations);
  

  // Load conversations list
  useEffect(() => {
    const loadConversations = async () => {
      if (isLoadingConversations || conversationsLoadedRef.current) return; // Prevent multiple simultaneous loads

      conversationsLoadedRef.current = true;
      setIsLoadingConversations(true);
      try {
        const data = await chat.getConversations();
        console.log('Conversations loaded:', data);
        setConversations(data);
      } catch (error) {
        console.error('Failed to load conversations:', error);
        conversationsLoadedRef.current = false; // Reset on error
      } finally {
        setIsLoadingConversations(false);
      }
    };

    if (localStorage.getItem('token')) {
      loadConversations();
    }
  }, []); // Only run once on mount

  // Separate effect for loading conversation history when conversationId changes
  useEffect(() => {
    if (conversationId && conversationId !== currentConversationRef.current) {
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      // Debounce the conversation loading
      loadingTimeoutRef.current = setTimeout(() => {
        currentConversationRef.current = conversationId;
        loadConversationHistory(conversationId);
      }, 100); // 100ms debounce
    }

    // Cleanup timeout on unmount
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [conversationId]); // Add dependency array

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const createNewChat = async () => {
    if (isLoading || isLoadingConversations) return; // Prevent multiple calls

    try {
      setIsLoadingConversations(true);
      const response = await chat.createNewConversation();
      setConversationId(response.chatId);
      setMessages([]);
      await refreshConversations();
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/login');
      }
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const token = localStorage.getItem("token");

    // If no conversation ID, create a new conversation first
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      try {
        const newConversation = await chat.createNewConversation();
        currentConversationId = newConversation.conversation_id;
        setConversationId(currentConversationId);
      } catch (error) {
        console.error("Error creating new conversation:", error);
        return;
      }
    }

  const userMessage: Message = {
    id: Date.now().toString(),
    text: input.trim(),
    isUser: true,
    timestamp: new Date(),
  };

  setMessages((prev) => [...prev, userMessage]);
  setInput("");
  setIsLoading(true);

  try {
    const response = await fetch("http://localhost:8000/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: input.trim(),
        conversation_id: currentConversationId, // ✅ send to backend
      }),
    });

    const data = await response.json();

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: data.answer,
      isUser: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, botMessage]);
    setIsLoading(false);

    // Refresh conversations to update the preview text and last updated time
    setTimeout(() => {
      refreshConversations();
    }, 1000); // Wait 1 second before refreshing to allow backend to process
  } catch (error) {
    console.error("Error:", error);
    const errorMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: "Sorry, an error occurred.",
      isUser: false,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, errorMessage]);
    setIsLoading(false);
  }
};


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadProgress(0);

      // Upload file with current conversation ID
      await files.uploadFile(file, conversationId);
      setUploadProgress(100);

      // The upload message is now handled by the backend and will appear in the conversation
      // We just need to refresh the conversation to see the upload card
      if (conversationId) {
        // Refresh current conversation to show the upload message
        await loadConversationHistory(conversationId);

        // Start polling for processing completion
        startProcessingPolling(conversationId);
      }

      // Reset progress after a delay
      setTimeout(() => setUploadProgress(null), 2000);

      // Clear the file input
      e.target.value = '';

    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/login');
      } else {
        const errorMessage: Message = {
          id: Date.now().toString(),
          text: `Failed to upload file: ${error.response?.data?.detail || 'Unknown error'}`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setUploadProgress(null);
      }
    }
  };

  // Polling function to check for processing completion
  const startProcessingPolling = (convId: string) => {
    let pollCount = 0;
    const maxPolls = 100; // Maximum 5 minutes of polling (3 seconds * 100)

    const pollInterval = setInterval(async () => {
      try {
        pollCount++;
        const conversationData = await chat.getChatHistory(convId);

        if (conversationData && conversationData.messages) {
          setMessages(conversationData.messages);

          // Check if there are any processing messages left
          const hasProcessingMessages = conversationData.messages.some((msg: Message) =>
            msg.type === 'upload_card' && msg.metadata?.status === 'processing'
          );

          // If no processing messages or max polls reached, stop polling
          if (!hasProcessingMessages || pollCount >= maxPolls) {
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Error polling for processing completion:', error);
        clearInterval(pollInterval);
      }
    }, 3000); // Poll every 3 seconds
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Sidebar */}
      <div className={`${
        isSidebarOpen ? 'w-64 sm:w-72 lg:w-80' : 'w-0'
      } transition-all duration-300 overflow-hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-r border-slate-200 dark:border-slate-700 flex-shrink-0`}>
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Conversations
              </h2>
            </div>
            <button
              onClick={createNewChat}
              className="p-2 rounded-lg sm:rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200"
              title="New Chat"
            >
              <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto h-full py-4 px-4 space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'rgb(var(--text-muted-rgb))' }} />
              <p className="text-sm" style={{ color: 'rgb(var(--text-muted-rgb))' }}>
                No conversations yet
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted-rgb))' }}>
                Start a new chat to begin
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.conversation_id}
                onClick={() => {
                  if (conversationId !== conv.conversation_id && !isLoading) {
                    loadConversationHistory(conv.conversation_id);
                  }
                }}
                className={`w-full p-4 text-left transition-all duration-200 rounded-xl hover-lift group ${
                  conversationId === conv.conversation_id
                    ? 'glass-effect shadow-glow'
                    : 'hover:bg-opacity-50'
                }`}
                style={{
                  background: conversationId === conv.conversation_id
                    ? 'rgb(var(--primary-rgb) / 0.1)'
                    : 'transparent',
                  borderColor: conversationId === conv.conversation_id
                    ? 'rgb(var(--primary-rgb) / 0.3)'
                    : 'transparent'
                }}
              >
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    conversationId === conv.conversation_id ? 'gradient-primary' : ''
                  }`}
                  style={{
                    background: conversationId !== conv.conversation_id
                      ? 'rgb(var(--surface-secondary-rgb))'
                      : undefined
                  }}>
                    <ChatBubbleLeftRightIcon className={`w-5 h-5 ${
                      conversationId === conv.conversation_id ? 'text-white' : ''
                    }`}
                    style={{
                      color: conversationId !== conv.conversation_id
                        ? 'rgb(var(--text-muted-rgb))'
                        : undefined
                    }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'rgb(var(--text-primary-rgb))' }}>
                      {(conv.preview_text || 'New Chat').length > 35
                        ? (conv.preview_text || 'New Chat').substring(0, 35) + '...'
                        : (conv.preview_text || 'New Chat')}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs" style={{ color: 'rgb(var(--text-muted-rgb))' }}>
                        {new Date(conv.last_updated).toLocaleDateString()}
                      </p>
                      <span className="w-1 h-1 rounded-full" style={{ background: 'rgb(var(--text-muted-rgb))' }}></span>
                      <p className="text-xs" style={{ color: 'rgb(var(--text-muted-rgb))' }}>
                        {conv.message_count} messages
                      </p>
                    </div>
                  </div>
                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDeleteConversation(conv.conversation_id, e)}
                    disabled={deletingConversationId === conv.conversation_id}
                    className={`opacity-0 group-hover:opacity-100 p-1.5 sm:p-2 rounded-lg transition-all duration-200 flex-shrink-0 ${
                      deletingConversationId === conv.conversation_id
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:scale-110'
                    }`}
                    title={deletingConversationId === conv.conversation_id ? "Deleting..." : "Delete conversation"}
                  >
                    {deletingConversationId === conv.conversation_id ? (
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <TrashIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    )}
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-xl m-2 sm:m-4 lg:m-6 rounded-2xl sm:rounded-3xl flex-1 flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center py-4 sm:py-6 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-t-2xl sm:rounded-t-3xl">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200"
                title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
              >
                {isSidebarOpen ? (
                  <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Bars3Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    RAG Bot
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    AI-Powered Assistant
                  </p>
                </div>
              </div>
              {userEmail && (
                <div className="hidden lg:flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {userEmail}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <ThemeToggle />
              <button
                onClick={createNewChat}
                className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200"
                title="New Chat"
              >
                <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button
                onClick={() => auth.logout()}
                className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200"
                title="Logout"
              >
                <ArrowRightStartOnRectangleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>

          <div ref={chatContainerRef} className="chat-container flex-1 min-h-0 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md mx-auto">
                  <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <SparklesIcon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Welcome to RAG Bot
                  </h3>
                  <p className="text-lg mb-6 text-slate-600 dark:text-slate-300">
                    Your intelligent AI assistant powered by advanced retrieval technology
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 rounded-xl" style={{ background: 'rgb(var(--surface-secondary-rgb) / 0.5)' }}>
                      <div className="w-8 h-8 rounded-lg gradient-secondary flex items-center justify-center">
                        <span className="text-white text-sm font-bold">?</span>
                      </div>
                      <span className="text-sm" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                        Ask questions about uploaded documents
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-xl" style={{ background: 'rgb(var(--surface-secondary-rgb) / 0.5)' }}>
                      <div className="w-8 h-8 rounded-lg gradient-secondary flex items-center justify-center">
                        <PaperClipIcon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                        Upload files to expand knowledge base
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.isUser ? 'user-message' : 'bot-message'}`}
                >
                  <div className="flex items-start space-x-4">
                    {!message.isUser && (
                      <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
                        <SparklesIcon className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {!message.isUser && (
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-sm" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                            RAG Bot
                          </span>
                          <span className="message-timestamp">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                      {message.isUser && (
                        <div className="flex items-center justify-end space-x-2 mb-2">
                          <span className="message-timestamp">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="font-semibold text-sm text-white">
                            You
                          </span>
                        </div>
                      )}
                      <div className={message.isUser ? 'text-white' : ''}>
                        <MessageCard message={message} />
                      </div>
                    </div>
                    {message.isUser && (
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ background: 'rgb(var(--text-primary-rgb) / 0.1)' }}>
                        <span style={{ color: 'rgb(var(--text-primary-rgb))' }}>
                          {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="message bot-message">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
                    <SparklesIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-sm" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                        RAG Bot
                      </span>
                      <span className="text-xs" style={{ color: 'rgb(var(--text-muted-rgb))' }}>
                        thinking...
                      </span>
                    </div>
                    <div className="typing-indicator">
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {uploadProgress !== null && (
            <div className="px-8 py-4 border-t" style={{ borderColor: 'rgb(var(--border-rgb) / 0.2)' }}>
              <div className="flex items-center space-x-3 mb-2">
                <PaperClipIcon className="w-4 h-4" style={{ color: 'rgb(var(--primary-rgb))' }} />
                <span className="text-sm font-medium" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                  Uploading file... {uploadProgress}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgb(var(--surface-secondary-rgb))' }}>
                <div
                  className="h-full rounded-full transition-all duration-500 gradient-primary"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-b-2xl sm:rounded-b-3xl">
            <form onSubmit={handleSubmit} className="flex items-center p-3 sm:p-4 lg:p-6 space-x-2 sm:space-x-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="w-full bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none text-sm sm:text-base lg:text-lg py-2 sm:py-3 px-3 sm:px-4 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <div className="absolute inset-y-0 right-3 sm:right-4 flex items-center pointer-events-none">
                  <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
                    Press Enter to send
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <label className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 cursor-pointer group"
                title="Upload file">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".txt,.pdf,.doc,.docx,.csv,.json,.md,.html"
                  />
                  <PaperClipIcon className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform duration-200" />
                </label>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                  title="Send message"
                >
                  <PaperAirplaneIcon className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 ${isLoading ? 'animate-pulse' : ''}`} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}