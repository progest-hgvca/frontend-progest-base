/**
 * Gera e envia para impressão a via em papel de uma requisição (movimentação).
 *
 * Usado tanto pelo solicitante (Histórico de Pedidos) quanto pelo setor
 * distribuidor (aba Movimentações do setor), por isso todos os dados são
 * derivados do próprio pedido — nunca do setor/usuário logado, que é
 * diferente dependendo de quem está imprimindo.
 *
 * Layout: paisagem, cabeçalho e quadro de dados compactos, no máximo 16 itens
 * por página. O bloco de assinaturas sai apenas na última página.
 *
 * @param {Object} pedido - Movimentação com `itens`, `usuario`, `setor_origem` e `setor_destino`.
 * @returns {boolean} false quando a janela de impressão foi bloqueada pelo navegador.
 */

import { formatarSimpas, unidadeMedidaDoItem } from "@/utils/formatarSimpas";
import { rotuloStatus } from "@/utils/nomenclaturaFluxo";

/**
 * Teto de itens por página. A folha em paisagem com o cabeçalho e o quadro de
 * dados compactos comporta 16 linhas sem invadir o rodapé.
 */
const MAX_ITENS_POR_PAGINA = 16;

const formatarData = (valor) => {
  if (!valor) return "N/A";
  return new Date(valor).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
};

const sanitizarLoteImpressao = (loteRaw) => {
  if (!loteRaw) return "-";
  try {
    let parsed = loteRaw;
    if (typeof loteRaw === "string" && (loteRaw.startsWith("[") || loteRaw.startsWith("{"))) {
      parsed = JSON.parse(loteRaw);
    }
    if (Array.isArray(parsed)) {
      if (!parsed.length) return "-";
      const lotes = parsed.map(l => {
        const cod = l?.lote || l?.numero_lote || l;
        return String(cod).replace(/\s*\([Vv]alidade:?[^)]*\)/g, "").replace(/^[Ll]ote:\s*/i, "").trim();
      }).filter(Boolean);
      return lotes.length ? lotes.join(", ") : "-";
    }
    if (typeof parsed === "object" && parsed !== null) {
      const cod = parsed.lote || parsed.numero_lote || "-";
      return String(cod).replace(/\s*\([Vv]alidade:?[^)]*\)/g, "").replace(/^[Ll]ote:\s*/i, "").trim() || "-";
    }
  } catch(e) {}

  const limpo = String(loteRaw)
    .replace(/\s*\([Vv]alidade:?[^)]*\)/g, "")
    .replace(/^[Ll]ote:\s*/i, "")
    .trim();
  return limpo || "-";
};

// Evita que nome de produto/observação vindos do banco quebrem o HTML gerado.
const escapar = (valor) =>
  String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Divide os itens em blocos do tamanho de uma página. */
const paginarItens = (itens, tamanho) => {
  if (!itens.length) return [[]];
  const paginas = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    paginas.push(itens.slice(i, i + tamanho));
  }
  return paginas;
};

