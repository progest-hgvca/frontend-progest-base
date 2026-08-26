/**
 * Gera e envia para impressão a via em papel de uma requisição (movimentação).
 *
 * Usado tanto pelo solicitante (Histórico de Pedidos) quanto pelo setor
 * distribuidor (aba Movimentações do setor), por isso todos os dados são
 * derivados do próprio pedido — nunca do setor/usuário logado, que é
 * diferente dependendo de quem está imprimindo.
 *
 * @param {Object} pedido - Movimentação com `itens`, `usuario`, `setor_origem` e `setor_destino`.
 * @returns {boolean} false quando a janela de impressão foi bloqueada pelo navegador.
 */

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

// Evita que nome de produto/observação vindos do banco quebrem o HTML gerado.
const escapar = (valor) =>
  String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function imprimirPedido(pedido) {
  if (!pedido) return false;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  // O setor de origem é quem fornece; o de destino é quem solicitou.
  const setorFornecedor =
    pedido.setor_origem?.nome || pedido.setorOrigem?.nome || "N/A";
  const setorSolicitante =
    pedido.setor_destino?.nome || pedido.setorDestino?.nome || "N/A";
  const solicitante = pedido.usuario?.name || "N/A";
  const itens = pedido.itens || [];

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
          padding: 40px;
          color: #333;
          line-height: 1.6;
        }

        .header {
          text-align: center;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }

        .header h1 {
          color: #2563eb;
          font-size: 28px;
          margin-bottom: 5px;
        }

        .header .subtitle {
          color: #64748b;
          font-size: 14px;
        }

        .info-section {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px dashed #e2e8f0;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          font-weight: 600;
          color: #475569;
          min-width: 150px;
        }

        .info-value {
          color: #1e293b;
          text-align: right;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .status-P { background: #fef3c7; color: #92400e; }
        .status-A { background: #d1fae5; color: #065f46; }
        .status-R { background: #fee2e2; color: #991b1b; }
        .status-C { background: #f3f4f6; color: #374151; }
        .status-X { background: #fee2e2; color: #991b1b; }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        .items-table thead {
          background: #2563eb;
          color: white;
        }

        .items-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
        }

        .items-table td {
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
        }

        .items-table tbody tr:last-child td {
          border-bottom: 2px solid #2563eb;
        }

        .observacao-section {
          background: #fffbeb;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }

        .observacao-section h3 {
          color: #92400e;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e2e8f0;
          text-align: center;
          color: #64748b;
          font-size: 12px;
        }

        .signatures {
          display: flex;
          justify-content: space-around;
          margin-top: 60px;
          margin-bottom: 20px;
        }

        .signature-box {
          text-align: center;
          width: 250px;
        }

        .signature-line {
          border-top: 2px solid #333;
          margin-bottom: 8px;
          padding-top: 60px;
        }

        @media print {
          body {
            padding: 20px;
          }

          .no-print {
            display: none;
          }
        }

        @page {
          margin: 2cm;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>REQUISIÇÃO DE MATERIAIS</h1>
        <p class="subtitle">Pedido #${pedido.id}</p>
      </div>

      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Data do Pedido:</span>
          <span class="info-value">${formatarDataHora(pedido.data_hora || pedido.created_at)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Solicitante:</span>
          <span class="info-value">${escapar(solicitante)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Setor Solicitante:</span>
          <span class="info-value">${escapar(setorSolicitante)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Setor Fornecedor:</span>
          <span class="info-value">${escapar(setorFornecedor)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status:</span>
          <span class="info-value">
            <span class="status-badge status-${pedido.status_solicitacao}">
              ${getStatusLabel(pedido.status_solicitacao)}
            </span>
          </span>
        </div>
      </div>

      ${
        pedido.observacao
          ? `
        <div class="observacao-section">
          <h3>Observação:</h3>
          <p>${escapar(pedido.observacao)}</p>
        </div>
      `
          : ""
      }

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 60px;">#</th>
            <th>Produto</th>
            <th style="width: 150px; text-align: center;">Qtd. Solicitada</th>
            <th style="width: 150px; text-align: center;">Qtd. Liberada</th>
          </tr>
        </thead>
        <tbody>
          ${itens
            .map(
              (item, index) => `
            <tr>
              <td style="text-align: center; font-weight: bold;">${index + 1}</td>
              <td>
                ${escapar(item.produto?.nome || `Produto #${item.produto_id}`)}
                ${(() => {
                  if (pedido.status_solicitacao !== 'A' || !item.lote) return '';
                  try {
                    const lotes = JSON.parse(item.lote);
                    if (!lotes.length) return '';
                    return '<div style="margin-top: 4px; font-size: 11px; color: #64748b;">' + 
                      'Lotes consumidos: ' + lotes.map(l => `<strong>${escapar(l.lote)}</strong> (${l.qtd})`).join(', ') +
                      '</div>';
                  } catch(e) { return ''; }
                })()}
              </td>
              <td style="text-align: center; font-weight: bold;">${item.quantidade_solicitada}</td>
              <td style="text-align: center; font-weight: bold; color: ${
                item.quantidade_liberada > 0 ? "#059669" : "#64748b"
              };">
                ${item.quantidade_liberada || "-"}
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      <div class="signatures">
        <div class="signature-box">
          <div class="signature-line"></div>
          <p><strong>Solicitante</strong></p>
          <p style="font-size: 12px; color: #64748b;">${escapar(solicitante)}</p>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <p><strong>Responsável pela Entrega</strong></p>
          <p style="font-size: 12px; color: #64748b;">Setor: ${escapar(setorFornecedor)}</p>
        </div>
      </div>

      <div class="footer">
        <p>Documento gerado em ${new Date().toLocaleString("pt-BR")}</p>
        <p style="margin-top: 5px;">Sistema de Gestão de Estoque - ProGest HGVC</p>
      </div>

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
