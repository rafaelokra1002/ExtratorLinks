const fs = require("fs");
const path = require("path");

function extrairLinksDeTexto(conteudo) {
  if (!conteudo) {
    return [];
  }

  const links = conteudo.match(/https?:\/\/chat\.whatsapp\.com\/[\w/-]+/gi) || [];
  return [...new Set(links.map((link) => link.trim()))];
}

/**
 * Lê links de um arquivo .txt (um link por linha).
 * Ignora linhas vazias e espaços extras.
 * @param {string} filePath - Caminho do arquivo .txt
 * @returns {string[]} Array de links
 */
function lerLinksDoArquivo(filePath) {
  const conteudo = fs.readFileSync(filePath, "utf-8");
  return extrairLinksDeTexto(conteudo);
}

/**
 * Salva o resultado em um arquivo .json
 * @param {object} resultado - Objeto com ativos e inativos
 * @param {string} filePath - Caminho do arquivo de saída
 */
function salvarResultadoJson(resultado, filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(resultado, null, 2), "utf-8");
}

module.exports = { extrairLinksDeTexto, lerLinksDoArquivo, salvarResultadoJson };
