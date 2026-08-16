<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  globalVariables,
  identities,
  manifest,
  type Microfrontend,
} from '@mfe-orchestrator-hub/client';

const microfrontends = ref<Microfrontend[]>([]);
const variables = ref<Record<string, string>>({});
const error = ref<string | null>(null);
const ids = identities();

onMounted(async () => {
  try {
    const [data, vars] = await Promise.all([manifest(), globalVariables()]);
    microfrontends.value = data.microfrontends ?? [];
    variables.value = vars;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
});
</script>

<template>
  <section class="manifest">
    <h2>Environment</h2>
    <p v-if="error" class="remote-error">{{ error }}</p>
    <template v-else>
      <ul>
        <li v-for="mfe in microfrontends" :key="mfe.slug">
          <strong>{{ mfe.name }}</strong> ({{ mfe.slug }}) — served version {{ mfe.version }}
        </li>
      </ul>
      <ul>
        <li v-for="(value, key) in variables" :key="key">{{ key }} = {{ value }}</li>
      </ul>
    </template>
    <p class="ids">session {{ ids.sessionId }} · device {{ ids.deviceId }}</p>
  </section>
</template>

<style scoped>
.manifest {
  margin-top: 2rem;
}

.ids {
  color: #888;
  font-size: 0.8rem;
}
</style>
