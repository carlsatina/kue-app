<template>
  <div class="page-grid with-sidebar">
    <div class="page-main stack">
      <div class="card live-surface">
        <div class="section-title">Balances</div>
        <div v-if="error" class="notice">{{ error }}</div>
        <div v-if="!session && !error" class="subtitle">No active session.</div>
        <div v-for="b in balances" :key="b.playerId" class="card">
          <div class="kpi">
            <strong class="fee-player-name">{{ b.player.nickname || b.player.fullName }}</strong>
            <button
              class="pill-button"
              :class="b.remaining > 0 ? 'warn' : 'paid'"
              @click="openPayment(b)"
              :disabled="b.remaining <= 0"
            >
              {{
                b.remaining > 0
                  ? 'Set Paid'
                  : b.method
                  ? `Paid via ${formatMethod(b.method)}`
                  : 'Paid'
              }}
            </button>
          </div>
          <div class="subtitle">Due: {{ b.due }}</div>
        </div>
      </div>
    </div>

    <div class="page-side stack">
      <div class="card live-surface">
        <div class="section-title">Summary</div>
        <div v-if="!session" class="subtitle">No active session.</div>
        <div v-else class="stack">
          <div class="kpi">
            <div class="subtitle">Players</div>
            <strong>{{ balances.length }}</strong>
          </div>
          <div class="kpi">
            <div class="subtitle">Outstanding</div>
            <strong>{{ formatAmount(totalDue) }}</strong>
          </div>
          <button
            v-if="session.status === 'open'"
            class="button button-compact fee-edit-button"
            @click="openEditFee"
          >
            Edit Fee
          </button>
        </div>
        <div v-if="error" class="notice">{{ error }}</div>
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
  <div v-if="showPayment" class="modal-backdrop">
    <div class="modal-card">
      <h3>Record Payment</h3>
      <div class="subtitle">{{ paymentTarget?.player?.nickname || paymentTarget?.player?.fullName }}</div>
      <div class="subtitle">Remaining: {{ paymentTarget?.remaining }}</div>
      <div class="grid two">
        <button class="button" @click="record('cash')">Cash</button>
        <button class="button secondary" @click="record('e-wallet')">E‑wallet</button>
      </div>
      <button class="button ghost" @click="closePayment">Cancel</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { api } from "../api.js";
import { selectedSessionId, setSelectedSessionId } from "../state/sessionStore.js";

const balances = ref([]);
const session = ref(null);
const error = ref("");
const showPayment = ref(false);
const paymentTarget = ref(null);
const showEditFee = ref(false);
const editFeeAmount = ref(0);
const editFeeError = ref("");
const totalDue = computed(() =>
  balances.value.reduce((sum, balance) => sum + Number(balance.remaining || 0), 0)
);

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
      balances.value = [];
      return;
    }
    session.value = currentSession;
    const data = await api.balances(session.value.id);
    balances.value = data.balances || [];
  } catch (err) {
    error.value = err.message || "No active session";
    balances.value = [];
  }
}

function openPayment(balance) {
  if (!session.value || balance.remaining <= 0) return;
  paymentTarget.value = balance;
  showPayment.value = true;
}

function closePayment() {
  showPayment.value = false;
  paymentTarget.value = null;
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

function formatMethod(method) {
  if (!method) return "";
  if (method.toLowerCase() === "cash") return "Cash";
  if (method.toLowerCase() === "e-wallet") return "E‑wallet";
  return method;
}

function formatAmount(value) {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString();
}

async function record(method) {
  if (!session.value || !paymentTarget.value) return;
  await api.recordPayment(session.value.id, {
    playerId: paymentTarget.value.playerId,
    amount: Number(paymentTarget.value.remaining),
    method
  });
  closePayment();
  await load();
}

async function saveEditFee() {
  if (!session.value || session.value.status !== "open") return;
  editFeeError.value = "";
  try {
    await api.updateSessionFee(session.value.id, {
      feeMode: "flat",
      feeAmount: Number(editFeeAmount.value || 0)
    });
    showEditFee.value = false;
    await load();
  } catch (err) {
    editFeeError.value = err.message || "Unable to update fee";
  }
}

onMounted(load);

watch(selectedSessionId, load);
</script>
