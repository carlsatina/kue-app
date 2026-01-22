<template>
  <div class="stack">
    <div class="card stack">
      <div class="kpi">
        <div>
          <div class="subtitle">Active Session</div>
          <strong>{{ session?.name || "None" }}</strong>
        </div>
        <span class="badge" :class="session?.status === 'open' ? '' : 'neutral'">
          {{ session?.status || 'closed' }}
        </span>
      </div>
      <div v-if="!session" class="stack">
        <input class="input" v-model="newSessionName" placeholder="Session name" />
        <div class="grid two">
          <input class="input" v-model.number="feeAmount" type="number" placeholder="Fee amount" />
          <select class="input" v-model="feeMode">
            <option value="flat">Flat fee</option>
            <option value="per_game">Per game</option>
          </select>
        </div>
        <button class="button" @click="createSession">Create Session</button>
      </div>
      <div v-else class="grid two">
        <button class="button" @click="refresh">Refresh</button>
        <button v-if="session.status !== 'open'" class="button secondary" @click="openSession">Open</button>
        <button v-else class="button ghost" @click="closeSession">Close Session</button>
      </div>
    </div>

    <div class="card">
      <div class="kpi" style="margin-bottom: 8px;">
        <div class="section-title">Courts</div>
        <button class="button ghost" @click="showAddCourt = true">Add Court</button>
      </div>
      <div class="grid two">
        <div v-for="court in courts" :key="court.id" class="card court-card">
          <div class="kpi">
            <div class="court-title">
              <strong class="court-name">{{ court.court?.name || court.name }}</strong>
              <button class="icon-button" @click="openEditCourt(court)" aria-label="Edit court">
                <svg viewBox="0 0 24 24" role="img">
                  <path d="M4 15.5V20h4.5L19 9.5 14.5 5 4 15.5z"></path>
                </svg>
              </button>
              <button class="icon-button danger" @click="deleteCourt(court)" aria-label="Delete court">
                <svg viewBox="0 0 24 24" role="img">
                  <path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm3-3h6l1 2H8l1-2z"></path>
                </svg>
              </button>
            </div>
            <span class="badge" :class="court.status === 'maintenance' ? 'warning' : ''">
              {{ court.status || 'available' }}
            </span>
          </div>
          <div v-if="court.status === 'available'" class="inline-actions">
            <button class="button ghost button-compact" @click="goToPlayers">Add Player</button>
          </div>
          <template v-else>
            <div class="subtitle">Now Playing:</div>
            <div v-if="court.currentMatch" class="pill-row">
              <span class="pill team-a">{{ teamNames(court.currentMatch, 1) }}</span>
              <span class="pill team-b">{{ teamNames(court.currentMatch, 2) }}</span>
            </div>
            <div v-else class="subtitle">Open</div>
            <div v-if="court.currentMatch" class="time-row">
              <span class="subtitle">Started: {{ formatTime(court.currentMatch.startedAt) }}</span>
              <span class="subtitle">Elapsed: {{ elapsedTime(court.currentMatch.startedAt) }}</span>
            </div>
            <div class="inline-actions">
              <button class="button ghost button-compact danger" @click="cancelMatch(court)" :disabled="!court.currentMatchId">
                Cancel Match
              </button>
              <button class="button button-compact" @click="openEndMatch(court)" :disabled="!court.currentMatchId">
                Complete Match
              </button>
            </div>
          </template>
        </div>
      </div>
      <div v-if="error" class="notice" style="margin-top:12px;">{{ error }}</div>
    </div>
  </div>
  <div v-if="showAddCourt" class="modal-backdrop">
    <div class="modal-card">
      <h3>Add Court</h3>
      <input class="input" v-model="newCourtName" placeholder="Court name" />
      <input class="input" v-model="newCourtNotes" placeholder="Notes (optional)" />
      <div v-if="addCourtError" class="notice">{{ addCourtError }}</div>
      <div class="grid two">
        <button class="button" @click="createCourt">Create</button>
        <button class="button ghost" @click="closeAddCourt">Cancel</button>
      </div>
    </div>
  </div>
  <div v-if="showEditCourt" class="modal-backdrop">
    <div class="modal-card">
      <h3>Edit Court</h3>
      <input class="input" v-model="editCourtName" placeholder="Court name" />
      <input class="input" v-model="editCourtNotes" placeholder="Notes (optional)" />
      <div v-if="editCourtError" class="notice">{{ editCourtError }}</div>
      <div class="grid two">
        <button class="button" @click="updateCourt">Save</button>
        <button class="button ghost" @click="closeEditCourt">Cancel</button>
      </div>
    </div>
  </div>
  <div v-if="showDeleteCourt" class="modal-backdrop">
    <div class="modal-card">
      <h3>Delete Court</h3>
      <div class="subtitle">
        Are you sure you want to delete <strong>{{ deleteCourtName }}</strong>?
      </div>
      <div v-if="deleteCourtError" class="notice">{{ deleteCourtError }}</div>
      <div class="grid two">
        <button class="button ghost" @click="closeDeleteCourt">Cancel</button>
        <button class="button danger button-compact" @click="confirmDeleteCourt">Delete</button>
      </div>
    </div>
  </div>
  <div v-if="showEndMatch" class="modal-backdrop">
    <div class="modal-card match-modal">
      <div class="match-modal-head">
        <div>
          <div class="subtitle">Finish the game</div>
          <h3>Complete Match</h3>
        </div>
        <span class="match-burst">🏸</span>
      </div>
      <div class="subtitle">Select the winner or mark as draw.</div>
      <div v-if="endMatchError" class="notice">{{ endMatchError }}</div>
      <div class="winner-grid">
        <div class="winner-card team-a">
          <div class="subtitle">Team A</div>
          <strong>{{ endMatchTeams.teamA }}</strong>
          <button class="button button-compact" @click="setWinner(1)">Team A Wins</button>
        </div>
        <div class="winner-card team-b">
          <div class="subtitle">Team B</div>
          <strong>{{ endMatchTeams.teamB }}</strong>
          <button class="button button-compact secondary" @click="setWinner(2)">Team B Wins</button>
        </div>
      </div>
      <div class="grid two">
        <button class="button ghost" @click="setWinner(null)">Draw</button>
        <button class="button ghost" @click="closeEndMatch">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { api } from "../api.js";
