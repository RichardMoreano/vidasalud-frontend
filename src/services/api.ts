import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalInstance, msalInitPromise, loginRequest } from "../authConfig";

const API_BASE_URL = "http://localhost:8080";

// --- TIPOS Y DTOS ENUMERADOS DE JAVA ---
export type EstadoAtencion = 
  | "SOLICITADA" 
  | "CONFIRMADA" 
  | "EN_ESPERA" 
  | "EN_ATENCION" 
  | "CERRADA" 
  | "CANCELADA";

export interface Appointment {
  id?: number;
  pacienteId: string;
  servicioId: number;
  boxId?: number;
  estado: EstadoAtencion;
  fechaSolicitud?: string;
  fechaAtencion?: string;
}

export interface AppointmentRequest {
  pacienteId: string;
  servicioId: number;
  boxId?: number;
}

export interface StatusUpdateRequest {
  status: EstadoAtencion;
}

export interface Prestacion {
  id?: number;
  nombre: string;
  precio: number;
  boxId: number;
  cupoDisponible: number;
}

export interface PrestacionRequest {
  nombre: string;
  precio: number;
  boxId: number;
  cupoDisponible: number;
}

// --- OBTENER TOKEN DE AZURE ENTRA ID ---
async function getAccessToken(): Promise<string | null> {
  // Esperar a que la inicialización global de MSAL haya terminado
  await msalInitPromise;

  const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
  if (!account) return null;

  try {
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: account,
    });
    return response.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      msalInstance.acquireTokenRedirect(loginRequest);
    }
    return null;
  }
}

// --- HELPER FETCH CON BEARER TOKEN ---
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
  }

  // Manejar respuestas de creación/actualización vacías o JSON
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return {} as T;
}

// --- SERVICIOS API ---
export const api = {
  // Appointments
  getAppointments: (status?: EstadoAtencion) => 
    apiFetch<Appointment[]>(`/api/appointments${status ? `?status=${status}` : ""}`),
  
  getAppointmentById: (id: number) => 
    apiFetch<Appointment>(`/api/appointments/${id}`),
  
  createAppointment: (data: AppointmentRequest) => 
    apiFetch<Appointment>("/api/appointments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  updateAppointmentStatus: (id: number, status: EstadoAtencion) => 
    apiFetch<Appointment>(`/api/appointments/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  // Catalog
  getServices: () => 
    apiFetch<Prestacion[]>("/api/catalog/services"),
  
  createService: (data: PrestacionRequest) => 
    apiFetch<Prestacion>("/api/catalog/services", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  updateService: (id: number, data: PrestacionRequest) => 
    apiFetch<Prestacion>(`/api/catalog/services/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};