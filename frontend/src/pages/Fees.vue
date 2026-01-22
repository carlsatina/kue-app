<template>
  <div class="stack">
    <div class="card">
      <div class="section-title">Balances</div>
      <div v-if="error" class="notice">{{ error }}</div>
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
import { onMounted, ref } from "vue";
import { api } from "../api.js";

const balances = ref([]);
const session = ref(null);
const error = ref("");
const showPayment = ref(false);
const paymentTarget = ref(null);

async function load() {
  try {
    session.value = await api.activeSession();
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
