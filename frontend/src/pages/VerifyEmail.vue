<template>
  <div class="card auth-card stack verify-email">
    <div class="verify-badge" :class="{ success: status === 'success', error: status === 'error' }">
      <span v-if="status === 'loading'">Verifying…</span>
      <span v-else-if="status === 'success'">Verified</span>
      <span v-else>Invalid link</span>
    </div>
    <h2>{{ headline }}</h2>
    <p class="subtitle">{{ message }}</p>
    <router-link class="button" :class="status === 'error' ? 'ghost' : ''" to="/login">
      Go to login
    </router-link>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { api } from "../api.js";

const route = useRoute();
const status = ref("loading");
const headline = computed(() => {
  if (status.value === "success") return "Email verified!";
  if (status.value === "error") return "Verification failed";
  return "Finishing up";
});
const message = computed(() => {
  if (status.value === "success") {
    return "You can now log in and manage your sessions.";
  }
  if (status.value === "error") {
    return "This verification link is invalid or expired.";
  }
  return "Hold tight while we validate your link.";
});

onMounted(async () => {
  const token = route.query.token ? String(route.query.token) : "";
  if (!token) {
    status.value = "error";
    return;
  }
  try {
    await api.verifyEmail(token);
    status.value = "success";
  } catch {
    status.value = "error";
  }
});
</script>
