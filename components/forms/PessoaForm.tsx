import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, Building2, MapPin } from 'lucide-react'
import { cepService } from '@/services/cep'
import { cnpjService } from '@/services/cnpj'
import { vendedoresService } from '@/services/api'
import type { PessoaFormInput, PessoaTipo, Vendedor } from '@/types'

interface PessoaFormProps {
  initialData?: Partial<PessoaFormInput>
  mode?: PessoaTipo
  allowTipoSwitch?: boolean
  allowFornecedorExtras?: boolean
  allowStatusToggle?: boolean
  enableCepLookup?: boolean
  enableDocumentoLookup?: boolean
  allowedTipos?: PessoaTipo[]
  onSubmit: (values: PessoaFormInput) => Promise<void> | void
  onCancel: () => void
  loading?: boolean
  title?: string
  description?: string
}

const defaultPessoa: PessoaFormInput = {
  nome: '',
  tipo: 'cliente',
  email: '',
  telefone: '',
  documento: '',
  endereco: '',
  cidade: '',
  estado: '',
  cep: '',
  bairro: '',
  observacoes: '',
  nome_fantasia: '',
  inscricao_estadual: '',
  vendedor_id: null,
  ativo: true
}

export default function PessoaForm({
  initialData,
  mode = 'cliente',
  allowTipoSwitch = true,
  allowFornecedorExtras = true,
  allowStatusToggle = true,
  enableCepLookup = true,
  enableDocumentoLookup = true,
  allowedTipos,
  onSubmit,
  onCancel,
  loading = false,
  title,
  description
}: PessoaFormProps) {
  const tiposDisponiveis = useMemo<PessoaTipo[]>(
    () => (allowedTipos?.length ? allowedTipos : ['cliente', 'fornecedor', 'ambos']),
    [allowedTipos]
  )

  const resolvedDefaults = useMemo(() => {
    const candidato = initialData?.tipo ?? mode
    const tipoSeguro = tiposDisponiveis.includes(candidato) ? candidato : tiposDisponiveis[0]
    return {
      ...defaultPessoa,
      ...initialData,
      tipo: tipoSeguro
    }
  }, [initialData, mode, tiposDisponiveis])

  const [formData, setFormData] = useState<PessoaFormInput>(resolvedDefaults)
  const [cepLoading, setCepLoading] = useState(false)
  const [docLookupLoading, setDocLookupLoading] = useState(false)
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [vendedoresLoading, setVendedoresLoading] = useState(false)

  const currentTipo = allowTipoSwitch ? formData.tipo : tiposDisponiveis[0]
  const showVendedorField = currentTipo === 'cliente' || currentTipo === 'ambos'

  // Fetch vendedores list for the selector
  useEffect(() => {
    const fetchVendedores = async () => {
      if (!showVendedorField) return
      
      setVendedoresLoading(true)
      try {
        const response = await vendedoresService.getAll(1, 1000)
        if (response.success && response.data) {
          setVendedores(response.data.filter((v: Vendedor) => v.ativo))
        }
      } catch (error) {
        console.error('Error loading vendedores:', error)
      } finally {
        setVendedoresLoading(false)
      }
    }

    fetchVendedores()
  }, [showVendedorField])

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      ...resolvedDefaults,
      tipo: allowTipoSwitch ? resolvedDefaults.tipo : tiposDisponiveis[0]
    }))
  }, [resolvedDefaults, allowTipoSwitch, tiposDisponiveis])

  const handleCepChange = async (cep: string) => {
    setFormData(prev => ({ ...prev, cep }))

    const normalized = cep.replace(/\D/g, '')
    if (!enableCepLookup || normalized.length !== 8) {
      return
    }

    setCepLoading(true)
    try {
      const response = await cepService.buscarCEP(cep)
      if (response) {
        setFormData(prev => ({
          ...prev,
          endereco: response.logradouro || prev.endereco,
          bairro: response.bairro || prev.bairro,
          cidade: response.localidade || prev.cidade,
          estado: response.uf || prev.estado
        }))
      }
    } catch (error) {
    } finally {
      setCepLoading(false)
    }
  }

  const handleDocumentoChange = async (documento: string) => {
    setFormData(prev => ({ ...prev, documento }))

    const normalized = documento.replace(/\D/g, '')
    if (!enableDocumentoLookup || normalized.length !== 14) {
      return
    }

    setDocLookupLoading(true)
    try {
      const response = await cnpjService.buscarCNPJ(documento)
      if (response) {
        setFormData(prev => ({
          ...prev,
          nome: response.razao_social || prev.nome,
          nome_fantasia: response.nome_fantasia || prev.nome_fantasia,
          endereco: response.logradouro ? `${response.logradouro}, ${response.numero}` : prev.endereco,
          cidade: response.municipio || prev.cidade,
          estado: response.uf || prev.estado,
          cep: response.cep || prev.cep,
          tipo: allowTipoSwitch ? prev.tipo : mode
        }))
      }
    } catch (error) {
    } finally {
      setDocLookupLoading(false)
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const payload: PessoaFormInput = {
      ...formData,
      tipo: currentTipo,
      ativo: allowStatusToggle ? formData.ativo : formData.ativo ?? true
    }
    onSubmit(payload)
  }

  const showFornecedorFields = allowFornecedorExtras && (currentTipo === 'fornecedor' || currentTipo === 'ambos')

  return (
    <Card className="w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle>{title || (initialData ? 'Editar Registro' : 'Nova Pessoa')}</CardTitle>
          <CardDescription>
            {description || 'Preencha as informações de cadastro'}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                value={currentTipo}
                onChange={(event) => setFormData(prev => ({ ...prev, tipo: event.target.value as PessoaTipo }))}
                className="w-full p-2 border rounded-md"
                disabled={!allowTipoSwitch}
              >
                {tiposDisponiveis.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo === 'cliente' && 'Cliente'}
                    {tipo === 'fornecedor' && 'Fornecedor'}
                    {tipo === 'ambos' && 'Cliente e Fornecedor'}
                  </option>
                ))}
              </select>
            </div>
            {allowStatusToggle && (
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="ativo"
                  checked={Boolean(formData.ativo ?? true)}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                />
                <Label htmlFor="ativo">Registro ativo</Label>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="documento">CPF / CNPJ</Label>
            <div className="relative">
              <Input
                id="documento"
                value={formData.documento ?? ''}
                onChange={(event) => handleDocumentoChange(event.target.value)}
                placeholder="Digite o documento"
                className="pr-10"
              />
              {(enableDocumentoLookup && docLookupLoading) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
              )}
              {showFornecedorFields && !docLookupLoading && (
                <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome / Razão Social *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(event) => setFormData(prev => ({ ...prev, nome: event.target.value }))}
                required
              />
            </div>
            {showFornecedorFields && (
              <div className="space-y-2">
                <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                <Input
                  id="nome_fantasia"
                  value={formData.nome_fantasia ?? ''}
                  onChange={(event) => setFormData(prev => ({ ...prev, nome_fantasia: event.target.value }))}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
              <Input
                id="inscricao_estadual"
                value={formData.inscricao_estadual ?? ''}
                onChange={(event) => setFormData(prev => ({ ...prev, inscricao_estadual: event.target.value }))}
                placeholder="Inscrição Estadual (opcional)"
              />
            </div>
            {showVendedorField && (
              <div className="space-y-2">
                <Label htmlFor="vendedor_id">Vendedor</Label>
                <select
                  id="vendedor_id"
                  value={formData.vendedor_id?.toString() ?? ''}
                  onChange={(event) => {
                    const value = event.target.value
                    setFormData(prev => ({ 
                      ...prev, 
                      vendedor_id: value ? parseInt(value, 10) : null 
                    }))
                  }}
                  className="w-full p-2 border rounded-md"
                  disabled={vendedoresLoading}
                >
                  <option value="">Selecione um vendedor</option>
                  {vendedores.map((vendedor) => (
                    <option key={vendedor.id} value={vendedor.id}>
                      {vendedor.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email ?? ''}
                onChange={(event) => setFormData(prev => ({ ...prev, email: event.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone ?? ''}
                onChange={(event) => setFormData(prev => ({ ...prev, telefone: event.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <div className="relative">
              <Input
                id="cep"
                value={formData.cep ?? ''}
                onChange={(event) => handleCepChange(event.target.value)}
                placeholder="00000-000"
                className="pr-10"
              />
              {(enableCepLookup && cepLoading) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
              )}
              {!cepLoading && (
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              value={formData.endereco ?? ''}
              onChange={(event) => setFormData(prev => ({ ...prev, endereco: event.target.value }))}
              placeholder="Rua, número, complemento"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={formData.bairro ?? ''}
                onChange={(event) => setFormData(prev => ({ ...prev, bairro: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={formData.cidade ?? ''}
                onChange={(event) => setFormData(prev => ({ ...prev, cidade: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Input
                id="estado"
                value={formData.estado ?? ''}
                onChange={(event) => setFormData(prev => ({ ...prev, estado: event.target.value.toUpperCase().slice(0, 2) }))}
                placeholder="UF"
                maxLength={2}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <textarea
              id="observacoes"
              value={formData.observacoes ?? ''}
              onChange={(event) => setFormData(prev => ({ ...prev, observacoes: event.target.value }))}
              placeholder="Observações adicionais"
              className="w-full p-2 border rounded-md h-24 resize-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
