function isValidParts(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function isValidDay(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  return Boolean(match) && isValidParts(Number(match[1]), Number(match[2]), Number(match[3]));
}

// Dia (AAAA-MM-DD) no fuso America/Bahia.
function dayOf(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return new Date(value).toLocaleDateString('en-CA', { timeZone: 'America/Bahia' });
}

module.exports = { isValidParts, isValidDay, dayOf };
