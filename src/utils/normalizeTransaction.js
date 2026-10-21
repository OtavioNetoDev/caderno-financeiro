// Campos opcionais vazios viram "ausentes", para a API aceitar limpar valores ao editar.
module.exports = function normalizeTransaction(data) {
  for (const field of ['shareMode', 'paymentMethod', 'categoryId', 'personId']) {
    if (data[field] === '' || data[field] === null) {
      data[field] = undefined;
    }
  }
  if (typeof data.personName === 'string') {
    data.personName = data.personName.trim();
  }
  return data;
};
