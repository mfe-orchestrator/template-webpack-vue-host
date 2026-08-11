// configure() must run at the very top of the entry point, synchronously, before
// anything imports a remote. It is idempotent.
import { configure } from '@mfe-orchestrator-hub/client';

configure({
  backendUrl: process.env.MFE_BACKEND_URL,
  projectId: process.env.MFE_PROJECT_ID,
  environment: process.env.MFE_ENVIRONMENT,
});

// The dynamic import keeps the rest of the app out of the entry chunk, so Module
// Federation can negotiate the shared scope before the app boots.
import('./bootstrap');
