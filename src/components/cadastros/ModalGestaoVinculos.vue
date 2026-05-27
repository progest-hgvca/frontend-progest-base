<script setup>
import { ref, computed, watch, getCurrentInstance } from "vue";
import { useStore } from "vuex";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { LinkIcon, Trash2Icon, ShieldIcon, UserIcon, PackageIcon } from "lucide-vue-next";
import funcUsuarioSetor from "@/functions/cad_usuario_setor.js";
import { formatarNomeSetor } from "@/utils/formatters.js";

const props = defineProps({
  open: { type: Boolean, default: false },
  usuario: { type: Object, default: () => ({}) },
});
const emit = defineEmits(["update:open", "atualizado"]);

const store = useStore();
const { proxy } = getCurrentInstance();

const loading = ref(false);
const vinculos = ref([]);
const novoSetorId = ref("");
const novoPerfil = ref("solicitante");

// Todos os setores disponíveis para vincular
const todosSetores = computed(() => {
  const list = store.state.listSetoresGerais;
  return Array.isArray(list?.data) ? list.data : Array.isArray(list) ? list : [];
});

// Setores já vinculados (para não mostrar no select de adição)
const setoresVinculadosIds = computed(() =>
  vinculos.value.map((v) => v.setor_id)
);

const setoresDisponiveis = computed(() =>
  todosSetores.value.filter(
    (s) => !setoresVinculadosIds.value.includes(s.id) && s.status === "A"
  )
);

const carregarVinculos = async () => {
  if (!props.usuario?.id) return;
  loading.value = true;
  try {
    const res = await proxy.$axios.post(
      "/usuarioSetor/listByUsuario",
      { usuario_id: props.usuario.id },
      { headers: { Authorization: "Bearer " + store.getters.getUserToken } }
    );
    vinculos.value = res.data?.data || [];
  } catch (e) {
    vinculos.value = [];
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.open,
  (val) => {
    if (val) carregarVinculos();
    else {
      vinculos.value = [];
      novoSetorId.value = "";
      novoPerfil.value = "solicitante";
    }
  }
);

const vincular = async () => {
  if (!novoSetorId.value || !novoPerfil.value) return;
  loading.value = true;
  try {
    await funcUsuarioSetor.create(
      { $axios: proxy.$axios, $store: store, $toastr: proxy.$toastr },
      {
        usuario_id: props.usuario.id,
        setor_id: parseInt(novoSetorId.value),
        perfil: novoPerfil.value,
      }
    );
    novoSetorId.value = "";
    novoPerfil.value = "solicitante";
    await carregarVinculos();
    emit("atualizado");
    proxy.$toastr?.s("Vínculo criado com sucesso!");
  } catch (e) {
    proxy.$toastr?.e("Erro ao criar vínculo.");
  } finally {
    loading.value = false;
  }
};

const remover = async (vinculo) => {
  loading.value = true;
  try {
    await funcUsuarioSetor.remove(
      { $axios: proxy.$axios, $store: store, $toastr: proxy.$toastr },
      { usuario_id: props.usuario.id, setor_id: vinculo.setor_id }
    );
    await carregarVinculos();
    emit("atualizado");
    proxy.$toastr?.s("Vínculo removido com sucesso!");
  } catch (e) {
    proxy.$toastr?.e("Erro ao remover vínculo.");
  } finally {
    loading.value = false;
  }
};

const perfilConfig = {
  admin: { label: "Admin", color: "text-rose-600 border-rose-200 bg-rose-50" },
  almoxarife: { label: "Almoxarife", color: "text-blue-600 border-blue-200 bg-blue-50" },
  solicitante: { label: "Solicitante", color: "text-emerald-600 border-emerald-200 bg-emerald-50" },
};

const getPerfilConfig = (perfil) =>
  perfilConfig[perfil] || { label: perfil, color: "text-slate-600 border-slate-200 bg-slate-50" };

const close = () => emit("update:open", false);
</script>

<template>
  <Dialog :open="open" @update:open="close">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <LinkIcon class="w-5 h-5 text-primary" />
          Gerenciar Vínculos — {{ usuario?.name }}
        </DialogTitle>
      </DialogHeader>

      <div class="space-y-5 py-2">
        <!-- Formulário de adição -->
        <div class="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">
          <Label class="text-xs font-bold uppercase tracking-wider text-slate-500">Novo Vínculo</Label>

          <div class="grid grid-cols-1 gap-3">
            <div class="space-y-1.5">
              <Label>Setor</Label>
              <Select v-model="novoSetorId">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor..." />
                </SelectTrigger>
                <SelectContent>
                  <div v-if="setoresDisponiveis.length === 0" class="py-4 text-center text-sm text-muted-foreground">
                    Todos os setores já foram vinculados.
                  </div>
                  <SelectItem
                    v-for="s in setoresDisponiveis"
                    :key="s.id"
                    :value="s.id.toString()"
                  >
                    {{ formatarNomeSetor(s) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-1.5">
              <Label>Perfil no Setor</Label>
              <Select v-model="novoPerfil">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solicitante">Solicitante</SelectItem>
                  <SelectItem value="almoxarife">Almoxarife</SelectItem>
                  <SelectItem value="admin">Admin do Setor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            @click="vincular"
            :disabled="!novoSetorId || !novoPerfil || loading"
            class="w-full"
            size="sm"
          >
            <LinkIcon class="w-4 h-4 mr-2" />
            Vincular Setor
          </Button>
        </div>

        <!-- Lista de vínculos atuais -->
        <div class="space-y-2">
          <Label class="text-xs font-bold uppercase tracking-wider text-slate-500">
            Acessos Atuais ({{ vinculos.length }})
          </Label>

          <div v-if="loading" class="flex justify-center py-6">
            <LoadingSpinner size="sm" />
          </div>

          <div v-else-if="vinculos.length === 0" class="py-6 text-center text-sm text-slate-400 bg-slate-50 rounded-lg border border-dashed">
            Nenhum setor vinculado a este colaborador.
          </div>

          <div v-else class="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            <div
              v-for="v in vinculos"
              :key="v.setor_id"
              class="flex items-center justify-between p-3 bg-white border rounded-xl shadow-sm hover:shadow transition-shadow"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <PackageIcon class="w-4 h-4 text-slate-500" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-slate-800 truncate">
                    {{ formatarNomeSetor(v.setor) || v.setor?.nome || `Setor #${v.setor_id}` }}
                  </p>
                  <p class="text-[10px] text-slate-400">
                    {{ v.setor?.polo?.nome || 'Polo não informado' }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0 ml-3">
                <Badge
                  variant="outline"
                  :class="getPerfilConfig(v.perfil).color"
                  class="text-[10px] font-bold uppercase tracking-widest"
                >
                  {{ getPerfilConfig(v.perfil).label }}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 text-slate-400 hover:text-destructive"
                  @click="remover(v)"
                  :disabled="loading"
                >
                  <Trash2Icon class="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end border-t pt-3">
        <Button variant="outline" @click="close">Fechar</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
