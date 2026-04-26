/**
 * Aguarda um tempo em milissegundos antes de continuar.
 * @param {number} ms - Tempo em milissegundos
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { delay };
