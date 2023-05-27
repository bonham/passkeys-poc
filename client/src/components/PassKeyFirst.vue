<script lang="ts" setup>
import { ref } from 'vue'
import { startRegistration } from '@simplewebauthn/browser';
import type { RegistrationResponseJSON } from '@simplewebauthn/typescript-types'

const regstatus = ref("None")
// const loginstatus = ref("None")

// checkPrereqs()

// async function checkPrereqs() {

//   if (client.isAvailable()) {
//     visible.value = true
//   }

//   if (await client.isLocalAuthenticator())
//     localAuthenticatorAvailable.value = true
// }

// type ChallengeResponse = { challenge: string }

// async function getChallenge(): Promise<string> {
//   const url = 'http://localhost:5000/api/v1/auth/challenge'
//   var resp: Response
//   const opts: RequestInit = {
//     method: 'GET',
//     credentials: "include"
//   }
//   try {
//     resp = await fetch(url, opts)
//     if (!resp.ok) {
//       throw new Error("Response not ok" + resp)
//     } else {
//       const respj: ChallengeResponse = await resp.json()
//       return respj.challenge
//     }
//   } catch (e) {
//     throw new Error("Network error during fetch" + e)
//   }
// }

async function handleCreate() {

  // GET registration options from the endpoint that calls
  // @simplewebauthn/server -> generateRegistrationOptions()
  const resp = await getWithCORS('/api/v1/auth/regoptions');

  let attResp: RegistrationResponseJSON;
  try {
    // Pass the options to the authenticator and wait for a response
    attResp = await startRegistration(await resp.json());
  } catch (error) {

    if (error instanceof Error) {
      // Some basic error handling
      if (error.name === 'InvalidStateError') {
        regstatus.value = 'Error: Authenticator was probably already registered by user';
      } else {
        regstatus.value = error.name + " / " + error.message;
      }
    }
    throw error;
  }

  // POST the response to the endpoint that calls
  // @simplewebauthn/server -> verifyRegistrationResponse()
  const verificationResp = await sendJSONToServer('/api/v1/auth/register', JSON.stringify(attResp));

  // Wait for the results of verification
  const verificationJSON = await verificationResp.json();
  console.log("verificationJson:", verificationJSON)

  // Show UI appropriate for the `verified` status
  if (verificationJSON && verificationJSON.verified) {
    regstatus.value = 'Success!';
  } else {
    regstatus.value = `Oh no, something went wrong! Response: <pre>${JSON.stringify(
      verificationJSON,
    )}</pre>`;
  }
}


// async function handleCreate() {

//   const challenge = await getChallenge()
//   if (!challenge) throw new Error("Challenge not defined")
//   const registration = await client.register("Arnaud", challenge, {
//     "authenticatorType": "both",
//     "userVerification": "required",
//     "timeout": 60000,
//     "attestation": false,
//     "debug": false
//   })
//   console.log("reg", registration)
//   let response: Response
//   try {
//     response = await sendRegToServer(registration)
//   } catch (e) {
//     console.log("Failure in registration call", e)
//     regstatus.value = "Communication failure"
//     return
//   }
//   const success: boolean = response.ok
//   regstatus.value = success ? "Success" : "Failure"
// }

async function getWithCORS(path: string) {

  const url = `http://localhost:5000${path}`
  const opts: RequestInit = {
    method: 'GET',
    credentials: "include"
  }

  // can throw error
  const resp = await fetch(url, opts);
  return resp
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

// async function sendRegToServer(registration: RegistrationEncoded) {
//   const uri = "/api/v1/auth/register"
//   const payload = JSON.stringify(registration)
//   return await sendJSONToServer(uri, payload)
// }

// async function sendAuthDataToServer(authentication: AuthenticationEncoded) {
//   const uri = "/api/v1/auth/login"
//   const payload = JSON.stringify(authentication)
//   return await sendJSONToServer(uri, payload)
// }

// async function handleLogin() {
//   const challenge = await getChallenge()
//   let authentication: AuthenticationEncoded
//   try {
//     authentication = await client.authenticate([], challenge, {
//       "authenticatorType": "both",
//       "userVerification": "required",
//       "timeout": 60000
//     })
//     console.log("auth", authentication)
//   } catch (e) {
//     console.log("Passkey selection failed", e)
//     loginstatus.value = "Passkey selection failed"
//     return
//   }

//   let authResponse: Response
//   try {
//     authResponse = await sendAuthDataToServer(authentication)
//   } catch (e) {
//     console.error("Failure in authentication call", e)
//     loginstatus.value = "Communication failure"
//     return
//   }

//   loginstatus.value = authResponse.ok ? "Success" : "Unauthorized"

// }


</script>

<template>
  <div>Hello</div>
  <button @click="handleCreate">Register</button>
  <div>Registration status: {{ regstatus }}</div>
  <!-- <div>
                <button @click="handleLogin">Login</button>
                <div>Login status: {{ loginstatus }}</div>
              </div> -->
</template>