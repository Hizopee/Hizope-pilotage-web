<template>
  <div class="shell">
    <aside class="rail">
      <p class="rail-title">Registre projets</p>
      <p class="rail-sub">Pilotage interne Hizope</p>
      <button
        v-for="project in projects"
        :key="project.id"
        type="button"
        class="rail-item"
        :class="{ active: selectedProject === project.id }"
        @click="selectedProject = project.id"
      >
        <span
          class="rail-dot"
          :class="projectConnected[project.id] ? 'status-ok' : 'status-down'"
        ></span>
        {{ project.label }}
      </button>
      <div class="rail-note">Chaque produit aura son propre module, avec ses propres règles de reversement.</div>
    </aside>

    <main class="main">
      <template v-if="!['cmicrolocks', 'lovelist'].includes(selectedProject)">
        <div class="topbar">
          <div>
            <h1>{{ selectedProjectLabel }}</h1>
            <p class="topbar-meta">Module pas encore disponible</p>
          </div>
        </div>
        <div class="card">
          <div class="card-body pad empty-state">
            Le module {{ selectedProjectLabel }} n'est pas encore connecté. Il aura son propre suivi des acomptes et ses
            propres règles de reversement, comme CMicrolocks.
          </div>
        </div>
      </template>

      <template v-else-if="selectedProject === 'lovelist'">
        <div class="topbar">
          <div>
            <h1>LoveList</h1>
            <p class="topbar-meta">{{ lovelistSyncLabel }}</p>
          </div>
          <div class="env-switch" role="group" aria-label="Environnement">
            <button class="env-btn" :class="{ active: env === 'test' }" @click="setEnv('test')">Test</button>
            <button class="env-btn" :class="{ active: env === 'live' }" @click="setEnv('live')">Production</button>
          </div>
        </div>

        <div class="test-banner" v-if="env === 'test'">
          ⚠ Mode test — ces montants sont des paiements de test Stripe, pas de l'argent réel.
        </div>

        <div v-if="lovelistLoading" class="muted">Chargement…</div>
        <div v-else-if="lovelistError" class="error-box">
          Impossible de charger les données Stripe : {{ lovelistError }}
        </div>

        <template v-else-if="lovelistSummary">
          <div class="kpi-row">
            <div class="kpi">
              <p class="kpi-label">Total encaissé</p>
              <p class="kpi-value">{{ money(lovelistEur.grossAmount) }}</p>
              <p class="kpi-sub">{{ lovelistEur.chargesCount }} paiement{{ lovelistEur.chargesCount > 1 ? "s" : "" }}</p>
            </div>
            <div class="kpi">
              <p class="kpi-label">Frais Stripe (carte bancaire)</p>
              <p class="kpi-value">{{ money(lovelistEur.stripeFeeAmount) }}</p>
              <p class="kpi-sub">Prélevés par Stripe sur chaque paiement</p>
            </div>
            <div class="kpi accent" :class="{ 'margin-negative': lovelistEur.netMargin < 0 }">
              <p class="kpi-label">Net pour Hizope</p>
              <p class="kpi-value">{{ money(lovelistEur.netMargin) }}</p>
              <p class="kpi-sub">Encaissé − frais Stripe · 0 % de commission</p>
            </div>
            <div class="kpi" v-if="lovelistPayouts">
              <p class="kpi-label">Solde Stripe</p>
              <p class="kpi-value">{{ money(lovelistPayouts.available?.eur) }}</p>
              <p class="kpi-sub">Disponible · {{ money(lovelistPayouts.pending?.eur) }} en attente</p>
            </div>
          </div>

          <div class="split">
            <div class="card">
              <div class="card-head"><h2>Alertes</h2></div>
              <div class="card-body">
                <div v-if="lovelistSummary.alerts.length" class="alerts-list">
                  <div v-for="(alert, i) in lovelistSummary.alerts" :key="i" class="alert-item" :class="'alert-' + alert.severity">
                    {{ alert.message }}
                  </div>
                </div>
                <div v-else class="empty-state"><span class="ok-dot"></span>Aucune alerte — tout est calme.</div>
              </div>
            </div>

            <div class="card">
              <div class="card-head"><h2>Virements vers ton compte</h2></div>
              <div class="card-body">
                <div v-if="lovelistPayoutsError" class="error-box">
                  Impossible de charger les virements : {{ lovelistPayoutsError }}
                </div>
                <table v-else-if="lovelistPayouts?.payouts.length" class="data-table">
                  <thead><tr><th>Arrivée</th><th>Statut</th><th>Montant</th></tr></thead>
                  <tbody>
                    <tr v-for="payout in lovelistPayouts.payouts" :key="payout.id">
                      <td>{{ formatDate(payout.arrivalDate) }}</td>
                      <td>
                        <span class="status-dot" :class="payoutDotClass(payout.status)"></span>{{ payoutStatusLabel(payout.status) }}
                        <span v-if="payout.failureMessage" class="muted"> — {{ payout.failureMessage }}</span>
                      </td>
                      <td>{{ money(payout.amount) }}</td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="empty-state">Aucun virement Stripe pour l'instant.</div>
              </div>
            </div>
          </div>

          <div class="card rules-card">
            <div class="rules-formula">
              <strong>Pas de reversement.</strong> LoveList appartient à 100 % à Hizope : aucune commission,
              tout l'encaissé te revient. Stripe vire automatiquement le solde disponible sur ton compte bancaire.
            </div>
            <div class="rules-chips">
              <div class="chip-row"><span>Paiements en échec</span><span class="chip on">Activé</span></div>
              <div class="chip-row"><span>Litiges (disputes)</span><span class="chip on">Activé</span></div>
              <div class="chip-row"><span>Remboursements</span><span class="chip on">Activé</span></div>
            </div>
          </div>
        </template>

        <div class="card">
          <div class="ops-body">
            <div class="logs-header">
              <h3>Logs applicatifs</h3>
              <div class="logs-controls">
                <select v-model="logLevel" @change="loadLogs">
                  <option value="Warning">Warning et plus</option>
                  <option value="Information">Information et plus (bruyant)</option>
                  <option value="Error">Error et plus</option>
                </select>
                <button type="button" class="ghost-button" :disabled="logsLoading" @click="loadLogs">
                  {{ logsLoading ? "…" : "Rafraîchir" }}
                </button>
              </div>
            </div>
            <p class="muted small">
              Tampon en mémoire côté API LoveList — repart à vide à chaque redémarrage/déploiement.
            </p>
            <div v-if="logsLoading && !logs.length" class="muted">Chargement…</div>
            <div v-else-if="logsError" class="error-box">Impossible de charger les logs : {{ logsError }}</div>
            <template v-else>
              <table v-if="logs.length" class="data-table">
                <thead><tr><th>Heure</th><th>Niveau</th><th>Catégorie</th><th>Message</th></tr></thead>
                <tbody>
                  <tr v-for="(entry, i) in logs" :key="i">
                    <td class="nowrap">{{ formatDateTime(entry.timestamp) }}</td>
                    <td><span class="level-badge" :class="levelClass(entry.level)">{{ entry.level }}</span></td>
                    <td class="nowrap">{{ shortCategory(entry.category) }}</td>
                    <td>
                      {{ entry.message }}
                      <details v-if="entry.exception">
                        <summary>Exception</summary>
                        <pre>{{ entry.exception }}</pre>
                      </details>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p v-else class="muted">Aucun log à ce niveau pour l'instant.</p>
            </template>
          </div>
        </div>
      </template>

      <template v-else>
      <div class="topbar">
        <div>
          <h1>CMicrolocks</h1>
          <p class="topbar-meta">{{ lastSyncLabel }}</p>
        </div>
        <div class="env-switch" role="group" aria-label="Environnement">
          <button class="env-btn" :class="{ active: env === 'test' }" @click="setEnv('test')">Test</button>
          <button class="env-btn" :class="{ active: env === 'live' }" @click="setEnv('live')">Production</button>
        </div>
      </div>

      <div class="test-banner" v-if="env === 'test'">
        ⚠ Mode test — ces montants sont des paiements de test Stripe, pas de l'argent réel.
      </div>

      <div v-if="stripeLoading" class="muted">Chargement…</div>
      <div v-else-if="stripeError" class="error-box">
        Impossible de charger les données Stripe : {{ stripeError }}
      </div>

      <template v-else-if="stripeSummary">
        <div class="kpi-row">
          <div class="kpi">
            <p class="kpi-label">Total des acomptes reçus</p>
            <p class="kpi-value">{{ money(stripeEur.grossAmount) }}</p>
            <p class="kpi-sub">{{ stripeEur.chargesCount }} paiement{{ stripeEur.chargesCount > 1 ? "s" : "" }}</p>
          </div>
          <div class="kpi">
            <p class="kpi-label">Frais de service retenus</p>
            <p class="kpi-value">{{ money(stripeEur.serviceFeeAmount) }}</p>
            <p class="kpi-sub">{{ stripeSummary.serviceFeePercent }} % du total</p>
          </div>
          <div class="kpi">
            <p class="kpi-label">Frais Stripe (carte bancaire)</p>
            <p class="kpi-value">{{ money(stripeEur.stripeFeeAmount) }}</p>
            <p class="kpi-sub">Absorbés par Hizope, pas déduits du versement à Cécilia</p>
          </div>
          <div class="kpi" :class="{ 'margin-negative': stripeEur.netMargin < 0 }">
            <p class="kpi-label">Marge nette Hizope</p>
            <p class="kpi-value">{{ money(stripeEur.netMargin) }}</p>
            <p class="kpi-sub">Frais de service − frais Stripe</p>
          </div>
          <div class="kpi accent">
            <p class="kpi-label">À verser à Cécilia</p>
            <p class="kpi-value">{{ money(payoutDueDisplay) }}</p>
            <p class="kpi-sub">Net des frais de service et des versements déjà faits</p>
            <button
              v-if="env === 'live'"
              type="button"
              class="mark-paid-btn"
              @click="toggleMarkPaidForm"
            >
              {{ showMarkPaidForm ? "Annuler" : "Marquer un versement effectué" }}
            </button>
            <p v-else class="kpi-sub">Disponible en mode Production uniquement</p>
          </div>
        </div>

        <div class="card" v-if="showMarkPaidForm && env === 'live'">
          <div class="card-head"><h2>Enregistrer un virement fait à Cécilia</h2></div>
          <div class="card-body pad">
            <form class="reversal-form" @submit.prevent="onRecordReversal">
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
              <button type="submit" :disabled="saving">{{ saving ? "Enregistrement…" : "Enregistrer le virement" }}</button>
              <p v-if="saveError" class="error-box">{{ saveError }}</p>
              <p v-if="saveSuccess" class="success-box">Virement enregistré.</p>
            </form>
          </div>
        </div>

        <div class="split">
          <div class="card">
            <div class="card-head"><h2>Alertes</h2></div>
            <div class="card-body">
              <div v-if="stripeSummary.alerts.length" class="alerts-list">
                <div v-for="(alert, i) in stripeSummary.alerts" :key="i" class="alert-item" :class="'alert-' + alert.severity">
                  {{ alert.message }}
                </div>
              </div>
              <div v-else class="empty-state"><span class="ok-dot"></span>Aucune alerte — tout est calme.</div>
            </div>
          </div>

          <div class="card">
            <div class="card-head"><h2>Historique de synchronisation</h2></div>
            <div class="card-body">
              <table v-if="reversedSyncLog.length" class="data-table">
                <thead><tr><th>Date</th><th>Statut</th><th>Paiements</th></tr></thead>
                <tbody>
                  <tr v-for="(entry, i) in reversedSyncLog" :key="i">
                    <td>{{ formatDateTime(entry.timestamp) }}</td>
                    <td><span class="status-dot" :class="entry.status"></span>{{ entry.status === "success" ? "OK" : "Erreur" }}</td>
                    <td>{{ entry.chargesFetched ?? "—" }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="empty-state">Aucune synchro enregistrée.</div>
            </div>
          </div>
        </div>

        <div class="card rules-card">
          <div class="rules-formula">
            <strong>Règle de reversement.</strong> Cécilia reçoit le total des acomptes encaissés, moins
            <strong>{{ stripeSummary.serviceFeePercent }} %</strong> retenus comme frais de service. Pas de frais Stripe déduits
            en plus.
          </div>
          <div class="rules-chips">
            <div class="chip-row"><span>Échec de synchro</span><span class="chip on">Activé</span></div>
            <div class="chip-row"><span>Paiements en échec</span><span class="chip on">Activé</span></div>
            <div class="chip-row"><span>Litiges (disputes)</span><span class="chip on">Activé</span></div>
            <div class="chip-row"><span>Remboursements</span><span class="chip on">Activé</span></div>
          </div>
        </div>
      </template>

      <details class="card ops-details">
        <summary>Outils détaillés — acomptes hors Connect, virements manuels, logs applicatifs</summary>
        <div class="ops-body">
          <div v-if="loading" class="muted">Chargement…</div>
          <div v-else-if="loadError" class="error-box">
            Impossible de charger les données : {{ loadError }}
          </div>
          <template v-else-if="reconciliation">
            <h3>Acomptes non passés par Connect ({{ reconciliation.unconnectedDeposits.length }})</h3>
            <table v-if="reconciliation.unconnectedDeposits.length" class="data-table">
              <thead><tr><th>Date RDV</th><th>Cliente</th><th>Prestation</th><th>Statut</th><th>Montant</th></tr></thead>
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
            <p class="muted small">Enregistrés depuis le bouton "Marquer un versement effectué" en haut de page.</p>
            <table v-if="reconciliation.reversalHistory.length" class="data-table">
              <thead><tr><th>Date</th><th>Montant</th><th>Note</th></tr></thead>
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

          <div class="logs-header">
            <h3>Logs applicatifs</h3>
            <div class="logs-controls">
              <select v-model="logLevel" @change="loadLogs">
                <option value="Warning">Warning et plus</option>
                <option value="Information">Information et plus (bruyant)</option>
                <option value="Error">Error et plus</option>
              </select>
              <button type="button" class="ghost-button" :disabled="logsLoading" @click="loadLogs">
                {{ logsLoading ? "…" : "Rafraîchir" }}
              </button>
            </div>
          </div>
          <p class="muted small">
            Tampon en mémoire côté API (les 1000 derniers, filtrés) — repart à vide à chaque
            redémarrage/déploiement, ce n'est pas un historique persistant.
          </p>
          <div v-if="logsLoading && !logs.length" class="muted">Chargement…</div>
          <div v-else-if="logsError" class="error-box">Impossible de charger les logs : {{ logsError }}</div>
          <template v-else>
            <table v-if="logs.length" class="data-table">
              <thead><tr><th>Heure</th><th>Niveau</th><th>Catégorie</th><th>Message</th></tr></thead>
              <tbody>
                <tr v-for="(entry, i) in logs" :key="i">
                  <td class="nowrap">{{ formatDateTime(entry.timestamp) }}</td>
                  <td><span class="level-badge" :class="levelClass(entry.level)">{{ entry.level }}</span></td>
                  <td class="nowrap">{{ shortCategory(entry.category) }}</td>
                  <td>
                    {{ entry.message }}
                    <details v-if="entry.exception">
                      <summary>Exception</summary>
                      <pre>{{ entry.exception }}</pre>
                    </details>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="muted">Aucun log à ce niveau pour l'instant.</p>
          </template>
        </div>
      </details>
      </template>

      <footer>Pilotage Hizope · usage interne — Joyce uniquement</footer>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { getCmicrolocksReconciliationApi, recordCmicrolocksReversalApi } from "@/services/reconciliation.api";
import { getCmicrolocksLogsApi, getLovelistLogsApi } from "@/services/logs.api";
import { getCmicrolocksStripeSummaryApi, getLovelistPayoutsApi, getLovelistStripeSummaryApi } from "@/services/stripe.api";
import { money, formatDate, formatDateTime, payoutStatusLabel } from "@/utils/format.utils";

const projects = [
  { id: "cmicrolocks", label: "CMicrolocks" },
  { id: "lovelist", label: "LoveList" },
  { id: "gaia", label: "Gaia" },
];
const selectedProject = ref("cmicrolocks");
const selectedProjectLabel = computed(
  () => projects.find((p) => p.id === selectedProject.value)?.label || selectedProject.value
);

const env = ref("live");

const stripeSummary = ref(null);
const stripeLoading = ref(true);
const stripeError = ref("");

// Vert dès que la dernière synchro Stripe a réussi (donc que la clé configurée côté API
// est valide) ; rouge sinon — y compris pendant le tout premier chargement, par défaut
// prudent plutôt que de supposer que c'est connecté avant d'avoir la confirmation.
const cmicrolocksConnected = computed(() => !stripeError.value && stripeSummary.value !== null);

const stripeEur = computed(
  () =>
    stripeSummary.value?.totals?.eur || {
      chargesCount: 0,
      grossAmount: 0,
      serviceFeeAmount: 0,
      stripeFeeAmount: 0,
      netMargin: 0,
      payoutDue: 0,
    }
);
const errorMessage = (e) => e.response?.data?.detail || e.message || "Erreur inconnue.";

// --- LoveList : 100 % Hizope, pas de commission ni de reversement. ---
const lovelistSummary = ref(null);
const lovelistLoading = ref(true);
const lovelistError = ref("");
const lovelistPayouts = ref(null);
const lovelistPayoutsError = ref("");

const lovelistConnected = computed(() => !lovelistError.value && lovelistSummary.value !== null);
const projectConnected = computed(() => ({
  cmicrolocks: cmicrolocksConnected.value,
  lovelist: lovelistConnected.value,
}));

const lovelistEur = computed(
  () => lovelistSummary.value?.totals?.eur || { chargesCount: 0, grossAmount: 0, stripeFeeAmount: 0, netMargin: 0 }
);
const lovelistSyncLabel = computed(() => {
  const last = lovelistSummary.value?.syncLog?.at(-1);
  if (!last) return "Pas encore synchronisé";
  return `Dernière synchro : ${formatDateTime(last.timestamp)} · ${env.value === "test" ? "test" : "production"}`;
});

const loadLovelist = async () => {
  lovelistLoading.value = true;
  lovelistError.value = "";
  lovelistPayoutsError.value = "";
  // Indépendants : une clé sans droit "Payouts" ne doit pas masquer le résumé des paiements.
  const [summary, payouts] = await Promise.allSettled([
    getLovelistStripeSummaryApi(env.value),
    getLovelistPayoutsApi(env.value),
  ]);
  if (summary.status === "fulfilled") lovelistSummary.value = summary.value;
  else lovelistError.value = errorMessage(summary.reason);
  if (payouts.status === "fulfilled") lovelistPayouts.value = payouts.value;
  else {
    lovelistPayouts.value = null;
    lovelistPayoutsError.value = errorMessage(payouts.reason);
  }
  lovelistLoading.value = false;
};

const payoutDotClass = (status) => {
  if (status === "paid") return "success";
  if (status === "failed" || status === "canceled") return "error";
  return "pending";
};

const reversedSyncLog = computed(() => [...(stripeSummary.value?.syncLog || [])].reverse());
const lastSyncLabel = computed(() => {
  const last = reversedSyncLog.value[0];
  if (!last) return "Pas encore synchronisé";
  return `Dernière synchro : ${formatDateTime(last.timestamp)} · ${env.value === "test" ? "test" : "production"}`;
});

const loadStripeSummary = async () => {
  stripeLoading.value = true;
  stripeError.value = "";
  try {
    stripeSummary.value = await getCmicrolocksStripeSummaryApi(env.value);
  } catch (e) {
    stripeError.value = e.response?.data?.detail || e.message || "Erreur inconnue.";
  } finally {
    stripeLoading.value = false;
  }
};

const setEnv = (next) => {
  if (env.value === next) return;
  env.value = next;
};
watch(env, () => {
  showMarkPaidForm.value = false;
  loadStripeSummary();
  loadLovelist();
});

const loading = ref(true);
const loadError = ref("");
const reconciliation = ref(null);

// Total Stripe (tous canaux) moins la commission, moins ce qui a déjà été viré à
// Cécilia (quel que soit le canal — le ledger des virements n'est pas scindé par canal).
const payoutDueNet = computed(() => stripeEur.value.payoutDue - (reconciliation.value?.totalAlreadyReversed ?? 0));
// Affiché à 0€ minimum : une fois le dû réglé, le compteur ne doit pas paraître "en
// négatif" pour un usage courant (un vrai trop-perçu resterait visible via l'historique).
const payoutDueDisplay = computed(() => Math.max(0, payoutDueNet.value));

const saving = ref(false);
const saveError = ref("");
const saveSuccess = ref(false);
const showMarkPaidForm = ref(false);

const today = new Date().toISOString().slice(0, 10);
const form = reactive({ amount: null, date: today, note: "" });

const toggleMarkPaidForm = () => {
  showMarkPaidForm.value = !showMarkPaidForm.value;
  if (showMarkPaidForm.value) {
    form.amount = Math.max(0, Math.round(payoutDueNet.value * 100) / 100);
    saveSuccess.value = false;
  }
};

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

const logs = ref([]);
const logsLoading = ref(true);
const logsError = ref("");
const logLevel = ref("Warning");

const logsApiFor = { cmicrolocks: getCmicrolocksLogsApi, lovelist: getLovelistLogsApi };

const loadLogs = async () => {
  const project = selectedProject.value;
  const getLogs = logsApiFor[project];
  if (!getLogs) return;
  logsLoading.value = true;
  logsError.value = "";
  try {
    const result = await getLogs({ take: 200, level: logLevel.value });
    // Réponse d'un projet qu'on a quitté entre-temps : ne pas l'afficher sur l'autre.
    if (project === selectedProject.value) logs.value = result;
  } catch (e) {
    if (project === selectedProject.value) logsError.value = errorMessage(e);
  } finally {
    if (project === selectedProject.value) logsLoading.value = false;
  }
};

// "Microlocks.Api.Controllers.PlatformController" -> "PlatformController" : le namespace
// complet n'apporte rien à l'affichage, juste de la largeur perdue dans la colonne.
const shortCategory = (category) => category?.split(".").pop() || category;

const levelClass = (level) => {
  const l = (level || "").toLowerCase();
  if (l === "critical" || l === "error") return "level-error";
  if (l === "warning") return "level-warning";
  return "level-info";
};

// Les logs suivent le projet sélectionné (même tableau, source différente).
watch(selectedProject, () => {
  logs.value = [];
  loadLogs();
});

onMounted(() => {
  loadStripeSummary();
  loadLovelist();
  load();
  loadLogs();
});
</script>

<style scoped>
.shell {
  max-width: 1180px;
  margin: 0 auto;
  padding-inline: 20px;
  padding-block: 28px;
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 24px;
}

@media (max-width: 860px) {
  .shell {
    grid-template-columns: 1fr;
  }
}

/* --- Rail --- */
.rail {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rail-title {
  font-family: "Archivo", sans-serif;
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
  margin: 0 0 4px 2px;
}

.rail-sub {
  font-size: 0.78rem;
  color: var(--ink-muted);
  margin: 0 0 18px 2px;
}

.rail-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 500;
  background: transparent;
  border: none;
  font-family: inherit;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}

.rail-item:hover {
  background: var(--surface-alt);
}

.rail-item.active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.rail-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ink-muted);
  flex-shrink: 0;
}

