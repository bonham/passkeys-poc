<script lang="ts" setup>

import RegistrationForm from './RegistrationForm.vue';
import LoginForm from './LoginForm.vue';

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

    </nav>
    <div>
      <RegistrationForm form-label="Register with username" />
      <RegistrationForm use-registration-key form-label="Register with registration key" />
      <LoginForm />
    </div>
  </div>
</template>