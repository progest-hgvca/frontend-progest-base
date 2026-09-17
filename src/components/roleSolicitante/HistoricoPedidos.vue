<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold flex items-center gap-2">
          <i class="mdi mdi-history text-xl text-blue-600"></i>
          Histórico de Pedidos
        </h2>
        <p class="text-sm text-muted-foreground">
          Acompanhe o status, edite rascunhos ou cancele pedidos pendentes.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <div class="relative">
          <i class="mdi mdi-magnify absolute left-2 top-2 text-muted-foreground"></i>
          <Input 
            v-model="searchLote" 
            placeholder="Buscar por lote..." 
            class="pl-8 h-8 text-sm w-48"
            @keyup.enter="fetchPedidos"
          />
        </div>

        <!-- Exporta todos os pedidos da lista -->
        <Button
          variant="outline"
          size="sm"
          @click="exportarTodosExcel"
          :disabled="loading || pedidos.length === 0"
          class="flex items-center gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
        >
          <i class="mdi mdi-file-excel"></i>
          Exportar Excel
        </Button>

        <Button variant="outline" size="sm" @click="fetchPedidos" :disabled="loading" class="flex items-center gap-1.5">
          <i class="mdi mdi-refresh" :class="{ 'animate-spin': loading }"></i>
          Atualizar
        </Button>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="w-full min-h-[400px] flex items-center justify-center"
    >
      <LoadingSpinner size="lg" />
    </div>

    <!-- Empty State -->
    <Card v-else-if="pedidos.length === 0">
      <CardContent class="py-12 text-center">
        <i
          class="mdi mdi-package-variant text-6xl text-muted-foreground mb-4"
        ></i>
        <h3 class="text-lg font-medium mb-2">Nenhum pedido encontrado</h3>
        <p class="text-muted-foreground mb-4">
          Você ainda não fez nenhum pedido ou rascunho.
        </p>
        <Button @click="irParaBuscar">
          <i class="mdi mdi-magnify mr-2"></i>
          Montar Pedido
        </Button>
      </CardContent>
    </Card>

    <!-- Pedidos List -->
    <div v-else class="space-y-4">
      <Card v-for="pedido in pedidos" :key="pedido.id" class="overflow-hidden transition-all duration-200" :class="{ 'border-amber-300 bg-amber-50/20': pedido.status_solicitacao === 'C' }">
        <CardHeader class="pb-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <CardTitle class="text-lg flex items-center gap-2">
                Pedido #{{ pedido.id }}
                <span v-if="pedido.status_solicitacao === 'C'" class="text-xs font-normal text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Rascunho não enviado
                </span>
              </CardTitle>
              <Badge :variant="getStatusVariant(pedido.status_solicitacao)">
                {{ getStatusLabel(pedido.status_solicitacao) }}
              </Badge>
              <Badge v-if="pedido.tem_devolucao" variant="outline" class="border-amber-500 text-amber-700 bg-amber-50">
                <i class="mdi mdi-keyboard-return mr-1"></i> Devolução
              </Badge>
            </div>
            <div class="text-sm text-muted-foreground">
              {{ formatDate(pedido.data_hora) }}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="space-y-3">
            <!-- Info do pedido e Ações -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex flex-wrap gap-4 text-sm">
                <div class="flex items-center gap-2">
                  <i class="mdi mdi-store text-muted-foreground"></i>
                  <span class="text-muted-foreground">Distribuidor:</span>
                  <span class="font-medium">
                    {{ pedido.setor_origem?.nome_exibicao || pedido.setor_origem?.nome || "N/A" }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <i class="mdi mdi-package-variant text-muted-foreground"></i>
                  <span class="text-muted-foreground">Itens:</span>
                  <span class="font-medium">
                    {{ pedido.itens?.length || 0 }}
                  </span>
                </div>
                <!-- Aprovador (quando aprovado ou reprovado) -->
                <div class="flex items-center gap-2 mt-2">
                    <i class="mdi mdi-account-check text-muted-foreground"></i>
                    <span class="text-muted-foreground">
                      {{ pedido.status_solicitacao === 'A' ? 'Aprovado por:' : (pedido.status_solicitacao === 'R' ? 'Reprovado por:' : 'Responsável:') }}
                    </span>
                    <span class="font-medium" :class="pedido.status_solicitacao === 'A' ? 'text-green-700' : (pedido.status_solicitacao === 'R' ? 'text-red-600' : 'text-yellow-600')">
                      {{ pedido.aprovador?.name || 'Aguardando avaliação' }}
                    </span>
                  </div>
                </div>

              <!-- Botões de Ação -->
              <div class="flex items-center gap-1.5 self-end sm:self-auto">
                <!-- RASCUNHO: Enviar Agora -->
                <Button
                  v-if="pedido.status_solicitacao === 'C'"
                  size="sm"
                  variant="default"
                  @click.stop="enviarRascunhoDireto(pedido)"
                  :disabled="actionInProgress === pedido.id"
                  class="h-8 px-2.5 bg-green-600 hover:bg-green-700 text-white text-xs flex items-center gap-1"
                  title="Enviar Rascunho para Análise"
                >
                  <LoadingSpinner v-if="actionInProgress === pedido.id" size="sm" />
                  <i v-else class="mdi mdi-send text-sm"></i>
                  <span>Enviar</span>
                </Button>

                <!-- RASCUNHO OU PENDENTE: Editar -->
                <Button
                  v-if="pedido.status_solicitacao === 'C' || pedido.status_solicitacao === 'P'"
                  variant="outline"
                  size="sm"
                  @click.stop="editarPedido(pedido)"
                  class="h-8 px-2.5 text-xs flex items-center gap-1"
                  :title="pedido.status_solicitacao === 'C' ? 'Editar Rascunho' : 'Editar Pedido Pendente'"
                >
                  <i class="mdi mdi-pencil text-sm text-blue-600"></i>
                  <span>Editar</span>
                </Button>

                <!-- RASCUNHO: Excluir -->
                <Button
                  v-if="pedido.status_solicitacao === 'C'"
                  variant="ghost"
                  size="icon"
                  @click.stop="abrirExcluirRascunho(pedido)"
                  :disabled="actionInProgress === pedido.id"
                  class="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Excluir Rascunho"
                >
                  <i class="mdi mdi-delete-outline text-lg"></i>
                </Button>

                <!-- PENDENTE: Cancelar -->
                <Button
                  v-if="pedido.status_solicitacao === 'P'"
                  variant="ghost"
                  size="icon"
                  @click.stop="abrirCancelarPedido(pedido)"
                  :disabled="actionInProgress === pedido.id"
                  class="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Cancelar Pedido"
                >
                  <LoadingSpinner v-if="actionInProgress === pedido.id" size="sm" />
                  <i v-else class="mdi mdi-close-circle-outline text-lg"></i>
                </Button>

                <!-- APROVADO: Imprimir -->
                <Button
                  v-if="pedido.status_solicitacao === 'A'"
                  variant="ghost"
                  size="icon"
                  @click.stop="imprimirPedido(pedido)"
                  class="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  title="Imprimir Pedido"
                >
                  <i class="mdi mdi-printer text-lg"></i>
                </Button>

                <!-- Exportar este pedido em Excel (qualquer status) -->
                <Button
                  variant="ghost"
                  size="icon"
                  @click.stop="exportarExcel(pedido)"
                  class="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  title="Exportar Pedido em Excel"
                >
                  <i class="mdi mdi-file-excel text-lg"></i>
                </Button>
              </div>
            </div>

            <!-- Observação -->
            <div v-if="pedido.observacao" class="text-sm bg-muted/50 p-2 rounded">
              <span class="text-muted-foreground font-medium">Obs:</span>
              <span class="ml-1 text-slate-700">{{ pedido.observacao }}</span>
            </div>

            <!-- Expandir detalhes -->
            <div class="pt-1">
              <Button
                variant="ghost"
                size="sm"
                @click="toggleExpand(pedido.id)"
                class="text-xs h-7 px-2"
              >
                <i
                  :class="[
                    'mdi mr-1',
                    expanded[pedido.id] ? 'mdi-chevron-up' : 'mdi-chevron-down',
                  ]"
                ></i>
                {{ expanded[pedido.id] ? "Ocultar itens" : `Ver itens (${pedido.itens?.length || 0})` }}
              </Button>
            </div>

            <!-- Itens expandidos -->
            <div
              v-if="expanded[pedido.id] && pedido.itens"
              class="border-t pt-3 mt-2"
            >
              <div class="space-y-2">
                <div
                  v-for="item in pedido.itens"
                  :key="item.id"
                  class="flex items-center justify-between text-sm p-2.5 bg-muted/60 rounded border border-muted"
                >
                  <div>
                    <span class="font-medium text-slate-900">
                      {{ item.produto?.nome || `Produto #${item.produto_id}` }}
                    </span>
                    <span v-if="item.produto?.marca" class="text-xs text-muted-foreground ml-2">
                      ({{ item.produto.marca }})
                    </span>
                  </div>
                    <div class="flex items-center gap-4 text-xs font-medium">
                      <span class="text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded">
                        Solicitado: {{ item.quantidade_solicitada }}
                      </span>
                      <span
                        v-if="item.quantidade_liberada > 0"
                        class="text-green-700 bg-green-100 px-2 py-0.5 rounded"
                      >
                        Liberado: {{ item.quantidade_liberada }}
                      </span>
                      <Button
                        v-if="item.quantidade_liberada > 0"
                        variant="ghost"
                        size="sm"
                        @click.stop="abrirModalDevolucao(pedido, item)"
                        class="h-6 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        title="Devolver Item"
                      >
                        <i class="mdi mdi-keyboard-return mr-1"></i> Devolver
                      </Button>
                    </div>
                  </div>
                </div>

                <!-- Histórico de Devoluções do Pedido -->
                <div v-if="pedido.devolucoes && pedido.devolucoes.length > 0" class="mt-4 border border-amber-200 bg-amber-50/30 rounded-md p-3">
                  <h4 class="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1">
                    <i class="mdi mdi-history"></i> Histórico de Devoluções
                  </h4>
                  <div class="space-y-1.5">
                    <div v-for="dev in pedido.devolucoes" :key="dev.id" class="text-xs text-slate-700 flex flex-wrap gap-x-3 gap-y-1 items-center bg-white border border-amber-100 p-2 rounded">
                      <span><strong>Item:</strong> {{ pedido.itens?.find(i => i.id === dev.item_movimentacao_id)?.produto?.nome || 'Item #' + dev.item_movimentacao_id }}</span>
                      <span><strong>Lote:</strong> <span class="bg-amber-100 px-1 py-0.5 rounded">{{ dev.lote }}</span></span>
                      <span><strong>Qtd:</strong> <span class="text-amber-700 font-bold">{{ dev.quantidade }}</span></span>
                      <span><strong>Data:</strong> {{ formatDate(dev.created_at) }}</span>
                      <span v-if="dev.usuario" class="text-muted-foreground"><strong>Por:</strong> {{ dev.usuario.name }}</span>
                      <span v-if="dev.motivo" class="w-full text-slate-500 italic mt-1 break-words">"{{ dev.motivo }}"</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </CardContent>
      </Card>
    </div>

    <!-- Alert Dialog para confirmar cancelamento de pedido pendente -->
    <AlertDialog v-model:open="showCancelDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar Pedido</AlertDialogTitle>
          <AlertDialogDescription>
            Deseja realmente cancelar o Pedido #{{ pedidoSelecionado?.id }}?
            Esta ação não poderá ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Não, manter pedido</AlertDialogCancel>
          <AlertDialogAction
            @click="confirmarCancelamento"
            class="bg-red-600 hover:bg-red-700 text-white"
          >
            Sim, cancelar pedido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Alert Dialog para confirmar exclusão de rascunho -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Rascunho</AlertDialogTitle>
          <AlertDialogDescription>
            Deseja realmente excluir o Rascunho #{{ pedidoSelecionado?.id }}?
            Todos os itens salvos neste rascunho serão removidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Não, manter rascunho</AlertDialogCancel>
          <AlertDialogAction
            @click="confirmarExclusaoRascunho"
            class="bg-red-600 hover:bg-red-700 text-white"
          >
            Sim, excluir rascunho
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    
    <ModalDevolverItem ref="modalDevolucao" @sucesso="fetchPedidos" />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/loading-spinner/LoadingSpinner.vue";
