const fs = require("fs");
const path = require("path");

const INDEX_PATH = path.join(__dirname, "index.html");

module.exports = function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Metodo nao permitido.");
    return;
  }

  try {
    const html = fs.readFileSync(INDEX_PATH, "utf-8");
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    res.end(html);
  } catch (erro) {
    console.error("server.js error", erro);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Erro ao carregar a pagina.");
  }
};