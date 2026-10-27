/**
 * Máscara do código SIMPAS: 15 dígitos no formato 00.00.00.00000000-0.
 *
 * Extraído para um módulo próprio porque a impressão e a exportação em Excel
 * do mesmo pedido precisam produzir exatamente o mesmo código — antes a função
 * existia só no lado da impressão.
 *
 * Valores que não têm 15 dígitos são devolvidos como vieram: o cadastro aceita
 * códigos legados fora do padrão, e mascará-los à força esconderia o problema.
 *
 * @param {string|number|null} valor
 * @returns {string} código formatado, ou "-" quando vazio
 */
export function formatarSimpas(valor) {
  if (!valor) return "-";

  const s = String(valor).trim();

  if (/^\d{15}$/.test(s)) {
    return `${s.slice(0, 2)}.${s.slice(2, 4)}.${s.slice(4, 6)}.${s.slice(6, 14)}-${s.slice(14)}`;
  }

  return s;
}

/**
 * Unidade de medida de um item de pedido, tolerante às várias formas com que
 * a API serializa o relacionamento (snake_case, camelCase, sigla ou nome).
 *
 * @param {Object} item - item de movimentação com `.produto`
 * @returns {string}
 */
export function unidadeMedidaDoItem(item) {
  const produto = item?.produto;
  if (!produto) return "-";

  return (
    produto.unidade_medida?.sigla ||
    produto.unidade_medida?.nome ||
    produto.unidadeMedida?.sigla ||
    produto.unidadeMedida?.nome ||
    "-"
  );
}

export default formatarSimpas;
