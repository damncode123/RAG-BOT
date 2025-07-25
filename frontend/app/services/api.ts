import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized error (e.g., redirect to login)
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Add request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await axios.post(`${API_URL}/auth/token`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    const { access_token } = response.data;
    localStorage.setItem('token', access_token);
    return access_token;
  },

  async register(email: string, password: string) {
    const response = await api.post('/auth/register', {
      email,
      password,
    });
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },
};

export const chat = {
  async createNewConversation(title?: string) {
    const response = await api.post('/conversations/new', { title });
    return response.data;
  },

  async sendMessage(content: string, chatId: string) {
    const response = await api.post(`/conversations/${chatId}/messages`, { content });
    return response.data;
  },

  async getChatHistory(chatId: string) {
    const response = await api.get(`/conversations/${chatId}/messages`);
    return response.data.messages;
  },

 // api.ts or wherever the method is defined
async getConversations(email: string, limit: number = 30) {
  const response = await api.get('/conversations', {
    params: {
      email,
      limit,
    },
  });
  return response.data.conversations;
}

};

export const files = {
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
