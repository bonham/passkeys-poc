<script lang="ts" setup>

import { ref } from 'vue'
import { getWithCORS, getErrorMessage } from '@/lib/httpHelpers';

const emit = defineEmits(['changed'])

const logoutstatus = ref("")

async function handleLogout() {

  const logoutUrl = "/api/v1/auth/logout"

  let resp: Response
  try {
    resp = await getWithCORS(logoutUrl);
  } catch (error) {
    logoutstatus.value = getErrorMessage(error)
    emit('changed')
    return
  }
  if (!resp.ok) {
    const t = await resp.text()
    logoutstatus.value = t
    emit('changed')
    return
  } else {
    logoutstatus.value = "Success"
    emit('changed')
  }
};

</script>
<template>
  <div class="border border-secondary-subtle p-3">
    <button @click="handleLogout" class="btn btn-secondary mb-2">Logout</button>
    <div v-if="logoutstatus">Status: {{ logoutstatus }}</div>
  </div>
</template>