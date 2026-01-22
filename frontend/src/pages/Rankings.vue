<template>
  <div class="stack">
    <div class="card live-surface">
      <div class="section-title">Rankings</div>
      <div v-if="!session" class="subtitle">No active session.</div>
      <div v-else class="rank-summary">
        <div class="rank-summary-card">
          <div class="subtitle">Session</div>
          <strong>{{ session.name }}</strong>
        </div>
        <div class="rank-summary-card">
          <div class="subtitle">Players</div>
          <strong>{{ totalPlayers }}</strong>
        </div>
      </div>
    </div>

    <div class="card stack live-surface" v-if="session">
      <div v-if="rankedPlayers.length === 0" class="subtitle">No stats yet.</div>
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
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { api } from "../api.js";

const session = ref(null);
const rankedPlayers = ref([]);
const totalPlayers = ref(0);

async function load() {
  try {
    const activeSession = await api.activeSession();
    if (!activeSession) {
      session.value = null;
      rankedPlayers.value = [];
      totalPlayers.value = 0;
      return;
    }
    session.value = activeSession;
    const data = await api.rankings(session.value.id);
    rankedPlayers.value = data.players || [];
    totalPlayers.value = data.totalPlayers || 0;
  } catch {
    session.value = null;
    rankedPlayers.value = [];
    totalPlayers.value = 0;
  }
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

onMounted(load);
</script>