import { useToast } from "@/components/ui/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSolicitacao } from "@/composables/useSolicitacao";
import { imprimirPedido as gerarImpressaoPedido } from "@/utils/imprimirPedido";
import {
  exportarPedidoExcel,
  exportarPedidosExcel,
} from "@/utils/exportarPedidoExcel";
import { Input } from "@/components/ui/input";
import ModalDevolverItem from "./ModalDevolverItem.vue";

const router = useRouter();
const store = useStore();
const { toast } = useToast();
const { carregarPedidoParaEdicao } = useSolicitacao();

const searchLote = ref("");
const modalDevolucao = ref(null);

const pedidos = ref([]);
const loading = ref(true);
const expanded = ref({});
const actionInProgress = ref(null);
const showCancelDialog = ref(false);
const showDeleteDialog = ref(false);
const pedidoSelecionado = ref(null);

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusLabel = (status) => {
  const labels = {
    P: "Aguardando Análise",
    A: "Atendido",
    R: "Negado",
    C: "Rascunho",
    X: "Cancelado",
  };
  return labels[status] || status;
};

const getStatusVariant = (status) => {
  const variants = {
    P: "secondary",
    A: "default",
    R: "destructive",
    C: "outline",
    X: "destructive",
  };
  return variants[status] || "secondary";
};

