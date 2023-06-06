<script lang="ts" setup>
import { ref } from 'vue'

import RegistrationForm from './RegistrationForm.vue';
import LoginForm from './LoginForm.vue';
import { getWithCORS } from '@/lib/httpHelpers';

import { onMounted } from 'vue'

onMounted(() => {
  updateUser()
})

const username = ref("None")

async function updateUser() {
  try {
    const res = await getWithCORS('/api/v1/auth/user')
    if (res.ok) {
      const ro = await res.json()
      username.value = ro.userid
    } else {
      console.error(`Could not fetch user. Response status ${res.status}`)
      username.value = "Grr"
    }
  } catch (error) {
    console.log("Could not fetch user", error)
    username.value = "Error"
  }
}
// checkPrereqs()

// async function checkPrereqs() {

//   if (client.isAvailable()) {
//     visible.value = true
//   }

//   if (await client.isLocalAuthenticator())
//     localAuthenticatorAvailable.value = true
// }

</script>

<template>
  <div class="container">
    <nav class="p-2 navbar bg-dark border-bottom border-bottom-dark" data-bs-theme="dark">
      <div class="navbar-brand">Webauthn</div>
      <div class="navbar-nav text-light">{{ username }}</div>
    </nav>
    <div>
      <RegistrationForm form-label="Register with username" place-holder="Username" />
      <RegistrationForm use-registration-key form-label="Register with registration key" place-holder="Key" />
      <LoginForm @changed="updateUser" />
    </div>
  </div>
</template>