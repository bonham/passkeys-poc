<script lang="ts" setup>
import { ref } from 'vue'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import type { RegistrationResponseJSON, PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/typescript-types'
import type { VerifiedAuthenticationResponse, VerifiedRegistrationResponse } from '@simplewebauthn/server'

const regstatus = ref("None")
const loginstatus = ref("None")

// checkPrereqs()

// async function checkPrereqs() {

//   if (client.isAvailable()) {
//     visible.value = true
//   }

//   if (await client.isLocalAuthenticator())
//     localAuthenticatorAvailable.value = true
// }

function getErrorMessage(error: any) {
  if (error instanceof Error) {
    return `Name: ${error.name}, Message: ${error.message}`
  } else return `Error object type ${typeof error}, Value: ${String(error)}`
}

async function handleCreate() {

  // GET registration options from the endpoint that calls
  // @simplewebauthn/server -> generateRegistrationOptions()
  const resp = await getWithCORS('/api/v1/auth/regoptions');

  const regoptions = await resp.json() as PublicKeyCredentialCreationOptionsJSON

  let attResp: RegistrationResponseJSON;
  try {
    // Pass the options to the authenticator and wait for a response
    attResp = await startRegistration(regoptions);
  } catch (error) {

    if (error instanceof Error) {
      // Some basic error handling
      if (error.name === 'InvalidStateError') {
        regstatus.value = 'Authenticator was probably already registered by user';
        return
      } else {
        console.error(getErrorMessage(error))
        regstatus.value = "Failed on client side";
        return
      }
    } else {
      console.error(getErrorMessage(error))
      regstatus.value = "Failed on client side (2)"
      return
    }
  }

  // POST the response to the endpoint that calls
  // @simplewebauthn/server -> verifyRegistrationResponse()
  let verificationResp: Response
  try {
    verificationResp = await sendJSONToServer('/api/v1/auth/register', JSON.stringify(attResp));
    if (!verificationResp.ok) {
      console.log(`Verification failed with response:`, verificationResp)
      regstatus.value = "Failed"
      return
    }
  } catch (error) {
    const msg = getErrorMessage(error);
    console.log("Error when calling registration endpoint: " + msg);
    regstatus.value = "Failed"
    return
  }

  // Wait for the results of verification
  const verificationJSON = await verificationResp.json() as VerifiedRegistrationResponse;
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

async function handleLogin() {

  const authuser = "usernickname1"
  const authoptionsUrl = "/api/v1/auth/authoptions" + "?authuser=" + authuser
  const resp = await getWithCORS(authoptionsUrl);
  const regoptions = await resp.json() as PublicKeyCredentialCreationOptionsJSON

  let asseResp;
  try {
    // Pass the options to the authenticator and wait for a response
    asseResp = await startAuthentication(regoptions);
  } catch (error) {
    // Some basic error handling
    loginstatus.value = "Start Auth error: " + String(error);
    return
  }

  // POST the response to the endpoint that calls
  // @simplewebauthn/server -> verifyAuthenticationResponse()
  let verificationResp: Response
  try {
    verificationResp = await sendJSONToServer('/api/v1/auth/authentication', JSON.stringify(asseResp))
    if (!verificationResp.ok) {
      console.log(`Verification failed with response:`, verificationResp)
      loginstatus.value = "Failed"
      return
    }
  } catch (error) {
    const msg = getErrorMessage(error);
    console.log("Error when calling registration endpoint: " + msg);
    loginstatus.value = "Failed"
    return
  }

  // Wait for the results of verification
  const verificationJSON = await verificationResp.json() as VerifiedAuthenticationResponse;
  console.log("verificationJson:", verificationJSON)

  // Show UI appropriate for the `verified` status
  if (verificationJSON && verificationJSON.verified) {
    loginstatus.value = 'Success!';
  } else {
    loginstatus.value = `Oh no, something went wrong! Response: ${JSON.stringify(
      verificationJSON,
    )}`;
  }
};

</script>

<template>
  <div>Hello</div>
  <button @click="handleCreate">Register</button>
  <div>Registration status: {{ regstatus }}</div>
  <div>
    <button @click="handleLogin">Login</button>
    <div>Login status: {{ loginstatus }}</div>
  </div>
</template>