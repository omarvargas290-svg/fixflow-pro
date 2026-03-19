# Deploy de FixFlow Pro

## Requisitos

- Hosting Node.js o VPS con HTTPS
- Dominio o subdominio apuntando al servidor

## Archivos principales

Publica completos estos archivos y carpetas:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`
- `icon-192.png`
- `icon-512.png`
- `server.js`
- `package.json`
- `data/users.json`
- `data/stores/`

## Ejecucion

1. Instala Node.js 18 o superior.
2. En la raiz del proyecto ejecuta `npm start`.
3. Publica el puerto del proceso detras de HTTPS.

## Recomendado

- Render, Railway, Fly.io, VPS o cualquier hosting Node
- HTTPS obligatorio
- Subdominio sugerido: `app.tudominio.com`

## Nota

Ahora cada usuario tiene su propia base de datos JSON dentro de `data/stores/<userId>.json`.

- Registro global de usuarios: `data/users.json`
- Base independiente por usuario: `data/stores/USR-XX.json`
- Las sesiones y filtros siguen siendo locales por navegador

## Expo / APK

Este proyecto actualmente es una app web/PWA, no un proyecto Expo React Native.

- No genera APK de Expo de forma directa en su estado actual
- Para obtener APK por Expo hay que migrarlo a un proyecto Expo y luego compilar con EAS Build
