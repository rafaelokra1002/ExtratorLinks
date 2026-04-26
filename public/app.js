const textoLinks = document.getElementById("textoLinks");
const analisarBtn = document.getElementById("analisarBtn");
const limparBtn = document.getElementById("limparBtn");
const arquivoLinks = document.getElementById("arquivoLinks");
const mensagem = document.getElementById("mensagem");
const statusBadge = document.getElementById("statusBadge");
const totalRecebidos = document.getElementById("totalRecebidos");
const totalUnicos = document.getElementById("totalUnicos");
const totalAtivos = document.getElementById("totalAtivos");
const totalInativos = document.getElementById("totalInativos");
const resultadoLista = document.getElementById("resultadoLista");
const copiarBtn = document.getElementById("copiarBtn");
const baixarBtn = document.getElementById("baixarBtn");
const progressoTexto = document.getElementById("progressoTexto");
const progressoPercentual = document.getElementById("progressoPercentual");
const progressoBarra = document.getElementById("progressoBarra");
const processoLog = document.getElementById("processoLog");

let ultimoResultado = null;
let pollingId = null;

function atualizarAcoesResultado() {
  const temResultados = Boolean(ultimoResultado && ultimoResultado.ativos.length);
  copiarBtn.disabled = !temResultados;
  baixarBtn.disabled = !ultimoResultado;
}

function definirMensagem(texto, tipo = "") {
  mensagem.textContent = texto;
  mensagem.className = `message ${tipo}`.trim();
}

async function lerRespostaJson(response) {
  const texto = await response.text();

  if (!texto) {
    return {};
  }

  try {
    return JSON.parse(texto);
  } catch {
    return {
      erro: texto,
    };
  }
}

function atualizarProgresso(progresso = {}, logs = []) {
  const percentual = progresso.percentual || 0;
  const numeroLote = progresso.numeroLote || 0;
  const totalLotes = progresso.totalLotes || 0;
  const processados = progresso.processados || 0;
  const total = progresso.total || 0;

  progressoBarra.style.width = `${percentual}%`;
  progressoPercentual.textContent = `${percentual}%`;
  progressoTexto.textContent = totalLotes
    ? `Lote ${numeroLote}/${totalLotes} • ${processados}/${total} processados`
    : "Nenhum processamento em andamento";

  processoLog.innerHTML = "";
  const linhas = logs.length ? logs : ["[idle] aguardando novo lote para iniciar"];

  linhas.forEach((linha) => {
    const item = document.createElement("p");
    item.textContent = linha;
    processoLog.appendChild(item);
  });
}

function pararPolling() {
  if (pollingId) {
    clearInterval(pollingId);
    pollingId = null;
  }
}

function finalizarComErro(mensagemErro) {
  statusBadge.textContent = "Erro";
  statusBadge.classList.remove("loading");
  definirMensagem(mensagemErro, "error");
  analisarBtn.disabled = false;
}

