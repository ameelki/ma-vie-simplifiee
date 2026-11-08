// L'adresse du backend se règle dans src/assets/config.js (pas besoin de recompiler pour la changer).
const cfg = (typeof window !== 'undefined' ? (window as any).APP_CONFIG : null) || {};
export const environment = { production: true, apiUrl: (cfg.apiUrl as string) || '/api' };
