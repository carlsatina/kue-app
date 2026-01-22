<template>
  <div class="stack" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
    <div class="pull-indicator" :class="{ active: isPulling || refreshing }">
      <span v-if="!refreshing">Pull down to refresh</span>
      <span v-else>Refreshing…</span>
    </div>
    <div class="card stack">
      <div class="section-title">Player Status</div>
      <div v-if="loading" class="subtitle">Loading...</div>
    <div v-else-if="error" class="notice">{{ error }}</div>
    <div v-else>
      <div class="kpi">
        <strong>{{ data.player.nickname || data.player.fullName }}</strong>
        <span class="badge" :class="['checked_in', 'present'].includes(data.status) ? '' : 'warning'">
          {{ data.status }}
        </span>
      </div>
      <div class="subtitle">Session: {{ data.session.name }}</div>
      <div class="subtitle">Queue: {{ data.inQueue ? `#${data.queuePosition}` : 'Not queued' }}</div>
      <div class="subtitle">Up next: {{ data.upNext ? 'Yes' : 'No' }}</div>
      <div class="subtitle">Estimated wait: {{ data.estimatedWaitMinutes ?? '—' }} mins</div>
      <div class="subtitle">Court: {{ data.currentCourt?.name || '—' }}</div>
      <div v-if="data.session.announcements" class="notice" style="margin-top:12px;">
        {{ data.session.announcements }}
      </div>
      <div class="qr" v-if="qrCode">
        <img :src="qrCode" alt="QR code" />
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import QRCode from "qrcode";
import { api } from "../api.js";
import { useRoute } from "vue-router";

const route = useRoute();
const data = ref(null);
const loading = ref(true);
const error = ref("");
const qrCode = ref("");
const startY = ref(0);
const isPulling = ref(false);
const refreshing = ref(false);

async function load() {
  try {
    data.value = await api.publicPlayer(route.params.token);
    qrCode.value = await QRCode.toDataURL(window.location.href);
  } catch (err) {
    error.value = err.message || "Unable to load";
  } finally {
    loading.value = false;
  }
}

function onTouchStart(e) {
  if (window.scrollY === 0) {
    startY.value = e.touches[0].clientY;
  }
}

function onTouchMove(e) {
  if (window.scrollY !== 0) return;
  const delta = e.touches[0].clientY - startY.value;
  if (delta > 30) {
    isPulling.value = true;
  }
}

async function onTouchEnd(e) {
  const delta = e.changedTouches[0].clientY - startY.value;
  if (delta > 60 && !refreshing.value) {
    refreshing.value = true;
    await load();
    refreshing.value = false;
  }
  isPulling.value = false;
}

onMounted(load);
</script>
