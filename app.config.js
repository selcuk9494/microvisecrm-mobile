module.exports = () => {
  const now = Math.floor(Date.now() / 1000);
  const buildNumber = process.env.IOS_BUILD_NUMBER || String(now);
  return ({
  name: "Istakip",
  slug: "microvisecrm",
  version: "1.0.0",
  orientation: "portrait",
  jsEngine: "jsc",
  ios: {
    bundleIdentifier: "com.microvisecrm.istakip",
    supportsTablet: false,
    buildNumber,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "Konum, şube seçimi ve iş emirleri için kullanılır.",
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: true, NSAllowsArbitraryLoadsInWebContent: true },
      ITSAppUsesNonExemptEncryption: false
    }
  },
  extra: {
    eas: { projectId: "44d5031d-2f33-4b56-bc1f-989d9b2fa543" },
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "https://microvisecrm-api.vercel.app"
  }
  });
};
