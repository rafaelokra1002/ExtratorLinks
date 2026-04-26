function enviarJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function lerBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body) {
      resolve(req.body);
      return;
    }

    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      resolve(body);
    });

    req.on("error", reject);
  });
}

function obterTexto(body) {
  if (!body) {
    return "";
  }

  if (typeof body === "string") {
    try {
      const payload = JSON.parse(body);
      return payload.texto || "";
    } catch {
      return "";
    }
  }

  if (typeof body === "object") {
    return body.texto || "";
  }

  return "";
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    enviarJson(res, 405, { erro: "Metodo nao permitido." });
    return;
  }

  try {
    const { analisarLinks } = require("../src/services/analisarLinks");
    const { extrairLinksDeTexto } = require("../src/utils/arquivo");
    const body = await lerBody(req);
    const texto = obterTexto(body);
    const links = extrairLinksDeTexto(texto);

    if (links.length === 0) {
      enviarJson(res, 400, {
        erro: "Nenhum link valido do WhatsApp foi encontrado no texto enviado.",
      });
      return;
    }

    const resultado = await analisarLinks(links, {
      salvarArquivos: false,
      delayEntreLotes: 0,
    });

    enviarJson(res, 200, resultado);
  } catch (erro) {
    console.error("api/analisar error", erro);
    enviarJson(res, 500, {
      erro: erro.message || "Erro interno.",
      detalhe: process.env.NODE_ENV === "development" ? erro.stack : undefined,
    });
  }
};