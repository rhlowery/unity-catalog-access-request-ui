/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly SSR: boolean;
  readonly VITE_DATABRICKS_HOST?: string;
  readonly VITE_DATABRICKS_TOKEN?: string;
  readonly VITE_BFF_URL?: string;
  readonly VITE_FRONTEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
