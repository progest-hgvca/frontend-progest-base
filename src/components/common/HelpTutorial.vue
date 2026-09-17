<template>
  <!-- Container fixo flutuante no canto inferior direito -->
  <div class="fixed bottom-6 right-6 z-50" ref="containerRef">
    <!-- Card / Modal Contextual -->
    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-3 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-3 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute bottom-14 right-0 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 p-5 text-gray-800 focus:outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
      >
        <!-- Header -->
        <div class="flex items-start justify-between border-b border-gray-100 pb-3 mb-3">
          <div class="flex items-center gap-2 pr-2">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
              <i class="mdi mdi-lightbulb-on-outline"></i>
            </span>
            <h3 id="tutorial-title" class="font-semibold text-gray-900 text-base leading-tight">
              {{ currentTutorial.titulo }}
            </h3>
          </div>
          <button
            type="button"
            @click="fechar"
            class="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition-colors leading-none"
            aria-label="Fechar tutorial"
          >
            <span class="text-lg font-medium select-none">✕</span>
          </button>
        </div>

        <!-- Corpo com finalidade destacada -->
        <div class="space-y-3 text-sm">
          <div class="bg-blue-50/70 border border-blue-100 text-blue-900 rounded-lg p-3 text-xs leading-relaxed">
            <span class="font-semibold block mb-0.5 text-blue-800">Objetivo desta tela:</span>
            {{ currentTutorial.finalidade }}
          </div>

          <!-- Passos numerados -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Passo a Passo:
            </h4>
            <ol class="space-y-2 text-xs text-gray-600">
              <li
                v-for="(passo, index) in currentTutorial.passos"
                :key="index"
                class="flex items-start gap-2"
              >
                <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200 mt-0.5">
                  {{ index + 1 }}
                </span>
                <span class="leading-snug text-gray-700">{{ passo }}</span>
              </li>
            </ol>
          </div>
        </div>

        <!-- Rodapé do Card -->
        <div class="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <span>ProGest • Guia Rápido</span>
          <button
            type="button"
            @click="fechar"
            class="text-blue-600 hover:text-blue-800 font-medium hover:underline"
          >
            Entendido
          </button>
        </div>
      </div>
    </transition>

    <!-- Botão Circular Fixo -->
    <button
      type="button"
      @click="toggle"
      :class="[
        'fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-11 h-11 flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer',
        isOpen ? 'ring-4 ring-blue-300 scale-105' : ''
      ]"
      :aria-expanded="isOpen"
      title="Ajuda e orientações desta tela"
    >
      <span class="text-xl font-bold select-none leading-none">?</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { tutorials } from "@/constants/tutorials.js";

const route = useRoute();
const isOpen = ref(false);
const containerRef = ref(null);

const tutorialPadrao = {
  titulo: "Guia Rápido do Sistema",
  finalidade: "Utilize o sistema ProGest para gerenciamento seguro de estoque, compras, movimentações e dispensações de materiais.",
  passos: [
    "Navegue pelas opções disponíveis no menu lateral para acessar os recursos permitidos ao seu perfil.",
    "Certifique-se sempre de que o setor correto esteja selecionado no cabeçalho superior.",
    "Utilize as tabelas para consultar saldos, histórico de movimentações e informações dos itens.",
    "Caso necessite de suporte técnico ou esclarecimento sobre regras de negócio, contate a administração."
  ]
};

const currentTutorial = computed(() => {
  // 1. Tenta identificar se há uma aba ativa passada via query (ex: ?tab=estoque)
  if (route.query && route.query.tab && tutorials[route.query.tab]) {
    return tutorials[route.query.tab];
  }

  // 2. Busca pelo nome da rota (ex: route.name = 'pedidos')
  if (route.name && tutorials[route.name]) {
    return tutorials[route.name];
  }

  // 3. Busca por identificadores comuns de tela baseados no path
  const path = route.path || "";
  if (path.includes("pedidos") && tutorials.pedidos) return tutorials.pedidos;
  if (path.includes("estoque") && tutorials.estoque) return tutorials.estoque;
  if (path.includes("entrada") && tutorials.entradas) return tutorials.entradas;
  if (path.includes("movimentac") && tutorials.movimentacoes) return tutorials.movimentacoes;
  if (path.includes("produtos") && tutorials.produtos) return tutorials.produtos;
  if (path.includes("setor-atual") && tutorials.setorAtual) return tutorials.setorAtual;

  // 4. Fallback amigável geral
  return tutorialPadrao;
});

const toggle = () => {
  isOpen.value = !isOpen.value;
};

const fechar = () => {
  isOpen.value = false;
};

// Fechar ao pressionar ESC ou clicar fora
const handleKeyDown = (event) => {
  if (event.key === "Escape" && isOpen.value) {
    fechar();
  }
};

const handleClickOutside = (event) => {
  if (containerRef.value && !containerRef.value.contains(event.target) && isOpen.value) {
    fechar();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
  document.addEventListener("mousedown", handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
  document.removeEventListener("mousedown", handleClickOutside);
});
</script>
