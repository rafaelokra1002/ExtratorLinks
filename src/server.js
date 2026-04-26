const fs = require("fs");
const path = require("path");
const http = require("http");
const { analisarLinks } = require("./services/analisarLinks");
const { extrairLinksDeTexto } = require("./utils/arquivo");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const jobs = new Map();

function criarJob() {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const job = {
    id,
    status: "queued",
    progresso: {
      numeroLote: 0,
      totalLotes: 0,
      processados: 0,
      total: 0,
      ativos: 0,
      inativos: 0,
      percentual: 0,
      ultimoLink: null,
    },
    logs: ["[queue] job recebido e aguardando processamento"],
    resultado: null,
    erro: null,
    updatedAt: Date.now(),
  };

  jobs.set(id, job);
  return job;
}

function atualizarJob(job, patch) {
  Object.assign(job, patch, { updatedAt: Date.now() });
}

function adicionarLog(job, mensagem) {
  job.logs.push(mensagem);
  if (job.logs.length > 20) {
    job.logs = job.logs.slice(-20);
  }
  job.updatedAt = Date.now();
}

function serializarJob(job) {
  return {
    id: job.id,
    status: job.status,
    progresso: job.progresso,
    logs: job.logs,
    resultado: job.resultado,
    erro: job.erro,
  };
}

function iniciarAnaliseEmBackground(job, links) {
  atualizarJob(job, {
    status: "running",
    progresso: {
      ...job.progresso,
      total: links.length,
      totalLotes: Math.ceil(links.length / 20),
    },
  });
  adicionarLog(job, `[init] ${links.length} link(s) unicos na fila`);

  analisarLinks(links, {
    salvarArquivos: true,
    onProgresso: ({ processados, total, ativos, inativos, ultimoResultado }) => {
      const percentual = total > 0 ? Math.round((processados / total) * 100) : 0;
      job.progresso = {
        ...job.progresso,
        processados,
        total,
        ativos,
        inativos,
        percentual,
        ultimoLink: ultimoResultado.link,
      };

      if (ultimoResultado.ativo) {
        adicionarLog(job, `[active] ${ultimoResultado.link}`);
      }
    },
    onLote: ({ numeroLote, totalLotes, processados, total, ativos, inativos }) => {
      const percentual = total > 0 ? Math.round((processados / total) * 100) : 0;
      job.progresso = {
        ...job.progresso,
        numeroLote,
        totalLotes,
        processados,
        total,
        ativos,
        inativos,
        percentual,
      };
      adicionarLog(job, `[batch] lote ${numeroLote}/${totalLotes} concluido - ${processados}/${total}`);
    },
  })
    .then((resultado) => {
      atualizarJob(job, {
        status: "done",
        resultado,
        progresso: {
          ...job.progresso,
          percentual: 100,
        },
      });
      adicionarLog(job, `[done] analise finalizada com ${resultado.ativos.length} grupo(s) ativo(s)`);
    })
    .catch((erro) => {
      atualizarJob(job, {
        status: "error",
        erro: erro.message || "Erro interno.",
      });
      adicionarLog(job, `[error] ${erro.message || "Erro interno."}`);
    });
}

function enviarJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(payload));
}

function enviarArquivo(res, filePath) {
  const extensao = path.extname(filePath);
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  };

  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Arquivo nao encontrado.");
  });

  res.writeHead(200, {
    "Content-Type": contentTypes[extensao] || "application/octet-stream",
  });

  stream.pipe(res);
}

function lerBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        reject(new Error("Requisicao excedeu 1MB."));
        req.destroy();
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && (req.url === "/" || req.url.startsWith("/index.html"))) {
    enviarArquivo(res, path.join(PUBLIC_DIR, "index.html"));
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/styles.css")) {
    enviarArquivo(res, path.join(PUBLIC_DIR, "styles.css"));
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/app.js")) {
    enviarArquivo(res, path.join(PUBLIC_DIR, "app.js"));
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/api/progresso/")) {
    const jobId = req.url.split("/").pop();
    const job = jobs.get(jobId);

    if (!job) {
      enviarJson(res, 404, { erro: "Job nao encontrado." });
      return;
    }

    enviarJson(res, 200, serializarJob(job));
    return;
  }

  if (req.method === "POST" && req.url === "/api/analisar") {
    try {
      const body = await lerBody(req);
      const payload = body ? JSON.parse(body) : {};
      const texto = payload.texto || "";
      const links = extrairLinksDeTexto(texto);

      if (links.length === 0) {
        enviarJson(res, 400, {
          erro: "Nenhum link valido do WhatsApp foi encontrado no texto enviado.",
        });
        return;
      }

      const job = criarJob();
      iniciarAnaliseEmBackground(job, links);
      enviarJson(res, 202, { jobId: job.id, total: links.length });
      return;
    } catch (erro) {
      enviarJson(res, 500, { erro: erro.message || "Erro interno." });
      return;
    }
  }

  enviarJson(res, 404, { erro: "Rota nao encontrada." });
});

server.listen(PORT, () => {
  console.log(`Servidor web ativo em http://localhost:${PORT}`);
});