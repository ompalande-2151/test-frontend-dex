import axios, { type AxiosResponse } from "axios";
import { useToastStore } from "../store/toastStore";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://dex-production-c023.up.railway.app";

export const dexApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Centralized error helper
const handleError = (error: any) => {
  let title = "API Error";
  let description = "An unexpected error occurred.";

  // Skip toast for unimplemented endpoints
  if (error.response?.status === 404 && error.config?.url?.includes("/lp-positions")) {
    return Promise.reject(error);
  }

  if (error.response) {
    // Server responded with non-2xx status
    const status = error.response.status;
    const data = error.response.data;

    title = `Error ${status}`;
    description = data?.message || data?.error || JSON.stringify(data) || "Server Error";

    if (status === 400) {
      title = "Bad Request (400)";
    } else if (status === 404) {
      title = "Not Found (404)";
    } else if (status === 409) {
      title = "Conflict (409)";
    } else if (status === 500) {
      title = "Server Error (500)";
    }
  } else if (error.request) {
    // Request made but no response received
    title = "Network Error";
    description = "No response from server. Check backend status.";
  } else {
    // Something else went wrong
    description = error.message;
  }

  useToastStore.getState().addToast({
    type: "error",
    title,
    description,
  });

  return Promise.reject(error);
};

// Response interceptor
dexApi.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: any) => handleError(error)
);
