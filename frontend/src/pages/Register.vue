<template>
  <div class="card auth-card stack">
    <h2>Create Queue Master Account</h2>
    <p class="subtitle">Open registration for organizers and staff.</p>
    <input class="input" v-model="fullName" type="text" placeholder="Full name" />
    <input class="input" v-model="email" type="email" placeholder="Email" />
    <div class="input-wrap">
      <input
        class="input"
        v-model="password"
        :type="showPassword ? 'text' : 'password'"
        placeholder="Password"
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
    <button class="button" @click="handleRegister">Register</button>
    <div class="subtitle">
      Already have an account? <router-link to="/login">Login</router-link>
    </div>
    <div v-if="error" class="notice">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../api.js";

const router = useRouter();
const fullName = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const showConfirm = ref(false);
const error = ref("");

async function handleRegister() {
  error.value = "";
  if (password.value !== confirmPassword.value) {
    error.value = "Passwords do not match";
    return;
  }
  try {
    const data = await api.register({
      email: email.value,
      password: password.value,
      fullName: fullName.value
    });
    router.push({ path: "/check-email", query: { email: data.email || email.value } });
  } catch (err) {
    error.value = err.message;
  }
}
</script>
