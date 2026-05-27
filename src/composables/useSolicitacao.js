// Composable para gerenciar o estado compartilhado da solicitação
import { ref, computed, watch } from "vue";
import { useStore } from "vuex";

// Estado global reativo (fora do composable para persistir entre componentes)
const tipoSelecionado = ref(null);
const itensPedido = ref([]);
const distribuidorSelecionado = ref(null);

// Carregar do localStorage na inicialização
const savedState = localStorage.getItem("solicitacaoState");
if (savedState) {
  try {
    const parsed = JSON.parse(savedState);
    tipoSelecionado.value = parsed.tipo || null;
    itensPedido.value = parsed.itens || [];
    distribuidorSelecionado.value = parsed.distribuidor || parsed.fornecedor || null;
  } catch (e) {
    console.error("Erro ao carregar estado da solicitação:", e);
  }
}

// Salvar no localStorage quando mudar
watch(
  [tipoSelecionado, itensPedido, distribuidorSelecionado],
  () => {
    localStorage.setItem(
      "solicitacaoState",
      JSON.stringify({
        tipo: tipoSelecionado.value,
        itens: itensPedido.value,
        distribuidor: distribuidorSelecionado.value,
      })
    );
  },
  { deep: true }
);

export function useSolicitacao() {
  const store = useStore();

  // Refs exportadas
  const tipo = computed(() => tipoSelecionado.value);
  const itens = computed(() => itensPedido.value);
  const distribuidor = computed(() => distribuidorSelecionado.value);

  // Contadores
  const quantidadeProdutos = computed(() => itensPedido.value.length);
  const totalItens = computed(() =>
    itensPedido.value.reduce((acc, item) => acc + (item.quantidade || 0), 0)
  );

  // Setor atual do usuário
  const setorAtual = computed(() => store.state.setorDetails);

  // Distribuidores disponíveis para o setor atual
  const distribuidoresDisponiveis = computed(() => {
    const details = store.state.setorDetails;
    if (!details) return [];

    // distribuidores_relacionados é um array com objetos que têm setor_distribuidor_id
    const relacionamentos = details.distribuidores_relacionados || [];

    console.log("🔍 Distribuidores relacionados raw:", relacionamentos);

    const result = relacionamentos
      .filter((rel) => {
        // Garantir que temos um ID válido
        const distribuidorId =
          rel.setor_distribuidor_id || rel.setor_fornecedor_id || rel.fornecedor_id || rel.id;
        return distribuidorId != null;
      })
      .map((rel) => {
        // Tentar múltiplas formas de obter o ID do distribuidor
        const distribuidorId = rel.setor_distribuidor_id || rel.setor_fornecedor_id || rel.fornecedor_id;
        const distribuidorNome =
          rel.distribuidor?.nome ||
          rel.fornecedor?.nome ||
          rel.setor_fornecedor?.nome ||
          rel.nome ||
          `Setor ${distribuidorId}`;

        console.log("📦 Mapeando distribuidor:", {
          rel,
          distribuidorId,
          distribuidorNome,
        });

        // IMPORTANTE: ...rel PRIMEIRO para que id e nome não sejam sobrescritos
        return {
          ...rel,
          id: distribuidorId,
          nome: distribuidorNome,
          tipo: rel.tipo_produto || null,
        };
      });

    console.log("✅ Distribuidores mapeados:", result);
    return result;
  });

  // Funções
  const setTipo = (novoTipo) => {
    if (
      tipoSelecionado.value &&
      tipoSelecionado.value !== novoTipo &&
      itensPedido.value.length > 0
    ) {
      // Limpar itens ao trocar o tipo
      itensPedido.value = [];
    }
    tipoSelecionado.value = novoTipo;
  };

  const addItem = (produto, quantidade) => {
    const existingIndex = itensPedido.value.findIndex(
      (item) => item.produtoId === produto.id
    );

    if (existingIndex >= 0) {
      // Atualizar quantidade se já existe
      itensPedido.value[existingIndex].quantidade += quantidade;
    } else {
      // Adicionar novo item
      itensPedido.value.push({
        produtoId: produto.id,
        nome: produto.nome,
        marca: produto.marca || "",
        unidade:
          produto.unidade_medida?.sigla || produto.unidade_medida?.nome || "",
        quantidade: quantidade,
      });
    }
  };

  const removeItem = (produtoId) => {
    const index = itensPedido.value.findIndex(
      (item) => item.produtoId === produtoId
    );
    if (index >= 0) {
      itensPedido.value.splice(index, 1);
    }
  };

  const updateQuantidade = (produtoId, novaQuantidade) => {
    const item = itensPedido.value.find((i) => i.produtoId === produtoId);
    if (item) {
      item.quantidade = Math.max(1, novaQuantidade);
    }
  };

  const setDistribuidor = (distribuidorId) => {
    distribuidorSelecionado.value = distribuidorId;
  };

  const limparPedido = () => {
    itensPedido.value = [];
    distribuidorSelecionado.value = null;
  };

  const limparTudo = () => {
    tipoSelecionado.value = null;
    itensPedido.value = [];
    distribuidorSelecionado.value = null;
    localStorage.removeItem("solicitacaoState");
  };

  const getPedidoParaEnvio = (observacao = "") => {
    if (!distribuidorSelecionado.value || itensPedido.value.length === 0) {
      return null;
    }

    const userId = store.state.user?.id;
    const setorDestinoId = store.state.setorAtualId;

    if (!userId || !setorDestinoId) {
      console.error("Dados do usuário ou setor não disponíveis");
      return null;
    }

    return {
      usuario_id: userId,
      setor_origem_id: Number(distribuidorSelecionado.value),
      setor_destino_id: Number(setorDestinoId),
      tipo: "S", // Solicitação
      status_solicitacao: "P", // Pendente
      observacao: observacao,
      itens: itensPedido.value.map((item) => ({
        produto_id: item.produtoId,
        quantidade_solicitada: item.quantidade,
      })),
    };
  };

  return {
    // Estado
    tipo,
    itens,
    distribuidor,
    quantidadeProdutos,
    totalItens,
    setorAtual,
    distribuidoresDisponiveis,

    // Funções
    setTipo,
    addItem,
    removeItem,
    updateQuantidade,
    setDistribuidor,
    limparPedido,
    limparTudo,
    getPedidoParaEnvio,
  };
}
