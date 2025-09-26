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
import { vendasApi, produtosApi, clientesApi } from '@/services/api'

interface Produto {
    id: number
    nome: string
    preco: number
    quantidade: number
}

interface Cliente {
    id: number
    nome: string
    email: string
}

interface ItemVenda {
    produto_id: number
    quantidade: number
    preco_unitario: number
    produto?: Produto
}

interface Venda {
    id: number
    cliente_id: number
    data: string
    total: number
    itens: ItemVenda[]
    cliente?: Cliente
}

export default function VendasPage() {
    const [vendas, setVendas] = useState<Venda[]>([])
    const [produtos, setProdutos] = useState<Produto[]>([])
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [loading, setLoading] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    
    const [novaVenda, setNovaVenda] = useState({
        cliente_id: '',
        itens: [] as ItemVenda[]
    })
    
    const [itemTemp, setItemTemp] = useState({
        produto_id: '',
        quantidade: '1'
    })

    useEffect(() => {
        loadVendas()
        loadProdutos()
        loadClientes()
    }, [])

    const loadVendas = async () => {
        setLoading(true)
        try {
            const response = await vendasApi.listar()
            if (response.success && response.data) {
                setVendas(response.data)
            }
        } catch (error) {
            console.error('Erro ao carregar vendas:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadProdutos = async () => {
        try {
            const response = await produtosApi.listar()
            if (response.success && response.data) {
                setProdutos(response.data)
            }
        } catch (error) {
            console.error('Erro ao carregar produtos:', error)
        }
    }

    const loadClientes = async () => {
        try {
            const response = await clientesApi.listar()
            if (response.success && response.data) {
                setClientes(response.data)
            }
        } catch (error) {
            console.error('Erro ao carregar clientes:', error)
        }
    }

    const adicionarItem = () => {
        const produto = produtos.find(p => p.id === parseInt(itemTemp.produto_id))
        if (!produto) return

        setNovaVenda(prev => ({
            ...prev,
            itens: [
                ...prev.itens,
                {
                    produto_id: parseInt(itemTemp.produto_id),
                    quantidade: parseInt(itemTemp.quantidade),
                    preco_unitario: produto.preco,
                    produto
                }
            ]
        }))

        setItemTemp({
            produto_id: '',
            quantidade: '1'
        })
    }

    const removerItem = (index: number) => {
        setNovaVenda(prev => ({
            ...prev,
            itens: prev.itens.filter((_, i) => i !== index)
        }))
    }

    const calcularTotal = () => {
        return novaVenda.itens.reduce((total, item) => {
            return total + (item.quantidade * item.preco_unitario)
        }, 0)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!novaVenda.cliente_id || novaVenda.itens.length === 0) return

        try {
            const vendaData = {
                cliente_id: parseInt(novaVenda.cliente_id),
                itens: novaVenda.itens.map(item => ({
                    produto_id: item.produto_id,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco_unitario
                }))
            }

            await vendasApi.criar(vendaData)
            setModalOpen(false)
            loadVendas()
            setNovaVenda({
                cliente_id: '',
                itens: []
            })
        } catch (error) {
            console.error('Erro ao salvar venda:', error)
        }
    }

    return (
        <ProtectedRoute>
            <Layout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold">Vendas</h1>
                        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                            <DialogTrigger asChild>
                                <Button>Nova Venda</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                    <DialogTitle>Nova Venda</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="cliente">Cliente</Label>
                                        <select
                                            id="cliente"
                                            className="w-full border rounded-md p-2"
                                            value={novaVenda.cliente_id}
                                            onChange={(e) => setNovaVenda({...novaVenda, cliente_id: e.target.value})}
                                            required
                                        >
                                            <option value="">Selecione um cliente</option>
                                            {clientes.map(cliente => (
                                                <option key={cliente.id} value={cliente.id}>
                                                    {cliente.nome}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="border rounded-lg p-4 space-y-4">
                                        <h3 className="font-medium">Adicionar Produtos</h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <Label htmlFor="produto">Produto</Label>
                                                <select
                                                    id="produto"
                                                    className="w-full border rounded-md p-2"
                                                    value={itemTemp.produto_id}
                                                    onChange={(e) => setItemTemp({...itemTemp, produto_id: e.target.value})}
                                                >
                                                    <option value="">Selecione um produto</option>
                                                    {produtos.map(produto => (
                                                        <option key={produto.id} value={produto.id}>
                                                            {produto.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <Label htmlFor="quantidade">Quantidade</Label>
                                                <Input
                                                    id="quantidade"
                                                    type="number"
                                                    min="1"
                                                    value={itemTemp.quantidade}
                                                    onChange={(e) => setItemTemp({...itemTemp, quantidade: e.target.value})}
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <Button
                                                    type="button"
                                                    onClick={adicionarItem}
                                                    disabled={!itemTemp.produto_id}
                                                >
                                                    Adicionar
                                                </Button>
                                            </div>
                                        </div>

                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Produto</TableHead>
                                                    <TableHead>Quantidade</TableHead>
                                                    <TableHead>Preço Unit.</TableHead>
                                                    <TableHead>Subtotal</TableHead>
                                                    <TableHead></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {novaVenda.itens.map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{item.produto?.nome}</TableCell>
                                                        <TableCell>{item.quantidade}</TableCell>
                                                        <TableCell>R$ {item.preco_unitario.toFixed(2)}</TableCell>
                                                        <TableCell>
                                                            R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => removerItem(index)}
                                                            >
                                                                Remover
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {novaVenda.itens.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center">
                                                            Nenhum item adicionado
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>

                                        <div className="flex justify-end text-lg font-bold">
                                            Total: R$ {calcularTotal().toFixed(2)}
                                        </div>
                                    </div>

                                    <div className="flex justify-end space-x-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setModalOpen(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={!novaVenda.cliente_id || novaVenda.itens.length === 0}
                                        >
                                            Finalizar Venda
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
                                        <TableHead>Data</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead>Itens</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vendas.map((venda) => (
                                        <TableRow key={venda.id}>
                                            <TableCell>
                                                {new Date(venda.data).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>{venda.cliente?.nome}</TableCell>
                                            <TableCell>R$ {venda.total.toFixed(2)}</TableCell>
                                            <TableCell>
                                                {venda.itens.length} {venda.itens.length === 1 ? 'item' : 'itens'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {vendas.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center">
                                                Nenhuma venda registrada
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
