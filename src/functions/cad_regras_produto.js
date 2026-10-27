/**
 * API das regras de produto por categoria de setor.
 *
 * Duas camadas, espelhando o backend:
 *  - regras por categoria (Farmácia / Internamento / Administrativo), que
 *    definem que grupos de produto cada tipo de setor pode solicitar;
 *  - exceções por setor, para casos isolados que não justificam afrouxar a
 *    regra da categoria inteira.
 */

import axios from "axios";

const auth = () => ({
  headers: {
    Authorization: "Bearer " + (localStorage.getItem("token") || ""),
    "Content-Type": "application/json",
  },
});

/**
 * Quadro completo: categorias, grupos disponíveis, grupos liberados por
 * categoria e exceções cadastradas.
 *
 * @param {Object} [filtros] - { setor_id } para limitar as exceções a um setor
 */
export async function listarRegras(filtros = {}) {
  const { data } = await axios.post("/regras-produto/list", filtros, auth());
  if (!data.status) throw new Error(data.message || "Erro ao carregar as regras.");
  return data.data;
}

/**
 * Substitui por completo a lista de grupos liberados para uma categoria.
 *
 * @param {string} categoria - Farmacia | Internamento | Administrativo
 * @param {number[]} grupoProdutoIds
 */
export async function salvarRegrasCategoria(categoria, grupoProdutoIds) {
  const { data } = await axios.post(
    "/regras-produto/sync",
    { categoria, grupo_produto_ids: grupoProdutoIds },
    auth(),
  );
  if (!data.status) throw new Error(data.message || "Erro ao salvar as regras.");
  return data;
}

/**
 * Cria ou atualiza uma exceção de produto para um setor.
 *
 * @param {number} setorId
 * @param {number} produtoId
 * @param {boolean} permitido - true libera apesar da categoria; false bloqueia
 */
export async function salvarExcecao(setorId, produtoId, permitido = true) {
  const { data } = await axios.post(
    "/regras-produto/excecao",
    { setor_id: setorId, produto_id: produtoId, permitido },
    auth(),
  );
  if (!data.status) throw new Error(data.message || "Erro ao salvar a exceção.");
  return data.data;
}

/** Remove uma exceção, devolvendo o produto à regra da categoria. */
export async function removerExcecao(setorId, produtoId) {
  const { data } = await axios.post(
    "/regras-produto/excecao",
    { setor_id: setorId, produto_id: produtoId, remover: true },
    auth(),
  );
  if (!data.status) throw new Error(data.message || "Erro ao remover a exceção.");
  return data;
}

/**
 * Prévia do catálogo de um setor: quantos e quais produtos ele enxerga com as
 * regras atuais. Serve para conferir uma configuração antes de confiar nela.
 */
export async function previewCatalogoSetor(setorId, limite = 50) {
  const { data } = await axios.post(
    "/regras-produto/preview",
    { setor_id: setorId, limite },
    auth(),
  );
  if (!data.status) throw new Error(data.message || "Erro ao gerar a prévia.");
  return data.data;
}

export default {
  listarRegras,
  salvarRegrasCategoria,
  salvarExcecao,
  removerExcecao,
  previewCatalogoSetor,
};
