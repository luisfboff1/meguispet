import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, MapPin, Building2 } from 'lucide-react'
import { cepService } from '@/services/cep'
import { cnpjService } from '@/services/cnpj'
import type { Cliente, ClienteForm as ClienteFormValues } from '@/types'

interface ClienteFormProps {
  cliente?: Cliente
  onSubmit: (cliente: ClienteFormValues) => Promise<void> | void
  onCancel: () => void
  loading?: boolean
}

export default function ClienteForm({ cliente, onSubmit, onCancel, loading = false }: ClienteFormProps) {
  const [formData, setFormData] = useState<ClienteFormValues>({
    nome: cliente?.nome || '',
    email: cliente?.email || '',
    telefone: cliente?.telefone || '',
    endereco: cliente?.endereco || '',
    cidade: cliente?.cidade || '',
    estado: cliente?.estado || '',
    cep: cliente?.cep || '',
    bairro: cliente?.bairro || '',
    documento: cliente?.documento || '',
    observacoes: cliente?.observacoes || '',
    tipo: cliente?.tipo || 'cliente'
  })

  const [cepLoading, setCepLoading] = useState(false)
  const [cnpjLoading, setCnpjLoading] = useState(false)

  // Autocomplete por CEP
  const handleCEPChange = async (cep: string) => {
    setFormData(prev => ({ ...prev, cep }))
    
    if (cep.replace(/\D/g, '').length === 8) {
      setCepLoading(true)
      try {
        const cepData = await cepService.buscarCEP(cep)
        if (cepData) {
          setFormData(prev => ({
            ...prev,
            endereco: cepData.logradouro,
            bairro: cepData.bairro,
            cidade: cepData.localidade,
            estado: cepData.uf
          }))
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error)
      } finally {
        setCepLoading(false)
      }
    }
  }

  // Autocomplete por CNPJ
  const handleCNPJChange = async (cnpj: string) => {
    setFormData(prev => ({ ...prev, documento: cnpj }))
    
    if (cnpj.replace(/\D/g, '').length === 14) {
      setCnpjLoading(true)
      try {
        const cnpjData = await cnpjService.buscarCNPJ(cnpj)
        if (cnpjData) {
          setFormData(prev => ({
            ...prev,
            nome: cnpjData.razao_social,
            endereco: `${cnpjData.logradouro}, ${cnpjData.numero}`,
            cidade: cnpjData.municipio,
            estado: cnpjData.uf,
            cep: cnpjData.cep,
            tipo: 'cliente'
          }))
        }
      } catch (error) {
        console.error('Erro ao buscar CNPJ:', error)
      } finally {
        setCnpjLoading(false)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {cliente ? 'Editar Cliente' : 'Novo Cliente'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                value={formData.tipo}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as 'cliente' | 'fornecedor' | 'ambos' }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="cliente">Cliente</option>
                <option value="fornecedor">Fornecedor</option>
                <option value="ambos">Cliente e Fornecedor</option>
              </select>
            </div>
          </div>

          {/* CNPJ/CPF */}
          <div>
            <Label htmlFor="documento">CNPJ/CPF</Label>
            <div className="relative">
              <Input
                id="documento"
                type="text"
                value={formData.documento}
                onChange={(e) => handleCNPJChange(e.target.value)}
                placeholder="Digite o CNPJ ou CPF"
                className="pr-10"
              />
              {cnpjLoading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
              )}
              <Building2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Nome */}
          <div>
            <Label htmlFor="nome">Nome/Razão Social</Label>
            <Input
              id="nome"
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Nome completo ou razão social"
              required
            />
          </div>

          {/* Email e Telefone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          {/* CEP */}
          <div>
            <Label htmlFor="cep">CEP</Label>
            <div className="relative">
              <Input
                id="cep"
                type="text"
                value={formData.cep}
                onChange={(e) => handleCEPChange(e.target.value)}
                placeholder="00000-000"
                className="pr-10"
              />
              {cepLoading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
              )}
              <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Endereço */}
          <div>
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              type="text"
              value={formData.endereco}
              onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
              placeholder="Rua, número, complemento"
            />
          </div>

          {/* Cidade e Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                type="text"
                value={formData.cidade}
                onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                placeholder="Cidade"
              />
            </div>
            <div>
              <Label htmlFor="estado">Estado</Label>
              <Input
                id="estado"
                type="text"
                value={formData.estado}
                onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                placeholder="UF"
                maxLength={2}
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações adicionais"
              className="w-full p-2 border rounded-md h-20 resize-none"
            />
          </div>

          {/* Botões */}
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
