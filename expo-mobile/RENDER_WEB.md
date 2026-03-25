# Deploy Web En Render

## Objetivo

Publicar la web app de FixFlow sin depender de `localhost`.

## Requisitos

- Backend activo en: `https://fixflow-pro.onrender.com`
- Repo subido a GitHub

## Variables de entorno

En Render, agrega:

```text
EXPO_PUBLIC_API_URL=https://fixflow-pro.onrender.com
```

## Crear el sitio estatico

En Render:

1. `New +`
2. `Static Site`
3. conecta tu repositorio
4. configura:

```text
Root Directory: expo-mobile
Build Command: npm install && npm run build:web
Publish Directory: dist
```

## Dominio recomendado

- Frontend: `app.tudominio.com`
- Backend: `api.tudominio.com`

Si luego cambias el backend al subdominio `api.tudominio.com`, actualiza la variable:

```text
EXPO_PUBLIC_API_URL=https://api.tudominio.com
```

## Probar localmente el build web

```powershell
cd "C:\Users\HOGAR\Desktop\stitch_nueva_orden_de_servicio\expo-mobile"
$env:EXPO_PUBLIC_API_URL="https://fixflow-pro.onrender.com"
npm run build:web
```

El resultado queda en `dist/`.
