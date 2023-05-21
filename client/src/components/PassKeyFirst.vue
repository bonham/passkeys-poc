<script lang="ts" setup>
import { ref } from 'vue'
import { client } from '@passwordless-id/webauthn'
import type { RegistrationEncoded } from '@passwordless-id/webauthn/dist/esm/types';


const visible = ref(false)
const localAuthenticatorAvailable = ref(false)

checkPrereqs()

async function checkPrereqs() {

  if (client.isAvailable()) {
    visible.value = true
  }

  if (await client.isLocalAuthenticator())
    localAuthenticatorAvailable.value = true
}

async function handleCreate() {
  console.log("handleCreate")

  const challenge = "a7c61ef9-dc23-4806-b486-2428938a547e"
  const registration = await client.register("Arnaud", challenge, {
    "authenticatorType": "both",
    "userVerification": "required",
    "timeout": 60000,
    "attestation": false,
    "debug": false
  })
  console.log("reg", registration)
  await sendRegToServer(registration)

}

async function sendRegToServer(registration: RegistrationEncoded) {
  const body = JSON.stringify(registration)
  const headers = new Headers()
  headers.append("Content-Type", "application/json")

  const url = 'http://localhost:5000/api/v1/auth/register'
  const opts: RequestInit = {
    method: 'POST',
    headers,
    body
  }

  try {
    const resp = await fetch(url, opts);
    if (!resp.ok) {
      console.error("Response not ok", resp)
      throw new Error("Registration response not ok")
    }
  } catch (e) {
    console.error("Network error during fetch", e);
  }

}

</script>

<template>
  <div>Hello</div>
  <div v-if="visible">
    <button @click="handleCreate">Create new passkey</button>
    <div>Local Authenticator <div v-if="!localAuthenticatorAvailable">not</div> available
    </div>
  </div>
</template>