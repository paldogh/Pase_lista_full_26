# Pase de Lista QR — backend

## Cambios de compatibilidad

- Se conservaron los prefijos de rutas y los controladores existentes.
- CORS admite el frontend de producción mediante `FRONTEND_URL` y dominios adicionales mediante `ALLOWED_ORIGINS`.
- Se mantiene el pool PostgreSQL compartido y un único `PrismaClient`.
- El endpoint `GET /health` sirve como comprobación básica del servicio.
- El enlace de recuperación de contraseña usa `FRONTEND_URL`.
- El controlador de materias ahora importa el cliente Prisma compartido.
- El servidor cierra HTTP y PostgreSQL al recibir `SIGTERM` o `SIGINT`.

## Variables en Render (backend)

Configura en **Environment** del Web Service:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | La URL PostgreSQL de Neon que ya utiliza el proyecto, completa y con SSL según la URL entregada por Neon |
| `JWT_SECRET` | La misma clave secreta larga que usa actualmente el backend; no la cambies durante este despliegue porque invalidaría los JWT existentes |
| `FRONTEND_URL` | URL pública exacta del frontend Render, incluyendo `https://` y sin `/` final |
| `DB_POOL_MAX` | `10` (usar un valor menor si se ejecutan varias instancias y Neon tiene límite reducido) |
| `DB_CONNECTION_TIMEOUT_MS` | `10000` |
| `DB_IDLE_TIMEOUT_MS` | `30000` |

Si también necesitas permitir otro origen web, agrega `ALLOWED_ORIGINS` con los dominios separados por coma. No agregues rutas como `/login` ni `/api`; solo el origen, por ejemplo `https://mi-frontend.onrender.com`.

Conserva las variables `EMAIL_USER`, `EMAIL_PASS` y `WHATSAPP_*` si ya utilizas recuperación por correo o notificaciones WhatsApp. No es necesario volver a introducirlas si la funcionalidad no se usa.

## Comandos

```bash
npm ci
npm run dev
```

Render debe usar:

- Build command: `npm install` (o `npm ci` si el lockfile está actualizado)
- Start command: `npm start`

El script `postinstall` ejecuta `prisma generate`; no ejecuta migraciones ni modifica datos.

## Comprobaciones posteriores al deploy

1. `GET https://TU-BACKEND.onrender.com/health` debe responder `{"status":"ok", ...}`.
2. Probar `POST /api/auth/login`.
3. Probar consultas y operaciones habituales: alumnos, grupos, maestros, materias, asistencias, dashboard y reportes.
4. En el navegador, revisar Network y Console si aparece un error CORS.

## Importante: seed destructivo

`prisma/seed.js` contiene instrucciones `deleteMany()` que eliminan datos de las tablas antes de crear registros de demostración. **No ejecutes `npm run prisma db seed`, `node prisma/seed.js` ni el seed en producción**. El seed se adaptó para utilizar la conexión configurada, pero su comportamiento destructivo se conserva intencionalmente y no forma parte del despliegue normal.

## Notas de seguridad pendientes

En el backend original, varios endpoints de lectura/escritura no tienen middleware de autorización JWT; el frontend puede adjuntar el token, pero eso no protege por sí solo los endpoints. No añadí bloqueos de autorización en esta entrega porque habría que definir qué roles pueden consultar, registrar o modificar cada recurso y hacerlo sin impedir el flujo de las tablets y la app móvil. Antes de operar con datos reales, conviene implementar y probar esa matriz de permisos.
