<template>
  <TemplateAdmin>
    <div class="max-w-7xl mx-auto space-y-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Pedidos</h1>
          <p class="text-muted-foreground">
            Gerencie e crie novos pedidos de materiais e medicamentos.
          </p>
        </div>
      </div>
      
      <Tabs :value="activeTab" @update:value="changeTab" class="w-full">
        <TabsList class="grid w-full grid-cols-3 mb-6 bg-slate-100/50 p-1 rounded-lg">
          <TabsTrigger value="itens" class="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-md">
            <ShoppingCartIcon class="w-4 h-4 mr-2 inline-block" />
            Montar Pedido
          </TabsTrigger>
          <TabsTrigger value="historico" class="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-md">
            <HistoryIcon class="w-4 h-4 mr-2 inline-block" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="pedido" class="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-md">
            <CheckCircleIcon class="w-4 h-4 mr-2 inline-block" />
            Finalizar Pedido
          </TabsTrigger>
        </TabsList>
        <TabsContent value="itens">
          <ProductSearch />
        </TabsContent>
        <TabsContent value="historico">
          <HistoricoPedidos />
        </TabsContent>
        <TabsContent value="pedido">
          <FinalizarPedidoTab />
        </TabsContent>
      </Tabs>
    </div>
  </TemplateAdmin>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import TemplateAdmin from "@/views/roleAdmin/TemplateAdmin.vue";
import ProductSearch from "@/components/roleSolicitante/ProductSearch.vue";
import HistoricoPedidos from "@/components/roleSolicitante/HistoricoPedidos.vue";
import FinalizarPedidoTab from "@/components/roleSolicitante/FinalizarPedidoTab.vue";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCartIcon, HistoryIcon, CheckCircleIcon } from "lucide-vue-next";

const router = useRouter();
const route = useRoute();
const activeTab = ref("itens");

const changeTab = (tab) => {
  const normalized = normalizeTab(tab);
  activeTab.value = normalized;
  try {
    window.history.replaceState({}, "", `${route.path}?tab=${normalized}`);
  } catch (e) {
    console.warn("Não foi possível atualizar a URL com a tab:", e);
  }
};

const normalizeTab = (tab) => {
  const allowed = ["itens", "historico", "pedido"];
  if (!tab || typeof tab !== "string") return "itens";
  return allowed.includes(tab) ? tab : "itens";
};

const initTabFromRoute = () => {
  const queryTab = route.query?.tab;
  activeTab.value = normalizeTab(queryTab);
};

onMounted(() => {
  initTabFromRoute();
});

watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && normalizeTab(newTab) !== activeTab.value) {
      activeTab.value = normalizeTab(newTab);
    }
  }
);
</script>
