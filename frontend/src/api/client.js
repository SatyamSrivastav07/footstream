import axios from 'axios';

const rawApiBaseUrl =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

export const apiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '');

const resolveSocketUrl = () => {
  // Absolute backend URL: https://backend.onrender.com/api
  if (/^https?:\/\//i.test(apiBaseUrl)) {
    return new URL(apiBaseUrl).origin;
  }

  // Relative /api fallback means frontend and backend are on same origin.
  return window.location.origin;
};

export const socketUrl =
  import.meta.env.VITE_SOCKET_URL?.replace(/\/+$/, '') ||
  resolveSocketUrl();

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const readableDetailsMessage = (details = []) => {
  if (!Array.isArray(details) || details.length === 0) return '';
  if (details.length === 1) return details[0]?.message || '';
  const fields = details
    .slice(0, 3)
    .map((item) => String(item?.field || 'field').replace(/[.[\]]+/g, ' '))
    .join(', ');
  return `Please fix ${fields}. First issue: ${details[0]?.message || 'Invalid value.'}`;
};

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.userMessage =
        'Unable to reach FootStream. Check that the backend is running.';
    } else {
      const details = error.response.data?.error?.details || [];
      const serverMessage = error.response.data?.error?.message || '';
      const detailMessage = readableDetailsMessage(details);
      error.userMessage =
        detailMessage ||
        serverMessage ||
        'The request could not be completed.';

      if (error.response.status === 429) {
        const retryAfter = error.response.headers?.['retry-after'];

        if (retryAfter) {
          error.userMessage =
            `${error.userMessage} Try again in ${retryAfter} seconds.`;
        }
      }

      error.fieldErrors = details;
    }

    return Promise.reject(error);
  },
);

export default api;
