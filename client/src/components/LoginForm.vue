<script lang="ts" setup>

import { ref } from 'vue'
import { getWithCORS, sendJSONToServer, getErrorMessage } from '@/lib/httpHelpers';
import { startAuthentication } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/typescript-types'
import type { VerifiedAuthenticationResponse, } from '@simplewebauthn/server'

const loginstatus = ref("None")

async function handleLogin() {

  const authoptionsUrl = "/api/v1/auth/authoptions"

  let resp: Response
  try {
    resp = await getWithCORS(authoptionsUrl);
  } catch (error) {
    loginstatus.value = getErrorMessage(error)
    return
  }
  if (!resp.ok) {
    const t = await resp.text()
    loginstatus.value = t
    return
  }

  let regoptions
  regoptions = await resp.json() as PublicKeyCredentialCreationOptionsJSON

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
  <div class="border border-secondary-subtle p-3">
    <button @click="handleLogin" class="btn btn-secondary mb-2">Sign in with passkey</button>
    <div class="mt-2">Status: {{ loginstatus }}</div>
  </div>
</template>