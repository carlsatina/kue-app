<template>
  <form class="card auth-card stack reset-password" @submit.prevent="handleReset">
    <h2>Set a new password</h2>
    <p class="subtitle">Choose a new password for your account.</p>
    <div class="input-wrap">
      <input
        class="input"
        v-model="password"
        :type="showPassword ? 'text' : 'password'"
        placeholder="New password"
      />
      <button class="icon-toggle" type="button" @click="showPassword = !showPassword" aria-label="Toggle password">
        <svg viewBox="0 0 24 24" role="img">
          <path
            d="M12 5c-5 0-9.3 3.1-11 7 1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"
          ></path>
        </svg>
      </button>
    </div>
    <div class="input-wrap">
      <input
        class="input"
        v-model="confirmPassword"
        :type="showConfirm ? 'text' : 'password'"
        placeholder="Confirm password"
      />
      <button
        class="icon-toggle"
        type="button"
        @click="showConfirm = !showConfirm"
        aria-label="Toggle confirm password"
      >
        <svg viewBox="0 0 24 24" role="img">
          <path
            d="M12 5c-5 0-9.3 3.1-11 7 1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"
          ></path>
        </svg>
      </button>
    </div>
    <button class="button" type="submit" :disabled="loading">
      {{ loading ? "Saving..." : "Update password" }}
    </button>
    <div v-if="error" class="notice">{{ error }}</div>
    <div v-if="success" class="notice success">Password updated. You can log in now.</div>
    <router-link class="button ghost" to="/login">Back to login</router-link>
  </form>
</template>

<script setup>
import { ref } from "vue";
import { useRoute } from "vue-router";
import { api } from "../api.js";

const route = useRoute();
const password = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const showConfirm = ref(false);
const loading = ref(false);
const error = ref("");
const success = ref(false);

async function handleReset() {
  error.value = "";
  success.value = false;
  const token = route.query.token ? String(route.query.token) : "";
  if (!token) {
    error.value = "Missing reset token.";
    return;
  }
  if (password.value !== confirmPassword.value) {
    error.value = "Passwords do not match";
    return;
  }
  loading.value = true;
  try {
    await api.resetPassword({ token, password: password.value });
    success.value = true;
  } catch (err) {
    error.value = err.message || "Unable to reset password";
  } finally {
    loading.value = false;
  }
}
</script>
