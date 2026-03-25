const projectId = "225e5626-02d1-4169-a759-76c2872dcb40";

module.exports = () => ({
  expo: {
    name: "FixFlow Mobile",
    slug: "fixflow-mobile",
    version: "1.0.0",
    runtimeVersion: {
      policy: "appVersion",
    },
    orientation: "portrait",
    platforms: ["android", "ios", "web"],
    icon: "./assets/icon.png",
    jsEngine: "hermes",
    userInterfaceStyle: "light",
    updates: {
      enabled: false,
      fallbackToCacheTimeout: 0,
      checkAutomatically: "ON_LOAD",
    },
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#1152d4",
    },
    assetBundlePatterns: ["**/*"],
    web: {
      bundler: "metro",
      favicon: "./assets/icon.png",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1152d4",
      },
      package: "com.fixflow.mobile",
    },
    ios: {
      bundleIdentifier: "com.fixflow.mobile",
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "",
      eas: {
        projectId,
      },
    },
  },
});
