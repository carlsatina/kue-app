<template>
  <div class="page-grid with-sidebar">
    <div class="page-main stack">
      <div v-if="session" class="card stack live-surface rank-board">
        <div class="rank-hero">
          <div>
            <div class="subtitle">Live Rankings</div>
            <div class="rank-title">Top Players</div>
          </div>
          <div class="rank-hero-meta">
            <div class="rank-chip">{{ session?.name }}</div>
            <div class="rank-chip">{{ totalPlayers }} players</div>
          </div>
        </div>

        <div v-if="rankedPlayers.length === 0" class="subtitle">No stats yet.</div>
        <template v-else>
          <div class="rank-podium">
            <div
              v-for="(player, idx) in podiumPlayers"
              :key="player.playerId"
              class="rank-podium-card"
              :class="`podium-${rankClass(player.rank)}`"
              :style="{ animationDelay: `${idx * 80}ms` }"
            >
              <div class="rank-corner-icon">{{ rankCornerIcon(player.rank) }}</div>
              <div class="rank-medal">
                <span class="rank-number">{{ player.rank }}</span>
              </div>
              <div class="rank-name">{{ player.player.nickname || player.player.fullName }}</div>
              <div class="rank-mini-stats">
                <span>GP {{ player.gamesPlayed }}</span>
                <span>W {{ player.wins }}</span>
                <span>L {{ player.losses }}</span>
                <span>{{ winPct(player.winPct) }}</span>
              </div>
            </div>
          </div>

          <div class="rank-list">
            <div
              v-for="(player, idx) in restPlayers"
              :key="player.playerId"
              class="rank-row"
              :style="{ animationDelay: `${(idx + 3) * 40}ms` }"
            >
              <div class="rank-row-left">
                <div class="rank-row-badge" :class="rankClass(player.rank)">
                  <span class="rank-number">{{ player.rank }}</span>
                </div>
                <div class="rank-row-name">{{ player.player.nickname || player.player.fullName }}</div>
              </div>
              <div class="rank-row-icon">{{ rankCornerIcon(player.rank) }}</div>
              <div class="rank-row-stats">
                <span class="rank-pill">GP {{ player.gamesPlayed }}</span>
                <span class="rank-pill win">W {{ player.wins }}</span>
                <span class="rank-pill loss">L {{ player.losses }}</span>
                <span class="rank-pill pct">{{ winPct(player.winPct) }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
      <div v-else class="card live-surface">
        <div class="subtitle">Open a session to see the live rankings.</div>
      </div>
    </div>

    <div class="page-side stack">
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
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { api } from "../api.js";
import { selectedSessionId, setSelectedSessionId } from "../state/sessionStore.js";

const session = ref(null);
const rankedPlayers = ref([]);
const totalPlayers = ref(0);
const podiumPlayers = computed(() => rankedPlayers.value.slice(0, 3));
const restPlayers = computed(() => rankedPlayers.value.slice(3));

async function load() {
  try {
    let currentSession = null;
    if (selectedSessionId.value) {
      currentSession = await api.session(selectedSessionId.value);
    } else {
      currentSession = await api.activeSession();
      if (currentSession?.id) setSelectedSessionId(currentSession.id);
    }
    if (!currentSession) {
      session.value = null;
      rankedPlayers.value = [];
      totalPlayers.value = 0;
      return;
    }
    session.value = currentSession;
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

function rankCornerIcon(rank) {
  if (rank === 1) return "🏆";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "⭐";
}


onMounted(load);

watch(selectedSessionId, load);
</script>
