# Build Android

Esta app puede instalarse sin Expo Go generando un binario nativo con EAS Build.

## Requisitos

- Cuenta de Expo/EAS
- `eas-cli` instalado
- Backend de produccion activo

## APK instalable directo

```powershell
cd "C:\Users\HOGAR\Desktop\stitch_nueva_orden_de_servicio\expo-mobile"
npm.cmd install
eas login
npm run build:apk
```

Ese perfil usa:

- `buildType: apk`
- `EXPO_PUBLIC_API_URL=https://fixflow-pro.onrender.com`

Al terminar, EAS devuelve un link directo para descargar el APK e instalarlo sin Expo Go.

## AAB para Play Store

```powershell
cd "C:\Users\HOGAR\Desktop\stitch_nueva_orden_de_servicio\expo-mobile"
npm.cmd install
eas login
npm run build:production
```

## Verificar configuracion publica

```powershell
npx expo config --type public
```

Debe mostrar:

- `android.package: com.fixflow.mobile`
- `extra.apiUrl: https://fixflow-pro.onrender.com`
