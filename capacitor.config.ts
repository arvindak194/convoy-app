import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.convoy.app',
  appName: 'convoy',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['*.firebaseapp.com', '*.firebase.com', '*.googleapis.com']
  }
};

export default config;
