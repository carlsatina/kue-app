<template>
  <div class="page-grid with-sidebar">
    <div class="page-main stack">
      <div class="card stack live-surface">
        <div class="section-title">Team Builder</div>
        <div v-if="error" class="notice">{{ error }}</div>
        <div v-if="!session" class="subtitle">No active session.</div>
        <div v-else-if="matchFormat !== 'doubles'" class="subtitle">
          Team builder is available for doubles sessions.
        </div>
        <div v-else class="team-builder stack">
          <div class="team-builder-head">
            <div>
              <div class="subtitle">Build teams</div>
              <div class="subtitle compact">Select 2 players to create a team.</div>
            </div>
            <div class="team-builder-actions">
              <button class="button ghost button-compact" @click="autoPairTeams">Auto Pair</button>
              <button class="button ghost button-compact" @click="clearTeams">Reset</button>
            </div>
          </div>
          <div class="team-builder-grid">
            <div class="team-builder-panel">
              <div class="subtitle compact">Players</div>
              <div class="team-builder-list">
                <button
                  v-for="player in joinedPlayers"
                  :key="player.id"
                  class="team-player"
                  :class="{
                    selected: selectedTeamPlayers.includes(player.id),
                    assigned: assignedPlayerIds.has(player.id)
                  }"
                  :disabled="assignedPlayerIds.has(player.id)"
                  @click="togglePlayerSelection(player.id)"
                >
                  {{ player.name }}
                </button>
              </div>
            </div>
            <div class="team-builder-panel">
              <div class="subtitle compact">Teams</div>
              <div class="team-builder-list">
                <div v-if="teamPreview.length === 0" class="subtitle compact">
                  No teams yet.
                </div>
                <div v-for="(team, idx) in teamPreview" :key="team.id" class="team-card">
                  <div class="team-name">
                    {{ team.name }}
                    <span v-if="team.source === 'auto'" class="team-pill">Auto</span>
                  </div>
                  <button
                    v-if="team.source === 'manual'"
                    class="icon-button danger"
                    @click="removeTeam(idx)"
                    aria-label="Remove team"
                  >
                    <svg viewBox="0 0 24 24" role="img">
                      <path
                        d="M6 7h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm3-3h6l1 2H8l1-2z"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="team-builder-actions">
            <button
              class="button button-compact"
              @click="requestTeamConfirm"
              :disabled="selectedTeamPlayers.length !== 2"
            >
              Create Team
            </button>
            <div class="subtitle compact">
              Selected {{ selectedTeamPlayers.length }}/2
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="page-side stack">
      <div class="card live-surface team-builder-session-card">
        <div class="section-title">Session</div>
        <div v-if="!session" class="subtitle">No active session.</div>
        <div v-else class="stack">
          <div class="kpi">
            <div class="subtitle">Name</div>
            <strong>{{ session.name }}</strong>
          </div>
          <div class="kpi">
            <div class="subtitle">Players</div>
            <strong>{{ joinedPlayers.length }}</strong>
          </div>
          <div class="kpi">
            <div class="subtitle">Manual teams</div>
            <strong>{{ manualTeams.length }}</strong>
          </div>
        </div>
        <router-link class="button button-compact back-bracket-button" to="/tournament">
          Back to Bracket
        </router-link>
      </div>
    </div>
  </div>

  <div v-if="showTeamConfirm" class="modal-backdrop">
    <div class="modal-card">
      <h3>Create Team</h3>
      <div class="subtitle">Confirm this team pairing?</div>
      <div class="team-confirm">
        <strong>{{ selectedTeamNames[0] || "Player 1" }}</strong>
        <span class="team-confirm-plus">+</span>
        <strong>{{ selectedTeamNames[1] || "Player 2" }}</strong>
      </div>
      <div class="grid two">
        <button class="button ghost" @click="closeTeamConfirm">Cancel</button>
        <button class="button" @click="confirmTeamCreate">Create</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { api } from "../api.js";
import { loadManualTeams, saveManualTeams } from "../utils/teamBuilder.js";
import { selectedSessionId, setSelectedSessionId } from "../state/sessionStore.js";

const session = ref(null);
const sessionPlayers = ref([]);
const manualTeams = ref([]);
const selectedTeamPlayers = ref([]);
const showTeamConfirm = ref(false);
const lastTeamConfirmSignature = ref("");
const error = ref("");

const matchFormat = computed(() => session.value?.gameType || "doubles");

const joinedPlayers = computed(() => {
  return sessionPlayers.value
    .filter((sp) => sp.status !== "done")
    .sort((a, b) => new Date(a.checkedInAt) - new Date(b.checkedInAt))
    .map((sp) => ({
      id: sp.player.id,
      name: sp.player.nickname || sp.player.fullName
    }));
});

const assignedPlayerIds = computed(() => {
  const ids = manualTeams.value.flatMap((team) => team.memberIds || []);
  return new Set(ids);
});

const entrants = computed(() => buildTeamEntrants(joinedPlayers.value, manualTeams.value));
const teamPreview = computed(() => entrants.value);

const selectedTeamNames = computed(() => {
  return selectedTeamPlayers.value
    .map((id) => joinedPlayers.value.find((player) => player.id === id))
    .filter(Boolean)
    .map((player) => player.name);
});

