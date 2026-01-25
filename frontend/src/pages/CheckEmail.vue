<template>
  <div class="card auth-card stack check-email">
    <h2>Check your email</h2>
    <p class="subtitle">
      We sent a verification link to <strong>{{ email || "your inbox" }}</strong>.
      Click the button in that email to activate your account.
    </p>
    <div class="check-email-hint">
      Didn’t get it? Check spam or promotions, or wait a minute and refresh.
    </div>
    <router-link class="button check-email-button" to="/login">Back to login</router-link>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const email = computed(() => (route.query.email ? String(route.query.email) : ""));
</script>
