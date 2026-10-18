<script setup>
/**
 * Relatório financeiro em três recortes do mesmo período:
 *
 *  - Analítico : uma linha por item (entradas de nota fiscal ou saídas).
 *  - Por Pedido: uma linha por requisição, com o valor total do que saiu nela.
 *  - Por Setor : entradas, saídas e saldo de cada setor.
 *
 * O custo das saídas vem de `item_movimentacao.valor_unitario`, congelado no
 * momento da aprovação pelo FIFO — não é recalculado na leitura.
 */
import { ref, computed, onMounted } from "vue";
import axios from "axios";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/ui/data-table/DataTable.vue";
import LoadingSpinner from "@/components/ui/loading-spinner/LoadingSpinner.vue";
import { useToast } from "@/components/ui/toast";
import { formatarNomeSetor } from "@/utils/formatters";
import { exportToExcel } from "@/utils/exportUtils";

const { toast } = useToast();

const ABAS = [
  { id: "analitico", titulo: "Analítico", descricao: "Uma linha por item" },
  { id: "por-pedido", titulo: "Por Pedido", descricao: "Consolidado por requisição" },
  { id: "por-setor", titulo: "Por Setor", descricao: "Entradas, saídas e saldo" },
];

const abaAtiva = ref("analitico");
const tipoRelatorio = ref("saidas");
const setores = ref([]);

const filters = ref({
  date_from: "",
  date_to: "",
  setor_id: "",
});

const isSearching = ref(false);
const results = ref([]);
const totalGeral = ref(0);
const semPermissao = ref(false);
const pagination = ref({ current_page: 1, last_page: 1, total: 0 });

/* ---------- Colunas por recorte ---------- */

const colsEntradas = [
  { key: "data_entrada", label: "Data" },
  { key: "nota_fiscal", label: "Nota Fiscal" },
  { key: "setor", label: "Setor" },
  { key: "fornecedor", label: "Fornecedor" },
  { key: "produto", label: "Produto" },
  { key: "codigo_simpas", label: "SIMPAS" },
  { key: "quantidade", label: "Qtd" },
  { key: "valor_unitario", label: "Valor Un." },
  { key: "subtotal", label: "Subtotal" },
];

const colsSaidas = [
  { key: "created_at", label: "Data" },
  { key: "pedido_id", label: "Pedido" },
  { key: "setor_origem", label: "Origem" },
  { key: "setor_destino", label: "Destino" },
  { key: "produto", label: "Produto" },
  { key: "codigo_simpas", label: "SIMPAS" },
  { key: "quantidade", label: "Qtd" },
  { key: "valor_unitario", label: "Custo Un." },
  { key: "valor_total", label: "Valor Total" },
];

const colsPorPedido = [
  { key: "data_hora", label: "Data" },
  { key: "pedido_id", label: "Pedido" },
  { key: "setor_origem", label: "Origem" },
  { key: "setor_destino", label: "Destino" },
  { key: "solicitante", label: "Solicitante" },
  { key: "total_itens", label: "Itens" },
  { key: "total_quantidade", label: "Qtd Total" },
  { key: "valor_total", label: "Valor Total" },
];

const colsPorSetor = [
  { key: "setor", label: "Setor" },
  { key: "polo", label: "Polo" },
  { key: "categoria", label: "Categoria" },
  { key: "total_entradas", label: "Entradas" },
  { key: "total_saidas", label: "Saídas" },
  { key: "total_recebido", label: "Recebido" },
  { key: "saldo", label: "Saldo" },
];

const columns = computed(() => {
  if (abaAtiva.value === "por-pedido") return colsPorPedido;
  if (abaAtiva.value === "por-setor") return colsPorSetor;
  return tipoRelatorio.value === "entradas" ? colsEntradas : colsSaidas;
});

const mostraSeletorTipo = computed(() => abaAtiva.value === "analitico");
const usaPaginacao = computed(() => abaAtiva.value !== "por-setor");

/* ---------- Formatação ---------- */

const formatMoney = (val) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

const formatDate = (val) => (val ? new Date(val).toLocaleDateString("pt-BR") : "-");

const CAMPOS_DATA = ["data_entrada", "created_at", "data_hora"];
const CAMPOS_MOEDA = [
  "valor_unitario",
  "subtotal",
  "valor_total",
  "total_entradas",
  "total_saidas",
  "total_recebido",
  "saldo",
];

const formatData = computed(() =>
  results.value.map((item) => {
    const linha = { ...item };
    CAMPOS_DATA.forEach((c) => {
      if (linha[c] !== undefined) linha[c] = formatDate(linha[c]);
    });
    CAMPOS_MOEDA.forEach((c) => {
      if (linha[c] !== undefined && linha[c] !== null) linha[c] = formatMoney(linha[c]);
    });
    return linha;
  }),
);

/* ---------- Busca ---------- */

function endpointAtual() {
  if (abaAtiva.value === "por-pedido") return "/relatorios/financeiro/por-pedido";
  if (abaAtiva.value === "por-setor") return "/relatorios/financeiro/por-setor";
  return tipoRelatorio.value === "entradas"
    ? "/relatorios/financeiro/entradas"
    : "/relatorios/financeiro/saidas";
}