async function load() {
  error.value = "";
  try {
    let currentSession = null;
    if (selectedSessionId.value) {
      currentSession = await api.session(selectedSessionId.value);
    } else {
      currentSession = await api.activeSession();
      if (currentSession?.id) setSelectedSessionId(currentSession.id);
    }
    session.value = currentSession;
    if (!currentSession) {
      sessionPlayers.value = [];
      manualTeams.value = [];
      return;
    }
    sessionPlayers.value = await api.sessionPlayers(currentSession.id);
    manualTeams.value = loadManualTeams(currentSession.id);
  } catch (err) {
    error.value = err.message || "Unable to load session";
    session.value = null;
    sessionPlayers.value = [];
    manualTeams.value = [];
  }
}

function togglePlayerSelection(playerId) {
  if (assignedPlayerIds.value.has(playerId)) return;
  if (selectedTeamPlayers.value.includes(playerId)) {
    selectedTeamPlayers.value = selectedTeamPlayers.value.filter((id) => id !== playerId);
    return;
  }
  if (selectedTeamPlayers.value.length >= 2) return;
  selectedTeamPlayers.value = [...selectedTeamPlayers.value, playerId];
}

function createManualTeam() {
  if (selectedTeamPlayers.value.length !== 2) return;
  const selected = selectedTeamPlayers.value
    .map((id) => joinedPlayers.value.find((player) => player.id === id))
    .filter(Boolean);
  if (selected.length !== 2) return;
  const memberIds = selected.map((player) => player.id);
  const name = `${selected[0].name} + ${selected[1].name}`;
  manualTeams.value = [
    ...manualTeams.value,
    buildTeam(memberIds, name, { source: "manual" })
  ];
  selectedTeamPlayers.value = [];
  persistManualTeams();
}

function requestTeamConfirm() {
  if (matchFormat.value !== "doubles") return;
  if (selectedTeamPlayers.value.length !== 2) return;
  showTeamConfirm.value = true;
}

function closeTeamConfirm() {
  showTeamConfirm.value = false;
  lastTeamConfirmSignature.value = selectedTeamPlayers.value.join("|");
}

function confirmTeamCreate() {
  createManualTeam();
  showTeamConfirm.value = false;
  lastTeamConfirmSignature.value = "";
}

function removeTeam(index) {
  const teamToRemove = teamPreview.value[index];
  if (!teamToRemove || teamToRemove.source !== "manual") return;
  manualTeams.value = manualTeams.value.filter((team) => team.id !== teamToRemove.id);
  persistManualTeams();
}

function clearTeams() {
  manualTeams.value = [];
  selectedTeamPlayers.value = [];
  persistManualTeams();
}

function autoPairTeams() {
  manualTeams.value = buildTeamEntrants(joinedPlayers.value, []).map((team) => ({
    ...team,
    source: "manual"
  }));
  selectedTeamPlayers.value = [];
  persistManualTeams();
}

function buildTeamEntrants(players, customTeams) {
  const teams = [];
  const normalizedCustom = customTeams.map((team) => ({
    ...team,
    source: team.source || "manual"
  }));
  const assigned = new Set(normalizedCustom.flatMap((team) => team.memberIds || []));
  if (normalizedCustom.length) {
    teams.push(...normalizedCustom);
  }
  const remaining = players.filter((player) => !assigned.has(player.id));
  for (let i = 0; i < remaining.length; i += 2) {
    const first = remaining[i];
    const second = remaining[i + 1];
    if (!first) break;
    if (second) {
      const memberIds = [first.id, second.id];
      teams.push(buildTeam(memberIds, `${first.name} + ${second.name}`, { source: "auto" }));
    } else {
      const memberIds = [first.id];
      teams.push(
        buildTeam(memberIds, `${first.name} + BYE`, {
          disabled: true,
          source: "auto",
          teamKeyOverride: teamKey([first.id, `bye-${first.id}`])
        })
      );
    }
  }
  return teams;
}

function buildTeam(memberIds, name, options = {}) {
  return {
    id: options.teamKeyOverride || teamKey(memberIds),
    name,
    memberIds,
    disabled: Boolean(options.disabled),
    source: options.source
  };
}

function teamKey(ids) {
  return ids.slice().sort().join("+");
}

function persistManualTeams() {
  if (!session.value?.id) return;
  saveManualTeams(session.value.id, manualTeams.value);
}

watch(
  () => selectedTeamPlayers.value.join("|"),
  (signature) => {
    if (matchFormat.value !== "doubles") return;
    if (selectedTeamPlayers.value.length !== 2) return;
    if (showTeamConfirm.value) return;
    if (signature && signature !== lastTeamConfirmSignature.value) {
      showTeamConfirm.value = true;
    }
  }
);

watch(joinedPlayers, (players) => {
  const valid = new Set(players.map((player) => player.id));
  manualTeams.value = manualTeams.value.filter((team) =>
    (team.memberIds || []).every((id) => valid.has(id))
  );
  selectedTeamPlayers.value = selectedTeamPlayers.value.filter((id) => valid.has(id));
});

watch(
  () => manualTeams.value,
  (teams) => {
    if (!session.value?.id) return;
    saveManualTeams(session.value.id, teams);
  },
  { deep: true }
);

onMounted(load);

watch(selectedSessionId, load);
</script>
