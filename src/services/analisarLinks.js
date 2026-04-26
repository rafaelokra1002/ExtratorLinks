const fs = require("fs");
const path = require("path");
const { verificarGrupo } = require("./verificarGrupo");
const { delay } = require("../utils/delay");
const { extrairLinksDeTexto, salvarResultadoJson } = require("../utils/arquivo");

const TAMANHO_LOTE_PADRAO = 20;
const DELAY_ENTRE_LOTES_PADRAO = 1000;
const ARQUIVO_SAIDA = path.join(__dirname, "..", "..", "resultado.json");
const ARQUIVO_ATIVOS_TXT = path.join(__dirname, "..", "..", "ativos.txt");

async function analisarLinks(entrada, opcoes = {}) {
  const linksOriginais = Array.isArray(entrada) ? entrada : extrairLinksDeTexto(entrada);
  const links = [...new Set(linksOriginais.filter(Boolean))];
  const tamanhoLote = opcoes.tamanhoLote || TAMANHO_LOTE_PADRAO;
  const delayEntreLotes = opcoes.delayEntreLotes || DELAY_ENTRE_LOTES_PADRAO;
  const salvarArquivos = opcoes.salvarArquivos !== false;
  const onLote = typeof opcoes.onLote === "function" ? opcoes.onLote : null;
  const onProgresso = typeof opcoes.onProgresso === "function" ? opcoes.onProgresso : null;

  const ativos = [];
  const inativos = [];
  const totalLotes = Math.ceil(links.length / tamanhoLote);

  if (salvarArquivos) {
    fs.writeFileSync(ARQUIVO_ATIVOS_TXT, "", "utf-8");
  }

  for (let indice = 0; indice < links.length; indice += tamanhoLote) {
    const lote = links.slice(indice, indice + tamanhoLote);
    const numeroLote = Math.floor(indice / tamanhoLote) + 1;
    const resultados = await Promise.all(lote.map((link) => verificarGrupo(link)));

    for (const resultado of resultados) {
      if (resultado.ativo) {
        ativos.push({ nome: resultado.nome, link: resultado.link });

        if (salvarArquivos) {
          fs.appendFileSync(ARQUIVO_ATIVOS_TXT, resultado.link + "\n", "utf-8");
        }
      } else {
        inativos.push({
          link: resultado.link,
          erro: resultado.erro,
        });
      }

      if (onProgresso) {
        onProgresso({
          processados: ativos.length + inativos.length,
          total: links.length,
          ativos: ativos.length,
          inativos: inativos.length,
          ultimoResultado: resultado,
        });
      }
    }

    if (onLote) {
      onLote({
        numeroLote,
        totalLotes,
        tamanhoLote: lote.length,
        processados: ativos.length + inativos.length,
        total: links.length,
        ativos: ativos.length,
        inativos: inativos.length,
      });
    }

    if (indice + tamanhoLote < links.length) {
      await delay(delayEntreLotes);
    }
  }

  const resultado = {
    ativos,
    inativos,
    total: links.length,
    unicos: links.length,
    recebidos: linksOriginais.length,
  };

  if (salvarArquivos) {
    salvarResultadoJson(resultado, ARQUIVO_SAIDA);
  }

  return resultado;
}

module.exports = {
  analisarLinks,
  ARQUIVO_ATIVOS_TXT,
  ARQUIVO_SAIDA,
  DELAY_ENTRE_LOTES_PADRAO,
  TAMANHO_LOTE_PADRAO,
};