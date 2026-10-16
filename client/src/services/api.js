import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // Send and receive cookies across origins
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error extraction
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (error.response) {
      // Backend returned an error response
      if (error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (error.response.status === 403) {
        errorMessage = 'You are not authorized to perform this action.';
      } else if (error.response.status === 404) {
        errorMessage = 'Requested resource was not found.';
      } else if (error.response.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
    } else if (error.request) {
      // Request was sent but no response received (server down or network error)
      errorMessage = 'Unable to reach the server. Please check your connection.';
    }

    const enhancedError = new Error(errorMessage);
    enhancedError.status = error.response ? error.response.status : null;
    enhancedError.errors = error.response?.data?.errors || null;
    enhancedError.originalError = error;

    return Promise.reject(enhancedError);
  }
);

export default api;
