/**
 * Exporta requisições (movimentações) para Excel.
 *
 * Contraparte de `imprimirPedido.js`: mesma origem de dados e mesmas regras de
 * leitura — tudo é derivado do próprio pedido, nunca do setor/usuário logado,
 * que muda conforme quem está exportando.
 *
 * São dois usos:
 *  - `exportarPedidoExcel(pedido)`      → uma planilha com a via de um pedido
 *  - `exportarPedidosExcel(pedidos)`    → duas abas (resumo + itens) da lista filtrada
 *
 * Ambas são assíncronas: a biblioteca xlsx (~290 kB) só é baixada quando o
 * usuário exporta de fato, para não pesar no carregamento inicial do sistema.
 */

/** Carrega o xlsx sob demanda (code splitting) */
const carregarXLSX = () => import("xlsx");

const formatarDataHora = (valor) => {
  if (!valor) return "N/A";
  return new Date(valor).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusLabel = (status) => {
  const labels = {
    P: "Pendente",
    A: "Aprovado",
    R: "Rejeitado",
    C: "Rascunho",
    X: "Cancelado",
  };
  return labels[status] || status || "-";
};

const getSetorFornecedor = (pedido) =>
  pedido.setor_origem?.nome || pedido.setorOrigem?.nome || "N/A";

const getSetorSolicitante = (pedido) =>
  pedido.setor_destino?.nome || pedido.setorDestino?.nome || "N/A";

const getTipoLabel = (tipo) => {
  const labels = { T: "Transferência", D: "Devolução", S: "Saída/Solicitação" };
  return labels[tipo] || tipo || "-";
};

/**
 * Os lotes consumidos ficam serializados em JSON no campo `lote` do item,
 * preenchidos na aprovação (baixa FIFO). Só existem em pedidos aprovados.
 */
const getLotesConsumidos = (pedido, item) => {
  if (pedido.status_solicitacao !== "A" || !item.lote) return "";
  try {
    const lotes = JSON.parse(item.lote);
    if (!Array.isArray(lotes) || !lotes.length) return "";
    return lotes.map((l) => `${l.lote} (${l.qtd})`).join(", ");
  } catch (e) {
    // Pedidos antigos podem ter o lote gravado como texto simples
    return String(item.lote);
  }
};

const getNomeProduto = (item) =>
  item.produto?.nome || `Produto #${item.produto_id}`;

/** Nome de arquivo sem caracteres inválidos para o sistema de arquivos */
const sanitizarNomeArquivo = (valor) =>
  String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "_");

const dataArquivo = () => new Date().toISOString().slice(0, 10);

/**
 * Exporta um único pedido — mesmo conteúdo da via impressa.
 *
 * @param {Object} pedido - Movimentação com `itens`, `usuario`, `setor_origem` e `setor_destino`.
 * @returns {Promise<boolean>} false quando não há pedido para exportar.
 */
