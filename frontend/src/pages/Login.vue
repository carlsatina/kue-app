<template>
  <div class="card auth-card stack">
    <h2>Queue Master Login</h2>
    <p class="subtitle">Sign in to run today’s session.</p>
    <input class="input" v-model="email" type="email" placeholder="Email" />
    <input class="input" v-model="password" type="password" placeholder="Password" />
    <button class="button" @click="handleLogin">Login</button>
    <div class="subtitle">
      New here? <router-link to="/register">Create an account</router-link>
    </div>
    <div v-if="error" class="notice">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../api.js";

const router = useRouter();
const email = ref("");
const password = ref("");
const error = ref("");

async function handleLogin() {
  error.value = "";
  try {
    const data = await api.login({ email: email.value, password: password.value });
    localStorage.setItem("token", data.token);
    router.push("/");
  } catch (err) {
    error.value = err.message;
  }
}
</script>