async function buscarRelatorio(page = 1) {
  isSearching.value = true;
  semPermissao.value = false;

  try {
    const url = usaPaginacao.value ? `${endpointAtual()}?page=${page}` : endpointAtual();
    const { data } = await axios.post(url, { filters: filters.value });

    if (!data.status) {
      throw new Error(data.message || "Não foi possível carregar o relatório.");
    }

    if (abaAtiva.value === "por-setor") {
      results.value = data.data || [];
      totalGeral.value = data.totalizadores?.total_saidas || 0;
      pagination.value = { current_page: 1, last_page: 1, total: results.value.length };
    } else {
      results.value = data.data?.data || [];
      totalGeral.value = data.total_valor ?? data.valor_total_geral ?? 0;
      pagination.value = {
        current_page: data.data?.current_page || 1,
        last_page: data.data?.last_page || 1,
        total: data.data?.total || 0,
      };
    }
  } catch (error) {
    if (error.response?.status === 403) {
      semPermissao.value = true;
      results.value = [];
    } else {
      toast({
        title: "Erro no relatório",
        description:
          error.response?.data?.message || error.message || "Falha ao carregar o relatório.",
        variant: "destructive",
      });
    }
  } finally {
    isSearching.value = false;
  }
}

function trocarAba(id) {
  if (abaAtiva.value === id) return;
  abaAtiva.value = id;
  results.value = [];
  totalGeral.value = 0;
  buscarRelatorio(1);
}

const handleSearch = () => buscarRelatorio(1);
const handlePaginate = (page) => buscarRelatorio(page);

function exportar() {
  if (!results.value.length) {
    toast({ title: "Nada para exportar", description: "Faça uma busca primeiro." });
    return;
  }

  const aba = ABAS.find((a) => a.id === abaAtiva.value);
  const sufixo = abaAtiva.value === "analitico" ? `_${tipoRelatorio.value}` : "";
  const cols = columns.value;

  // Matriz com cabeçalho legível na primeira linha, seguindo a ordem das
  // colunas visíveis — e não as chaves cruas do JSON.
  const matriz = [
    cols.map((c) => c.label),
    ...formatData.value.map((linha) => cols.map((c) => linha[c.key] ?? "")),
  ];

  exportToExcel({
    data: matriz,
    columns: cols.map(() => ({ wch: 20 })),
    filename: `financeiro_${abaAtiva.value}${sufixo}_${new Date().toISOString().slice(0, 10)}`,
    sheetName: aba.titulo,
  });
}

async function carregarSetores() {
  try {
    const { data } = await axios.post("/setores/list", { filters: { status: "A" } });
    if (data.status) {
      setores.value = Array.isArray(data.data) ? data.data : data.data?.data || [];
    }
  } catch (error) {
    console.warn("Não foi possível carregar os setores para o filtro.", error);
  }
}

onMounted(carregarSetores);
</script>

<template>
  <div class="flex-1 space-y-4 p-8 pt-6">
    <div>
      <h2 class="text-3xl font-bold tracking-tight">Relatório Financeiro</h2>
      <p class="text-sm text-muted-foreground mt-1">
        Valores unitários de entradas e saídas, por pedido e por setor.
      </p>
    </div>

    <!-- Abas -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="aba in ABAS"
        :key="aba.id"
        type="button"
        @click="trocarAba(aba.id)"
        class="rounded-md border px-4 py-2 text-left transition-colors"
        :class="
          abaAtiva === aba.id
            ? 'border-primary bg-primary/5 ring-1 ring-primary'
            : 'border-border hover:bg-muted/50'
        "
      >
        <span class="block text-sm font-semibold">{{ aba.titulo }}</span>
        <span class="block text-xs text-muted-foreground">{{ aba.descricao }}</span>
      </button>
    </div>

    <Card>
      <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div v-if="mostraSeletorTipo" class="space-y-2">
            <Label>Movimento</Label>
            <select
              v-model="tipoRelatorio"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="saidas">Saídas (custo)</option>
              <option value="entradas">Entradas (nota fiscal)</option>
            </select>
          </div>

          <div class="space-y-2">
            <Label>Setor</Label>
            <select
              v-model="filters.setor_id"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos os setores</option>
              <option v-for="s in setores" :key="s.id" :value="s.id">
                {{ formatarNomeSetor(s) }}
              </option>
            </select>
          </div>

          <div class="space-y-2">
            <Label>Data inicial</Label>
            <Input type="date" v-model="filters.date_from" />
          </div>

          <div class="space-y-2">
            <Label>Data final</Label>
            <Input type="date" v-model="filters.date_to" />
          </div>

          <div class="flex gap-2">
            <Button @click="handleSearch" :disabled="isSearching" class="flex-1">
              {{ isSearching ? "Buscando..." : "Buscar" }}
            </Button>
            <Button variant="outline" @click="exportar" :disabled="!results.length">
              Exportar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card v-if="semPermissao">
      <CardContent class="py-10 text-center">
        <p class="font-medium">Você não tem permissão para visualizar valores financeiros.</p>
        <p class="text-sm text-muted-foreground mt-1">
          O acesso é restrito a administradores da CAF e a admin/almoxarife de setores com estoque.
        </p>
      </CardContent>
    </Card>

    <div v-else-if="isSearching" class="flex justify-center py-16">
      <LoadingSpinner size="lg" />
    </div>

    <Card v-else-if="results.length">
      <CardHeader class="flex flex-row items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle>Resultados</CardTitle>
          <p class="text-xs text-muted-foreground mt-1">
            {{ pagination.total || results.length }} registro(s)
          </p>
        </div>
        <div class="text-right">
          <Badge variant="secondary" class="mb-1">Total do período</Badge>
          <div class="text-xl font-bold text-primary">{{ formatMoney(totalGeral) }}</div>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          :columns="columns"
          :data="formatData"
          :loading="isSearching"
          :pagination="usaPaginacao ? pagination : null"
          @paginate="handlePaginate"
          :hideEditAction="true"
          :hideStatusAction="true"
        />
      </CardContent>
    </Card>

    <Card v-else>
      <CardContent class="py-10 text-center text-sm text-muted-foreground">
        Defina os filtros e clique em Buscar para ver os valores do período.
      </CardContent>
    </Card>
  </div>
</template>
