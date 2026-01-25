<template>
  <div class="page-grid with-sidebar">
    <div class="page-main stack">
      <div class="card stack session-compact">
        <div class="kpi">
          <div>
            <div class="subtitle">Active Session</div>
            <strong>{{ session?.name || "None" }}</strong>
          </div>
          <span class="badge" :class="session?.status === 'open' ? '' : 'neutral'">
            {{ session?.status || 'closed' }}
          </span>
        </div>
        <div v-if="!session" class="subtitle">No session selected.</div>
        <div class="session-actions">
          <button class="button button-compact" @click="openCreateSession">Add Session</button>
          <button
            v-if="session"
            class="button ghost button-compact"
            @click="openEditSession"
          >
            Edit Session
          </button>
          <button
            v-if="session && session.status !== 'open'"
            class="button secondary button-compact"
            @click="openSession"
          >
            Open
          </button>
          <button v-if="session && session.status === 'open'" class="button ghost button-compact" @click="closeSession">
            Close Session
          </button>
        </div>
      </div>

      <div class="card live-surface">
        <div class="kpi" style="margin-bottom: 8px;">
          <div class="section-title">Courts</div>
          <div class="inline-actions">
            <button class="button button-compact join-link-button" @click="createInviteLink">
              Create Join Link
            </button>
            <button class="button ghost" @click="showAddCourt = true">Add Court</button>
          </div>
        </div>
        <div v-if="courts.length" class="grid courts-grid">
          <div
            v-for="court in courts"
            :key="court.id"
            class="card court-card"
            :class="{ playing: court.currentMatchId }"
          >
            <div class="court-head">
              <div class="court-title">
                <strong class="court-name">{{ court.court?.name || court.name }}</strong>
                <div class="court-head-actions">
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
              </div>
              <span class="badge court-status" :class="courtStatusClass(court)">
                {{ courtStatusLabel(court.status) }}
              </span>
            </div>

            <div class="court-meta">
              <div class="court-meta-block">
                <div class="subtitle">Start</div>
                <strong>{{ formatTime(court.currentMatch?.startedAt) }}</strong>
              </div>
              <div class="court-meta-block">
                <div class="subtitle">Elapsed</div>
                <strong>{{ elapsedTime(court.currentMatch?.startedAt) }}</strong>
              </div>
            </div>

            <div class="court-players">
              <div class="subtitle">Players</div>
              <div v-if="court.currentMatch" class="pill-row court-pill-row">
                <span class="pill team-a">{{ teamNames(court.currentMatch, 1) || "—" }}</span>
                <span class="court-vs">vs</span>
                <span class="pill team-b">{{ teamNames(court.currentMatch, 2) || "—" }}</span>
              </div>
              <div v-else class="subtitle muted">No match yet</div>
            </div>

            <div class="court-actions-row">
              <button
                v-if="court.status === 'available'"
                class="button ghost button-compact"
                @click="goToPlayers"
              >
                Add Player
              </button>
              <div v-else class="court-match-actions">
                <button
                  class="button ghost button-compact danger"
                  @click="cancelMatch(court)"
                  :disabled="!court.currentMatchId"
                >
                  Cancel Match
                </button>
                <button
                  class="button button-compact"
                  @click="openEndMatch(court)"
                  :disabled="!court.currentMatchId"
                >
                  Complete Match
                </button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="subtitle">No courts available.</div>
        <div v-if="error" class="notice" style="margin-top:12px;">{{ error }}</div>
      </div>
    </div>

    <div class="page-side stack">
      <div class="card">
      <button class="collapse-head" @click="togglePastSessions" type="button">
        <span class="section-title">Past Sessions</span>
        <span class="collapse-meta">
          {{ pastSessions.length }} total
          <span class="collapse-chevron" :class="{ open: showPastSessions }">▾</span>
        </span>
      </button>
      <div v-if="showPastSessions" class="collapse-body">
        <div v-if="pastSessions.length === 0" class="subtitle">No closed sessions yet.</div>
        <div v-for="s in pastSessions" :key="s.id" class="past-session-item">
          <div class="past-session-row">
            <div>
              <div class="past-session-name">{{ s.name }}</div>
              <div class="subtitle">Closed: {{ formatDateTime(s.closedAt) }}</div>
            </div>
            <span class="badge neutral">{{ s.status }}</span>
          </div>
          <div class="past-session-actions">
            <button class="button ghost button-compact" @click="viewRoster(s)">View Roster</button>
            <button class="button button-compact" @click="reopenSession(s)">Reopen</button>
            <button class="button ghost danger button-compact" @click="openDeleteSession(s)">Delete</button>
          </div>
        </div>
      </div>
      </div>
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
    <div class="modal-card match-modal compact">
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
          <div class="winner-row">
            <div class="winner-info">
              <div class="subtitle">Team A</div>
              <strong>{{ endMatchTeams.teamA }}</strong>
            </div>
            <input
              class="input winner-score-input"
              type="number"
              min="0"
              v-model="endMatchScoreA"
              placeholder="Score"
            />
          </div>
          <button class="button button-compact" @click="setWinner(1)">Team A Wins</button>
        </div>
        <div class="winner-card team-b">
          <div class="winner-row">
            <div class="winner-info">
              <div class="subtitle">Team B</div>
              <strong>{{ endMatchTeams.teamB }}</strong>
            </div>
            <input
              class="input winner-score-input"
              type="number"
              min="0"
              v-model="endMatchScoreB"
              placeholder="Score"
            />
          </div>
          <button class="button button-compact secondary" @click="setWinner(2)">Team B Wins</button>
        </div>
      </div>
      <div class="match-modal-actions">
        <button class="button ghost button-compact draw-button" @click="setWinner(null)">Draw</button>
        <button class="button ghost button-compact" @click="closeEndMatch">Cancel</button>
      </div>
    </div>
  </div>
  <div v-if="showEditFee" class="modal-backdrop">
    <div class="modal-card">
      <h3>Edit Session Fee</h3>
      <div class="subtitle">{{ session?.name }}</div>
      <div class="field">
        <label class="field-label">Fee amount</label>
        <input class="input" v-model.number="editFeeAmount" type="number" min="0" />
      </div>
      <div v-if="editFeeError" class="notice">{{ editFeeError }}</div>
      <div class="grid two">
        <button class="button" @click="saveEditFee">Save</button>
        <button class="button ghost" @click="closeEditFee">Cancel</button>
      </div>
    </div>
  </div>
  <div v-if="showInviteLink" class="modal-backdrop">
    <div class="modal-card">
      <h3>Session Join Link</h3>
      <div class="subtitle">Share this link so players can register.</div>
      <div class="share-link">
        <input class="input" readonly :value="inviteLink" />
        <button class="button ghost button-compact" :class="{ active: inviteCopied }" @click="copyInviteLink">
          {{ inviteCopied ? "Copied" : "Copy" }}
        </button>
      </div>
      <button class="button ghost" @click="closeInviteLink">Close</button>
    </div>
  </div>
  <div v-if="showInviteWarning" class="modal-backdrop">
    <div class="modal-card">
      <h3>Session needed</h3>
      <div class="subtitle">Create and open a session before generating a join link.</div>
      <button class="button" @click="closeInviteWarning">OK</button>
    </div>
  </div>
  <div v-if="showRoster" class="modal-backdrop">
    <div class="modal-card">
      <h3>Session Roster</h3>
      <div class="subtitle">{{ rosterSession?.name }}</div>
      <div v-if="rosterPlayers.length === 0" class="subtitle">No players recorded.</div>
      <div v-else class="roster-list">
        <div v-for="sp in rosterPlayers" :key="sp.id" class="roster-item">
          <div class="roster-name">{{ sp.player.nickname || sp.player.fullName }}</div>
          <span class="badge neutral">{{ sp.status }}</span>
          <div class="roster-meta">GP {{ sp.gamesPlayed }}</div>
        </div>
      </div>
      <button class="button ghost" @click="closeRoster">Close</button>
    </div>
  </div>
  <div v-if="showDeleteSession" class="modal-backdrop">
    <div class="modal-card">
      <h3>Delete Session</h3>
      <div class="subtitle">
        Permanently delete <strong>{{ deleteSessionTarget?.name }}</strong> and its data?
      </div>
      <div v-if="deleteSessionError" class="notice">{{ deleteSessionError }}</div>
      <div class="grid two">
        <button class="button ghost" @click="closeDeleteSession">Cancel</button>
        <button class="button danger button-compact" @click="confirmDeleteSession">Delete</button>
      </div>
    </div>
  </div>
  <div v-if="showCreateSession" class="modal-backdrop">
    <div class="modal-card session-create">
      <h3>Create Session</h3>
      <div class="field">
        <label class="field-label">Session name</label>
        <input class="input" v-model="newSessionName" />
      </div>
      <div class="field">
        <label class="field-label">Game type</label>
        <select class="input" v-model="newGameType">
          <option value="doubles">Doubles</option>
          <option value="singles">Singles</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label">Fee amount</label>
        <input class="input" v-model.number="feeAmount" type="number" min="0" />
      </div>
      <div class="join-limits-row">
        <div class="field field-inline">
          <label class="field-label">Regular</label>
          <input class="input" type="number" min="0" v-model.number="regularJoinLimit" />
        </div>
        <div class="field field-inline">
          <label class="field-label">New joiner</label>
          <input class="input" type="number" min="0" v-model.number="newJoinerLimit" />
        </div>
      </div>
      <div v-if="createError" class="notice">{{ createError }}</div>
      <div class="grid two">
        <button class="button ghost" @click="closeCreateSession">Cancel</button>
        <button class="button" @click="createSession">Create Session</button>
      </div>
    </div>
  </div>
  <div v-if="showEditSession" class="modal-backdrop">
    <div class="modal-card session-create">
      <h3>Edit Session</h3>
      <div class="field">
        <label class="field-label">Session name</label>
        <input class="input" v-model="editSessionName" />
      </div>
      <div class="field">
        <label class="field-label">Game type</label>
        <select class="input" v-model="editGameType">
          <option value="doubles">Doubles</option>
          <option value="singles">Singles</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label">Fee amount</label>
        <input class="input" v-model.number="editSessionFeeAmount" type="number" min="0" />
      </div>
      <div class="join-limits-row">
        <div class="field field-inline">
          <label class="field-label">Regular</label>
          <input class="input" type="number" min="0" v-model.number="editRegularJoinLimit" />
        </div>
        <div class="field field-inline">
          <label class="field-label">New joiner</label>
          <input class="input" type="number" min="0" v-model.number="editNewJoinerLimit" />
        </div>
      </div>
      <div v-if="editSessionError" class="notice">{{ editSessionError }}</div>
      <div class="grid two">
        <button class="button ghost" @click="closeEditSession">Cancel</button>
        <button class="button" @click="saveEditSession">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from "vue";
