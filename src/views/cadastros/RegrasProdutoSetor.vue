<script setup>
/**
 * Administração de quais produtos cada categoria de setor pode solicitar.
 *
 * Duas camadas, na mesma tela:
 *  - regras por categoria: marca/desmarca grupos de produto por categoria;
 *  - exceções por setor: libera ou bloqueia um produto específico num setor,
 *    sem mexer na regra da categoria inteira.
 *
 * A prévia mostra quantos produtos um setor enxerga com a configuração atual —
 * é a forma de conferir uma mudança antes de confiar nela.
 */
import { ref, computed, onMounted } from "vue";
import axios from "axios";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/loading-spinner/LoadingSpinner.vue";
import { useToast } from "@/components/ui/toast";
import { formatarNomeSetor } from "@/utils/formatters";
import {
  listarRegras,
  salvarRegrasCategoria,
  salvarExcecao,
  removerExcecao,
  previewCatalogoSetor,
} from "@/functions/cad_regras_produto";

const { toast } = useToast();

const carregando = ref(true);
const salvando = ref(false);
const grupos = ref([]);
const regras = ref({});
const excecoes = ref([]);
const setoresPorCategoria = ref({});
const categoriaAtiva = ref("Internamento");

const setores = ref([]);
const setorPreview = ref("");
const preview = ref(null);
const carregandoPreview = ref(false);

// Formulário de exceção
const excecaoSetorId = ref("");
const buscaProduto = ref("");
const produtosEncontrados = ref([]);
const buscandoProduto = ref(false);

const CATEGORIAS = [
  {
    valor: "Farmacia",
    titulo: "Farmácia",
    descricao: "CAF, farmácias centrais e satélites. Abastecem o hospital inteiro.",
  },
  {
    valor: "Internamento",
    titulo: "Internamento",
    descricao: "UTIs, clínicas, salas e centro cirúrgico. Itens de uso assistencial.",
  },
  {
    valor: "Administrativo",
    titulo: "Administrativo",
    descricao: "Diretorias, RH, TI, manutenção. Expediente, limpeza e itens gerais.",
  },
];

const gruposDaCategoriaAtiva = computed(() => regras.value[categoriaAtiva.value] || []);

const categoriaAtivaInfo = computed(
  () => CATEGORIAS.find((c) => c.valor === categoriaAtiva.value) || CATEGORIAS[0],
);

const excecoesDoSetor = computed(() => {
  if (!excecaoSetorId.value) return excecoes.value;
  return excecoes.value.filter((e) => String(e.setor_id) === String(excecaoSetorId.value));
});

function estaLiberado(grupoId) {
  return gruposDaCategoriaAtiva.value.map(Number).includes(Number(grupoId));
}

function alternarGrupo(grupoId) {
  const atuais = (regras.value[categoriaAtiva.value] || []).map(Number);
  const id = Number(grupoId);

  regras.value[categoriaAtiva.value] = atuais.includes(id)
    ? atuais.filter((g) => g !== id)
    : [...atuais, id];
}

async function carregar() {
  carregando.value = true;
  try {
    const dados = await listarRegras();
    grupos.value = dados.grupos || [];
    regras.value = dados.regras || {};
    excecoes.value = dados.excecoes || [];
    setoresPorCategoria.value = dados.setores_por_categoria || {};

    const { data } = await axios.post("/setores/list", { filters: { status: "A" } });
    if (data.status) {
      setores.value = Array.isArray(data.data) ? data.data : data.data?.data || [];
    }
  } catch (erro) {
    toast({
      title: "Erro ao carregar",
      description: erro.message || "Não foi possível carregar as regras.",
      variant: "destructive",
    });
  } finally {
    carregando.value = false;
  }
}

async function salvarCategoria() {
  salvando.value = true;
  try {
    await salvarRegrasCategoria(categoriaAtiva.value, gruposDaCategoriaAtiva.value);
    toast({
      title: "Regras salvas",
      description: `${categoriaAtivaInfo.value.titulo}: ${gruposDaCategoriaAtiva.value.length} grupo(s) liberado(s).`,
    });
    if (setorPreview.value) await atualizarPreview();
  } catch (erro) {
    toast({
      title: "Erro ao salvar",
      description: erro.message || "Não foi possível salvar as regras.",
      variant: "destructive",
    });
  } finally {
    salvando.value = false;
  }
}

