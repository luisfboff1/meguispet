import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { clientesApi } from '@/services/api'

interface Cliente {
    id: number
    nome: string
    email: string
    telefone: string
    cpf: string
    endereco: string
}

export default function ClientesPage() {
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [loading, setLoading] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [clienteEdit, setClienteEdit] = useState<Cliente | null>(null)
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        telefone: '',
        cpf: '',
        endereco: ''
    })

    useEffect(() => {
        loadClientes()
    }, [])

    const loadClientes = async () => {
        setLoading(true)
        try {
            const response = await clientesApi.listar()
            if (response.success && response.data) {
                setClientes(response.data)
            }
        } catch (error) {
            console.error('Erro ao carregar clientes:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (clienteEdit) {
                await clientesApi.atualizar(clienteEdit.id, formData)
            } else {
                await clientesApi.criar(formData)
            }

            setModalOpen(false)
            loadClientes()
            resetForm()
        } catch (error) {
            console.error('Erro ao salvar cliente:', error)
        }
    }

    const handleEdit = (cliente: Cliente) => {
        setClienteEdit(cliente)
        setFormData({
            nome: cliente.nome,
            email: cliente.email,
            telefone: cliente.telefone,
            cpf: cliente.cpf,
            endereco: cliente.endereco
        })
        setModalOpen(true)
    }

    const handleDelete = async (id: number) => {
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
            try {
                await clientesApi.deletar(id)
                loadClientes()
            } catch (error) {
                console.error('Erro ao deletar cliente:', error)
            }
        }
    }

    const resetForm = () => {
        setClienteEdit(null)
        setFormData({
            nome: '',
            email: '',
            telefone: '',
            cpf: '',
            endereco: ''
        })
    }

    return (
        <ProtectedRoute>
            <Layout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold">Clientes</h1>
                        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={resetForm}>
                                    Novo Cliente
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>
                                        {clienteEdit ? 'Editar Cliente' : 'Novo Cliente'}
                                    </DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="nome">Nome</Label>
                                        <Input
                                            id="nome"
                                            value={formData.nome}
                                            onChange={(e) => setFormData({...formData, nome: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="telefone">Telefone</Label>
                                            <Input
                                                id="telefone"
                                                value={formData.telefone}
                                                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cpf">CPF</Label>
                                            <Input
                                                id="cpf"
                                                value={formData.cpf}
                                                onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endereco">Endereço</Label>
                                        <Input
                                            id="endereco"
                                            value={formData.endereco}
                                            onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setModalOpen(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button type="submit">
                                            {clienteEdit ? 'Salvar' : 'Criar'}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {loading ? (
                        <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                        </div>
                    ) : (
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Telefone</TableHead>
                                        <TableHead>CPF</TableHead>
                                        <TableHead>Endereço</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {clientes.map((cliente) => (
                                        <TableRow key={cliente.id}>
                                            <TableCell>{cliente.nome}</TableCell>
                                            <TableCell>{cliente.email}</TableCell>
                                            <TableCell>{cliente.telefone}</TableCell>
                                            <TableCell>{cliente.cpf}</TableCell>
                                            <TableCell>{cliente.endereco}</TableCell>
                                            <TableCell>
                                                <div className="flex space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(cliente)}
                                                    >
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDelete(cliente.id)}
                                                    >
                                                        Excluir
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {clientes.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center">
                                                Nenhum cliente cadastrado
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </Layout>
        </ProtectedRoute>
    )
}
