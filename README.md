# VidaSalud - Frontend

Aplicación web desarrollada con **React**, **Vite** y **TypeScript** para la gestión del sistema de salud VidaSalud. Incluye autenticación integrada mediante **Azure Entra ID (MSAL)** para la comunicación segura con el API Gateway / BFF (`ms-vidasalud-bff`).

##  Tecnologías y Librerías

* **Core:** React 18, Vite, TypeScript.
* **Estilos:** Tailwind CSS.
* **Autenticación:** `@azure/msal-browser`, `@azure/msal-react`.
* **Consumo API:** Axios.

## Configuración del Entorno (`.env`)

Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`

## Ejecución en Desarrollo

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (http://localhost:5173)
npm run dev

## Flujo de Autenticación

1. El usuario inicia sesión a través de la ventana emergente de Microsoft Entra ID.

2. MSAL solicita un token JWT con la audiencia del backend (`aeee03ad-c0ad-41e8-95f2-4eeeafb23f14/.default`).

3. El token de acceso se adjunta en el encabezado `Authorization: Bearer <TOKEN>` en todas las peticiones dirigidas al BFF.