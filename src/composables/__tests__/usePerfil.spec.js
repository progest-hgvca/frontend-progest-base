import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePerfil } from '../usePerfil'
import { useStore } from 'vuex'

// Mock do vuex
vi.mock('vuex', () => ({
  useStore: vi.fn()
}))

describe('usePerfil.js', () => {
  let mockStore

  beforeEach(() => {
    mockStore = {
      state: {
        user: { id: 1 },
        listUsuariosSetor: []
      }
    }
    useStore.mockReturnValue(mockStore)
  })

  it('deve retornar isAdmin como true quando o usuário tiver perfil admin no setor', () => {
    mockStore.state.listUsuariosSetor = [
      { usuario_id: 1, perfil: 'admin' },
      { usuario_id: 2, perfil: 'solicitante' }
    ]

    const { isAdmin, isAlmoxarife, isSolicitante, podeVerRelatorios } = usePerfil()
    
    expect(isAdmin.value).toBe(true)
    expect(isAlmoxarife.value).toBe(false)
    expect(isSolicitante.value).toBe(false)
    expect(podeVerRelatorios.value).toBe(true)
  })

  it('deve retornar false para todos se listUsuariosSetor estiver vazia e sem fallback', () => {
    const { isAdmin, isAlmoxarife, isSolicitante, podeVerRelatorios } = usePerfil()
    
    expect(isAdmin.value).toBe(false)
    expect(isAlmoxarife.value).toBe(false)
    expect(isSolicitante.value).toBe(false)
    expect(podeVerRelatorios.value).toBe(false)
  })

  it('deve utilizar fallback (compatibilidade legada) caso o usuário não esteja na lista, mas tenha a role no próprio user', () => {
    mockStore.state.user = { id: 1, roles: ['almoxarife'] }
    mockStore.state.listUsuariosSetor = []

    const { isAdmin, isAlmoxarife, isSolicitante, podeVerRelatorios } = usePerfil()

    expect(isAdmin.value).toBe(false)
    expect(isAlmoxarife.value).toBe(true)
    expect(isSolicitante.value).toBe(false)
    expect(podeVerRelatorios.value).toBe(true)
  })
  
  it('deve retornar isSolicitante como true corretamente e impedir visualização de relatórios', () => {
    mockStore.state.listUsuariosSetor = [
      { usuario_id: 1, perfil: 'solicitante' }
    ]

    const { isAdmin, isAlmoxarife, isSolicitante, podeVerRelatorios } = usePerfil()

    expect(isAdmin.value).toBe(false)
    expect(isAlmoxarife.value).toBe(false)
    expect(isSolicitante.value).toBe(true)
    expect(podeVerRelatorios.value).toBe(false) // Solicitante não pode ver relatórios
  })
})
