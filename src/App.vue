<template>
  <div id="app">
    <router-view />
    <Toaster />
    <FeedbackModal />
    <HelpTutorial v-if="showTutorial" />
  </div>
</template>

<script>
import { defineComponent, computed } from "vue";
import { useRoute } from "vue-router";
import { Toaster } from "@/components/ui/toast";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import HelpTutorial from "@/components/common/HelpTutorial.vue";

export default defineComponent({
  name: "App",
  components: {
    Toaster,
    FeedbackModal,
    HelpTutorial,
  },
  setup() {
    const route = useRoute();
    const showTutorial = computed(() => {
      const publicRoutes = ["login", "register"];
      return !publicRoutes.includes(route.name);
    });

    return {
      showTutorial,
    };
  },
});
</script>

<style lang="scss"></style>