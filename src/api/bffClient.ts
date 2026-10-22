import axios from "axios";
import { msalInstance, loginRequest, msalInitPromise } from "../authConfig";

export const bffClient = axios.create({
  baseURL: import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
});

bffClient.interceptors.request.use(async (config) => {
  await msalInitPromise;

  let account = msalInstance.getActiveAccount();
  if (!account) {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      account = accounts[0];
      msalInstance.setActiveAccount(account);
    }
  }

  if (account) {
    try {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: account,
      });
      if (response.accessToken) {
        config.headers.Authorization = `Bearer ${response.accessToken}`;
      }
    } catch (error) {
      console.warn("No se pudo adjuntar el accessToken a bffClient:", error);
    }
  }
  return config;
});