async function atualizarPreview() {
  if (!setorPreview.value) {
    preview.value = null;
    return;
  }
  carregandoPreview.value = true;
  try {
    preview.value = await previewCatalogoSetor(setorPreview.value, 20);
  } catch (erro) {
    toast({
      title: "Erro na prévia",
      description: erro.message || "Não foi possível gerar a prévia.",
      variant: "destructive",
    });
  } finally {
    carregandoPreview.value = false;
  }
}

let debounce = null;
function buscarProdutos() {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(async () => {
    const termo = buscaProduto.value.trim();
    if (termo.length < 3) {
      produtosEncontrados.value = [];
      return;
    }
    buscandoProduto.value = true;
    try {
      const { data } = await axios.post("/produtos/list", {
        search: termo,
        filters: { status: "A" },
        per_page: 15,
      });
      produtosEncontrados.value = data.status ? data.data || [] : [];
    } catch (erro) {
      produtosEncontrados.value = [];
    } finally {
      buscandoProduto.value = false;
    }
  }, 350);
}

async function adicionarExcecao(produto, permitido) {
  if (!excecaoSetorId.value) {
    toast({
      title: "Selecione um setor",
      description: "A exceção vale para um setor específico.",
      variant: "destructive",
    });
    return;
  }

  try {
    await salvarExcecao(excecaoSetorId.value, produto.id, permitido);
    toast({
      title: permitido ? "Produto liberado" : "Produto bloqueado",
      description: produto.nome,
    });
    buscaProduto.value = "";
    produtosEncontrados.value = [];
    await carregar();
    if (setorPreview.value) await atualizarPreview();
  } catch (erro) {
    toast({
      title: "Erro",
      description: erro.message || "Não foi possível salvar a exceção.",
      variant: "destructive",
    });
  }
}

async function excluirExcecao(excecao) {
  try {
    await removerExcecao(excecao.setor_id, excecao.produto_id);
    toast({ title: "Exceção removida", description: "O produto voltou a seguir a regra da categoria." });
    await carregar();
    if (setorPreview.value) await atualizarPreview();
  } catch (erro) {
    toast({
      title: "Erro",
      description: erro.message || "Não foi possível remover a exceção.",
      variant: "destructive",
    });
  }
}

onMounted(carregar);
</script>