export async function exportarPedidoExcel(pedido) {
  if (!pedido) return false;

  const XLSX = await carregarXLSX();
  const itens = pedido.itens || [];
  const linhas = [];

  linhas.push(["REQUISIÇÃO DE MATERIAIS"]);
  linhas.push([`Pedido #${pedido.id}`]);
  linhas.push([]);

  linhas.push(["Data do Pedido", formatarDataHora(pedido.data_hora || pedido.created_at)]);
  linhas.push(["Tipo", getTipoLabel(pedido.tipo)]);
  linhas.push(["Solicitante", pedido.usuario?.name || "N/A"]);
  linhas.push(["Setor Solicitante", getSetorSolicitante(pedido)]);
  linhas.push(["Setor Fornecedor", getSetorFornecedor(pedido)]);
  linhas.push(["Status", getStatusLabel(pedido.status_solicitacao)]);
  if (pedido.aprovador?.name) {
    linhas.push(["Aprovado por", pedido.aprovador.name]);
  }
  if (pedido.observacao) {
    linhas.push(["Observação", pedido.observacao]);
  }
  linhas.push([]);

  linhas.push(["#", "Produto", "Qtd. Solicitada", "Qtd. Liberada", "Lotes consumidos"]);

  let totalSolicitado = 0;
  let totalLiberado = 0;

  itens.forEach((item, index) => {
    const solicitada = Number(item.quantidade_solicitada) || 0;
    const liberada = Number(item.quantidade_liberada) || 0;
    totalSolicitado += solicitada;
    totalLiberado += liberada;

    linhas.push([
      index + 1,
      getNomeProduto(item),
      solicitada,
      liberada,
      getLotesConsumidos(pedido, item),
    ]);
  });

  linhas.push(["", "TOTAL", totalSolicitado, totalLiberado, ""]);
  linhas.push([]);
  linhas.push([`Documento gerado em ${new Date().toLocaleString("pt-BR")}`]);
  linhas.push(["Sistema de Gestão de Estoque - ProGest HGVC"]);

  const ws = XLSX.utils.aoa_to_sheet(linhas);
  ws["!cols"] = [
    { wch: 6 },
    { wch: 45 },
    { wch: 16 },
    { wch: 16 },
    { wch: 40 },
  ];
  // Mescla as células do título e do subtítulo para as 5 colunas
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Pedido ${pedido.id}`);
  XLSX.writeFile(wb, `pedido_${pedido.id}_${dataArquivo()}.xlsx`);

  return true;
}

/**
 * Exporta uma lista de requisições em duas abas:
 *  - "Requisições": uma linha por pedido, com totais
 *  - "Itens": uma linha por item, para dinâmicas e filtros no Excel
 *
 * @param {Array} pedidos - Lista já filtrada, na ordem exibida na tela.
 * @param {Object} [opcoes]
 * @param {string} [opcoes.nomeArquivo] - Base do nome do arquivo gerado.
 * @param {string} [opcoes.titulo] - Contexto exibido no topo da aba de resumo.
 * @returns {Promise<boolean>} false quando a lista está vazia.
 */
export async function exportarPedidosExcel(pedidos, opcoes = {}) {
  const lista = Array.isArray(pedidos) ? pedidos : [];
  if (lista.length === 0) return false;

  const XLSX = await carregarXLSX();
  const { nomeArquivo = "requisicoes", titulo = "Requisições" } = opcoes;

  /* ----- Aba 1: uma linha por requisição ----- */
  const resumo = [];
  resumo.push([titulo]);
  resumo.push([`Gerado em ${new Date().toLocaleString("pt-BR")} — ${lista.length} requisição(ões)`]);
  resumo.push([]);
  resumo.push([
    "Pedido",
    "Data/Hora",
    "Tipo",
    "Status",
    "Solicitante",
    "Setor Solicitante",
    "Setor Fornecedor",
    "Itens",
    "Qtd. Solicitada",
    "Qtd. Liberada",
    "Observação",
  ]);

  lista.forEach((pedido) => {
    const itens = pedido.itens || [];
    const totalSolicitado = itens.reduce(
      (soma, item) => soma + (Number(item.quantidade_solicitada) || 0),
      0,
    );
    const totalLiberado = itens.reduce(
      (soma, item) => soma + (Number(item.quantidade_liberada) || 0),
      0,
    );

    resumo.push([
      pedido.id,
      formatarDataHora(pedido.data_hora || pedido.created_at),
      getTipoLabel(pedido.tipo),
      getStatusLabel(pedido.status_solicitacao),
      pedido.usuario?.name || "N/A",
      getSetorSolicitante(pedido),
      getSetorFornecedor(pedido),
      itens.length,
      totalSolicitado,
      totalLiberado,
      pedido.observacao || "",
    ]);
  });

  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  wsResumo["!cols"] = [
    { wch: 8 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 25 },
    { wch: 28 }, { wch: 28 }, { wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 40 },
  ];
  wsResumo["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
  ];

  /* ----- Aba 2: uma linha por item ----- */
  const detalhe = [];
  detalhe.push([
    "Pedido",
    "Data/Hora",
    "Status",
    "Setor Solicitante",
    "Setor Fornecedor",
    "Produto",
    "Qtd. Solicitada",
    "Qtd. Liberada",
    "Lotes consumidos",
  ]);

  lista.forEach((pedido) => {
    (pedido.itens || []).forEach((item) => {
      detalhe.push([
        pedido.id,
        formatarDataHora(pedido.data_hora || pedido.created_at),
        getStatusLabel(pedido.status_solicitacao),
        getSetorSolicitante(pedido),
        getSetorFornecedor(pedido),
        getNomeProduto(item),
        Number(item.quantidade_solicitada) || 0,
        Number(item.quantidade_liberada) || 0,
        getLotesConsumidos(pedido, item),
      ]);
    });
  });

  const wsDetalhe = XLSX.utils.aoa_to_sheet(detalhe);
  wsDetalhe["!cols"] = [
    { wch: 8 }, { wch: 18 }, { wch: 12 }, { wch: 28 }, { wch: 28 },
    { wch: 45 }, { wch: 16 }, { wch: 16 }, { wch: 40 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsResumo, "Requisições");
  XLSX.utils.book_append_sheet(wb, wsDetalhe, "Itens");
  XLSX.writeFile(wb, `${sanitizarNomeArquivo(nomeArquivo)}_${dataArquivo()}.xlsx`);

  return true;
}

export default exportarPedidoExcel;
