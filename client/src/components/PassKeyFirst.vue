<script lang="ts" setup>
import { ref } from 'vue'
import { client } from '@passwordless-id/webauthn'
import type { RegistrationEncoded, AuthenticationEncoded } from '@passwordless-id/webauthn/dist/esm/types';


const visible = ref(false)
const localAuthenticatorAvailable = ref(false)
const regstatus = ref("None")
const loginstatus = ref("None")

checkPrereqs()

async function checkPrereqs() {

  if (client.isAvailable()) {
    visible.value = true
  }

  if (await client.isLocalAuthenticator())
    localAuthenticatorAvailable.value = true
}

type ChallengeResponse = { challenge: string }

async function getChallenge(): Promise<string> {
  const url = 'http://localhost:5000/api/v1/auth/challenge'
  var resp: Response
  const opts: RequestInit = {
    method: 'GET',
    credentials: "include"
  }
  try {
    resp = await fetch(url, opts)
    if (!resp.ok) {
      throw new Error("Response not ok" + resp)
    } else {
      const respj: ChallengeResponse = await resp.json()
      return respj.challenge
    }
  } catch (e) {
    throw new Error("Network error during fetch" + e)
  }
}

async function handleCreate() {

  const challenge = await getChallenge()
  if (!challenge) throw new Error("Challenge not defined")
  const registration = await client.register("Arnaud", challenge, {
    "authenticatorType": "both",
    "userVerification": "required",
    "timeout": 60000,
    "attestation": false,
    "debug": false
  })
  console.log("reg", registration)
  let response: Response
  try {
    response = await sendRegToServer(registration)
  } catch (e) {
    console.log("Failure in registration call", e)
    regstatus.value = "Communication failure"
    return
  }
  const success: boolean = response.ok
  regstatus.value = success ? "Success" : "Failure"
}

async function sendJSONToServer(path: string, payload: string) {
  const body = payload
  const headers = new Headers()
  headers.append("Content-Type", "application/json")

  const url = `http://localhost:5000${path}`
  const opts: RequestInit = {
    method: 'POST',
    headers,
    body,
    credentials: "include"
  }

  // can throw error
  const resp = await fetch(url, opts);
  return resp
}

async function sendRegToServer(registration: RegistrationEncoded) {
  const uri = "/api/v1/auth/register"
  const payload = JSON.stringify(registration)
  return await sendJSONToServer(uri, payload)
}

async function sendAuthDataToServer(authentication: AuthenticationEncoded) {
  const uri = "/api/v1/auth/login"
  const payload = JSON.stringify(authentication)
  return await sendJSONToServer(uri, payload)
}

async function handleLogin() {
  const challenge = await getChallenge()
  let authentication: AuthenticationEncoded
  try {
    authentication = await client.authenticate([], challenge, {
      "authenticatorType": "both",
      "userVerification": "required",
      "timeout": 60000
    })
    console.log("auth", authentication)
  } catch (e) {
    console.log("Passkey selection failed", e)
    loginstatus.value = "Passkey selection failed"
    return
  }

  let authResponse: Response
  try {
    authResponse = await sendAuthDataToServer(authentication)
  } catch (e) {
    console.error("Failure in authentication call", e)
    loginstatus.value = "Communication failure"
    return
  }

  loginstatus.value = authResponse.ok ? "Success" : "Unauthorized"

}


</script>

<template>
  <div>Hello</div>
  <div v-if="visible">
    <button @click="handleCreate">Register</button>
    <div>Local Authenticator
      <div v-if="!localAuthenticatorAvailable">not</div>
      available
    </div>
    <div>Registration status: {{ regstatus }}</div>
    <div>
      <button @click="handleLogin">Login</button>
      <div>Login status: {{ loginstatus }}</div>
    </div>
  </div>
</template>