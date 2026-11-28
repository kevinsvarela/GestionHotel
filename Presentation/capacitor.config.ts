import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ucr.gestionhotel',
  appName: 'Gestión Hotel',
  webDir: 'dist/gestion_hotel/browser',
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
