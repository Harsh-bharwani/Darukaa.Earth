import axios from "axios";

// Enforce dynamic environment target variables
const api = axios.create({
  baseURL: import.meta.env.PROD
    ? "https://darukaa-earth-backend-ssgl.onrender.com"
    : "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