<template>
  <div class="flex-1 space-y-4 p-8 pt-6">
    <div>
      <h2 class="text-3xl font-bold tracking-tight">Produtos por Setor</h2>
      <p class="text-sm text-muted-foreground mt-1">
        Define o que cada tipo de setor pode solicitar. Vale tanto para a tela de
        pedido quanto para a API — um produto fora da regra é recusado na criação
        do pedido.
      </p>
    </div>

    <div v-if="carregando" class="flex justify-center py-16">
      <LoadingSpinner size="lg" />
    </div>

    <template v-else>
      <!-- Seletor de categoria -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          v-for="cat in CATEGORIAS"
          :key="cat.valor"
          type="button"
          @click="categoriaAtiva = cat.valor"
          class="text-left rounded-lg border p-4 transition-colors"
          :class="
            categoriaAtiva === cat.valor
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-border hover:bg-muted/50'
          "
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-semibold">{{ cat.titulo }}</span>
            <Badge variant="secondary" class="text-xs">
              {{ setoresPorCategoria[cat.valor] || 0 }} setor(es)
            </Badge>
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ cat.descricao }}</p>
          <p class="text-xs mt-2 font-medium">
            {{ (regras[cat.valor] || []).length }} de {{ grupos.length }} grupos liberados
          </p>
        </button>
      </div>

      <!-- Grupos liberados para a categoria escolhida -->
      <Card>
        <CardHeader class="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Grupos liberados — {{ categoriaAtivaInfo.titulo }}</CardTitle>
            <p class="text-sm text-muted-foreground mt-1">
              Vale para os {{ setoresPorCategoria[categoriaAtiva] || 0 }} setores desta categoria.
            </p>
          </div>
          <Button :disabled="salvando" @click="salvarCategoria">
            {{ salvando ? "Salvando..." : "Salvar regras" }}
          </Button>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <label
              v-for="grupo in grupos"
              :key="grupo.id"
              class="flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors"
              :class="estaLiberado(grupo.id) ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/40'"
            >
              <input
                type="checkbox"
                class="mt-1 h-4 w-4"
                :checked="estaLiberado(grupo.id)"
                @change="alternarGrupo(grupo.id)"
              />
              <span class="min-w-0">
                <span class="block text-sm font-medium truncate">{{ grupo.nome }}</span>
                <span class="flex items-center gap-2 mt-1">
                  <Badge variant="outline" class="text-[10px]">{{ grupo.tipo }}</Badge>
                  <Badge v-if="grupo.controlado" variant="destructive" class="text-[10px]">
                    Controlado
                  </Badge>
                </span>
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      <!-- Prévia do catálogo -->
      <Card>
        <CardHeader>
          <CardTitle>Conferir o catálogo de um setor</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-col md:flex-row gap-4 items-end">
            <div class="flex-1 space-y-2">
              <Label>Setor</Label>
              <select
                v-model="setorPreview"
                @change="atualizarPreview"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione um setor</option>
                <option v-for="s in setores" :key="s.id" :value="s.id">
                  {{ formatarNomeSetor(s) }}
                </option>
              </select>
            </div>
          </div>

          <div v-if="carregandoPreview" class="py-6 flex justify-center">
            <LoadingSpinner />
          </div>

          <div v-else-if="preview" class="space-y-3">
            <div class="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="secondary">{{ preview.setor.categoria || "sem categoria" }}</Badge>
              <Badge variant="outline">tipo: {{ preview.setor.tipo }}</Badge>
              <span class="font-semibold">{{ preview.total }} produto(s) visíveis</span>
            </div>
            <div class="rounded-md border divide-y max-h-72 overflow-y-auto">
              <div
                v-for="p in preview.amostra"
                :key="p.id"
                class="px-3 py-2 text-sm flex items-center justify-between gap-3"
              >
                <span class="truncate">{{ p.nome }}</span>
                <span class="text-xs text-muted-foreground shrink-0">
                  {{ p.grupo_produto?.nome }}
                </span>
              </div>
              <p v-if="!preview.amostra.length" class="px-3 py-6 text-center text-sm text-muted-foreground">
                Este setor não enxerga nenhum produto com as regras atuais.
              </p>
            </div>
            <p v-if="preview.total > preview.amostra.length" class="text-xs text-muted-foreground">
              Mostrando os {{ preview.amostra.length }} primeiros de {{ preview.total }}.
            </p>
          </div>
        </CardContent>
      </Card>

      <!-- Exceções por setor -->
      <Card>
        <CardHeader>
          <CardTitle>Exceções por setor</CardTitle>
          <p class="text-sm text-muted-foreground mt-1">
            Libera ou bloqueia um produto específico num setor, sem afrouxar a
            regra da categoria inteira. Um bloqueio sempre vence uma liberação.
          </p>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-col md:flex-row gap-4 items-end">
            <div class="flex-1 space-y-2">
              <Label>Setor</Label>
              <select
                v-model="excecaoSetorId"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos os setores (apenas listar)</option>
                <option v-for="s in setores" :key="s.id" :value="s.id">
                  {{ formatarNomeSetor(s) }}
                </option>
              </select>
            </div>
            <div class="flex-1 space-y-2">
              <Label>Buscar produto</Label>
              <Input
                v-model="buscaProduto"
                @input="buscarProdutos"
                placeholder="Nome, código SIMPAS..."
              />
            </div>
          </div>

          <div v-if="buscandoProduto" class="py-4 flex justify-center">
            <LoadingSpinner size="sm" />
          </div>

          <div v-else-if="produtosEncontrados.length" class="rounded-md border divide-y">
            <div
              v-for="p in produtosEncontrados"
              :key="p.id"
              class="px-3 py-2 flex items-center justify-between gap-3"
            >
              <span class="text-sm truncate">{{ p.nome }}</span>
              <span class="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" @click="adicionarExcecao(p, true)">
                  Liberar
                </Button>
                <Button size="sm" variant="destructive" @click="adicionarExcecao(p, false)">
                  Bloquear
                </Button>
              </span>
            </div>
          </div>

          <div class="rounded-md border divide-y">
            <div
              v-for="e in excecoesDoSetor"
              :key="e.id"
              class="px-3 py-2 flex items-center justify-between gap-3"
            >
              <span class="min-w-0">
                <span class="block text-sm truncate">{{ e.produto?.nome }}</span>
                <span class="text-xs text-muted-foreground">
                  {{ e.setor?.nome }}
                </span>
              </span>
              <span class="flex items-center gap-3 shrink-0">
                <Badge :variant="e.permitido ? 'secondary' : 'destructive'" class="text-xs">
                  {{ e.permitido ? "Liberado" : "Bloqueado" }}
                </Badge>
                <Button size="sm" variant="ghost" @click="excluirExcecao(e)">Remover</Button>
              </span>
            </div>
            <p v-if="!excecoesDoSetor.length" class="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhuma exceção cadastrada.
            </p>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
