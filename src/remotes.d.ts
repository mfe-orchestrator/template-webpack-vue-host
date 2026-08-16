// Remotes are resolved at runtime by the orchestrator, so the federation key you
// import from has no types of its own at build time. Declare one module per remote
// you consume, mirroring the keys of `remotes` in webpack.config.ts.
declare module 'exampleremote/Button' {
  import type { Component } from 'vue';

  const component: Component;
  export default component;
}
