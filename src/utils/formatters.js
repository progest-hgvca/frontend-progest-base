/**
 * Helper global de formatação de Setor com identificação do Polo.
 * Utilizado em qualquer Select/lista onde setores homônimos precisam ser diferenciados.
 *
 * Formatos de saída:
 *   - Com sigla:    "[UPA] Farmácia"
 *   - Sem sigla:    "Farmácia (Hospital Geral)"
 *   - Sem polo:     "Farmácia"
 *
 * @param {Object} setor - objeto com .nome, .polo?.nome, .polo?.sigla
 * @returns {string}
 */
export function formatarNomeSetor(setor) {
  if (!setor) return '';
  const nomePolo = setor.polo?.nome || '';
  const siglaPolo = setor.polo?.sigla || '';

  if (siglaPolo) {
    return `[${siglaPolo}] ${setor.nome}`;
  }
  if (nomePolo) {
    return `${setor.nome} (${nomePolo})`;
  }
  return setor.nome || '';
}

/**
 * Formata o nome do Polo para exibição (usa sigla se disponível).
 * Ex: "UPA" ou "Hospital Geral"
 *
 * @param {Object} polo - objeto com .nome, .sigla
 * @returns {string}
 */
export function formatarNomePolo(polo) {
  if (!polo) return '';
  return polo.sigla ? polo.sigla : polo.nome || '';
}
