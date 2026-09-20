import axios from "axios";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "../authConfig";

export const msalInstance = new PublicClientApplication(msalConfig);

export const bffClient = axios.create({
  baseURL: import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
});

bffClient.interceptors.request.use(async (config) => {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    try {
      const response = await msalInstance.acquireTokenSilent({
        scopes: ["openid", "profile"],
        account: accounts[0],
      });
      config.headers.Authorization = `Bearer ${response.accessToken}`;
    } catch (error) {
      console.warn("No se pudo adjuntar token dinámico:", error);
    }
  }
  return config;
});