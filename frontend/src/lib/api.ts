import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});
