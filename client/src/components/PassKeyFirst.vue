<script lang="ts" setup>
import { ref } from 'vue'

const visible = ref(false)

checkPrereqs()

function checkPrereqs() {

  if (window.PublicKeyCredential &&
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable &&
    PublicKeyCredential.isConditionalMediationAvailable) {
    // Check if user verifying platform authenticator is available.  
    Promise.all([
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
      PublicKeyCredential.isConditionalMediationAvailable(),
    ]).then(results => {
      if (results.every(r => r === true)) {
        console.log("yes")
        visible.value = true
      } else {
        console.log("no")
      }
    });
  } else {
    console.log("Verification one failed")
  }
}

async function handleCreate() {
  console.log("handleCreate")

  const uidArray = new Int8Array(2)
  uidArray[0] = 42


  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge: new ArrayBuffer(0),
    rp: {
      name: "Example",
      id: "localhost",
    },
    user: {
      id: uidArray,
      name: "john78",
      displayName: "John",
    },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
    authenticatorSelection: {
      requireResidentKey: true
    }


  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions
  });

  console.log("Cred", credential)
  // Encode and send the credential to the server for verification.  

}

</script>

<template>
  <div>Hello</div>
  <div v-if="visible">
    <button @click="handleCreate">Create new passkey</button>
  </div>
</template>