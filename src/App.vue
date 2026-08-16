<script setup lang="ts">
import { defineAsyncComponent, h } from 'vue';
import ManifestPanel from './components/ManifestPanel.vue';

// Example remote, declared in webpack.config.ts. Rename "exampleremote" and the
// slug it points to, or delete both once you wire your own microfrontends.
const RemoteButton = defineAsyncComponent({
  loader: () => import('exampleremote/Button'),
  loadingComponent: { render: () => h('span', 'Loading remote…') },
  errorComponent: {
    render: () =>
      h(
        'span',
        { class: 'remote-error' },
        'Remote "example-remote" is not available. Point webpack.config.ts at one of your own slugs.'
      ),
  },
});
</script>

<template>
  <div class="app">
    <header>
      <h1>Module Federation host</h1>
      <p>Webpack + Vue 3 + MFE Orchestrator</p>
    </header>
    <main>
      <p>
        This host resolves its remotes through the orchestrator: it never knows,
        and never chooses, which version it is served.
      </p>
      <RemoteButton />
      <ManifestPanel />
    </main>
  </div>
</template>

<style>
.app {
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem;
}

.remote-error {
  color: #b4530a;
}
</style>
