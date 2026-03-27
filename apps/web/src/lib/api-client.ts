import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3100/api",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

export default apiClient;
