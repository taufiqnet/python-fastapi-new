import axios, { AxiosInstance } from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: {
    "Accept": "application/json",
  },
});

// Request interceptor: attach bearer token and business_id if available
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // If unauthorized on a protected route, clear token
      if (!window.location.pathname.startsWith("/login")) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("current_user");
      }
    }
    return Promise.reject(error);
  }
);
