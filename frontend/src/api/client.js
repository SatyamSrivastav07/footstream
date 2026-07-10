import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.userMessage = 'Unable to reach FootStream. Check that the backend is running.';
    } else {
      error.userMessage = error.response.data?.error?.message || 'The request could not be completed.';
      error.fieldErrors = error.response.data?.error?.details || [];
    }
    return Promise.reject(error);
  },
);

export default api;

