import { getApiBaseUrl } from "./env";
import Axios from "axios";

export const api = Axios.create({
  baseURL: `${getApiBaseUrl()}/api/v1`,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

