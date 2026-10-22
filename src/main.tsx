// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { EventType } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance, msalInitPromise } from './authConfig';
import { NotificationProvider } from './context/NotificationContext';
import App from './App';
import './index.css';

msalInitPromise.then(() => {
  msalInstance.handleRedirectPromise()
    .then((redirectResponse) => {
      if (redirectResponse?.account) {
        msalInstance.setActiveAccount(redirectResponse.account);
      } else {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          msalInstance.setActiveAccount(accounts[0]);
        }
      }
    })
    .catch((error) => {
      console.warn("MSAL - Se ignoró error de caché antigua:", error.name);
      localStorage.clear();
      sessionStorage.clear();
    })
    .finally(() => {
      msalInstance.addEventCallback((event: any) => {
        if (event.eventType === EventType.LOGIN_SUCCESS && event.payload?.account) {
          msalInstance.setActiveAccount(event.payload.account);
        }
      });

      ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
          <MsalProvider instance={msalInstance}>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </MsalProvider>
        </React.StrictMode>
      );
    });
});