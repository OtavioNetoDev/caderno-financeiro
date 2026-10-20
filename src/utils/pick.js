// Copia só os campos permitidos, evitando que o cliente grave campos como userId.
module.exports = (source, fields) =>
  Object.fromEntries(
    fields.filter((field) => source && source[field] !== undefined).map((field) => [field, source[field]]),
  );
