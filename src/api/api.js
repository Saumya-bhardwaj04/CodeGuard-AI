import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_CANDIDATES = [
  API_BASE_URL,
  'http://localhost:3001',
  'http://localhost:3002'
].filter((url, index, arr) => Boolean(url) && arr.indexOf(url) === index);

let activeApiBaseUrl = API_BASE_URL;

const apiClient = axios.create({
  baseURL: activeApiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 180000,
});

const updateApiBase = (baseURL) => {
  activeApiBaseUrl = baseURL;
  apiClient.defaults.baseURL = baseURL;
};

const requestWithFallback = async (requestFn) => {
  const tryOrder = [
    activeApiBaseUrl,
    ...API_CANDIDATES.filter((url) => url !== activeApiBaseUrl)
  ];

  let lastError = null;

  for (const baseURL of tryOrder) {
    try {
      updateApiBase(baseURL);
      return await requestFn();
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      if (status && status < 500) {
        throw error;
      }
      if (error.code === 'ECONNABORTED') {
        throw error;
      }
    }
  }

  throw lastError;
};

export const analyzeCode = async (code, language) => {
  try {
    const response = await requestWithFallback(() => apiClient.post('/api/analyze-code', {
      language,
      code,
    }));
    return response.data;
  } catch (error) {
    console.warn('Analysis request failed:', error.code || error.message);

    if (error.code === 'ECONNABORTED') {
      throw new Error('Analysis is taking longer than expected. Please try again with smaller code.');
    }
    if (error.message === 'Network Error') {
      throw new Error('Unable to connect. Please check your connection and try again.');
    }
    if (error.response?.status >= 500) {
      throw new Error('Analysis service encountered an issue. Please try again.');
    }

    throw new Error('Something went wrong. Please try again.');
  }
};

export const checkBackendStatus = async () => {
  try {
    const response = await requestWithFallback(() => apiClient.get('/api/status'));
    return response.data;
  } catch (error) {
    return {
      running: false,
      error: 'Backend is not running'
    };
  }
};