const toggleExpand = (pedidoId) => {
  expanded.value[pedidoId] = !expanded.value[pedidoId];
};

const fetchPedidos = async () => {
  loading.value = true;
  try {
    const token = localStorage.getItem("token");
    const setorId = store.state.setorAtualId;

    const response = await axios.post(
      "/movimentacao/listBySetor",
      { setor_id: setorId, per_page: 5000, lote: searchLote.value },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.status) {
      const data = response.data.data?.data || response.data.data || [];
      pedidos.value = data.filter(
        (mov) => mov.tipo === "S" && mov.setor_destino_id === Number(setorId)
      );
    }
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    toast({
      title: "Erro",
      description: "Não foi possível carregar o histórico.",
      variant: "destructive",
    });
  } finally {
    loading.value = false;
  }
};

const abrirModalDevolucao = (pedido, item) => {
  if (modalDevolucao.value) {
    modalDevolucao.value.openModal(pedido.id, item);
  }
};

const editarPedido = (pedido) => {
  carregarPedidoParaEdicao(pedido);
  toast({
    title: "Modo de edição",
    description: `Pedido #${pedido.id} carregado para edição.`,
  });
  router.replace({ query: { tab: "pedido" } });
};

const enviarRascunhoDireto = async (pedido) => {
  actionInProgress.value = pedido.id;
  try {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      `/movimentacao/${pedido.id}/process`,
      { action: "submit" },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.status) {
      toast({
        title: "Sucesso",
        description: `Rascunho #${pedido.id} enviado com sucesso para análise!`,
      });
      await fetchPedidos();
    } else {
      throw new Error(response.data.message || "Erro ao enviar rascunho");
    }
  } catch (error) {
    console.error("Erro ao enviar rascunho:", error);
    toast({
      title: "Erro",
      description: error.response?.data?.message || "Não foi possível enviar o rascunho.",
      variant: "destructive",
    });
  } finally {
    actionInProgress.value = null;
  }
};

