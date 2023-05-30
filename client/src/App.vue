<script setup lang="ts">
import PassKeyFirst from './components/PassKeyFirst.vue';
</script>

<template>
  <div class="container">
    <nav class="p-2 navbar bg-dark border-bottom border-bottom-dark" data-bs-theme="dark">
      <div class="navbar-brand">Webauthn</div>

    </nav>
    <div class="mt-2">
      <PassKeyFirst />
    </div>
  </div>
</template>

