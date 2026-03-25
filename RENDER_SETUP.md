# Render Setup

## Objetivo

Tener validacion por cambios con staging y una produccion estable:

- `fixflow-api-staging`
- `fixflow-web-staging`
- `fixflow-api-prod`
- `fixflow-web-prod`

## Git recomendado

- `main` = produccion
- `staging` = revision manual

## 1. API staging

En Render crea un `Web Service`:

- Name: `fixflow-api-staging`
- Branch: `staging`
- Root Directory: vacio
- Runtime: `Node`
- Build Command:

```text
npm install
```

- Start Command:

```text
npm start
```

## 2. Web staging

En Render crea un `Static Site`:

- Name: `fixflow-web-staging`
- Branch: `staging`
- Root Directory: `expo-mobile`
- Build Command:

```text
npm install && npm run build:web
```

- Publish Directory:

```text
dist
```

- Environment Variable:

```text
EXPO_PUBLIC_API_URL=https://fixflow-api-staging.onrender.com
```

## 3. API produccion

En Render crea otro `Web Service`:

- Name: `fixflow-api-prod`
- Branch: `main`
- Root Directory: vacio
- Runtime: `Node`
- Build Command:

```text
npm install
```

- Start Command:

```text
npm start
```

## 4. Web produccion

En Render crea otro `Static Site`:

- Name: `fixflow-web-prod`
- Branch: `main`
- Root Directory: `expo-mobile`
- Build Command:

```text
npm install && npm run build:web
```

- Publish Directory:

```text
dist
```

- Environment Variable:

```text
EXPO_PUBLIC_API_URL=https://fixflow-pro.onrender.com
```

Si luego renombras la API de produccion, cambia esta URL por la real del servicio.

## Flujo de validacion

1. Haces cambios en `staging`
2. `git push origin staging`
3. Render despliega `fixflow-api-staging` y `fixflow-web-staging`
4. Revisas la URL staging
5. Si esta bien, haces merge a `main`
6. Render despliega `fixflow-api-prod` y `fixflow-web-prod`

## Comandos Git

Crear staging:

```powershell
cd "C:\Users\HOGAR\Desktop\stitch_nueva_orden_de_servicio"
git checkout -b staging
git push -u origin staging
```

Subir cambios a staging:

```powershell
git add .
git commit -m "Cambios para revision"
git push origin staging
```

## Dominio sugerido

- `api.tudominio.com` -> API produccion
- `app.tudominio.com` -> Web produccion
- `staging-api.tudominio.com` -> API staging
- `staging-app.tudominio.com` -> Web staging
