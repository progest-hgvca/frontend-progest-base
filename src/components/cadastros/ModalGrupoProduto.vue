<script setup>
import { computed, ref, watch, getCurrentInstance } from "vue";
import { useStore } from "vuex";
import CadastroDialog from "@/components/layouts/CadastroDialog.vue";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const props = defineProps(["idModal", "functions"]);
const store = useStore();
const { proxy } = getCurrentInstance();

const localData = ref({
  id: null,
  nome: "",
  tipo: "Material",
  controlado: false,
  status: "A",
});

/** Só faz sentido marcar como controlado se o grupo for de medicamentos */
const podeSerControlado = computed(() => localData.value.tipo === "Medicamento");

// Ao trocar para Material, o grupo deixa de ser controlado
watch(
  () => localData.value.tipo,
  (tipo) => {
    if (tipo !== "Medicamento") localData.value.controlado = false;
  },
);

const modalDataStore = computed(() => store.state.modalData.modalData);
const modalFunction = computed(() => store.state.modalData.modalFunction);
const modalErrors = computed(() => store.state.modalErrors || {});
const isModalOpen = computed({
  get: () => store.state.modalData.isModalOpen,
  set: (value) => store.commit("setModalOpen", value),
});

// Função auxiliar para verificar se um campo tem erro
const hasError = (campo) => !!modalErrors.value[campo];
const getError = (campo) =>
  modalErrors.value[campo] ? modalErrors.value[campo][0] : "";

watch(
  modalDataStore,
  (newValue) => {
    if (newValue) {
      localData.value = JSON.parse(JSON.stringify(newValue));
      if (!localData.value.tipo) localData.value.tipo = "Material";
      if (!localData.value.status) localData.value.status = "A";
      localData.value.controlado = !!localData.value.controlado;
    }
  },
  { deep: true, immediate: true },
);

const handleSave = () => {
  // Limpa erros antes de submeter
  store.commit("setModalErrors", {});

  if (!localData.value.nome) {
    proxy.$toastr?.e("Por favor, preencha o nome do grupo.");
    return;
  }

  const content = {
    $axios: proxy.$axios,
    $store: store,
    $toastr: proxy.$toastr,
    modalData: localData.value,
    // Callback chamado após salvar com sucesso — fecha o modal
    onSuccess: () => {
      store.commit("setModalOpen", false);
    },
  };

  props.functions.ADD_UP(content, modalFunction.value);
};
</script>

<template>
  <CadastroDialog
    v-model:open="isModalOpen"
    :title="
      modalFunction === 'ADD'
        ? 'Cadastrar Grupo de Produto'
        : 'Editar Grupo de Produto'
    "
  >
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
      <div class="space-y-2 md:col-span-2">
        <Label for="nome">Nome <span class="text-destructive">*</span></Label>
        <Input
          id="nome"
          v-model="localData.nome"
          placeholder="Digite o nome do grupo"
          :class="{ 'border-red-500 focus-visible:ring-red-500': hasError('nome') }"
        />
        <p v-if="hasError('nome')" class="text-xs text-destructive mt-1">
          {{ getError("nome") }}
        </p>
      </div>

      <div class="space-y-2">
        <Label for="tipo">Tipo <span class="text-destructive">*</span></Label>
        <Select v-model="localData.tipo">
          <SelectTrigger :class="{ 'border-red-500': hasError('tipo') }">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Medicamento">Medicamento</SelectItem>
            <SelectItem value="Material">Material</SelectItem>
          </SelectContent>
        </Select>
        <p v-if="hasError('tipo')" class="text-xs text-destructive mt-1">
          {{ getError("tipo") }}
        </p>
      </div>

      <!-- Medicamento controlado (Portaria 344/98) -->
      <div class="space-y-2 md:col-span-2">
        <div
          class="flex items-start gap-3 rounded-lg border p-3 transition-colors"
          :class="
            localData.controlado
              ? 'border-amber-300 bg-amber-50'
              : 'border-slate-200 bg-slate-50'
          "
        >
          <input
            id="controlado"
            type="checkbox"
            v-model="localData.controlado"
            :disabled="!podeSerControlado"
            class="mt-0.5 h-4 w-4 rounded border-slate-300 accent-amber-600 disabled:opacity-40"
          />
          <div class="space-y-0.5">
            <Label
              for="controlado"
              class="cursor-pointer"
              :class="podeSerControlado ? 'text-slate-700' : 'text-slate-400'"
            >
              Grupo de medicamentos controlados
            </Label>
            <p class="text-xs text-slate-500">
              {{
                podeSerControlado
                  ? "Produtos deste grupo exigem a lista da Portaria 344/98 e entram no relatório de controlados."
                  : "Disponível apenas para grupos do tipo Medicamento."
              }}
            </p>
          </div>
        </div>
        <p v-if="hasError('controlado')" class="text-xs text-destructive mt-1">
          {{ getError("controlado") }}
        </p>
      </div>

      <div class="space-y-2">
        <Label for="status">Status</Label>
        <Select v-model="localData.status">
          <SelectTrigger :class="{ 'border-red-500': hasError('status') }">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="A">Ativo</SelectItem>
            <SelectItem value="I">Inativo</SelectItem>
          </SelectContent>
        </Select>
        <p v-if="hasError('status')" class="text-xs text-destructive mt-1">
          {{ getError("status") }}
        </p>
      </div>
    </div>

    <template #footer="{ close }">
      <Button variant="outline" @click="close"> Fechar </Button>
      <Button @click="handleSave" class="min-w-[100px]">
        {{ modalFunction === "ADD" ? "Salvar" : "Atualizar" }}
      </Button>
    </template>
  </CadastroDialog>
</template>
