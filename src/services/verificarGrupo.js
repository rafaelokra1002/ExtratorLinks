const axios = require("axios");
const cheerio = require("cheerio");
const { delay } = require("../utils/delay");

const TITULOS_INATIVOS = new Set([
  "group chat invite",
  "convite para grupo do whatsapp",
  "whatsapp group invite",
]);
const MAX_TENTATIVAS = 2;

function normalizarTitulo(titulo) {
  return (titulo || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Acessa o link do grupo e captura o HTML da página.
 * Faz retry automático em caso de erro 429 (Too Many Requests).
 * @param {string} link - URL do grupo WhatsApp
 * @returns {Promise<string>} HTML da página
 */
async function capturarHTML(link) {
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      const response = await axios.get(link, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        },
        timeout: 15000,
      });
      return response.data;
    } catch (erro) {
      const status = erro.response && erro.response.status;
      if (status === 429 && tentativa < MAX_TENTATIVAS) {
        const espera = tentativa * 2000; // 2s, 4s
        console.log(`  ⚠️  429 bloqueado, tentativa ${tentativa}/${MAX_TENTATIVAS}. Aguardando ${espera / 1000}s...`);
        await delay(espera);
        continue;
      }
      throw erro;
    }
  }
}

/**
 * Extrai o título/nome do grupo a partir do HTML.
 * Busca na meta tag og:title ou no <title> da página.
 * @param {string} html - HTML da página
 * @returns {string} Título encontrado
 */
function extrairTitulo(html) {
  const $ = cheerio.load(html);

  // Tenta og:title primeiro (mais confiável)
  const ogTitle = $('meta[property="og:title"]').attr("content");
  if (ogTitle && ogTitle.trim().length > 0) {
    return ogTitle.trim();
  }

  // Fallback para <title>
  const title = $("title").text();
  if (title && title.trim().length > 0) {
    return title.trim();
  }

  return "";
}

/**
 * Classifica o grupo como ATIVO ou INATIVO.
 * INATIVO: título padrão de convite do WhatsApp ou vazio
 * ATIVO: qualquer outro título (nome real do grupo)
 * @param {string} titulo - Título extraído da página
 * @returns {boolean} true se ativo, false se inativo
 */
function classificarGrupo(titulo) {
  const tituloNormalizado = normalizarTitulo(titulo);

  if (!tituloNormalizado || TITULOS_INATIVOS.has(tituloNormalizado)) {
    return false;
  }
  return true;
}

/**
 * Verifica um único link de grupo do WhatsApp.
 * @param {string} link - URL do grupo
 * @returns {Promise<{ativo: boolean, nome: string|null, link: string, erro: string|null}>}
 */
async function verificarGrupo(link) {
  try {
    const html = await capturarHTML(link);
    const titulo = extrairTitulo(html);
    const ativo = classificarGrupo(titulo);

    return {
      ativo,
      nome: ativo ? titulo : null,
      link,
      erro: null,
    };
  } catch (erro) {
    return {
      ativo: false,
      nome: null,
      link,
      erro: erro.message,
    };
  }
}

module.exports = { verificarGrupo, capturarHTML, extrairTitulo, classificarGrupo, normalizarTitulo };
