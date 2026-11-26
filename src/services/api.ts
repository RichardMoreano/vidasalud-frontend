import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalInstance, msalInitPromise, loginRequest } from "../authConfig";

const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8080";

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

// --- OBTENER ACCESS TOKEN DE AZURE ENTRA ID ---
async function getAccessToken(): Promise<string | null> {
  await msalInitPromise;

  let account = msalInstance.getActiveAccount();
  if (!account) {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      account = accounts[0];
      msalInstance.setActiveAccount(account);
    }
  }

  if (!account) {
    console.error("MSAL: No hay una cuenta activa en sesión.");
    return null;
  }

  try {
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: account,
    });
    return response.accessToken || null;
  } catch (error) {
    console.warn("Falló la obtención silenciosa del Access Token:", error);
    if (error instanceof InteractionRequiredAuthError) {
      await msalInstance.acquireTokenRedirect(loginRequest);
    }
    return null;
  }
}

// --- ERROR TIPADO DE LA API ---
// Los microservicios responden { error, mensaje, detalles } (GlobalExceptionHandler).
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: Record<string, string>;

  constructor(status: number, message: string, code?: string, details?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  401: "Sesión expirada o token inválido. Vuelve a iniciar sesión.",
  403: "Tu rol no tiene permisos para esta operación.",
  404: "El recurso solicitado no existe.",
  409: "La operación entra en conflicto con el estado actual.",
  503: "El servicio de mensajería no está disponible en este momento.",
};

async function buildApiError(response: Response): Promise<ApiError> {
  const raw = await response.text();
  let message = STATUS_MESSAGES[response.status] || response.statusText || "Error inesperado";
  let code: string | undefined;
  let details: Record<string, string> | undefined;

  if (raw) {
    try {
      const body = JSON.parse(raw);
      code = body.error;
      details = body.detalles;
      message = body.mensaje || body.message || message;
      if (details && Object.keys(details).length > 0) {
        message += ": " + Object.entries(details).map(([k, v]) => `${k} ${v}`).join("; ");
      }
    } catch {
      message = raw;
    }
  }
  return new ApiError(response.status, message, code, details);
}

/** Mensaje legible para mostrar en la interfaz a partir de cualquier error. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return `${err.message} (HTTP ${err.status})`;
  if (err instanceof Error) return err.message;
  return String(err);
}

// --- HELPER FETCH CON BEARER TOKEN ---
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error("No se pudo obtener el token de acceso. Por favor, reingresa a la aplicación.");
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw await buildApiError(response);
  }

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