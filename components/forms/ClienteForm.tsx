import React from 'react'
import PessoaForm from './PessoaForm'
import type { Cliente, ClienteForm as ClienteFormValues, PessoaFormInput } from '@/types'

interface ClienteFormProps {
  cliente?: Cliente
  onSubmit: (cliente: ClienteFormValues) => Promise<void> | void
  onCancel: () => void
  loading?: boolean
}

const mapClienteToPessoa = (cliente?: Cliente): Partial<PessoaFormInput> => {
  if (!cliente) {
    return {}
  }

  return {
    nome: cliente.nome,
    documento: cliente.documento || '',
    email: cliente.email || '',
    telefone: cliente.telefone || '',
    endereco: cliente.endereco || '',
    cidade: cliente.cidade || '',
    estado: cliente.estado || '',
    cep: cliente.cep || '',
    bairro: cliente.bairro || '',
    observacoes: cliente.observacoes || '',
    tipo: cliente.tipo,
    ativo: cliente.ativo
  }
}

export default function ClienteForm({ cliente, onSubmit, onCancel, loading = false }: ClienteFormProps) {
  const handleSubmit = (values: PessoaFormInput) => {
    const payload: ClienteFormValues = {
      ...values,
      email: values.email ?? '',
      telefone: values.telefone ?? '',
      tipo: values.tipo || 'cliente',
      ativo: values.ativo ?? true,
      nome_fantasia: undefined,
      inscricao_estadual: undefined
    }

    onSubmit(payload)
  }

  return (
    <PessoaForm
      initialData={mapClienteToPessoa(cliente)}
      mode="cliente"
      allowTipoSwitch
      allowFornecedorExtras
      allowStatusToggle
      enableDocumentoLookup
      enableCepLookup
      loading={loading}
      title={cliente ? 'Editar Cliente' : 'Novo Cliente'}
      description="Defina o perfil e as informações básicas do cliente"
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  )
}
