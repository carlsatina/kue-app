<template>
  <div class="stack public-queue" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
    <div class="pull-indicator" :class="{ active: isPulling || refreshing }">
      <span v-if="!refreshing">Pull down to refresh</span>
      <span v-else>Refreshing…</span>
    </div>
    <div class="queue-hero">
      <div class="queue-hero-top">
        <div>
          <div class="queue-hero-eyebrow">Live queue</div>
          <h2 class="queue-hero-title">{{ data.session?.name || 'Queue' }}</h2>
          <div class="queue-hero-subtitle">Live queue + courts</div>
        </div>
        <div class="queue-hero-actions">
          <div class="queue-live-pill">
            <span class="queue-live-dot" aria-hidden="true"></span>
            Live
          </div>
          <button class="button ghost button-compact queue-hero-action" @click="openRankings">
            Rankings
            <span v-if="totalPlayers" class="queue-hero-count">{{ totalPlayers }}</span>
          </button>
        </div>
      </div>
      <div class="queue-hero-stats">
        <div class="queue-stat">
          <span>Courts</span>
          <strong>{{ data.courts?.length || 0 }}</strong>
        </div>
        <div class="queue-stat">
          <span>Matches</span>
          <strong>{{ queueMatches.length }}</strong>
        </div>
      </div>
    </div>

    <div class="card stack queue-section">
      <div class="queue-section-head">
        <div class="section-title">Now Playing</div>
        <span class="queue-section-badge">{{ data.courts?.length || 0 }} courts</span>
      </div>
      <div v-if="data.courts?.length === 0" class="subtitle">No courts yet.</div>
      <div v-for="court in data.courts || []" :key="court.court.id" class="queue-court-card">
        <div class="queue-court-head">
          <strong>{{ court.court.name }}</strong>
          <span class="queue-status-pill" :class="court.status">{{ statusLabel(court.status) }}</span>
        </div>
        <div class="queue-court-body">
          <div v-if="court.currentMatch" class="queue-now-vs">
            <span class="queue-now-pill team-a">{{ teamLabel(court.currentMatch, 1) }}</span>
            <span class="queue-now-divider">vs</span>
            <span class="queue-now-pill team-b">{{ teamLabel(court.currentMatch, 2) }}</span>
          </div>
          <span v-else class="subtitle">Open</span>
          <div v-if="court.currentMatch" class="queue-time-row">
            <span>Started {{ formatTime(court.currentMatch.startedAt) }}</span>
            <span>Elapsed {{ elapsedTime(court.currentMatch.startedAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card stack queue-section">
      <div class="queue-section-head">
        <div class="section-title">Upcoming Matches</div>
        <span class="queue-section-badge">{{ queueMatches.length }} in queue</span>
      </div>
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

  <div v-if="showRankingsModal" class="modal-backdrop">
    <div class="modal-card rank-modal">
      <div class="rank-modal-head">
        <div>
          <div class="subtitle">Current session</div>
          <h3>Rankings</h3>
        </div>
        <span class="queue-section-badge">{{ totalPlayers }} players</span>
      </div>
      <div v-if="rankedPlayers.length === 0" class="subtitle">No stats yet.</div>
      <div v-else class="rank-modal-body">
        <div v-for="player in rankedPlayers" :key="player.playerId" class="rank-card">
          <div class="rank-left">
            <div class="rank-badge" :class="rankClass(player.rank)">{{ player.rank }}</div>
            <div>
              <strong>{{ player.player.nickname || player.player.fullName }}</strong>
              <div class="subtitle">{{ player.player.fullName }}</div>
            </div>
          </div>
          <div class="rank-stats">
            <div class="rank-pill">GP {{ player.gamesPlayed }}</div>
            <div class="rank-pill win">W {{ player.wins }}</div>
            <div class="rank-pill loss">L {{ player.losses }}</div>
            <div class="rank-pill pct">{{ winPct(player.winPct) }}</div>
          </div>
        </div>
      </div>
      <button class="button" @click="closeRankings">Close</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { api } from "../api.js";
import { useRoute } from "vue-router";

const route = useRoute();
const data = ref({});
const rankedPlayers = ref([]);
const totalPlayers = ref(0);
const startY = ref(0);
const isPulling = ref(false);
const refreshing = ref(false);
const nowTick = ref(Date.now());
let timerId = null;
const showRankingsModal = ref(false);

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

function teamLabel(match, teamNumber) {
  return match.participants
    .filter((p) => p.teamNumber === teamNumber)
    .map((p) => p.player.nickname || p.player.fullName)
    .join(" + ");
}

function formatTime(timestamp) {
  if (!timestamp) return "—";
  const dt = new Date(timestamp);
  return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function elapsedTime(startedAt) {
  if (!startedAt) return "—";
  const diffMs = Math.max(0, nowTick.value - new Date(startedAt).getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${hours}h ${String(remMinutes).padStart(2, "0")}m`;
  }
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function statusLabel(status) {
  if (status === "in_match") return "Occupied";
  if (status === "maintenance") return "Maintenance";
  if (status === "available") return "Available";
  return status || "—";
}

function winPct(value) {
  const pct = Math.round((value || 0) * 100);
  return `${pct}%`;
}

function rankClass(rank) {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return "neutral";
}

async function load() {
  try {
    data.value = await api.publicQueue(route.params.token);
  } catch {
    data.value = {};
  }

  try {
    const rankingData = await api.publicQueueRankings(route.params.token);
    rankedPlayers.value = rankingData.players || [];
    totalPlayers.value = rankingData.totalPlayers || 0;
  } catch {
    rankedPlayers.value = [];
    totalPlayers.value = 0;
  }
}

function openRankings() {
  showRankingsModal.value = true;
}

function closeRankings() {
  showRankingsModal.value = false;
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

onMounted(() => {
  load();
  timerId = setInterval(() => {
    nowTick.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (timerId) clearInterval(timerId);
});
</script>
