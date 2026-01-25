<template>
  <div class="card auth-card stack forgot-password">
    <h2>Reset your password</h2>
    <p class="subtitle">Enter your email and we’ll send you a reset link.</p>
    <input class="input" v-model="email" type="email" placeholder="Email" />
    <button class="button" :disabled="loading" @click="handleRequest">
      {{ loading ? "Sending..." : "Send reset link" }}
    </button>
    <div v-if="sent" class="notice success">
      If that email exists, a reset link is on the way.
    </div>
    <router-link class="button ghost forgot-back" to="/login">Back to login</router-link>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { api } from "../api.js";

const email = ref("");
const loading = ref(false);
const sent = ref(false);

async function handleRequest() {
  loading.value = true;
  sent.value = false;
  try {
    await api.requestPasswordReset({ email: email.value });
    sent.value = true;
  } finally {
    loading.value = false;
  }
}
</script>
