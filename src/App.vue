<template>
  <div class="wrap">
    <header>
      <h1>Pilotage Hizope</h1>
      <p class="subtitle">Usage interne — Joyce uniquement.</p>
    </header>

    <section class="module">
      <h2>CMicrolocks — Acomptes à reverser au salon</h2>

      <div v-if="loading" class="muted">Chargement…</div>
      <div v-else-if="loadError" class="error-box">
        Impossible de charger les données : {{ loadError }}
      </div>

      <template v-else-if="reconciliation">
        <div class="totals">
          <div class="total-card">
            <span class="label">Encaissé sur le compte plateforme</span>
            <span class="value">{{ money(reconciliation.totalCollectedOnPlatform) }}</span>
          </div>
          <div class="total-card">
            <span class="label">Déjà reversé</span>
            <span class="value">{{ money(reconciliation.totalAlreadyReversed) }}</span>
          </div>
          <div class="total-card highlight">
            <span class="label">À reverser à Cécilia</span>
            <span class="value">{{ money(reconciliation.amountDue) }}</span>
          </div>
        </div>

        <form class="reversal-form" @submit.prevent="onRecordReversal">
          <h3>Enregistrer un virement fait</h3>
          <div class="fields">
            <label>
              Montant (€)
              <input v-model.number="form.amount" type="number" step="0.01" min="0.01" required />
            </label>
            <label>
              Date
              <input v-model="form.date" type="date" required />
            </label>
            <label class="grow">
              Note (optionnel)
              <input v-model="form.note" type="text" placeholder="Ex : virement du 12/09" />
            </label>
          </div>
          <button type="submit" :disabled="saving">
            {{ saving ? "Enregistrement…" : "Enregistrer le virement" }}
          </button>
          <p v-if="saveError" class="error-box">{{ saveError }}</p>
          <p v-if="saveSuccess" class="success-box">Virement enregistré.</p>
        </form>

        <h3>Acomptes non passés par Connect ({{ reconciliation.unconnectedDeposits.length }})</h3>
        <table v-if="reconciliation.unconnectedDeposits.length" class="data-table">
          <thead>
            <tr>
              <th>Date RDV</th>
              <th>Cliente</th>
              <th>Prestation</th>
              <th>Statut</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in reconciliation.unconnectedDeposits" :key="item.appointmentId">
              <td>{{ item.date }}</td>
              <td>{{ item.clientName }}</td>
              <td>{{ item.service }}</td>
              <td>{{ item.depositStatus }}</td>
              <td>{{ money(item.depositAmount) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">Aucun acompte en attente de reversement.</p>

        <h3>Historique des virements</h3>
        <table v-if="reconciliation.reversalHistory.length" class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Montant</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in reconciliation.reversalHistory" :key="entry.id">
              <td>{{ formatDate(entry.reversedAt) }}</td>
              <td>{{ money(entry.amount) }}</td>
              <td>{{ entry.note || "—" }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">Aucun virement enregistré pour l'instant.</p>
      </template>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { getCmicrolocksReconciliationApi, recordCmicrolocksReversalApi } from "@/services/reconciliation.api";
import { money, formatDate } from "@/utils/format.utils";

const loading = ref(true);
const loadError = ref("");
const reconciliation = ref(null);

const saving = ref(false);
const saveError = ref("");
const saveSuccess = ref(false);

const today = new Date().toISOString().slice(0, 10);
const form = reactive({ amount: null, date: today, note: "" });

const load = async () => {
  loading.value = true;
  loadError.value = "";
  try {
    reconciliation.value = await getCmicrolocksReconciliationApi();
  } catch (e) {
    loadError.value = e.response?.data?.detail || e.message || "Erreur inconnue.";
  } finally {
    loading.value = false;
  }
};

const onRecordReversal = async () => {
  saving.value = true;
  saveError.value = "";
  saveSuccess.value = false;
  try {
    await recordCmicrolocksReversalApi(form.amount, new Date(form.date).toISOString(), form.note || null);
    saveSuccess.value = true;
    form.amount = null;
    form.note = "";
    await load();
  } catch (e) {
    saveError.value = e.response?.data?.detail || e.message || "Erreur inconnue.";
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
.wrap {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 24px 80px;
}

header h1 {
  margin: 0 0 4px;
  font-size: 1.6rem;
}

.subtitle {
  margin: 0 0 28px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.module {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
}

.module h2 {
  margin-top: 0;
  font-size: 1.15rem;
}

.module h3 {
  margin: 28px 0 12px;
  font-size: 1rem;
}

.muted {
  color: var(--text-secondary);
}

.error-box {
  background: #fbe9e5;
  border: 1px solid var(--danger);
  color: var(--danger);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.9rem;
}

.success-box {
  background: #e8f3ec;
  border: 1px solid var(--primary);
  color: var(--primary-dark);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.9rem;
}

.totals {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.total-card {
  flex: 1 1 200px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--surface-variant);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 16px;
}

.total-card.highlight {
  background: var(--primary);
  border-color: var(--primary);
}

.total-card.highlight .label,
.total-card.highlight .value {
  color: white;
}

.total-card .label {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.total-card .value {
  font-size: 1.4rem;
  font-weight: 600;
}

.reversal-form {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.reversal-form .fields {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin: 12px 0;
}

.reversal-form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.reversal-form label.grow {
  flex: 1 1 220px;
}

.reversal-form input {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.95rem;
  font-family: inherit;
}

.reversal-form button {
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
}

.reversal-form button:disabled {
  opacity: 0.6;
  cursor: default;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.data-table th {
  text-align: left;
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.75rem;
  text-transform: uppercase;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
}

.data-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
}
</style>