const abrirCancelarPedido = (pedido) => {
  pedidoSelecionado.value = pedido;
  showCancelDialog.value = true;
};

const confirmarCancelamento = async () => {
  const pedido = pedidoSelecionado.value;
  if (!pedido) return;

  showCancelDialog.value = false;
  actionInProgress.value = pedido.id;

  try {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      `/movimentacao/${pedido.id}/process`,
      { action: "cancel" },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.status) {
      toast({
        title: "Sucesso",
        description: "Pedido cancelado com sucesso.",
      });
      await fetchPedidos();
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    console.error("Erro ao cancelar pedido:", error);
    toast({
      title: "Erro",
      description:
        error.response?.data?.message || "Não foi possível cancelar o pedido.",
      variant: "destructive",
    });
  } finally {
    actionInProgress.value = null;
    pedidoSelecionado.value = null;
  }
};

const abrirExcluirRascunho = (pedido) => {
  pedidoSelecionado.value = pedido;
  showDeleteDialog.value = true;
};

const confirmarExclusaoRascunho = async () => {
  const pedido = pedidoSelecionado.value;
  if (!pedido) return;

  showDeleteDialog.value = false;
  actionInProgress.value = pedido.id;

  try {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      `/movimentacao/${pedido.id}/delete`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.status) {
      toast({
        title: "Sucesso",
        description: "Rascunho excluído com sucesso.",
      });
      await fetchPedidos();
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    console.error("Erro ao excluir rascunho:", error);
    toast({
      title: "Erro",
      description:
        error.response?.data?.message || "Não foi possível excluir o rascunho.",
      variant: "destructive",
    });
  } finally {
    actionInProgress.value = null;
    pedidoSelecionado.value = null;
  }
};

const imprimirPedido = (pedido) => {
  if (!gerarImpressaoPedido(pedido)) {
    toast({
      title: "Erro",
      description:
        "Não foi possível abrir a janela de impressão. Verifique se pop-ups estão bloqueados.",
      variant: "destructive",
    });
  }
};

const exportarExcel = async (pedido) => {
  if (!(await exportarPedidoExcel(pedido))) {
    toast({
      title: "Erro",
      description: "Não foi possível gerar a planilha do pedido.",
      variant: "destructive",
    });
  }
};

const exportarTodosExcel = async () => {
  const gerou = await exportarPedidosExcel(pedidos.value, {
    nomeArquivo: "meus_pedidos",
    titulo: "Meus Pedidos",
  });

  if (!gerou) {
    toast({
      title: "Nada para exportar",
      description: "Não há pedidos na lista para gerar a planilha.",
    });
  }
};

const irParaBuscar = () => {
  router.replace({ query: { tab: "itens" } });
};

onMounted(() => {
  fetchPedidos();
});
</script>
