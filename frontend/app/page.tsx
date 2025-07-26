'use client';
// This file is the main entry point for the chat application, handling user interactions, message sending, and conversation management.
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PaperAirplaneIcon, PaperClipIcon } from '@heroicons/react/24/solid';
import { auth, chat, files } from './services/api';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
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
  const chatContainerRef = useRef<HTMLDivElement>(null);
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
    try {
      const history = await chat.getChatHistory(convId);
      if (history.messages) {
        setMessages(history.messages);
        setConversationId(convId);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };

  console.log('Loading conversations:', conversations);
  

  // Load conversations list
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const data = await chat.getConversations(userEmail);
        setConversations(data);
        
        // If we have a conversation ID, load its messages
        if (conversationId) {
          await loadConversationHistory(conversationId);
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    };
    
    if (localStorage.getItem('token')) {
      loadConversations();
    }
  }, []);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const createNewChat = async () => {
    try {
      const response = await chat.createNewConversation();
      setConversationId(response.chatId);
      setMessages([]);
      const updatedConversations = await chat.getConversations(userEmail);
      setConversations(updatedConversations);
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/login');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Create new conversation if none exists
      if (!conversationId) {
        const response = await chat.createNewConversation();
        setConversationId(response.chatId);
      }

      const response = await chat.sendMessage(userMessage.text, conversationId!);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.content,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
      
      // Refresh conversations list to show the latest chat
      const updatedConversations = await chat.getConversations(userEmail);
      setConversations(updatedConversations);
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/login');
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, I encountered an error. Please try again.',
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadProgress(0);
      await files.uploadFile(file);
      setUploadProgress(100);

      const systemMessage: Message = {
        id: Date.now().toString(),
        text: `File "${file.name}" uploaded successfully. You can now ask questions about it.`,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, systemMessage]);

      // Reset progress after a delay
      setTimeout(() => setUploadProgress(null), 2000);
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

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${
        isSidebarOpen ? 'w-80' : 'w-0'
      } transition-all duration-300 bg-white border-r border-gray-200 overflow-hidden`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Conversations</h2>
            <button
              onClick={() => {
                setConversationId(undefined);
                setMessages([]);
              }}
              className="p-2 text-gray-500 hover:text-primary-500 transition-colors"
              title="New Chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        <div className="overflow-y-auto h-full py-4">
          {conversations.map((conv) => (
            <button
              key={conv.conversation_id}
              onClick={() => loadConversationHistory(conv.conversation_id)}
              className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                conversationId === conv.conversation_id 
                  ? 'bg-primary-50 border-r-4 border-primary-500 font-medium' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {conv.preview_text.length > 50 
                      ? conv.preview_text.substring(0, 50) + '...'
                      : conv.preview_text}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(conv.last_updated).toLocaleDateString()} · {conv.message_count} messages
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white shadow-lg m-4 rounded-2xl flex-1 flex flex-col overflow-hidden">
          <div className="chat-header">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 text-gray-500 hover:text-primary-500 transition-colors"
                title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                RAG Bot
              </h1>
              <span className="px-2 py-1 text-xs font-medium text-primary-600 bg-primary-50 rounded-full">
                AI Assistant
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setConversationId(undefined);
                  setMessages([]);
                }}
                className="toolbar-button"
                title="New Chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => auth.logout()}
                className="toolbar-button"
                title="Logout"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          <div ref={chatContainerRef} className="chat-container flex-1 min-h-0 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.isUser ? 'user-message' : 'bot-message'}`}
              >
                <div className="flex items-start space-x-3">
                  {!message.isUser && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-medium">
                      R
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {message.isUser ? 'You' : 'RAG Bot'}
                      </span>
                      <span className="message-timestamp">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="mt-2 text-gray-700 leading-relaxed">
                      {message.text}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message bot-message">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-medium">
                    R
                  </div>
                  <div className="typing-indicator">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {uploadProgress !== null && (
            <div className="px-6 py-3 border-t border-gray-100">
              <div className="w-full bg-gray-100 rounded-full h-1">
                <div
                  className="bg-primary-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="chat-input border-t border-gray-100">
            <form onSubmit={handleSubmit} className="flex items-center p-4 space-x-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none"
              />
              <div className="flex items-center space-x-2">
                <label className="toolbar-button cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".txt,.pdf,.doc,.docx,.csv,.json,.md,.html"
                  />
                  <PaperClipIcon className="h-5 w-5" />
                </label>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="p-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}