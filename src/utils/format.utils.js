export const money = (value) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value ?? 0);

export const formatDate = (iso) => new Date(iso).toLocaleDateString("fr-FR");

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