import { api } from "../api.js";
import { useRouter } from "vue-router";
import { selectedSessionId, setPendingSessionId, setSelectedSessionId } from "../state/sessionStore.js";

const session = ref(null);
const courts = ref([]);
const error = ref("");
const newSessionName = ref("Evening Open Play");
const newGameType = ref("doubles");
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
const endMatchScoreA = ref("");
const endMatchScoreB = ref("");
const showInviteLink = ref(false);
const inviteLink = ref("");
const pastSessions = ref([]);
const showRoster = ref(false);
const rosterPlayers = ref([]);
const rosterSession = ref(null);
const showPastSessions = ref(false);
const showEditFee = ref(false);
const editFeeAmount = ref(0);
const editFeeError = ref("");
const regularJoinLimit = ref(0);
const newJoinerLimit = ref(0);
const showInviteWarning = ref(false);
const inviteCopied = ref(false);
let inviteCopyTimer = null;
const showDeleteSession = ref(false);
const deleteSessionTarget = ref(null);
const deleteSessionError = ref("");
const showCreateSession = ref(false);
const createError = ref("");
const showEditSession = ref(false);
const editSessionName = ref("");
const editGameType = ref("doubles");
const editSessionFeeAmount = ref(0);
const editRegularJoinLimit = ref(0);
const editNewJoinerLimit = ref(0);
const editSessionError = ref("");

