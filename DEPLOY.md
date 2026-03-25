# Deploy de FixFlow Pro

## Requisitos

- Hosting Node.js o Render Web Service para la API
- Hosting estatico o Render Static Site para la web app
- HTTPS

## Backend actual

La API principal corre desde:

- `server.js`
- `package.json`
- `data/fixflow.sqlite`

La migracion desde los JSON viejos ya es automatica. Los archivos `data/users.json` y `data/stores/*.json` quedan como respaldo/import inicial.

## Ejecutar local

```powershell
cd "C:\Users\HOGAR\Desktop\stitch_nueva_orden_de_servicio"
npm start
```

## Web app Expo

La web app sale desde:

- `expo-mobile/`

Build local:

```powershell
cd "C:\Users\HOGAR\Desktop\stitch_nueva_orden_de_servicio\expo-mobile"
npm run build:web
```

Salida:

- `expo-mobile/dist/`

## Produccion recomendada

- API: Render Web Service
- Web app: Render Static Site

Documentacion especifica:

- `expo-mobile/RENDER_WEB.md`
- `RENDER_SETUP.md`