async function acompanharJob(jobId) {
  pararPolling();

  pollingId = setInterval(async () => {
    try {
      const response = await fetch(`/api/progresso/${jobId}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.erro || "Falha ao consultar progresso.");
      }

      atualizarProgresso(payload.progresso, payload.logs);
      totalRecebidos.textContent = payload.progresso.total || 0;
      totalUnicos.textContent = payload.progresso.total || 0;
      totalAtivos.textContent = payload.progresso.ativos || 0;
      totalInativos.textContent = payload.progresso.inativos || 0;

      if (payload.status === "done") {
        pararPolling();
        renderizarResultado(payload.resultado);
        definirMensagem(
          `Analise finalizada com ${payload.resultado.ativos.length} grupo(s) ativo(s).`,
          "success"
        );
        analisarBtn.disabled = false;
      }

      if (payload.status === "error") {
        pararPolling();
        statusBadge.textContent = "Erro";
        statusBadge.classList.remove("loading");
        definirMensagem(payload.erro || "Falha ao analisar os links.", "error");
        analisarBtn.disabled = false;
      }
    } catch (erro) {
      pararPolling();
      statusBadge.textContent = "Erro";
      statusBadge.classList.remove("loading");
      definirMensagem(erro.message, "error");
      analisarBtn.disabled = false;
    }
  }, 800);
}

function renderizarResultado(resultado) {
  ultimoResultado = resultado;
  totalRecebidos.textContent = resultado.recebidos || 0;
  totalUnicos.textContent = resultado.unicos || 0;
  totalAtivos.textContent = resultado.ativos.length;
  totalInativos.textContent = resultado.inativos.length;
  statusBadge.textContent = "Concluido";
  statusBadge.classList.remove("loading");
  statusBadge.classList.add("done");
  atualizarProgresso(
    {
      percentual: 100,
      numeroLote: Math.max(1, Math.ceil((resultado.total || 0) / 20)),
      totalLotes: Math.max(1, Math.ceil((resultado.total || 0) / 20)),
      processados: resultado.total || 0,
      total: resultado.total || 0,
    },
    [`[done] analise finalizada com ${resultado.ativos.length} grupo(s) ativo(s)`]
  );
  atualizarAcoesResultado();

  if (!resultado.ativos.length) {
    resultadoLista.className = "result-list empty";
    resultadoLista.textContent = "Nenhum grupo ativo encontrado.";
    return;
  }

  resultadoLista.className = "result-list";
  resultadoLista.innerHTML = "";

  resultado.ativos.forEach((item) => {
    const card = document.createElement("article");
    card.className = "result-item";

    const meta = document.createElement("span");
    meta.className = "result-meta";
    meta.textContent = "active match";

    const title = document.createElement("h4");
    title.textContent = item.nome;

    const link = document.createElement("a");
    link.href = item.link;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = item.link;

    card.append(meta, title, link);
    resultadoLista.appendChild(card);
  });
}

async function analisar() {
  const texto = textoLinks.value.trim();

  if (!texto) {
    definirMensagem("Cole links ou carregue um arquivo antes de analisar.", "error");
    return;
  }

  analisarBtn.disabled = true;
  statusBadge.textContent = "Analisando";
  statusBadge.classList.add("loading");
  statusBadge.classList.remove("done");
  definirMensagem("Processando links. Isso pode levar alguns segundos.");

  try {
    const response = await fetch("/api/analisar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ texto }),
    });

    const payload = await lerRespostaJson(response);

    if (!response.ok) {
      throw new Error(payload.erro || "Falha ao analisar os links.");
    }

    if (response.status === 202) {
      atualizarProgresso(
        {
          percentual: 0,
          numeroLote: 0,
          totalLotes: Math.max(1, Math.ceil((payload.total || 0) / 20)),
          processados: 0,
          total: payload.total || 0,
        },
        [`[init] job ${payload.jobId} criado`, "[init] aguardando primeiro lote..."]
      );
      acompanharJob(payload.jobId);
      return;
    }

    renderizarResultado(payload);
    definirMensagem(
      `Analise finalizada com ${payload.ativos.length} grupo(s) ativo(s).`,
      "success"
    );
  } catch (erro) {
    finalizarComErro(erro.message);
  } finally {
    if (!pollingId) {
      analisarBtn.disabled = false;
    }
  }
}

arquivoLinks.addEventListener("change", async (event) => {
  const [arquivo] = event.target.files;
  if (!arquivo) {
    return;
  }

  textoLinks.value = await arquivo.text();
  definirMensagem(`Arquivo ${arquivo.name} carregado.`, "success");
});

analisarBtn.addEventListener("click", analisar);

limparBtn.addEventListener("click", () => {
  textoLinks.value = "";
  arquivoLinks.value = "";
  ultimoResultado = null;
  resultadoLista.className = "result-list empty";
  resultadoLista.textContent = "Nenhum resultado ainda.";
  statusBadge.textContent = "Aguardando";
  statusBadge.classList.remove("loading");
  statusBadge.classList.remove("done");
  pararPolling();
  totalRecebidos.textContent = "0";
  totalUnicos.textContent = "0";
  totalAtivos.textContent = "0";
  totalInativos.textContent = "0";
  atualizarProgresso();
  definirMensagem("");
  atualizarAcoesResultado();
});

copiarBtn.addEventListener("click", async () => {
  if (!ultimoResultado || !ultimoResultado.ativos.length) {
    definirMensagem("Nao ha links ativos para copiar.", "error");
    return;
  }

  const texto = ultimoResultado.ativos.map((item) => item.link).join("\n");
  await navigator.clipboard.writeText(texto);
  definirMensagem("Links ativos copiados.", "success");
});

baixarBtn.addEventListener("click", () => {
  if (!ultimoResultado) {
    definirMensagem("Nao ha resultado para baixar.", "error");
    return;
  }

  const blob = new Blob([JSON.stringify(ultimoResultado, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "resultado-web.json";
  link.click();
  URL.revokeObjectURL(url);
});

atualizarAcoesResultado();
atualizarProgresso();