async function refresh() {
  try {
    let sessionData = null;
    if (selectedSessionId.value) {
      try {
        sessionData = await api.session(selectedSessionId.value);
      } catch {
        setSelectedSessionId("");
      }
    }
    if (!sessionData) {
      sessionData = await api.activeSession();
      if (sessionData?.id) setSelectedSessionId(sessionData.id);
    }
    if (!sessionData) {
      session.value = null;
      courts.value = [];
      await loadPastSessions();
      regularJoinLimit.value = 0;
      newJoinerLimit.value = 0;
      return;
    }
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

    const sortedCourts = [...courtSessions].sort((a, b) =>
      courtSortName(a).localeCompare(courtSortName(b), undefined, { numeric: true, sensitivity: "base" })
    );
    session.value = { ...sessionData, courtSessions: sortedCourts };
    courts.value = sortedCourts;
    await loadPastSessions();
  } catch {
    session.value = null;
    courts.value = [];
    await loadPastSessions();
    regularJoinLimit.value = 0;
    newJoinerLimit.value = 0;
  } finally {
    window.dispatchEvent(new Event("sessions:updated"));
  }
}

async function loadPastSessions() {
  try {
    const sessions = await api.listSessions();
    pastSessions.value = (sessions || [])
      .filter((s) => s.status !== "open")
      .sort((a, b) => {
        const aTime = new Date(a.closedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.closedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      });
  } catch {
    pastSessions.value = [];
  }
}

function togglePastSessions() {
  showPastSessions.value = !showPastSessions.value;
}

function openDeleteSession(target) {
  deleteSessionTarget.value = target;
  deleteSessionError.value = "";
  showDeleteSession.value = true;
}

function closeDeleteSession() {
  showDeleteSession.value = false;
  deleteSessionTarget.value = null;
  deleteSessionError.value = "";
}

async function confirmDeleteSession() {
  if (!deleteSessionTarget.value) return;
  deleteSessionError.value = "";
  try {
    await api.deleteSession(deleteSessionTarget.value.id);
    closeDeleteSession();
    await refresh();
  } catch (err) {
    deleteSessionError.value = err.message || "Unable to delete session";
  }
}

function openEditFee() {
  if (!session.value || session.value.status !== "open") return;
  editFeeAmount.value = Number(session.value.feeAmount || 0);
  editFeeError.value = "";
  showEditFee.value = true;
}

function closeEditFee() {
  showEditFee.value = false;
  editFeeError.value = "";
}

async function saveEditFee() {
  if (!session.value || session.value.status !== "open") return;
  editFeeError.value = "";
  try {
    await api.updateSessionFee(session.value.id, {
      feeMode: "flat",
      feeAmount: Number(editFeeAmount.value)
    });
    showEditFee.value = false;
    await refresh();
  } catch (err) {
    editFeeError.value = err.message || "Unable to update fee";
  }
}

async function createSession() {
  createError.value = "";
  try {
    const created = await api.createSession({
      name: newSessionName.value,
      gameType: newGameType.value,
      feeMode: "flat",
      feeAmount: Number(feeAmount.value),
      regularJoinLimit: Math.max(0, Number(regularJoinLimit.value) || 0),
      newJoinerLimit: Math.max(0, Number(newJoinerLimit.value) || 0)
    });
    await api.openSession(created.id);
    setPendingSessionId(created.id);
    setSelectedSessionId(created.id);
    await refresh();
    showCreateSession.value = false;
  } catch (err) {
    createError.value = err.message || "Unable to create session";
  }
}

function openCreateSession() {
  createError.value = "";
  showCreateSession.value = true;
}

function closeCreateSession() {
  showCreateSession.value = false;
  createError.value = "";
}

function openEditSession() {
  if (!session.value) return;
  editSessionError.value = "";
  editSessionName.value = session.value.name || "";
  editGameType.value = session.value.gameType || "doubles";
  editSessionFeeAmount.value = Number(session.value.feeAmount || 0);
  editRegularJoinLimit.value = Number(session.value.regularJoinLimit || 0);
  editNewJoinerLimit.value = Number(session.value.newJoinerLimit || 0);
  showEditSession.value = true;
}

function closeEditSession() {
  showEditSession.value = false;
  editSessionError.value = "";
}

async function saveEditSession() {
  if (!session.value) return;
  editSessionError.value = "";
  try {
    await api.updateSession(session.value.id, {
      name: editSessionName.value,
      gameType: editGameType.value,
      feeAmount: Number(editSessionFeeAmount.value || 0),
      regularJoinLimit: Math.max(0, Number(editRegularJoinLimit.value) || 0),
      newJoinerLimit: Math.max(0, Number(editNewJoinerLimit.value) || 0)
    });
    showEditSession.value = false;
    await refresh();
  } catch (err) {
    editSessionError.value = err.message || "Unable to update session";
  }
}

async function openSession() {
  if (!session.value) return;
  try {
    await api.openSession(session.value.id);
    await refresh();
  } catch (err) {
    error.value = err.message || "Unable to open session";
  }
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
  endMatchScoreA.value = "";
  endMatchScoreB.value = "";
  showEndMatch.value = true;
}

async function setWinner(winnerTeam) {
  if (!session.value || !endMatchCourt.value?.currentMatchId) return;
  try {
    const payload = { matchId: endMatchCourt.value.currentMatchId };
    if (winnerTeam) payload.winnerTeam = winnerTeam;
    const scoreA = parseScoreValue(endMatchScoreA.value);
    const scoreB = parseScoreValue(endMatchScoreB.value);
    if (scoreA != null || scoreB != null) {
      const score = {};
      if (scoreA != null) score.team1 = scoreA;
      if (scoreB != null) score.team2 = scoreB;
      payload.score = score;
    }
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

function courtStatusLabel(status) {
  if (status === "in_match") return "Occupied";
  if (status === "maintenance") return "Maintenance";
  if (status === "available") return "Available";
  return status || "—";
}

function courtStatusClass(court) {
  if (court.status === "maintenance") return "warning";
  if (court.currentMatchId || court.status === "in_match" || court.status === "occupied") return "live";
  return "";
}

function courtSortName(courtSession) {
  return (courtSession?.court?.name || courtSession?.name || "").trim();
}

function formatDateTime(timestamp) {
  if (!timestamp) return "—";
  const dt = new Date(timestamp);
  return dt.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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

async function createInviteLink() {
  if (!session.value) {
    showInviteWarning.value = true;
    return;
  }
  const link = await api.createSessionInviteLink(session.value.id);
  inviteLink.value = `${window.location.origin}/join/${link.token}`;
  showInviteLink.value = true;
}

async function copyInviteLink() {
  if (!inviteLink.value) return;
  await navigator.clipboard.writeText(inviteLink.value);
  inviteCopied.value = true;
  if (inviteCopyTimer) window.clearTimeout(inviteCopyTimer);
  inviteCopyTimer = window.setTimeout(() => {
    inviteCopied.value = false;
  }, 1500);
}

function closeInviteLink() {
  showInviteLink.value = false;
  inviteLink.value = "";
  inviteCopied.value = false;
}

function closeInviteWarning() {
  showInviteWarning.value = false;
}

async function viewRoster(sessionItem) {
  rosterSession.value = sessionItem;
  rosterPlayers.value = await api.sessionPlayers(sessionItem.id);
  showRoster.value = true;
}

function closeRoster() {
  showRoster.value = false;
  rosterPlayers.value = [];
  rosterSession.value = null;
}

async function reopenSession(sessionItem) {
  try {
    await api.openSession(sessionItem.id);
    await refresh();
  } catch (err) {
    error.value = err.message || "Unable to reopen session";
  }
}

function closeEndMatch() {
  showEndMatch.value = false;
  endMatchCourt.value = null;
  endMatchError.value = "";
  endMatchTeams.value = { teamA: "—", teamB: "—" };
  endMatchScoreA.value = "";
  endMatchScoreB.value = "";
}

function parseScoreValue(value) {
  if (value === "" || value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
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

watch(selectedSessionId, () => {
  refresh();
});
</script>
