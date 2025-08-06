import axios from 'axios';

// Set the base API URL. Fallback to localhost during development.
const API_URL = process.env.API_URL || 'http://localhost:8000';

// Create an Axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a global response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => response, // pass response through if no error
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error); // reject for further custom handling
  }
);

// Add a global request interceptor to attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // Get token from browser's local storage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // Attach token to Authorization header
  }
  return config;
});

/////////////////////////////////////////////////////////////
// AUTH MODULE
/////////////////////////////////////////////////////////////

export const auth = {
  // Login method - sends form data (username/password) to backend
  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    
    // Send request to /auth/token endpoint
    const response = await axios.post(`${API_URL}/auth/token`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    const { access_token } = response.data;
    localStorage.setItem('token', access_token); // Save token in local storage
    return access_token;
  },

  // Register a new user
  async register(email: string, password: string) {
    const response = await api.post('/auth/register', {
      email,
      password,
    });
    return response.data;
  },

  // Logout - clear token and redirect to login page
  logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },
};

/////////////////////////////////////////////////////////////
// CHAT MODULE
/////////////////////////////////////////////////////////////

export const chat = {
  // Create a new conversation (chat session)
  async createNewConversation(title?: string) {
    const response = await api.post('/conversations/new', { title });
    return response.data;
  },

  // Send a message to a specific conversation (chatId)
  async sendMessage(content: string, chatId: string) {
    const response = await api.post(`/conversations/${chatId}/messages`, { content });
    return response.data;
  },

  // Get all messages from a specific conversation
  async getChatHistory(chatId: string) {
    const response = await api.get(`/conversations/${chatId}/messages`);
    return response.data;
  },

  // Fetch user's conversation list (optionally limited)
  async getConversations() {
    const response = await api.get('/conversations');
    console.log('Conversations fetched:', response.data);

    return response.data.conversations;
  },

  // Delete a conversation
  async deleteConversation(conversationId: string) {
    const response = await api.delete(`/conversations/${conversationId}`);
    return response.data;
  }
};

/////////////////////////////////////////////////////////////
// FILES MODULE
/////////////////////////////////////////////////////////////

export const files = {
  // Upload a file to the backend
  async uploadFile(file: File, conversationId?: string) {
    const formData = new FormData();
    formData.append('file', file); // Add file to form data

    // Add conversation ID if provided
    if (conversationId) {
      formData.append('conversation_id', conversationId);
    }

    // Send request with multipart/form-data headers
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
