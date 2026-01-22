<template>
  <div class="stack" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
    <div class="pull-indicator" :class="{ active: isPulling || refreshing }">
      <span v-if="!refreshing">Pull down to refresh</span>
      <span v-else>Refreshing…</span>
    </div>
    <div class="card">
      <div class="section-title">{{ data.session?.name || 'Queue' }}</div>
      <div class="subtitle">Live queue + courts</div>
    </div>

    <div class="card stack">
      <div class="section-title">Now Playing</div>
      <div v-if="data.courts?.length === 0" class="subtitle">No courts yet.</div>
      <div v-for="court in data.courts || []" :key="court.court.id" class="card">
        <div class="kpi">
          <strong>{{ court.court.name }}</strong>
          <span class="badge" :class="court.status === 'maintenance' ? 'warning' : ''">{{ court.status }}</span>
        </div>
        <div class="subtitle">
          {{ court.currentMatch ? matchLabel(court.currentMatch) : 'Open' }}
        </div>
      </div>
    </div>

    <div class="card stack">
      <div class="section-title">Upcoming Matches</div>
      <div v-if="queueMatches.length === 0" class="subtitle">No queued matches.</div>
      <div v-for="(match, idx) in queueMatches" :key="match.id" class="queue-card">
        <div class="queue-card-head">
          <strong>#{{ idx + 1 }} {{ match.typeLabel }}</strong>
          <span class="subtitle">Requested {{ formatTime(match.requestedAt) }}</span>
        </div>
        <div class="queue-vs">
          <div class="queue-team">
            <strong>{{ match.teamA.join(' + ') }}</strong>
          </div>
          <span class="queue-vs-pill">vs</span>
          <div class="queue-team">
            <strong>{{ match.teamB.join(' + ') }}</strong>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { api } from "../api.js";
import { useRoute } from "vue-router";

const route = useRoute();
const data = ref({});
const startY = ref(0);
const isPulling = ref(false);
const refreshing = ref(false);

const queueMatches = computed(() => {
  const entries = (data.value.queue || []).slice();
  const matches = [];
  for (let i = 0; i < entries.length; i += 2) {
    const a = entries[i];
    const b = entries[i + 1];
    if (!a || !b) break;
    matches.push({
      id: `${a.id}-${b.id}`,
      typeLabel: a.type === "doubles" ? "Doubles Match" : "Singles Match",
      teamA: a.players.map((p) => p.player.nickname || p.player.fullName),
      teamB: b.players.map((p) => p.player.nickname || p.player.fullName),
      requestedAt: a.createdAt
    });
  }
  return matches;
});

function matchLabel(match) {
  const team1 = match.participants.filter((p) => p.teamNumber === 1).map((p) => p.player.nickname || p.player.fullName);
  const team2 = match.participants.filter((p) => p.teamNumber === 2).map((p) => p.player.nickname || p.player.fullName);
  return `${team1.join(" + ")} vs ${team2.join(" + ")}`;
}

function formatTime(timestamp) {
  if (!timestamp) return "—";
  const dt = new Date(timestamp);
  return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

async function load() {
  data.value = await api.publicQueue(route.params.token);
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