import { useRouter } from "vue-router";

const session = ref(null);
const courts = ref([]);
const error = ref("");
const newSessionName = ref("Evening Open Play");
const feeMode = ref("flat");
const feeAmount = ref(100);
const showAddCourt = ref(false);
const newCourtName = ref("");
const newCourtNotes = ref("");
const addCourtError = ref("");
const nowTick = ref(Date.now());
let timerId = null;
const showEditCourt = ref(false);
const editCourtId = ref("");
const editCourtName = ref("");
const editCourtNotes = ref("");
const editCourtError = ref("");
const router = useRouter();
const showDeleteCourt = ref(false);
const deleteCourtId = ref("");
const deleteCourtName = ref("");
const deleteCourtError = ref("");
const showEndMatch = ref(false);
const endMatchCourt = ref(null);
const endMatchError = ref("");
const endMatchTeams = ref({ teamA: "—", teamB: "—" });

async function refresh() {
  try {
    const sessionData = await api.activeSession();
    let courtSessions = sessionData.courtSessions || [];

    const missingMatches = courtSessions.filter(
      (cs) => cs.currentMatchId && !cs.currentMatch
    );
    if (missingMatches.length) {
      const fetched = await Promise.all(
        missingMatches.map((cs) => api.getMatch(cs.currentMatchId))
      );
      const matchMap = new Map(fetched.map((m) => [m.id, m]));
      courtSessions = courtSessions.map((cs) =>
        cs.currentMatch
          ? cs
          : { ...cs, currentMatch: matchMap.get(cs.currentMatchId) || null }
      );
    }

    session.value = { ...sessionData, courtSessions };
    courts.value = courtSessions;
  } catch {
    session.value = null;
    courts.value = [];
  }
}

async function createSession() {
  const created = await api.createSession({
    name: newSessionName.value,
    feeMode: feeMode.value,
    feeAmount: Number(feeAmount.value)
  });
  session.value = created;
}

async function openSession() {
  if (!session.value) return;
  await api.openSession(session.value.id);
  await refresh();
}

