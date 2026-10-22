import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useMsal } from "@azure/msal-react";
import { api } from "../services/api";
import type { Appointment } from "../services/api";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "info" | "success" | "warning" | "email" | "admission" | "record" | string;
  targetView?: "dashboard" | "appointments";
}

export interface NotificationOptions {
  title: string;
  message: string;
  type?: NotificationItem["type"];
  targetView?: "dashboard" | "appointments";
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (
    titleOrOptions: string | NotificationOptions,
    message?: string,
    type?: NotificationItem["type"]
  ) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  activeToast: NotificationItem | null;
  closeToast: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accounts } = useMsal();
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem("vidasalud_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);
  const prevAppointmentsRef = useRef<Appointment[]>([]);

  useEffect(() => {
    localStorage.setItem("vidasalud_notifications", JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = (
    titleOrOptions: string | NotificationOptions,
    message?: string,
    type: NotificationItem["type"] = "info"
  ) => {
    let finalTitle = "";
    let finalMessage = "";
    let finalType: NotificationItem["type"] = "info";
    let targetView: "dashboard" | "appointments" = "dashboard";

    if (typeof titleOrOptions === "object") {
      finalTitle = titleOrOptions.title;
      finalMessage = titleOrOptions.message;
      finalType = titleOrOptions.type || "info";
      targetView = titleOrOptions.targetView || "dashboard";
    } else {
      finalTitle = titleOrOptions;
      finalMessage = message || "";
      finalType = type;
    }

    const newNotif: NotificationItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      title: finalTitle,
      message: finalMessage,
      timestamp: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      read: false,
      type: finalType,
      targetView,
    };

    setNotifications((prev) => [newNotif, ...prev]);
    setActiveToast(newNotif);
  };

  // POLLING GLOBAL EN SEGUNDO PLANO
  useEffect(() => {
    const account = accounts[0];
    if (!account) return;

    const roles = (account?.idTokenClaims?.roles as string[]) || [];
    const isAdmin = roles.includes("Admin");
    const isOperador = roles.includes("Operador");
    const currentUserId = (account?.username || account?.localAccountId || "").toLowerCase().trim();

    const checkUpdates = async () => {
      try {
        const appData = await api.getAppointments();

        if (prevAppointmentsRef.current.length > 0) {
          // 1. Detección de Nuevas Solicitudes (Avisar a ADMIN y OPERADOR)
          const newAppointments = appData.filter(
            (curr) => !prevAppointmentsRef.current.some((prev) => prev.id === curr.id)
          );

          if (newAppointments.length > 0 && (isAdmin || isOperador)) {
            newAppointments.forEach((newest) => {
              addNotification({
                type: "email",
                title: "Nueva Solicitud de Cita",
                message: `El paciente ${newest.pacienteId} solicitó la atención #${newest.id}`,
                targetView: "dashboard",
              });
            });
          }

          // 2. Detección de Cambios de Estado para el PACIENTE
          appData.forEach((curr) => {
            const prev = prevAppointmentsRef.current.find((p) => p.id === curr.id);
            if (prev && prev.estado !== curr.estado) {
              const appPacienteId = (curr.pacienteId || "").toLowerCase().trim();
              const isMyAppointment = appPacienteId === currentUserId || (currentUserId !== "" && appPacienteId.includes(currentUserId));

              if (isMyAppointment) {
                if (curr.estado === "CONFIRMADA") {
                  addNotification({
                    type: "email",
                    title: "Atención Confirmada",
                    message: `Tu cita #${curr.id} ha sido confirmada por recepción.`,
                    targetView: "dashboard",
                  });
                } else if (curr.estado === "EN_ATENCION") {
                  addNotification({
                    type: "admission",
                    title: "¡Llamado a Box!",
                    message: `¡Es tu turno! Dirígete al Box ${curr.boxId || "asignado"} para tu atención #${curr.id}.`,
                    targetView: "dashboard",
                  });
                } else if (curr.estado === "CERRADA") {
                  addNotification({
                    type: "record",
                    title: "Atención Finalizada",
                    message: `Tu atención #${curr.id} ha finalizado. ¡Gracias por tu visita!`,
                    targetView: "dashboard",
                  });
                } else if (curr.estado === "CANCELADA") {
                  addNotification({
                    type: "email",
                    title: "Atención Cancelada",
                    message: `Tu atención #${curr.id} fue cancelada.`,
                    targetView: "dashboard",
                  });
                }
              }
            }
          });
        }

        prevAppointmentsRef.current = appData;
      } catch (err) {
        console.error("Error en polling global:", err);
      }
    };

    checkUpdates();
    const interval = setInterval(checkUpdates, 3000);
    return () => clearInterval(interval);
  }, [accounts]);

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.removeItem("vidasalud_notifications");
  };

  const closeToast = () => setActiveToast(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAsRead, clearAll, activeToast, closeToast }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications debe usarse dentro de NotificationProvider");
  return context;
};