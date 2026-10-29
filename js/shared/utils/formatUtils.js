export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function fullName(client) {
  return [client.prenom, client.nom].filter(Boolean).join(' ');
}

export function initials(client) {
  return `${(client.prenom || '').charAt(0)}${(client.nom || '').charAt(0)}`.toUpperCase();
}

// Normalise un numéro pour les liens tel:/sms: (sans espaces).
export function telHref(phone = '') {
  return phone.replace(/[^\d+]/g, '');
}

// « 0612345678 » → « 06 12 34 56 78 » ; laisse intact ce qui n'est pas un
// numéro français à 10 chiffres.
export function formatPhone(phone = '') {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) return phone.trim();
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ');
}

// Clé de tri / recherche insensible à la casse et aux accents.
export function normalizeText(str = '') {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

export function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}
