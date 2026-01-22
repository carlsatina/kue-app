<template>
  <div class="card auth-card stack">
    <h2>Create Queue Master Account</h2>
    <p class="subtitle">Open registration for organizers and staff.</p>
    <input class="input" v-model="fullName" type="text" placeholder="Full name" />
    <input class="input" v-model="email" type="email" placeholder="Email" />
    <input class="input" v-model="password" type="password" placeholder="Password" />
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
const error = ref("");

async function handleRegister() {
  error.value = "";
  try {
    const data = await api.register({
      email: email.value,
      password: password.value,
      fullName: fullName.value
    });
    localStorage.setItem("token", data.token);
    router.push("/");
  } catch (err) {
    error.value = err.message;
  }
}
</script>