.rail-dot.status-ok {
  background: var(--success);
}

.rail-dot.status-down {
  background: var(--critical);
}


.rail-note {
  margin-top: 18px;
  padding: 12px 13px;
  border-radius: 10px;
  background: var(--surface-alt);
  border: 1px solid var(--border);
  font-size: 0.76rem;
  line-height: 1.5;
  color: var(--ink-muted);
}

/* --- Main --- */
.main {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.topbar h1 {
  font-family: "Archivo", sans-serif;
  font-weight: 800;
  font-size: 1.5rem;
  letter-spacing: -0.015em;
  margin: 0;
  text-wrap: balance;
}

.topbar-meta {
  font-size: 0.78rem;
  color: var(--ink-muted);
  margin: 3px 0 0;
}

.env-switch {
  display: inline-flex;
  background: var(--surface-alt);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 3px;
  gap: 2px;
}

.env-btn {
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 7px 16px;
  border-radius: 999px;
  color: var(--ink-muted);
  cursor: pointer;
}

.env-btn.active {
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow);
}

.test-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--warning-soft);
  color: var(--warning);
  border: 1px solid var(--warning);
  border-radius: 10px;
  padding: 9px 14px;
  font-size: 0.82rem;
  font-weight: 600;
}

.muted {
  color: var(--ink-muted);
}

