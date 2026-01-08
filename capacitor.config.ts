import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.38429a5b39ec4c0b9a2d5ac00c64d6d7',
  appName: 'vbeloop',
  webDir: 'dist',
  server: {
    url: 'https://38429a5b-39ec-4c0b-9a2d-5ac00c64d6d7.lovableproject.com?forceHideBadge=true',
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
