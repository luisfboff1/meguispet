import { useState } from 'react'
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
import { produtosApi } from '@/services/api'

interface Produto {
    id: number
    nome: string
    descricao: string
    preco: number
    preco_custo: number
    quantidade: number
}

export default function ProdutosPage() {
    const [produtos, setProdutos] = useState<Produto[]>([])
    const [loading, setLoading] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [produtoEdit, setProdutoEdit] = useState<Produto | null>(null)
    const [formData, setFormData] = useState({
        nome: '',
        descricao: '',
        preco: '',
        preco_custo: '',
        quantidade: ''
    })

    // Carregar produtos ao montar o componente
    useState(() => {
        loadProdutos()
    }, [])

    const loadProdutos = async () => {
        setLoading(true)
        try {
            const response = await produtosApi.listar()
            if (response.success && response.data) {
                setProdutos(response.data)
            }
        } catch (error) {
            console.error('Erro ao carregar produtos:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const produtoData = {
                ...formData,
                preco: parseFloat(formData.preco),
                preco_custo: parseFloat(formData.preco_custo),
                quantidade: parseInt(formData.quantidade)
            }

            if (produtoEdit) {
                await produtosApi.atualizar(produtoEdit.id, produtoData)
            } else {
                await produtosApi.criar(produtoData)
            }

            setModalOpen(false)
            loadProdutos()
            resetForm()
        } catch (error) {
            console.error('Erro ao salvar produto:', error)
        }
    }

    const handleEdit = (produto: Produto) => {
        setProdutoEdit(produto)
        setFormData({
            nome: produto.nome,
            descricao: produto.descricao,
            preco: produto.preco.toString(),
            preco_custo: produto.preco_custo.toString(),
            quantidade: produto.quantidade.toString()
        })
        setModalOpen(true)
    }

    const handleDelete = async (id: number) => {
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            try {
                await produtosApi.deletar(id)
                loadProdutos()
            } catch (error) {
                console.error('Erro ao deletar produto:', error)
            }
        }
    }

    const resetForm = () => {
        setProdutoEdit(null)
        setFormData({
            nome: '',
            descricao: '',
            preco: '',
            preco_custo: '',
            quantidade: ''
        })
    }

    return (
        <ProtectedRoute>
            <Layout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold">Produtos</h1>
                        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={resetForm}>
                                    Novo Produto
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>
                                        {produtoEdit ? 'Editar Produto' : 'Novo Produto'}
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
                                        <Label htmlFor="descricao">Descrição</Label>
                                        <Input
                                            id="descricao"
                                            value={formData.descricao}
                                            onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="preco">Preço</Label>
                                            <Input
                                                id="preco"
                                                type="number"
                                                step="0.01"
                                                value={formData.preco}
                                                onChange={(e) => setFormData({...formData, preco: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="preco_custo">Preço de Custo</Label>
                                            <Input
                                                id="preco_custo"
                                                type="number"
                                                step="0.01"
                                                value={formData.preco_custo}
                                                onChange={(e) => setFormData({...formData, preco_custo: e.target.value})}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="quantidade">Quantidade</Label>
                                        <Input
                                            id="quantidade"
                                            type="number"
                                            value={formData.quantidade}
                                            onChange={(e) => setFormData({...formData, quantidade: e.target.value})}
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
                                            {produtoEdit ? 'Salvar' : 'Criar'}
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
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Preço</TableHead>
                                        <TableHead>Custo</TableHead>
                                        <TableHead>Quantidade</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {produtos.map((produto) => (
                                        <TableRow key={produto.id}>
                                            <TableCell>{produto.nome}</TableCell>
                                            <TableCell>{produto.descricao}</TableCell>
                                            <TableCell>R$ {produto.preco.toFixed(2)}</TableCell>
                                            <TableCell>R$ {produto.preco_custo.toFixed(2)}</TableCell>
                                            <TableCell>{produto.quantidade}</TableCell>
                                            <TableCell>
                                                <div className="flex space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(produto)}
                                                    >
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDelete(produto.id)}
                                                    >
                                                        Excluir
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {produtos.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center">
                                                Nenhum produto cadastrado
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
