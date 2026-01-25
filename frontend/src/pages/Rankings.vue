<template>
  <div class="page-grid with-sidebar">
    <div class="page-main stack">
      <div v-if="session" class="card stack live-surface rank-board">
        <div class="rank-hero">
          <div>
            <div class="subtitle">Live Rankings</div>
            <div class="rank-title">{{ rankTitle }}</div>
          </div>
          <div class="rank-hero-meta">
            <div class="rank-chip">{{ session?.name }}</div>
            <div class="rank-chip">{{ totalCount }} {{ summaryLabel }}</div>
          </div>
        </div>
        <div v-if="showTeamToggle" class="segmented rank-toggle">
          <button
            class="segment"
            :class="{ active: rankMode === 'players' }"
            type="button"
            @click="rankMode = 'players'"
          >
            Players
          </button>
          <button
            class="segment"
            :class="{ active: rankMode === 'teams' }"
            type="button"
            @click="rankMode = 'teams'"
          >
            Teams
          </button>
        </div>

        <div v-if="rankedRows.length === 0" class="subtitle">No stats yet.</div>
        <template v-else>
          <div class="rank-podium">
            <div
              v-for="(row, idx) in podiumRows"
              :key="row.id"
              class="rank-podium-card"
              :class="`podium-${rankClass(row.rank)}`"
              :style="{ animationDelay: `${idx * 80}ms` }"
            >
              <div class="rank-corner-icon">{{ rankCornerIcon(row.rank) }}</div>
              <div class="rank-medal">
                <span class="rank-number">{{ row.rank }}</span>
              </div>
              <div class="rank-name">{{ row.name }}</div>
              <div class="rank-mini-stats">
                <span>GP {{ row.gamesPlayed }}</span>
                <span>W {{ row.wins }}</span>
                <span>L {{ row.losses }}</span>
                <span>{{ winPct(row.winPct) }}</span>
              </div>
            </div>
          </div>

          <div class="rank-list">
            <div
              v-for="(row, idx) in restRows"
              :key="row.id"
              class="rank-row"
              :style="{ animationDelay: `${(idx + 3) * 40}ms` }"
            >
              <div class="rank-row-left">
                <div class="rank-row-badge" :class="rankClass(row.rank)">
                  <span class="rank-number">{{ row.rank }}</span>
                </div>
                <div class="rank-row-name">{{ row.name }}</div>
              </div>
              <div class="rank-row-icon">{{ rankCornerIcon(row.rank) }}</div>
              <div class="rank-row-stats">
                <span class="rank-pill">GP {{ row.gamesPlayed }}</span>
                <span class="rank-pill win">W {{ row.wins }}</span>
                <span class="rank-pill loss">L {{ row.losses }}</span>
                <span class="rank-pill pct">{{ winPct(row.winPct) }}</span>
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
            <div class="subtitle">{{ summaryLabel }}</div>
            <strong>{{ totalCount }}</strong>
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
const matches = ref([]);
const rankMode = ref("players");
const rankedTeams = computed(() => buildTeamRankings(matches.value));
const isTeamView = computed(() => rankMode.value === "teams" && session.value?.gameType === "doubles");
const rankedRows = computed(() => (isTeamView.value ? rankedTeams.value : buildPlayerRows(rankedPlayers.value)));
const podiumRows = computed(() => rankedRows.value.slice(0, 3));
const restRows = computed(() => rankedRows.value.slice(3));
const totalCount = computed(() => (isTeamView.value ? rankedTeams.value.length : totalPlayers.value));
const summaryLabel = computed(() => (isTeamView.value ? "teams" : "players"));
const rankTitle = computed(() => (isTeamView.value ? "Top Teams" : "Top Players"));
const showTeamToggle = computed(() => session.value?.gameType === "doubles");

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
    const [rankResult, historyResult] = await Promise.allSettled([
      api.rankings(session.value.id),
      api.matchHistory(session.value.id)
    ]);
    if (rankResult.status === "fulfilled") {
      rankedPlayers.value = rankResult.value.players || [];
      totalPlayers.value = rankResult.value.totalPlayers || 0;
    } else {
      rankedPlayers.value = [];
      totalPlayers.value = 0;
    }
    matches.value = historyResult.status === "fulfilled" ? historyResult.value : [];
  } catch {
    session.value = null;
    rankedPlayers.value = [];
    totalPlayers.value = 0;
    matches.value = [];
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

function buildPlayerRows(players) {
  return (players || []).map((player) => ({
    id: player.playerId,
    name: player.player?.nickname || player.player?.fullName || "Player",
    gamesPlayed: player.gamesPlayed || 0,
    wins: player.wins || 0,
    losses: player.losses || 0,
    winPct: player.winPct || 0,
    rank: player.rank || 0
  }));
}

function buildTeamRankings(history) {
  const stats = new Map();
  const nameMap = new Map();
  (history || []).forEach((match) => {
    (match.participants || []).forEach((p) => {
      const name = p.player?.nickname || p.player?.fullName;
      if (p.playerId && name) nameMap.set(p.playerId, name);
    });
  });

  (history || []).forEach((match) => {
    if (match.status !== "ended") return;
    if (match.matchType !== "doubles") return;
    const participants = match.participants || [];
    const team1Ids = participants.filter((p) => p.teamNumber === 1).map((p) => p.playerId).filter(Boolean);
    const team2Ids = participants.filter((p) => p.teamNumber === 2).map((p) => p.playerId).filter(Boolean);
    if (team1Ids.length < 2 || team2Ids.length < 2) return;

    const team1 = getTeamEntry(stats, team1Ids, nameMap);
    const team2 = getTeamEntry(stats, team2Ids, nameMap);

    team1.gamesPlayed += 1;
    team2.gamesPlayed += 1;

    if (match.winnerTeam === 1) {
      team1.wins += 1;
      team2.losses += 1;
    } else if (match.winnerTeam === 2) {
      team2.wins += 1;
      team1.losses += 1;
    }
  });

  const rows = [...stats.values()].map((team) => ({
    ...team,
    winPct: team.gamesPlayed ? team.wins / team.gamesPlayed : 0
  }));

  rows.sort((a, b) => {
    if (b.winPct !== a.winPct) return b.winPct - a.winPct;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
    return a.name.localeCompare(b.name);
  });

  return rows.map((team, idx) => ({ ...team, rank: idx + 1 }));
}

function getTeamEntry(stats, memberIds, nameMap) {
  const key = teamKey(memberIds);
  if (stats.has(key)) return stats.get(key);
  const names = memberIds
    .map((id) => nameMap.get(id) || "Player")
    .sort((a, b) => a.localeCompare(b));
  const entry = {
    id: key,
    name: names.join(" + "),
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    winPct: 0,
    rank: 0
  };
  stats.set(key, entry);
  return entry;
}

function teamKey(ids) {
  return ids.slice().sort().join("+");
}

watch(session, (next) => {
  if (next?.gameType !== "doubles") {
    rankMode.value = "players";
  }
});

onMounted(load);

watch(selectedSessionId, load);
</script>
