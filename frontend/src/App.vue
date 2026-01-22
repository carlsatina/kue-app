<template>
  <div class="app-shell">
    <header class="header">
      <div>
        <h1 class="title">Kue</h1>
        <div class="subtitle">Mobile-first queue control for courts</div>
      </div>
      <button v-if="showLogout" class="button ghost" @click="logout">Logout</button>
    </header>
    <router-view />
  </div>
  <nav v-if="showNav" class="nav nav-4">
    <router-link to="/" class="nav-item">
      <span class="nav-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="img">
          <path d="M4 10.5l8-6 8 6v7a2 2 0 0 1-2 2h-4.5v-6h-3v6H6a2 2 0 0 1-2-2v-7z"></path>
        </svg>
      </span>
      <span>Dashboard</span>
    </router-link>
    <router-link to="/players" class="nav-item">
      <span class="nav-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="img">
          <circle cx="8" cy="9" r="3"></circle>
          <circle cx="17" cy="10" r="2.5"></circle>
          <path d="M3.5 19c0-3 2.5-5 4.5-5s4.5 2 4.5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
          <path d="M13.5 19c.3-2.1 1.9-3.8 4.1-3.8 2.2 0 3.9 1.7 4.1 3.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
        </svg>
      </span>
      <span>Players</span>
    </router-link>
    <router-link to="/rankings" class="nav-item">
      <span class="nav-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="img">
          <path d="M4 20h4V9H4v11zm6 0h4V4h-4v16zm6 0h4v-7h-4v7z"></path>
        </svg>
      </span>
      <span>Ranking</span>
    </router-link>
    <router-link to="/fees" class="nav-item">
      <span class="nav-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="img">
          <rect x="3" y="6" width="18" height="12" rx="3"></rect>
          <path d="M6 12h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
          <circle cx="16.5" cy="12" r="2.5"></circle>
        </svg>
      </span>
      <span>Fees</span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const authed = computed(() => Boolean(localStorage.getItem("token")));
const showLogout = computed(() => authed.value && !route.meta.public);
const showNav = computed(() => !route.meta.public && authed.value);

function logout() {
  localStorage.removeItem("token");
  router.push("/login");
}
</script>
