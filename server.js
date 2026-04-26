const fs = require("fs");
const path = require("path");

const INDEX_PATH = path.join(__dirname, "index.html");
const PUBLIC_DIR = path.join(__dirname, "public");

function enviarArquivo(res, filePath, contentType, method) {
  const conteudo = fs.readFileSync(filePath);
  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);

  if (method === "HEAD") {
    res.end();
    return;
  }

  res.end(conteudo);
}

module.exports = function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Metodo nao permitido.");
    return;
  }

  try {
    if (req.url === "/styles.css") {
      enviarArquivo(
        res,
        path.join(PUBLIC_DIR, "styles.css"),
        "text/css; charset=utf-8",
        req.method
      );
      return;
    }

    if (req.url === "/app.js") {
      enviarArquivo(
        res,
        path.join(PUBLIC_DIR, "app.js"),
        "application/javascript; charset=utf-8",
        req.method
      );
      return;
    }

    enviarArquivo(res, INDEX_PATH, "text/html; charset=utf-8", req.method);
  } catch (erro) {
    console.error("server.js error", erro);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Erro ao carregar a pagina.");
  }
};