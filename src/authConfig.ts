import { LogLevel, PublicClientApplication } from "@azure/msal-browser";
import type { Configuration, PopupRequest } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_ENTRA_TENANT_ID || "common"}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (!containsPii && level === LogLevel.Error) {
          console.error("MSAL Error:", message);
        }
      },
      logLevel: LogLevel.Error,
    },
  },
};

const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID || "";

export const loginRequest: PopupRequest = {
  scopes: [
    "openid", 
    "profile", 
    "email", 
    `${clientId}/.default`
  ],
};

export const msalInstance = new PublicClientApplication(msalConfig);
export const msalInitPromise = msalInstance.initialize();