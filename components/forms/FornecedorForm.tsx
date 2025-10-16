import React from 'react'
import PessoaForm from './PessoaForm'
import type { Fornecedor, FornecedorForm as FornecedorFormType, PessoaFormInput } from '@/types'

interface FornecedorFormProps {
  fornecedor?: Fornecedor
  onSubmit: (data: FornecedorFormType) => void
  onCancel: () => void
  loading?: boolean
}

const mapFornecedorToPessoa = (fornecedor?: Fornecedor): Partial<PessoaFormInput> => {
  if (!fornecedor) {
    return { tipo: 'fornecedor', ativo: true }
  }

  return {
    nome: fornecedor.nome,
    nome_fantasia: fornecedor.nome_fantasia || '',
    documento: fornecedor.cnpj || '',
    inscricao_estadual: fornecedor.inscricao_estadual || '',
    email: fornecedor.email || '',
    telefone: fornecedor.telefone || '',
    endereco: fornecedor.endereco || '',
    cidade: fornecedor.cidade || '',
    estado: fornecedor.estado || '',
    cep: fornecedor.cep || '',
    observacoes: fornecedor.observacoes || '',
    tipo: 'fornecedor',
    ativo: fornecedor.ativo
  }
}

export default function FornecedorForm({ fornecedor, onSubmit, onCancel, loading = false }: FornecedorFormProps) {
  const handleSubmit = (values: PessoaFormInput) => {
    const payload: FornecedorFormType = {
      nome: values.nome,
      nome_fantasia: values.nome_fantasia || '',
      cnpj: values.documento || '',
      inscricao_estadual: values.inscricao_estadual || '',
      email: values.email || '',
      telefone: values.telefone || '',
      endereco: values.endereco || '',
      cidade: values.cidade || '',
      estado: values.estado || '',
      cep: values.cep || '',
      observacoes: values.observacoes || '',
      ativo: values.ativo ?? true,
      tipo: values.tipo === 'cliente' ? 'fornecedor' : values.tipo
    }

    onSubmit(payload)
  }

  return (
    <PessoaForm
      initialData={mapFornecedorToPessoa(fornecedor)}
      mode="fornecedor"
      allowedTipos={['fornecedor', 'ambos']}
      allowTipoSwitch
      allowFornecedorExtras
      allowStatusToggle
      enableDocumentoLookup
      enableCepLookup
      loading={loading}
      title={fornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
      description="Cadastre ou atualize informações do fornecedor"
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  )
}
