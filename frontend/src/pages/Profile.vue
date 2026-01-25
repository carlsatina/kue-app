<template>
  <div class="page-grid profile-page">
    <div class="card profile-hero">
      <div class="profile-banner"></div>
      <div class="profile-header">
        <div class="profile-avatar">{{ initials }}</div>
        <div>
          <h2>Profile</h2>
          <div class="subtitle">Manage your account and access.</div>
        </div>
      </div>
      <div class="profile-details">
        <div class="profile-row">
          <span class="profile-label">Email</span>
          <strong>{{ profile.email || "—" }}</strong>
        </div>
        <div class="profile-row">
          <span class="profile-label">Roles</span>
          <div class="profile-pills">
            <span v-if="!profile.roles.length" class="pill neutral">None</span>
            <span v-for="role in profile.roles" :key="role" class="pill">{{ role }}</span>
          </div>
        </div>
        <div class="profile-row">
          <span class="profile-label">User ID</span>
          <span class="mono">{{ profile.id || "—" }}</span>
        </div>
      </div>
    </div>

    <div class="card profile-actions">
      <div>
        <div class="section-title">Security</div>
        <div class="subtitle">Sign out when you’re done managing courts.</div>
      </div>
      <button class="button danger profile-logout" @click="logout">Logout</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

function decodeTokenPayload(token) {
  if (!token) return null;
  try {
    const base64 = token.split(".")[1];
    const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const payload = decodeTokenPayload(localStorage.getItem("token"));
const profile = computed(() => ({
  id: payload?.id || "",
  email: payload?.email || "",
  roles: Array.isArray(payload?.roles) ? payload.roles : []
}));

const initials = computed(() => {
  const email = profile.value.email || "";
  return email ? email.trim().charAt(0).toUpperCase() : "U";
});

function logout() {
  localStorage.removeItem("token");
  window.dispatchEvent(new Event("auth:changed"));
  router.push("/login");
}
</script>