.error-box {
  background: var(--critical-soft);
  border: 1px solid var(--critical);
  color: var(--critical);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.9rem;
}

.success-box {
  background: var(--success-soft);
  border: 1px solid var(--success);
  color: var(--success);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.9rem;
  margin-top: 10px;
}

/* --- KPI row --- */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.kpi {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: var(--shadow);
}

.kpi-label {
  font-size: 0.74rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-muted);
  margin: 0 0 10px;
}

.kpi-value {
  font-family: "Archivo", sans-serif;
  font-weight: 800;
  font-size: 1.85rem;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  margin: 0;
}

.kpi.accent .kpi-value {
  color: var(--accent);
}

.kpi.margin-negative {
  border-color: var(--warning);
}

.kpi.margin-negative .kpi-value {
  color: var(--warning);
}

.kpi-sub {
  font-size: 0.76rem;
  color: var(--ink-muted);
  margin-top: 6px;
  font-variant-numeric: tabular-nums;
}

.mark-paid-btn {
  margin-top: 12px;
  background: white;
  color: var(--accent);
  border: none;
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

/* --- Split --- */
.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  align-items: start;
}

@media (max-width: 860px) {
  .split {
    grid-template-columns: 1fr;
  }
}

/* --- Card --- */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}

.card-head h2 {
  font-family: "Archivo", sans-serif;
  font-weight: 700;
  font-size: 0.92rem;
  margin: 0;
}

