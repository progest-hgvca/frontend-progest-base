<script setup>
import { ref, computed } from "vue";
import { useStore } from "vuex";
import api from "@/lib/axios";

// UI Components
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DataTable from "@/components/ui/data-table/DataTable.vue";

const store = useStore();

const tipoRelatorio = ref("entradas");
const filters = ref({
  date_from: "",
  date_to: "",
  setor_id: "",
});

const isSearching = ref(false);
const results = ref([]);
const pagination = ref({ current_page: 1, last_page: 1 });

const colsEntradas = [
  { key: "data_entrada", label: "Data" },
  { key: "setor", label: "Setor" },
  { key: "fornecedor", label: "Fornecedor" },
  { key: "produto", label: "Produto" },
  { key: "codigo_simpas", label: "SIMPASS" },
  { key: "quantidade", label: "Qtd" },
  { key: "valor_unitario", label: "Valor Un." },
  { key: "subtotal", label: "Subtotal" }
];

const colsSaidas = [
  { key: "created_at", label: "Data" },
  { key: "pedido_id", label: "Pedido ID" },
  { key: "setor_destino", label: "Setor Destino" },
  { key: "produto", label: "Produto" },
  { key: "codigo_simpas", label: "SIMPASS" },
  { key: "quantidade", label: "Qtd Liberada" },
  { key: "valor_unitario", label: "Custo Médio/Lote" },
  { key: "valor_total", label: "Valor Total" }
];

const columns = computed(() => tipoRelatorio.value === "entradas" ? colsEntradas : colsSaidas);

const totalValue = computed(() => {
  if (tipoRelatorio.value === "entradas") {
    return results.value.reduce((acc, curr) => acc + (parseFloat(curr.subtotal) || 0), 0);
  } else {
    return results.value.reduce((acc, curr) => acc + (parseFloat(curr.valor_total) || 0), 0);
  }
});

const formatMoney = (val) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);
};

const formatDate = (val) => {
  if (!val) return "-";
  return new Date(val).toLocaleDateString("pt-BR");
};

const formatData = computed(() => {
  return results.value.map(item => {
    let base = { ...item };
    if (base.data_entrada) base.data_entrada = formatDate(base.data_entrada);
    if (base.created_at) base.created_at = formatDate(base.created_at);
    if (base.valor_unitario !== undefined) base.valor_unitario = formatMoney(base.valor_unitario);
    if (base.subtotal !== undefined) base.subtotal = formatMoney(base.subtotal);
    if (base.valor_total !== undefined) base.valor_total = formatMoney(base.valor_total);
    return base;
  });
});

async function buscarRelatorio(page = 1) {
  isSearching.value = true;
  try {
    const endpoint = tipoRelatorio.value === "entradas"
      ? "/api/relatorios/financeiro/entradas"
      : "/api/relatorios/financeiro/saidas";
      
    const { data } = await api.post(`${endpoint}?page=${page}`, { filters: filters.value });
    if (data.status) {
      results.value = data.data.data;
      pagination.value = {
        current_page: data.data.current_page,
        last_page: data.data.last_page,
        total: data.data.total
      };
    }
  } catch (error) {
    console.error("Erro ao buscar relatorio financeiro", error);
  } finally {
    isSearching.value = false;
  }
}

function handleSearch() {
  buscarRelatorio(1);
}

function handlePaginate(page) {
  buscarRelatorio(page);
}
</script>

<template>
  <div class="flex-1 space-y-4 p-8 pt-6">
    <div class="flex items-center justify-between space-y-2">
      <h2 class="text-3xl font-bold tracking-tight">Relatório Financeiro Analítico</h2>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div class="space-y-2">
            <Label>Tipo de Relatório</Label>
            <select v-model="tipoRelatorio" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
              <option value="entradas">Entradas (Custo)</option>
              <option value="saidas">Saídas / Movimentações (Custo)</option>
            </select>
          </div>
          <div class="space-y-2">
            <Label>Data Inicial</Label>
            <Input type="date" v-model="filters.date_from" />
          </div>
          <div class="space-y-2">
            <Label>Data Final</Label>
            <Input type="date" v-model="filters.date_to" />
          </div>
          <Button @click="handleSearch" :disabled="isSearching" class="w-full">
            {{ isSearching ? 'Buscando...' : 'Buscar' }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card v-if="results.length > 0">
      <CardHeader class="flex flex-row items-center justify-between">
        <CardTitle>Resultados</CardTitle>
        <div class="text-lg font-bold text-primary">
          Total na página: {{ formatMoney(totalValue) }}
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          :columns="columns"
          :data="formatData"
          :loading="isSearching"
          :pagination="pagination"
          @paginate="handlePaginate"
          :hideEditAction="true"
          :hideStatusAction="true"
        />
      </CardContent>
    </Card>
  </div>
</template>
