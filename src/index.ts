// configure() must run at the very top of the entry point, synchronously, before
// anything imports a remote. It is idempotent.
import { configure } from '@mfe-orchestrator-hub/client';

// MFE_ENVIRONMENT is optional. webpack.config.js substitutes a real `undefined`
// here when the variable is unset or empty, and neither that nor an empty string is
// a usable environment slug: in both cases the key is left out of configure()
// entirely and the backend resolves the environment from the domain the request
// comes from.
const environment = process.env.MFE_ENVIRONMENT;

configure({
  backendUrl: process.env.MFE_BACKEND_URL,
  projectId: process.env.MFE_PROJECT_ID,
  ...(environment ? { environment } : {}),
});

// The dynamic import keeps the rest of the app out of the entry chunk, so Module
// Federation can negotiate the shared scope before the app boots.
import('./bootstrap');