.card-body {
  padding: 6px 8px;
}

/* --- Alerts --- */
.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
}

.alert-item {
  border-left: 3px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 0.83rem;
  line-height: 1.4;
  background: var(--surface-alt);
}

.alert-item.alert-warning {
  border-left-color: var(--warning);
  background: var(--warning-soft);
  color: var(--warning);
}

.alert-item.alert-critical {
  border-left-color: var(--critical);
  background: var(--critical-soft);
  color: var(--critical);
}

.alert-item.alert-info {
  border-left-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.empty-state {
  padding: 28px 18px;
  text-align: center;
  color: var(--ink-muted);
  font-size: 0.85rem;
}

.ok-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
  margin-right: 6px;
}

.status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 6px;
}

.status-dot.success {
  background: var(--success);
}

.status-dot.error {
  background: var(--critical);
}

.status-dot.pending {
  background: var(--warning);
}

/* --- Rules card --- */
.rules-card {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
}

@media (max-width: 700px) {
  .rules-card {
    grid-template-columns: 1fr;
  }
}

.rules-formula {
  padding: 16px 18px;
  border-right: 1px solid var(--border);
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--ink-muted);
}

@media (max-width: 700px) {
  .rules-formula {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
}

.rules-formula strong {
  color: var(--ink);
}

.rules-chips {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chip-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
}

.chip {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.chip.on {
  background: var(--success-soft);
  color: var(--success);
}

/* --- Ops details (legacy tools, collapsed by default) --- */
.ops-details > summary {
  padding: 14px 18px;
  cursor: pointer;
  font-family: "Archivo", sans-serif;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--ink-muted);
}

.ops-body {
  padding: 4px 18px 20px;
}

.ops-body h3 {
  margin: 22px 0 10px;
  font-size: 0.92rem;
}

.ops-body h3:first-child {
  margin-top: 4px;
}

/* --- Reversal form --- */
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
  color: var(--ink-muted);
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
  background: var(--surface);
  color: var(--ink);
}

