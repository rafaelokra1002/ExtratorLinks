const { analisarLinks } = require("../src/services/analisarLinks");
const { extrairLinksDeTexto } = require("../src/utils/arquivo");

function enviarJson(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

function obterTexto(req) {
  if (!req.body) {
    return "";
  }

  if (typeof req.body === "string") {
    try {
      const payload = JSON.parse(req.body);
      return payload.texto || "";
    } catch {
      return "";
    }
  }

  if (typeof req.body === "object") {
    return req.body.texto || "";
  }

  return "";
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    enviarJson(res, 405, { erro: "Metodo nao permitido." });
    return;
  }

  try {
    const texto = obterTexto(req);
    const links = extrairLinksDeTexto(texto);

    if (links.length === 0) {
      enviarJson(res, 400, {
        erro: "Nenhum link valido do WhatsApp foi encontrado no texto enviado.",
      });
      return;
    }

    const resultado = await analisarLinks(links, {
      salvarArquivos: false,
    });

    enviarJson(res, 200, resultado);
  } catch (erro) {
    enviarJson(res, 500, { erro: erro.message || "Erro interno." });
  }
};