import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.shop.ionic",
  appName: "shop-ionic",
  webDir: "dist",
  server: {
    cleartext: true,
    androidScheme: "http",
  },
};

export default config;
