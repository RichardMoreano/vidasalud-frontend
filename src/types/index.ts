// src/types/index.ts
export type EstadoAtencion = 
  | 'SOLICITADA' 
  | 'CONFIRMADA' 
  | 'EN_ESPERA' 
  | 'EN_ATENCION' 
  | 'CERRADA' 
  | 'CANCELADA';

export interface Appointment {
  id: number;
  pacienteId: string;
  servicioId: number;
  boxId?: number;
  estado: EstadoAtencion;
  fechaSolicitud: string;
  fechaAtencion?: string;
}

export interface AppointmentRequest {
  pacienteId: string;
  servicioId: number;
  boxId?: number;
}

export interface Prestacion {
  id: number;
  nombre: string;
  precio: number;
  boxId: number;
  cupoDisponible: number;
}