export function imprimirPedido(pedido) {
  if (!pedido) return false;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  // O setor de origem é quem fornece; o de destino é quem solicitou.
  const setorFornecedor =
    pedido.setor_origem?.nome || pedido.setorOrigem?.nome || "N/A";
  const setorSolicitante =
    pedido.setor_destino?.nome || pedido.setorDestino?.nome || "N/A";

  // Os quatro responsáveis do fluxo. Quando o backend ainda não registrou um
  // deles, a linha sai em branco para ser preenchida à mão.
  const solicitante = pedido.usuario?.name || "N/A";
  const autorizador = pedido.aprovador?.name || "";
  const atendente = pedido.atendente?.name || "";
  const recebedor = pedido.recebedor?.name || "";

  const itens = pedido.itens || [];
  const paginas = paginarItens(itens, MAX_ITENS_POR_PAGINA);
  const totalPaginas = paginas.length;

  const cabecalho = `
      <div class="header">
        <div class="header-logo">
          LOGO<br>HOSPITAL
        </div>
        <div class="header-titles">
          <h1>REQUISIÇÃO DE MATERIAIS</h1>
          <p class="subtitle">Pedido #${pedido.id}</p>
        </div>
      </div>

      <div class="info-section">
        <div class="info-block">
          <span class="info-label">Data do Pedido</span>
          <span class="info-value">${formatarData(pedido.data_hora || pedido.created_at)}</span>
        </div>
        <div class="info-block">
          <span class="info-label">Solicitante</span>
          <span class="info-value">${escapar(solicitante)}</span>
        </div>
        <div class="info-block">
          <span class="info-label">Setor Solicitante</span>
          <span class="info-value">${escapar(setorSolicitante)}</span>
        </div>
        <div class="info-block">
          <span class="info-label">Setor Fornecedor</span>
          <span class="info-value">${escapar(setorFornecedor)}</span>
        </div>
        <div class="info-block">
          <span class="info-label">Status</span>
          <span class="info-value">
            <span class="status-badge status-${pedido.status_solicitacao}">
              ${rotuloStatus(pedido.status_solicitacao)}
            </span>
          </span>
        </div>
      </div>`;

  const blocoAssinaturas = `
      <div class="signatures-section">
        <div class="signatures-title">Carimbar ou assinar por extenso</div>
        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line">
              <strong>1. Solicitado por:</strong><br>
              <span class="signature-name">${escapar(solicitante)}</span>
            </div>
          </div>
          <div class="signature-box">
            <div class="signature-line">
              <strong>2. Autorizado por:</strong><br>
              <span class="signature-name">${autorizador ? escapar(autorizador) : "&nbsp;"}</span>
            </div>
          </div>
          <div class="signature-box">
            <div class="signature-line">
              <strong>3. Atendido por:</strong><br>
              <span class="signature-name">${atendente ? escapar(atendente) : "&nbsp;"}</span>
            </div>
          </div>
          <div class="signature-box">
            <div class="signature-line">
              <strong>4. Recebido por:</strong><br>
              <span class="signature-name">${recebedor ? escapar(recebedor) : "&nbsp;"}</span>
            </div>
          </div>
        </div>
      </div>`;

  const observacao = pedido.observacao
    ? `<div class="observacao-section"><strong>Observação:</strong> ${escapar(pedido.observacao)}</div>`
    : "";

  const linhaItem = (item, indiceGlobal) => `
            <tr>
              <td class="col-num">${indiceGlobal}</td>
              <td>${escapar(formatarSimpas(item.produto?.codigo_simpas))}</td>
              <td>${escapar(item.produto?.nome || `Produto #${item.produto_id}`)}</td>
              <td>${escapar(unidadeMedidaDoItem(item))}</td>
              <td>${escapar(pedido.status_solicitacao === 'A' ? sanitizarLoteImpressao(item.lote) : '-')}</td>
              <td class="col-qtd">${item.quantidade_solicitada}</td>
              <td class="col-qtd ${item.quantidade_liberada > 0 ? 'qtd-atendida' : 'qtd-vazia'}">
                ${item.quantidade_liberada || "-"}
              </td>
            </tr>`;

  const corpoPaginas = paginas
    .map((itensDaPagina, indicePagina) => {
      const ehUltima = indicePagina === totalPaginas - 1;
      const offset = indicePagina * MAX_ITENS_POR_PAGINA;

      const linhas = itensDaPagina.length
        ? itensDaPagina.map((item, i) => linhaItem(item, offset + i + 1)).join("")
        : `<tr><td colspan="7" class="sem-itens">Nenhum item neste pedido.</td></tr>`;

      return `
      <section class="pagina${ehUltima ? "" : " quebra"}">
        ${cabecalho}
        ${indicePagina === 0 ? observacao : ""}

        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th style="width: 118px;">Cód. SIMPAS</th>
              <th>Descrição do Item</th>
              <th style="width: 70px;">Unidade</th>
              <th style="width: 105px;">Lote</th>
              <th style="width: 80px; text-align: center;">Qtd. Solicitada</th>
              <th style="width: 80px; text-align: center;">Qtd. Atendida</th>
            </tr>
          </thead>
          <tbody>${linhas}
          </tbody>
        </table>

        ${ehUltima ? blocoAssinaturas : ""}

        <div class="footer">
          Documento gerado em ${formatarData(new Date())} — Sistema de Gestão de Estoque — ProGest HGVC
          <span class="paginacao">Página ${indicePagina + 1} de ${totalPaginas}</span>
        </div>
      </section>`;
    })
    .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pedido #${pedido.id}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 8px;
          color: #333;
          line-height: 1.3;
          -webkit-print-color-adjust: exact;
        }

        /* Cada página é um bloco fechado; a quebra é forçada entre elas. */
        .pagina {
          page-break-inside: auto;
        }

        .pagina.quebra {
          page-break-after: always;
          break-after: page;
        }

        /* --- Cabeçalho compacto --- */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 5px;
          margin-bottom: 8px;
        }

        .header-logo {
          width: 52px;
          height: 52px;
          background: #f1f5f9;
          border: 1px dashed #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 7px;
          color: #94a3b8;
          text-align: center;
          flex-shrink: 0;
        }

        .header-titles {
          text-align: right;
        }

        .header h1 {
          color: #2563eb;
          font-size: 15px;
          margin-bottom: 1px;
          letter-spacing: .3px;
        }

        .header .subtitle {
          color: #64748b;
          font-size: 10px;
        }

        /* --- Quadro de informações: metade da altura anterior --- */
        .info-section {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 3px;
          padding: 5px 8px;
          margin-bottom: 8px;
          display: flex;
          flex-wrap: nowrap;
          gap: 8px;
        }

        .info-block {
          flex: 1;
          min-width: 0;
        }

        .info-label {
          font-weight: 600;
          color: #475569;
          font-size: 9px;
          display: block;
          text-transform: uppercase;
          letter-spacing: .2px;
        }

        .info-value {
          color: #1e293b;
          font-size: 10px;
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .status-badge {
          display: inline-block;
          padding: 1px 6px;
          border-radius: 8px;
          font-size: 9px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .status-P { background: #fef3c7; color: #92400e; }
        .status-A { background: #d1fae5; color: #065f46; }
        .status-R { background: #fee2e2; color: #991b1b; }
        .status-C { background: #f3f4f6; color: #374151; }
        .status-X { background: #fee2e2; color: #991b1b; }

        /* --- Tabela de itens --- */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4px;
        }

        .items-table thead {
          display: table-header-group;
          background: #2563eb;
          color: white;
        }

        .items-table tbody {
          display: table-row-group;
        }

        .items-table th {
          padding: 4px;
          text-align: left;
          font-weight: 600;
          font-size: 10px;
        }

        .items-table td {
          padding: 3px 4px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 10px;
        }

        .items-table tr {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .items-table tbody tr:last-child td {
          border-bottom: 2px solid #2563eb;
        }

        .col-num { text-align: center; font-weight: bold; }
        .col-qtd { text-align: center; font-weight: bold; }
        .qtd-atendida { color: #059669; }
        .qtd-vazia { color: #64748b; }
        .sem-itens { text-align: center; color: #94a3b8; font-style: italic; padding: 12px; }

        .observacao-section {
          background: #fffbeb;
          border-left: 3px solid #f59e0b;
          padding: 5px 8px;
          margin: 6px 0;
          border-radius: 3px;
          font-size: 10px;
        }

        /* --- Assinaturas: só na última página --- */
        .signatures-section {
          margin-top: 18px;
          border: 1px solid #e2e8f0;
          border-radius: 3px;
          padding: 8px;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .signatures-title {
          text-align: center;
          font-size: 10px;
          color: #64748b;
          margin-bottom: 28px;
          text-transform: uppercase;
          font-weight: bold;
          letter-spacing: .5px;
        }

        .signatures {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .signature-box {
          text-align: center;
          flex: 1;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .signature-line {
          border-top: 1px solid #333;
          padding-top: 4px;
          font-size: 10px;
        }

        .signature-name {
          color: #64748b;
          display: inline-block;
          min-height: 12px;
        }

        .footer {
          margin-top: 10px;
          text-align: center;
          color: #94a3b8;
          font-size: 9px;
          position: relative;
        }

        .paginacao {
          float: right;
          font-weight: 600;
        }

        @media print {
          @page {
            size: landscape;
            margin: 8mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .items-table thead {
            display: table-header-group !important;
          }
          .items-table tbody {
            display: table-row-group !important;
          }
          .items-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .pagina.quebra {
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      </style>
    </head>
    <body>
      ${corpoPaginas}

      <${"script"}>
        window.onload = function() {
          window.print();
        };
      </${"script"}>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  return true;
}

export default imprimirPedido;
