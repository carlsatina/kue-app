<template>
  <form class="card auth-card stack" @submit.prevent="handleLogin">
    <h2>Queue Master Login</h2>
    <p class="subtitle">Sign in to run today’s session.</p>
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
    <button class="button" type="submit">Login</button>
    <div class="subtitle">
      New here? <router-link to="/register">Create an account</router-link>
    </div>
    <div class="subtitle">
      Forgot password? <router-link to="/forgot-password">Reset it</router-link>
    </div>
    <div class="subtitle">
      Haven’t verified yet? <router-link to="/check-email">Check email</router-link>
    </div>
    <div v-if="error" class="notice">{{ error }}</div>
  </form>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../api.js";

const router = useRouter();
const email = ref("");
const password = ref("");
const showPassword = ref(false);
const error = ref("");

async function handleLogin() {
  error.value = "";
  try {
    const data = await api.login({ email: email.value, password: password.value });
    localStorage.setItem("token", data.token);
    window.dispatchEvent(new Event("auth:changed"));
    router.push("/");
  } catch (err) {
    error.value = err.message;
  }
}
</script>
