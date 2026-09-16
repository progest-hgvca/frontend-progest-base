<template>
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <i class="mdi mdi-package-down text-primary text-xl"></i>
          Baixa / Consumo Interno
        </DialogTitle>
        <DialogDescription>
          Registre a baixa de itens diretamente do estoque deste setor.
        </DialogDescription>
      </DialogHeader>

      <div v-if="lote" class="space-y-4 py-4">
        <!-- Produto e Lote -->
        <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
          <p class="text-sm font-semibold text-slate-800">{{ produto?.nome || produto?.nome_completo }}</p>
          <div class="flex justify-between items-center mt-2">
            <span class="text-xs text-slate-500">Lote: <span class="font-bold text-slate-700">{{ lote.lote }}</span></span>
            <span class="text-xs text-slate-500">Saldo: <span class="font-bold text-slate-700">{{ lote.quantidade_disponivel }}</span></span>
          </div>
        </div>

        <!-- Formulário -->
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium mb-1 block">Quantidade a Consumir</label>
            <Input
              type="number"
              v-model.number="form.quantidade"
              min="0.01"
              step="any"
              placeholder="Ex: 2.5"
              class="w-full"
            />
            <p v-if="erroQuantidade" class="text-xs text-red-500 mt-1">{{ erroQuantidade }}</p>
          </div>

          <div>
            <label class="text-sm font-medium mb-1 block">Justificativa (Opcional)</label>
            <Textarea
              v-model="form.observacao"
              placeholder="Motivo da baixa ou paciente atendido..."
              class="w-full resize-none h-20"
              maxlength="255"
            />
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-4">
        <Button variant="outline" @click="dialogOpen = false" :disabled="loading">
          Cancelar
        </Button>
        <Button @click="confirmarBaixa" :disabled="loading || !form.quantidade || form.quantidade <= 0 || form.quantidade > lote?.quantidade_disponivel">
          <LoadingSpinner v-if="loading" size="sm" class="mr-2" />
          <i v-else class="mdi mdi-check mr-2"></i>
          Confirmar Baixa
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { ref, reactive } from "vue";
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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import cadMovimentacao from "@/functions/cad_movimentacao";
import { useStore } from "vuex";
import axios from "axios";

const props = defineProps({
  setor: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["sucesso"]);

const { toast } = useToast();
const store = useStore();

const dialogOpen = ref(false);
const loading = ref(false);
const produto = ref(null);
const lote = ref(null);
const erroQuantidade = ref("");

const form = reactive({
  quantidade: null,
  observacao: "",
});

const openModal = (prod, lot) => {
  produto.value = prod;
  lote.value = lot;
  form.quantidade = null;
  form.observacao = "";
  erroQuantidade.value = "";
  dialogOpen.value = true;
};

const confirmarBaixa = async () => {
  if (!form.quantidade || form.quantidade <= 0) {
    erroQuantidade.value = "A quantidade deve ser maior que zero.";
    return;
  }
  if (form.quantidade > Number(lote.value.quantidade_disponivel)) {
    erroQuantidade.value = "Quantidade maior que o saldo disponível.";
    return;
  }

  erroQuantidade.value = "";
  loading.value = true;

  try {
    const payload = {
      produto_id: produto.value.id,
      lote: lote.value.lote,
      setor_id: props.setor.id,
      quantidade: form.quantidade,
      observacao: form.observacao,
    };

    const ctx = { 
      $axios: axios, 
      $store: store, 
      $toastr: { 
        s: (m) => toast({title: "Sucesso", description: m}), 
        e: (m) => toast({title: "Erro", description: m, variant: "destructive"}) 
      } 
    };
    
    await cadMovimentacao.registrarConsumoInterno(ctx, payload);
    
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
