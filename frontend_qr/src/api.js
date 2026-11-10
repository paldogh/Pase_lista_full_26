import axios from "axios";

// En Render define VITE_API_URL=https://TU-BACKEND.onrender.com/api
// En local se usa .env.development (http://localhost:3000/api).
const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/$/, ""),
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

// Adjunta el JWT automáticamente a las rutas protegidas.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
