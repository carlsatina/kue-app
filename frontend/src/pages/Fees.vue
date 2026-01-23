<template>
  <div class="page-grid with-sidebar">
    <div class="page-main stack">
      <div class="card live-surface">
        <div class="section-title">Balances</div>
        <div v-if="error" class="notice">{{ error }}</div>
        <div v-if="!session && !error" class="subtitle">No active session.</div>
        <div v-for="b in balances" :key="b.playerId" class="card">
          <div class="kpi">
            <strong>{{ b.player.nickname || b.player.fullName }}</strong>
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
        </div>
        <div v-if="error" class="notice">{{ error }}</div>
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
import { computed, onMounted, ref } from "vue";
import { api } from "../api.js";

const balances = ref([]);
const session = ref(null);
const error = ref("");
const showPayment = ref(false);
const paymentTarget = ref(null);
const totalDue = computed(() =>
  balances.value.reduce((sum, balance) => sum + Number(balance.remaining || 0), 0)
);

async function load() {
  try {
    const activeSession = await api.activeSession();
    if (!activeSession) {
      session.value = null;
      balances.value = [];
      return;
    }
    session.value = activeSession;
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

onMounted(load);
</script>
