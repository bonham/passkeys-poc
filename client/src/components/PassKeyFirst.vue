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
  <div>
    <RegistrationForm />
    <LoginForm />
  </div>
</template>