async function closeSession() {
  if (!session.value) return;
  await api.closeSession(session.value.id);
  await refresh();
}

function openEndMatch(courtSession) {
  if (!session.value || !courtSession.currentMatchId) return;
  endMatchCourt.value = courtSession;
  endMatchError.value = "";
  const teamA = teamNames(courtSession.currentMatch, 1) || "—";
  const teamB = teamNames(courtSession.currentMatch, 2) || "—";
  endMatchTeams.value = { teamA, teamB };
  showEndMatch.value = true;
}

async function setWinner(winnerTeam) {
  if (!session.value || !endMatchCourt.value?.currentMatchId) return;
  try {
    const payload = { matchId: endMatchCourt.value.currentMatchId };
    if (winnerTeam) payload.winnerTeam = winnerTeam;
    await api.endMatch(session.value.id, payload);
    closeEndMatch();
    await refresh();
  } catch (err) {
    endMatchError.value = err.message || "Unable to end match";
  }
}

async function cancelMatch(courtSession) {
  if (!session.value || !courtSession.currentMatchId) return;
  error.value = "";
  try {
    await api.cancelMatch(session.value.id, { matchId: courtSession.currentMatchId });
    await refresh();
  } catch (err) {
    error.value = err.message || "Unable to cancel match";
  }
}

function teamNames(match, teamNumber) {
  if (!match) return "";
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

async function createCourt() {
  addCourtError.value = "";
  if (!newCourtName.value.trim()) {
    addCourtError.value = "Court name is required.";
    return;
  }
  try {
    await api.createCourt({ name: newCourtName.value.trim(), notes: newCourtNotes.value.trim() });
    closeAddCourt();
    await refresh();
  } catch (err) {
    addCourtError.value = err.message || "Unable to create court";
  }
}

function closeAddCourt() {
  showAddCourt.value = false;
  newCourtName.value = "";
  newCourtNotes.value = "";
  addCourtError.value = "";
}

function closeEndMatch() {
  showEndMatch.value = false;
  endMatchCourt.value = null;
  endMatchError.value = "";
  endMatchTeams.value = { teamA: "—", teamB: "—" };
}

function goToPlayers() {
  router.push("/players");
}

function openEditCourt(courtSession) {
  const name = courtSession.court?.name || courtSession.name || "";
  editCourtId.value = courtSession.courtId || courtSession.court?.id || courtSession.id;
  editCourtName.value = name;
  editCourtNotes.value = courtSession.court?.notes || courtSession.notes || "";
  editCourtError.value = "";
  showEditCourt.value = true;
}

async function updateCourt() {
  if (!editCourtId.value) return;
  if (!editCourtName.value.trim()) {
    editCourtError.value = "Court name is required.";
    return;
  }
  try {
    await api.updateCourt(editCourtId.value, {
      name: editCourtName.value.trim(),
      notes: editCourtNotes.value.trim()
    });
    closeEditCourt();
    await refresh();
  } catch (err) {
    editCourtError.value = err.message || "Unable to update court";
  }
}

function closeEditCourt() {
  showEditCourt.value = false;
  editCourtId.value = "";
  editCourtName.value = "";
  editCourtNotes.value = "";
  editCourtError.value = "";
}

async function deleteCourt(courtSession) {
  const courtId = courtSession.courtId || courtSession.court?.id || courtSession.id;
  if (!courtId) return;
  deleteCourtId.value = courtId;
  deleteCourtName.value = courtSession.court?.name || courtSession.name || "this court";
  deleteCourtError.value = "";
  showDeleteCourt.value = true;
}

async function confirmDeleteCourt() {
  if (!deleteCourtId.value) return;
  try {
    await api.deleteCourt(deleteCourtId.value);
    closeDeleteCourt();
    await refresh();
  } catch (err) {
    deleteCourtError.value = err.message || "Unable to delete court";
  }
}

function closeDeleteCourt() {
  showDeleteCourt.value = false;
  deleteCourtId.value = "";
  deleteCourtName.value = "";
  deleteCourtError.value = "";
}

onMounted(() => {
  refresh();
  timerId = setInterval(() => {
    nowTick.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (timerId) clearInterval(timerId);
});
</script>
