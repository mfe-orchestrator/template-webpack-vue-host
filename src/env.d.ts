// webpack's DefinePlugin substitutes these at build time, so the application
// always sees real values. See webpack.config.ts.
declare namespace NodeJS {
  interface ProcessEnv {
    MFE_BACKEND_URL: string;
    MFE_PROJECT_ID: string;
    /** Optional: omit it and the backend resolves the environment from the domain. */
    MFE_ENVIRONMENT?: string;
  }
}
