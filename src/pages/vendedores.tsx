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
import { vendedoresApi } from '@/services/api'

interface Vendedor {
    id: number
    nome: string
    email: string
    telefone: string
    cpf: string
    comissao: number
}

export default function VendedoresPage() {
    const [vendedores, setVendedores] = useState<Vendedor[]>([])
    const [loading, setLoading] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [vendedorEdit, setVendedorEdit] = useState<Vendedor | null>(null)
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        telefone: '',
        cpf: '',
        comissao: ''
    })

    useEffect(() => {
        loadVendedores()
    }, [])

    const loadVendedores = async () => {
        setLoading(true)
        try {
            const response = await vendedoresApi.listar()
            if (response.success && response.data) {
                setVendedores(response.data)
            }
        } catch (error) {
            console.error('Erro ao carregar vendedores:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const vendedorData = {
                ...formData,
                comissao: parseFloat(formData.comissao)
            }

            if (vendedorEdit) {
                await vendedoresApi.atualizar(vendedorEdit.id, vendedorData)
            } else {
                await vendedoresApi.criar(vendedorData)
            }

            setModalOpen(false)
            loadVendedores()
            resetForm()
        } catch (error) {
            console.error('Erro ao salvar vendedor:', error)
        }
    }

    const handleEdit = (vendedor: Vendedor) => {
        setVendedorEdit(vendedor)
        setFormData({
            nome: vendedor.nome,
            email: vendedor.email,
            telefone: vendedor.telefone,
            cpf: vendedor.cpf,
            comissao: vendedor.comissao.toString()
        })
        setModalOpen(true)
    }

    const handleDelete = async (id: number) => {
        if (confirm('Tem certeza que deseja excluir este vendedor?')) {
            try {
                await vendedoresApi.deletar(id)
                loadVendedores()
            } catch (error) {
                console.error('Erro ao deletar vendedor:', error)
            }
        }
    }

    const resetForm = () => {
        setVendedorEdit(null)
        setFormData({
            nome: '',
            email: '',
            telefone: '',
            cpf: '',
            comissao: ''
        })
    }

    return (
        <ProtectedRoute>
            <Layout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold">Vendedores</h1>
                        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={resetForm}>
                                    Novo Vendedor
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>
                                        {vendedorEdit ? 'Editar Vendedor' : 'Novo Vendedor'}
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
                                        <Label htmlFor="comissao">Comissão (%)</Label>
                                        <Input
                                            id="comissao"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={formData.comissao}
                                            onChange={(e) => setFormData({...formData, comissao: e.target.value})}
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
                                            {vendedorEdit ? 'Salvar' : 'Criar'}
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
                                        <TableHead>Comissão</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vendedores.map((vendedor) => (
                                        <TableRow key={vendedor.id}>
                                            <TableCell>{vendedor.nome}</TableCell>
                                            <TableCell>{vendedor.email}</TableCell>
                                            <TableCell>{vendedor.telefone}</TableCell>
                                            <TableCell>{vendedor.cpf}</TableCell>
                                            <TableCell>{vendedor.comissao}%</TableCell>
                                            <TableCell>
                                                <div className="flex space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(vendedor)}
                                                    >
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDelete(vendedor.id)}
                                                    >
                                                        Excluir
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {vendedores.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center">
                                                Nenhum vendedor cadastrado
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