.reversal-form button {
  background: var(--accent);
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

/* --- Tables --- */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.83rem;
}

.data-table th {
  text-align: left;
  color: var(--ink-muted);
  font-weight: 600;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 10px;
}

.data-table td {
  padding: 9px 10px;
  border-top: 1px solid var(--border);
  font-family: "IBM Plex Mono", monospace;
  font-variant-numeric: tabular-nums;
}

.nowrap {
  white-space: nowrap;
}

.level-badge {
  display: inline-block;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 0.72rem;
  font-weight: 600;
  font-family: "IBM Plex Sans", sans-serif;
}

.level-badge.level-error {
  background: var(--critical-soft);
  color: var(--critical);
}

.level-badge.level-warning {
  background: var(--warning-soft);
  color: var(--warning);
}

.level-badge.level-info {
  background: var(--surface-alt);
  color: var(--ink-muted);
}

.data-table details {
  margin-top: 4px;
}

.data-table summary {
  cursor: pointer;
  font-size: 0.78rem;
  color: var(--ink-muted);
  font-family: "IBM Plex Sans", sans-serif;
}

.data-table pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.75rem;
  background: var(--surface-alt);
  border-radius: 8px;
  padding: 8px;
  margin-top: 4px;
}

/* --- Logs controls --- */
.logs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 22px;
}

.logs-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logs-controls select {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 0.85rem;
  font-family: inherit;
  background: var(--surface);
  color: var(--ink);
}

.ghost-button {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--ink);
}

.ghost-button:disabled {
  opacity: 0.6;
  cursor: default;
}

.small {
  font-size: 0.8rem;
  margin: 6px 0 14px;
}

footer {
  font-size: 0.73rem;
  color: var(--ink-muted);
  text-align: center;
  padding-top: 6px;
}
</style>
