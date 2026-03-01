import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vibebaze.app',
  appName: 'VibeBaze',
  webDir: 'dist',
  server: {
    url: 'https://www.vibebaze.com',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic'
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
