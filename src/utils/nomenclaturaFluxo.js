/**
 * Fonte única de verdade para o nome de cada fluxo de movimentação.
 *
 * O problema que este módulo resolve:
 *
 * 1. Existe um só código `D` para devolução. Se ela é uma SAÍDA ou uma ENTRADA
 *    não está gravado em lugar nenhum — depende de quem está olhando. Para a
 *    farmácia que recebe de volta é uma entrada; para o setor que devolveu é
 *    uma saída. Por isso `descreverFluxo` sempre exige o setor de referência.
 *
 * 2. `T` e `S` descrevem a MESMA operação (uma requisição); a diferença é só
 *    por qual tela ela foi criada — almoxarife (`T`) ou solicitante (`S`).
 *    Aqui os dois recebem o mesmo rótulo.
 *
 * 3. Antes disso os rótulos estavam duplicados em 8 arquivos, divergindo entre
 *    si: `T` era "Transferência" num lugar e "Requisição" em outro; `S` era
 *    "Saída", "Solicitação", "Pedido" e "Saída/Solicitação".
 *
 * Espelha `App\Models\Movimentacao::rotuloFluxoPara()` no backend.
 */

import {
  isEntradaMovimentacao,
  isSaidaMovimentacao,
} from "@/utils/movimentacaoPermissions";

export const FLUXOS = {
  REQUISICAO_ENVIADA: {
    codigo: "REQUISICAO_ENVIADA",
    rotulo: "Requisição enviada",
    rotuloCurto: "Requisição",
    descricao: "Você pediu estes itens ao setor fornecedor",
    sentido: "entrada",
    icone: "mdi-tray-arrow-down",
    cor: "emerald",
  },
  REQUISICAO_A_ATENDER: {
    codigo: "REQUISICAO_A_ATENDER",
    rotulo: "Requisição a atender",
    rotuloCurto: "A atender",
    descricao: "Outro setor pediu estes itens ao seu estoque",
    sentido: "saida",
    icone: "mdi-tray-arrow-up",
    cor: "sky",
  },
  DEVOLUCAO_ENVIADA: {
    codigo: "DEVOLUCAO_ENVIADA",
    rotulo: "Devolução enviada",
    rotuloCurto: "Devolução enviada",
    descricao: "Saída do seu estoque: você está devolvendo itens",
    sentido: "saida",
    icone: "mdi-undo-variant",
    cor: "amber",
  },
  DEVOLUCAO_RECEBIDA: {
    codigo: "DEVOLUCAO_RECEBIDA",
    rotulo: "Devolução recebida",
    rotuloCurto: "Devolução recebida",
    descricao: "Entrada no seu estoque: outro setor devolveu itens",
    sentido: "entrada",
    icone: "mdi-redo-variant",
    cor: "violet",
  },
  CONSUMO_INTERNO: {
    codigo: "CONSUMO_INTERNO",
    rotulo: "Consumo interno",
    rotuloCurto: "Consumo",
    descricao: "Baixa por uso dentro do próprio setor",
    sentido: "saida",
    icone: "mdi-clipboard-minus-outline",
    cor: "slate",
  },
  // Usado quando não há setor de referência — listas globais, relatórios
  // consolidados — onde não existe "meu estoque" para orientar o sentido.
  REQUISICAO: {
    codigo: "REQUISICAO",
    rotulo: "Requisição",
    rotuloCurto: "Requisição",
    descricao: "Transferência de itens entre setores",
    sentido: "neutro",
    icone: "mdi-swap-horizontal",
    cor: "sky",
  },
  DEVOLUCAO: {
    codigo: "DEVOLUCAO",
    rotulo: "Devolução",
    rotuloCurto: "Devolução",
    descricao: "Retorno de itens ao setor fornecedor",
    sentido: "neutro",
    icone: "mdi-undo-variant",
    cor: "amber",
  },
};

/**
 * Descreve o fluxo de uma movimentação do ponto de vista de um setor.
 *
 * @param {Object} mov - movimentação com `tipo`, `setor_origem_id`, `setor_destino_id`
 * @param {number|string|null} setorAtualId - setor de referência; sem ele, devolve o rótulo neutro
 * @returns {{codigo:string, rotulo:string, rotuloCurto:string, descricao:string, sentido:string, icone:string, cor:string}}
 */
export function descreverFluxo(mov, setorAtualId = null) {
  if (!mov) return FLUXOS.REQUISICAO;

  if (mov.tipo === "C") {
    return FLUXOS.CONSUMO_INTERNO;
  }

  // Sem setor de referência não dá para dizer o sentido: o mesmo registro é
  // entrada para um lado e saída para o outro.
  if (!setorAtualId) {
    return mov.tipo === "D" ? FLUXOS.DEVOLUCAO : FLUXOS.REQUISICAO;
  }

  const souOrigem = isSaidaMovimentacao(mov, setorAtualId);
  const souDestino = isEntradaMovimentacao(mov, setorAtualId);

  if (mov.tipo === "D") {
    if (souOrigem) return FLUXOS.DEVOLUCAO_ENVIADA;
    if (souDestino) return FLUXOS.DEVOLUCAO_RECEBIDA;
    return FLUXOS.DEVOLUCAO;
  }

  if (souDestino) return FLUXOS.REQUISICAO_ENVIADA;
  if (souOrigem) return FLUXOS.REQUISICAO_A_ATENDER;
  return FLUXOS.REQUISICAO;
}

/** Atalho para o rótulo completo. */
export function rotuloFluxo(mov, setorAtualId = null) {
  return descreverFluxo(mov, setorAtualId).rotulo;
}

/** O fluxo representa entrada no estoque do setor de referência? */
export function ehEntradaNoEstoque(mov, setorAtualId) {
  return descreverFluxo(mov, setorAtualId).sentido === "entrada";
}

/**
 * Rótulo do tipo sem considerar perspectiva. Para relatórios e exportações
 * que listam movimentações de vários setores ao mesmo tempo.
 */
export function rotuloTipo(tipo) {
  const mapa = {
    T: "Requisição",
    S: "Requisição",
    D: "Devolução",
    C: "Consumo interno",
  };
  return mapa[tipo] || tipo || "-";
}

/** Rótulo do status da solicitação. */
export function rotuloStatus(status) {
  const mapa = {
    C: "Rascunho",
    P: "Pendente",
    A: "Aprovado",
    R: "Rejeitado",
    X: "Cancelado",
  };
  return mapa[status] || status || "-";
}

/**
 * Como chamar a coluna de quantidade em cada fluxo. Numa devolução,
 * "Qtd. solicitada" significa "quanto se pediu para devolver" — dizer apenas
 * "solicitada" confunde com o pedido original.
 */
export function rotulosQuantidade(mov) {
  if (mov?.tipo === "D") {
    return {
      solicitada: "Qtd. a devolver",
      atendida: "Qtd. aceita",
    };
  }
  return {
    solicitada: "Qtd. solicitada",
    atendida: "Qtd. atendida",
  };
}

export default descreverFluxo;
