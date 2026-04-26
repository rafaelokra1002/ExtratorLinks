const path = require("path");
const fs = require("fs");
const {
  analisarLinks,
  ARQUIVO_ATIVOS_TXT,
  ARQUIVO_SAIDA,
  DELAY_ENTRE_LOTES_PADRAO,
  TAMANHO_LOTE_PADRAO,
} = require("./services/analisarLinks");
const { lerLinksDoArquivo } = require("./utils/arquivo");

// ─── Configurações ───────────────────────────────────────
const ARQUIVO_LINKS = path.join(__dirname, "..", "links.txt");

// ─── Links de exemplo (usados se links.txt não existir) ──
const LINKS_EXEMPLO = [
  "https://chat.whatsapp.com/abc123",
  "https://chat.whatsapp.com/xyz456",
];

/**
 * Exibe o resumo final no console.
 */
function exibirResumo(resultado) {
  console.log("\n" + "─".repeat(60));
  console.log("\n📊 RESUMO FINAL\n");
  console.log(`  ✅ Ativos:   ${resultado.ativos.length}`);
  console.log(`  ❌ Inativos: ${resultado.inativos.length}`);
  console.log(`  📋 Total:    ${resultado.ativos.length + resultado.inativos.length}`);

  if (resultado.ativos.length > 0) {
    console.log("\n📗 GRUPOS ATIVOS:");
    resultado.ativos.forEach((g) => {
      console.log(`  • ${g.nome} → ${g.link}`);
    });
  }

  if (resultado.inativos.length > 0) {
    console.log("\n📕 GRUPOS INATIVOS:");
    resultado.inativos.forEach((g) => {
      console.log(`  • ${g.link}`);
    });
  }
}

/**
 * Função principal.
 */
async function main() {
  console.log("═".repeat(60));
  console.log("  🔗 ANALISADOR DE LINKS DE GRUPOS DO WHATSAPP");
  console.log("═".repeat(60));

  // Determinar fonte dos links
  let links;

  if (fs.existsSync(ARQUIVO_LINKS)) {
    console.log(`\n📄 Lendo links do arquivo: ${ARQUIVO_LINKS}`);
    links = lerLinksDoArquivo(ARQUIVO_LINKS);

    if (links.length === 0) {
      console.log("⚠️  Nenhum link encontrado no arquivo. Verifique o conteúdo.");
      return;
    }
  } else {
    console.log("\n📄 Arquivo links.txt não encontrado. Usando links de exemplo.");
    links = LINKS_EXEMPLO;
  }

  console.log(`📋 ${links.length} link(s) para analisar.`);
  console.log(`\n🔍 ${links.length} links → ${Math.ceil(links.length / TAMANHO_LOTE_PADRAO)} lotes de ${TAMANHO_LOTE_PADRAO}\n`);
  console.log("─".repeat(60));

  // Processar todos os links
  const resultado = await analisarLinks(links, {
    tamanhoLote: TAMANHO_LOTE_PADRAO,
    delayEntreLotes: DELAY_ENTRE_LOTES_PADRAO,
    salvarArquivos: true,
    onLote: ({ numeroLote, totalLotes, tamanhoLote, processados, total, ativos, inativos }) => {
      console.log(`\n📦 LOTE ${numeroLote}/${totalLotes} (${tamanhoLote} links)`);
      console.log(`  📊 Total: ${ativos} ativos, ${inativos} inativos (${processados}/${total})`);

      if (numeroLote < totalLotes) {
        console.log(`  ⏳ Pausa de ${DELAY_ENTRE_LOTES_PADRAO / 1000}s...`);
      }
    },
    onProgresso: ({ ultimoResultado }) => {
      if (ultimoResultado.ativo) {
        console.log(`  ✅ ${ultimoResultado.nome} → ${ultimoResultado.link}`);
      }
    },
  });

  // Exibir resumo
  exibirResumo(resultado);
  console.log(`\n💾 Resultado salvo em: ${ARQUIVO_SAIDA}`);
  console.log(`📄 Links ativos salvos em: ${ARQUIVO_ATIVOS_TXT}`);

  console.log("\n" + "═".repeat(60));
  console.log("  ✔️  Análise concluída!");
  console.log("═".repeat(60) + "\n");
}

main().catch((erro) => {
  console.error("❌ Erro fatal:", erro.message);
  process.exit(1);
});
