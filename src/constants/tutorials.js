/**
 * Tutoriais contextuais do sistema ProGest.
 * Mapeamento por nome de rota (route.name) e identificadores de telas/abas.
 */

export const tutorials = {
  // Tela de Pedidos (Solicitante)
  PedidosView: {
    titulo: "Central de Pedidos e Requisições",
    finalidade: "Solicite materiais e medicamentos aos distribuidores autorizados ou acompanhe o andamento das suas requisições.",
    passos: [
      "Selecione na aba 'Montar Pedido' o setor distribuidor autorizado a fornecer itens para sua unidade.",
      "Busque os produtos desejados na tabela e informe as quantidades que seu setor necessita.",
      "Revise os itens selecionados e clique em 'Enviar Pedido' para despachá-lo para a fila de atendimento.",
      "Acompanhe se a solicitação foi aprovada, atendida ou reprovada na aba 'Histórico de Pedidos'.",
      "Caso precise devolver itens já recebidos, utilize o botão 'Devolver' diretamente no pedido atendido."
    ]
  },
  pedidos: {
    titulo: "Central de Pedidos e Requisições",
    finalidade: "Solicite materiais e medicamentos aos distribuidores autorizados ou acompanhe o andamento das suas requisições.",
    passos: [
      "Selecione na aba 'Montar Pedido' o setor distribuidor autorizado a fornecer itens para sua unidade.",
      "Busque os produtos desejados na tabela e informe as quantidades que seu setor necessita.",
      "Revise os itens selecionados e clique em 'Enviar Pedido' para despachá-lo para a fila de atendimento.",
      "Acompanhe se a solicitação foi aprovada, atendida ou reprovada na aba 'Histórico de Pedidos'.",
      "Caso precise devolver itens já recebidos, utilize o botão 'Devolver' diretamente no pedido atendido."
    ]
  },

  // Tela de Estoque / Aba Estoque
  EstoqueView: {
    titulo: "Consulta de Estoque e Consumo Interno",
    finalidade: "Monitore a quantidade física de produtos e lotes disponíveis no setor e registre baixas imediatas por consumo.",
    passos: [
      "Consulte os itens armazenados na sua unidade com detalhamento de lotes e datas de vencimento.",
      "Utilize os filtros rápidos de busca por nome, código ou grupo para localizar materiais com agilidade.",
      "Para dar baixa em insumos utilizados no dia a dia do setor, clique no botão 'Consumo Interno'.",
      "Selecione o lote correspondente ao material físico consumido e confirme a quantidade a ser baixada.",
      "Fique atento aos alertas visuais de estoque mínimo e proximidade da data de validade dos lotes."
    ]
  },
  estoque: {
    titulo: "Consulta de Estoque e Consumo Interno",
    finalidade: "Monitore a quantidade física de produtos e lotes disponíveis no setor e registre baixas imediatas por consumo.",
    passos: [
      "Consulte os itens armazenados na sua unidade com detalhamento de lotes e datas de vencimento.",
      "Utilize os filtros rápidos de busca por nome, código ou grupo para localizar materiais com agilidade.",
      "Para dar baixa em insumos utilizados no dia a dia do setor, clique no botão 'Consumo Interno'.",
      "Selecione o lote correspondente ao material físico consumido e confirme a quantidade a ser baixada.",
      "Fique atento aos alertas visuais de estoque mínimo e proximidade da data de validade dos lotes."
    ]
  },

  // Tela de Entrada / Aba Entradas
  EntradaView: {
    titulo: "Registro de Entradas por Nota Fiscal (CAF)",
    finalidade: "Cadastre o recebimento formal de mercadorias no estoque central a partir das Notas Fiscais dos fornecedores.",
    passos: [
      "Clique em 'Nova Entrada' para iniciar o lançamento de uma remessa de mercadorias recebida.",
      "Preencha o número da Nota Fiscal, selecione o fornecedor emitente e informe a data da nota.",
      "Adicione os produtos recebidos especificando lote, quantidade, valor unitário e prazo de validade.",
      "Confira se o valor e os quantitativos totais batem com a nota física antes de concluir o registro.",
      "Ao salvar, os lotes são imediatamente incorporados ao estoque da CAF prontos para distribuição."
    ]
  },
  entradas: {
    titulo: "Registro de Entradas por Nota Fiscal (CAF)",
    finalidade: "Cadastre o recebimento formal de mercadorias no estoque central a partir das Notas Fiscais dos fornecedores.",
    passos: [
      "Clique em 'Nova Entrada' para iniciar o lançamento de uma remessa de mercadorias recebida.",
      "Preencha o número da Nota Fiscal, selecione o fornecedor emitente e informe a data da nota.",
      "Adicione os produtos recebidos especificando lote, quantidade, valor unitário e prazo de validade.",
      "Confira se o valor e os quantitativos totais batem com a nota física antes de concluir o registro.",
      "Ao salvar, os lotes são imediatamente incorporados ao estoque da CAF prontos para distribuição."
    ]
  },

  // Tela de Movimentações / Aba Movimentações (Almoxarife)
  MovimentacoesView: {
    titulo: "Atendimento e Aprovação de Movimentações",
    finalidade: "Gerencie e atenda as requisições de materiais ou pedidos de devolução encaminhados ao seu setor.",
    passos: [
      "Acesse a lista de movimentações pendentes para visualizar pedidos que aguardam autorização da sua equipe.",
      "Clique em 'Visualizar / Atender' em uma movimentação pendente para analisar os itens solicitados.",
      "Confira os lotes sugeridos pelo sistema (FIFO por vencimento) e ajuste as quantidades liberadas se necessário.",
      "Caso haja divergência física ou impedimento, você pode reprovar a solicitação informando uma justificativa.",
      "Ao clicar em 'Aprovar', o saldo de estoque é debitado com segurança atômica e transferido ao destino."
    ]
  },
  movimentacoes: {
    titulo: "Atendimento e Aprovação de Movimentações",
    finalidade: "Gerencie e atenda as requisições de materiais ou pedidos de devolução encaminhados ao seu setor.",
    passos: [
      "Acesse a lista de movimentações pendentes para visualizar pedidos que aguardam autorização da sua equipe.",
      "Clique em 'Visualizar / Atender' em uma movimentação pendente para analisar os itens solicitados.",
      "Confira os lotes sugeridos pelo sistema (FIFO por vencimento) e ajuste as quantidades liberadas se necessário.",
      "Caso haja divergência física ou impedimento, você pode reprovar a solicitação informando uma justificativa.",
      "Ao clicar em 'Aprovar', o saldo de estoque é debitado com segurança atômica e transferido ao destino."
    ]
  },

  // Tela Setor Atual (Geral)
  setorAtual: {
    titulo: "Painel do Setor Selecionado",
    finalidade: "Gerencie as operações integradas do seu setor ativo, incluindo estoque, movimentações, entradas e equipe.",
    passos: [
      "Alterne entre as abas superiores ('Visão Geral', 'Estoque', 'Movimentações', 'Entradas') conforme sua necessidade.",
      "Utilize a barra superior para verificar se você está operando no setor e unidade corretos.",
      "Cada aba conta com ferramentas específicas para consulta, edição e emissão de relatórios.",
      "Acesse este botão de ajuda a qualquer momento para ver orientações exclusivas da aba em que você estiver."
    ]
  },

  // Tela de Produtos
  produtos: {
    titulo: "Catálogo de Produtos e Medicamentos",
    finalidade: "Cadastre e gerencie a padronização dos produtos, grupos e especificações técnicas de itens da instituição.",
    passos: [
      "Consulte o catálogo unificado de produtos cadastrados no sistema.",
      "Utilize os filtros por grupo, código e nome para rápida localização.",
      "Cadastre novos itens clicando em 'Novo Produto', informando dosagem, apresentação e unidade de medida.",
      "Mantenha as descrições e parâmetros padronizados para garantir consistência nas dispensações."
    ]
  }
};

export default tutorials;
