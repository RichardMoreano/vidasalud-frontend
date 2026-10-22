# VidaSalud — Frontend Dashboard & Gestión Clínica

Aplicación web desarrollada con **React 18, Vite, TypeScript y Tailwind CSS** para la gestión desacoplada del ecosistema clínico VidaSalud.

Implementa autenticación centralizada mediante **Azure Entra ID (MSAL)**, control de acceso basado en roles (RBAC) y un sistema de notificaciones asíncronas para eventos procesados mediante **RabbitMQ**.

---

## Tabla de contenidos

- [Características principales](#-características-principales)
- [Tecnologías utilizadas](#-tecnologías-utilizadas)
- [Arquitectura general](#-arquitectura-general)
- [Requisitos previos](#-requisitos-previos)
- [Configuración del entorno](#-configuración-del-entorno)
- [Instalación y ejecución](#-instalación-y-ejecución)
- [Roles y permisos](#-roles-y-permisos)
- [Notificaciones y eventos asíncronos](#-notificaciones-y-eventos-asíncronos)
- [Pruebas de errores y Dead Letter Queue](#-pruebas-de-errores-y-dead-letter-queue-dlq)
- [Solución de problemas](#-solución-de-problemas)

---

## Características principales

### 1. Autenticación con Azure Entra ID (MSAL)

- Inicio de sesión mediante Azure Entra ID.
- Integración con OAuth 2.0 y OpenID Connect (OIDC).
- Gestión de sesiones y tokens mediante `@azure/msal-browser` y `@azure/msal-react`.
- Envío del `accessToken` en las peticiones al API Gateway o Backend for Frontend (BFF).
- Comunicación con el servicio `ms-vidasalud-bff` mediante el cliente Axios `bffClient`.

### 2. Control de acceso basado en roles (RBAC)

La aplicación contempla diferentes perfiles de usuario:

- **Administrador (`Admin`):** acceso a las funcionalidades administrativas.
- **Operador / Recepcionista:** gestión del flujo de atención y sala de espera.
- **Paciente (`Paciente`):** creación y seguimiento de solicitudes de atención.

Las vistas y acciones disponibles dependen del rol asignado al usuario.

### 3. Dashboard de atención clínica

Para el perfil Operador / Recepcionista:

- Visualización de la sala de espera.
- Confirmación de atenciones.
- Gestión de estados de espera.
- Anuncio de pacientes.
- Llamado de pacientes a box.
- Cancelación de atenciones.

### 4. Gestión de solicitudes para pacientes

Para el perfil Paciente:

- Creación de solicitudes de atención.
- Consulta del estado de las solicitudes.
- Seguimiento de cambios de estado.
- Cancelación de solicitudes cuando corresponda.

### 5. Notificaciones asíncronas

- Polling en segundo plano mediante `NotificationContext`.
- Persistencia local de notificaciones mediante `localStorage`.
- Visualización de notificaciones flotantes (*Toasts*).
- Avisos ante cambios de estado y nuevas solicitudes.
- Interacción con las notificaciones desde la interfaz.

> La actualización en tiempo real descrita se implementa mediante polling.

### 6. Integración con RabbitMQ y Dead Letter Queue (DLQ)

La solución contempla pruebas de procesamiento de mensajes y manejo de errores.

- Simulación de errores recuperables y no recuperables.
- Reintentos de procesamiento según la configuración del consumidor.
- Derivación de mensajes fallidos a las colas de mensajes no procesados (*Dead Letter Queues*).
- Interfaz de gestión para inspeccionar las colas y los mensajes retenidos.

Las colas de ejemplo son:

- `q.cmd.email.dlq`
- `q.cmd.admission.dlq`

---

## Tecnologías utilizadas

| Categoría | Tecnología |
|---|---|
| Biblioteca de interfaz | React 18 |
| Herramienta de desarrollo | Vite |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS |
| Iconografía | Lucide React |
| Autenticación | `@azure/msal-browser` |
| Integración con React y MSAL | `@azure/msal-react` |
| Cliente HTTP | Axios |
| API de backend | API Gateway / BFF |
| Mensajería asíncrona | RabbitMQ |
| Persistencia local de notificaciones | `localStorage` |

---

## Arquitectura general

La aplicación frontend se comunica con los servicios backend mediante un API Gateway o BFF.

```text
┌─────────────────────────────────────┐
│         Usuario / Navegador         │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│       Frontend VidaSalud            │
│                                     │
│  React + TypeScript + Vite          │
│  Tailwind CSS + Lucide React        │
│  MSAL + NotificationContext         │
└──────────────────┬──────────────────┘
                   │
                   │ accessToken
                   ▼
┌─────────────────────────────────────┐
│        API Gateway / BFF            │
│       ms-vidasalud-bff              │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│          Servicios backend          │
│                                     │
│   Gestión de atenciones y eventos   │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│              RabbitMQ               │
│                                     │
│  Colas de procesamiento y DLQ       │
└─────────────────────────────────────┘
```

---

## Requisitos previos

Antes de ejecutar el proyecto, asegúrate de tener instalado:

- **Node.js:** versión compatible con las dependencias del proyecto.
- **npm:** administrador de paquetes incluido con Node.js.
- **Git:** opcional, para clonar el repositorio.
- **Azure Entra ID:** una aplicación registrada y configurada para la autenticación, si se utilizará el inicio de sesión real.
- **Backend VidaSalud:** servicios accesibles desde la URL configurada.
- **RabbitMQ:** instancia disponible si se realizarán pruebas de mensajería y DLQ.

Puedes comprobar las versiones instaladas con:

```bash
node --version
npm --version
```

---

## Configuración del entorno

Crea un archivo `.env` en la raíz del proyecto, al mismo nivel que `package.json`.

### Variables de entorno

```env
# Identificador de la aplicación registrada en Azure Entra ID
VITE_ENTRA_CLIENT_ID=

# Identificador del directorio (Tenant) de Azure Entra ID
VITE_ENTRA_TENANT_ID=

# URL base del API Gateway o Backend for Frontend
VITE_API_GATEWAY_URL=http://localhost:8080
```

### Descripción de las variables

| Variable | Descripción |
|---|---|
| `VITE_ENTRA_CLIENT_ID` | ID de cliente de la aplicación registrada en Azure. |
| `VITE_ENTRA_TENANT_ID` | ID del tenant de Azure Entra ID. |
| `VITE_API_GATEWAY_URL` | Dirección base del API Gateway o BFF. |

**Importante:**

- Las variables con prefijo `VITE_` quedan expuestas al código del frontend. No guardes secretos, contraseñas ni claves privadas en este archivo.
- Configura las URI de redirección de MSAL en Azure Entra ID según el entorno de ejecución.
- Verifica que la URL del backend corresponda al entorno local o remoto que deseas utilizar.
- Después de modificar `.env`, reinicia el servidor de desarrollo para aplicar los cambios.
- No subas archivos `.env` con credenciales o información sensible al repositorio.

---

## Instalación y ejecución

### 1. Instalar dependencias

Desde la raíz del proyecto, ejecuta:

```bash
npm install
```

### 2. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Por defecto, Vite suele iniciar la aplicación en:

```text
http://localhost:5173
```

Si la terminal muestra otra dirección, utiliza la URL indicada por Vite.

### 3. Generar una compilación de producción

```bash
npm run build
```

### 4. Ejecutar una vista previa de la compilación

```bash
npm run preview
```

---

## Roles y permisos

### Administrador (`Admin`)

Puede acceder a las funcionalidades administrativas contempladas en el proyecto:

- Selector de vistas por rol, según la implementación.
- Administración del catálogo.
- Consulta de reportería.
- Revisión de auditoría.
- Gestión e inspección de colas.

### Operador / Recepcionista

Dispone de herramientas para gestionar el flujo de atención:

- Visualizar la sala de espera.
- Confirmar atenciones.
- Anunciar pacientes.
- Gestionar estados de espera.
- Llamar pacientes a box.
- Cancelar atenciones.

### Paciente (`Paciente`)

Puede realizar las acciones disponibles para su perfil:

- Solicitar nuevas atenciones.
- Consultar solicitudes.
- Seguir cambios de estado.
- Cancelar solicitudes cuando la lógica de negocio lo permita.

---

## Notificaciones y eventos asíncronos

El sistema utiliza `NotificationContext` para gestionar notificaciones de la aplicación.

### Funcionamiento general

1. El contexto consulta periódicamente los eventos o estados disponibles en el backend.
2. Cuando detecta un cambio relevante, actualiza las notificaciones.
3. Las notificaciones se muestran mediante componentes visuales tipo Toast.
4. La información seleccionada se conserva localmente mediante `localStorage`, según la implementación.

### Consideraciones

- El polling no equivale a una conexión persistente como WebSockets.
- `localStorage` conserva datos en el navegador, pero no constituye una base de datos centralizada.
- Los intervalos de consulta y las reglas para evitar notificaciones duplicadas dependen del código de `NotificationContext`.
- La disponibilidad de las notificaciones depende del backend y de la conectividad del usuario.

---

## Pruebas de errores y Dead Letter Queue (DLQ)

Esta sección describe cómo probar el manejo de errores en el procesamiento de mensajes de RabbitMQ.

### 1. Abrir la interfaz de RabbitMQ

Si RabbitMQ está ejecutándose localmente y el puerto de administración está habilitado, abre:

```text
http://localhost:15672
```

Utiliza las credenciales configuradas para tu instancia.

En el entorno de demostración descrito para este proyecto:

```text
Usuario: vidasalud
Contraseña: vidasalud123
```

### 2. Generar una solicitud de prueba

1. Inicia el frontend y los servicios backend necesarios.
2. Inicia sesión con un usuario autorizado.
3. Abre la vista de Atenciones o Dashboard.
4. Haz clic en **Solicitar Nueva Atención**.
5. En el campo **RUT / ID Paciente**, introduce uno de los identificadores de prueba.

### 3. Casos de prueba

| Identificador | Comportamiento esperado |
|---|---|
| `fail-temp-123` | Simula un error recuperable. El consumidor realiza hasta tres intentos de procesamiento y, si se agotan, el mensaje se deriva a la DLQ. |
| `fail-fatal-123` | Simula un error no recuperable. El mensaje se rechaza y se deriva directamente a la DLQ. |

Estos resultados dependen de que el backend reconozca los prefijos de prueba y tenga implementadas las reglas de reintento y enrutamiento correspondientes.

### 4. Inspeccionar los mensajes en RabbitMQ

1. Accede a la interfaz de administración.
2. Abre la sección **Queues**.
3. Busca las colas de mensajes fallidos:
   - `q.cmd.email.dlq`
   - `q.cmd.admission.dlq`
4. Selecciona la cola que corresponda al evento generado.
5. Revisa el contador de mensajes y, si la configuración lo permite, inspecciona el contenido de los mensajes.

### 5. Resultado esperado

- El caso recuperable debe agotar la política de reintentos antes de llegar a la DLQ.
- El caso no recuperable debe seguir la ruta de rechazo definida por el consumidor.
- El mensaje retenido debe poder inspeccionarse en la cola de destino correspondiente.

**Nota técnica:** RabbitMQ no envía automáticamente cualquier mensaje fallido a una DLQ por el simple hecho de existir un error. El resultado depende de la configuración de dead-letter exchange, las colas, los rechazos, los TTL y la estrategia de reintentos utilizada por el backend.

---

## Verificación funcional

Antes de considerar la instalación lista, comprueba los siguientes puntos:

- [ ] La aplicación inicia con `npm run dev`.
- [ ] Las variables de entorno están configuradas.
- [ ] El inicio de sesión con Azure Entra ID funciona.
- [ ] El token de acceso se adjunta a las peticiones protegidas.
- [ ] El frontend se comunica correctamente con el API Gateway / BFF.
- [ ] Las vistas y acciones respetan los roles de usuario.
- [ ] Las solicitudes de atención se crean correctamente.
- [ ] Los cambios de estado se reflejan en la interfaz.
- [ ] Las notificaciones aparecen según los eventos recibidos.
- [ ] Los mensajes de prueba llegan a las DLQ esperadas cuando se producen los errores configurados.

---

## Solución de problemas

### Error de conexión con el backend

- Verifica que el API Gateway / BFF esté en ejecución.
- Comprueba `VITE_API_GATEWAY_URL`.
- Revisa la consola del navegador y la terminal del backend.
- Confirma que CORS permita las solicitudes desde el origen del frontend.

### Error de autenticación con Azure Entra ID

- Comprueba `VITE_ENTRA_CLIENT_ID` y `VITE_ENTRA_TENANT_ID`.
- Verifica la URI de redirección configurada en Azure.
- Revisa los permisos y ámbitos solicitados por MSAL.
- Confirma que el backend acepte y valide el token emitido para la API correspondiente.

### No aparecen notificaciones

- Verifica que el backend entregue los eventos o estados esperados.
- Comprueba que `NotificationContext` esté montado y ejecutándose.
- Revisa los errores de red y la consola del navegador.
- Comprueba las reglas de deduplicación y persistencia de `localStorage`.

### Los mensajes no aparecen en la DLQ

- Confirma que el consumidor esté procesando los mensajes.
- Revisa la configuración del dead-letter exchange y de las colas.
- Verifica la política de reintentos.
- Confirma que los identificadores de prueba se reconozcan en el backend.
- Consulta los logs del consumidor para identificar el motivo del fallo.

---

## Seguridad

- No almacenes secretos ni credenciales privadas en variables `VITE_*`.
- No publiques archivos `.env` con datos sensibles.
- Valida tokens y permisos en el backend.
- Restringe el acceso a la consola de administración de RabbitMQ.
- Utiliza credenciales seguras y distintas en producción.
- Evita exponer datos personales o clínicos en logs y notificaciones.
- Aplica las políticas de privacidad y protección de datos que correspondan al entorno clínico.

---

**VidaSalud — Frontend Dashboard & Gestión Clínica**

Interfaz para la gestión de atenciones, autenticación, roles y seguimiento de eventos clínicos.
