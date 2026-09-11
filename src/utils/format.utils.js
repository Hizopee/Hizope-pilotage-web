export const money = (value) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value ?? 0);

export const formatDate = (iso) => new Date(iso).toLocaleDateString("fr-FR");
