<template>
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="sm:max-w-md overflow-hidden">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2 text-amber-600">
          <i class="mdi mdi-keyboard-return text-xl"></i>
          Devolver Item
        </DialogTitle>
        <DialogDescription>
          Informe a quantidade que deseja devolver para o estoque do distribuidor.
        </DialogDescription>
      </DialogHeader>

      <div v-if="item" class="space-y-4 py-4">
        <!-- Resumo do Produto -->
        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <p class="text-sm font-bold text-slate-800">{{ item.produto?.nome_completo || item.produto?.nome }}</p>
          <div class="flex justify-between mt-2 text-xs text-slate-600">
            <span>Atendido: <strong>{{ item.quantidade_liberada }}</strong></span>
            <span v-if="loteInfo">
              Lote: <strong class="bg-amber-100 text-amber-800 px-1 py-0.5 rounded">{{ loteInfo.lote }}</strong>
            </span>
          </div>
        </div>

        <div v-if="multiplosLotes" class="bg-blue-50 text-blue-800 p-3 rounded text-xs">
          <i class="mdi mdi-information mr-1"></i> Este item foi atendido com múltiplos lotes. Selecione qual lote deseja devolver:
          <Select v-model="loteSelecionado" class="mt-2">
            <SelectTrigger class="w-full bg-white h-8 text-xs">
              <SelectValue placeholder="Selecione o Lote" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="(lot, idx) in lotesDisponiveis" :key="idx" :value="lot.lote">
                {{ lot.lote }} (Qtd: {{ lot.quantidade || lot.qtd }})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-3 mt-4">
          <div>
            <label class="text-sm font-medium mb-1 block">Quantidade a Devolver</label>
            <Input
              type="number"
              v-model.number="form.quantidade"
              min="0.01"
              step="any"
              placeholder="Ex: 1"
              class="w-full"
            />
            <p v-if="erroQuantidade" class="text-xs text-red-500 mt-1">{{ erroQuantidade }}</p>
          </div>

          <div>
            <label class="text-sm font-medium mb-1 block">Motivo da Devolução</label>
            <Textarea
              v-model="form.motivo"
              placeholder="Descreva o motivo (opcional)"
              class="w-full resize-none h-20 text-sm"
              maxlength="255"
            />
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-2">
        <Button variant="outline" @click="dialogOpen = false" :disabled="loading">
          Cancelar
        </Button>
        <Button class="bg-amber-600 hover:bg-amber-700 text-white" @click="confirmarDevolucao" :disabled="loading || !form.quantidade || form.quantidade <= 0">
          <LoadingSpinner v-if="loading" size="sm" class="mr-2" />
          <i v-else class="mdi mdi-check mr-2"></i>
          Confirmar Devolução
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed } from "vue";
import { useToast } from "@/components/ui/toast/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import cadMovimentacao from "@/functions/cad_movimentacao";
import { useStore } from "vuex";
import axios from "axios";

const emit = defineEmits(["sucesso"]);
const { toast } = useToast();
const store = useStore();

const dialogOpen = ref(false);
const loading = ref(false);
const item = ref(null);
const movimentacaoId = ref(null);
const erroQuantidade = ref("");

const form = reactive({
  quantidade: null,
  motivo: "",
});

const loteSelecionado = ref("");

const lotesDisponiveis = computed(() => {
  if (!item.value || !item.value.lote) return [];
  try {
    const parsed = JSON.parse(item.value.lote);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
});

const multiplosLotes = computed(() => lotesDisponiveis.value.length > 1);

const loteInfo = computed(() => {
  if (lotesDisponiveis.value.length === 1) {
    return lotesDisponiveis.value[0];
  }
  if (loteSelecionado.value) {
    return lotesDisponiveis.value.find(l => l.lote === loteSelecionado.value);
  }
  return null;
});

const openModal = (movId, itemMov) => {
  movimentacaoId.value = movId;
  item.value = itemMov;
  form.quantidade = null;
  form.motivo = "";
  erroQuantidade.value = "";
  
  if (lotesDisponiveis.value.length === 1) {
    loteSelecionado.value = lotesDisponiveis.value[0].lote;
  } else {
    loteSelecionado.value = "";
  }
  
  dialogOpen.value = true;
};

const confirmarDevolucao = async () => {
  if (!loteSelecionado.value && lotesDisponiveis.value.length > 0) {
    erroQuantidade.value = "Selecione o lote para devolução.";
    return;
  }

  if (!form.quantidade || form.quantidade <= 0) {
    erroQuantidade.value = "A quantidade deve ser maior que zero.";
    return;
  }
  
  let qtdMax = item.value.quantidade_liberada;
  if (loteInfo.value) {
    qtdMax = loteInfo.value.quantidade || loteInfo.value.qtd;
  }

  if (form.quantidade > qtdMax) {
    erroQuantidade.value = "Quantidade maior que a liberada neste lote.";
    return;
  }

  erroQuantidade.value = "";
  loading.value = true;

  try {
    const payload = {
      item_movimentacao_id: item.value.id,
      quantidade: form.quantidade,
      lote: loteSelecionado.value,
      motivo: form.motivo,
    };

    const ctx = { 
      $axios: axios, 
      $store: store, 
      $toastr: { 
        s: (m) => toast({title: "Sucesso", description: m}), 
        e: (m) => toast({title: "Erro", description: m, variant: "destructive"}) 
      } 
    };
    
    await cadMovimentacao.devolverItem(ctx, movimentacaoId.value, payload);
    
    dialogOpen.value = false;
    emit("sucesso");
  } catch (error) {
    if (error.validation && error.errors?.quantidade) {
      erroQuantidade.value = error.errors.quantidade[0];
    }
  } finally {
    loading.value = false;
  }
};

defineExpose({
  openModal,
});
</script>
