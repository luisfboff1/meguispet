import React, { useState, useEffect } from 'react'
import {
  Save,
  Loader2,
  Eye,
  EyeOff,
  RotateCcw,
  Plus,
  Trash2,
  Server,
  Sparkles,
  Key,
  Cpu,
  SlidersHorizontal,
  MessageSquareText,
  Wrench,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { agenteService } from '@/services/agenteService'
import type { AgentConfig, AgentConfigForm, AgentProvider, AgentMcpServer } from '@/types'
import { AGENT_MODELS } from '@/types'

const DEFAULT_PROMPT = `Voce e a Megui, assistente de IA do sistema MeguisPet. Voce ajuda os usuarios a consultar dados sobre vendas, clientes, produtos, estoque e financeiro. Responda sempre em portugues brasileiro de forma clara e objetiva. Formate valores monetarios como R$ e datas no formato brasileiro.`

const AVAILABLE_SKILLS = [
  { id: 'query_database', name: 'Consulta SQL', description: 'Consultar dados no banco de dados via SQL' },
  { id: 'get_schema', name: 'Explorador de Schema', description: 'Visualizar estrutura das tabelas' },
  { id: 'analyze_data', name: 'Analise de Dados', description: 'Analisar e formatar dados em resumos' },
]

interface AgentConfigPanelProps {
  config: AgentConfig | null
  onConfigChange: (config: AgentConfig) => void
}

export function AgentConfigPanel({ config, onConfigChange }: AgentConfigPanelProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showApiKey, setShowApiKey] = useState(false)

  // Form state
  const [provider, setProvider] = useState<AgentProvider>('openai')
  const [model, setModel] = useState('gpt-4o')
  const [apiKey, setApiKey] = useState('')
  const [apiKeyPreview, setApiKeyPreview] = useState('')
  const [temperature, setTemperature] = useState(0.3)
  const [maxTokens, setMaxTokens] = useState(4096)
  const [topP, setTopP] = useState(1.0)
  const [frequencyPenalty, setFrequencyPenalty] = useState(0)
  const [presencePenalty, setPresencePenalty] = useState(0)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [recursionLimit, setRecursionLimit] = useState(25)
  const [skills, setSkills] = useState<string[]>(['query_database', 'get_schema', 'analyze_data'])
  const [mcpServers, setMcpServers] = useState<AgentMcpServer[]>([])

  // Load config
  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    setLoading(true)
    const res = await agenteService.getConfig()
    if (res.success && res.data) {
      const c = res.data
      setProvider(c.provider)
      setModel(c.model)
      setApiKeyPreview(c.api_key_preview || '')
      setTemperature(c.temperature)
      setMaxTokens(c.max_tokens)
      setTopP(c.top_p)
      setFrequencyPenalty(c.frequency_penalty)
      setPresencePenalty(c.presence_penalty)
      setSystemPrompt(c.system_prompt || '')
      setRecursionLimit(c.recursion_limit || 25)
      setSkills(c.skills || ['query_database', 'get_schema', 'analyze_data'])
      setMcpServers(c.mcp_servers || [])
    }
    setLoading(false)
  }

  // When provider changes, set default model for that provider
  function handleProviderChange(newProvider: AgentProvider) {
    setProvider(newProvider)
    const models = AGENT_MODELS[newProvider]
    if (models.length > 0) {
      setModel(models[0].id)
    }
  }

  async function handleSave() {
    setSaving(true)
    const form: AgentConfigForm = {
      provider,
      model,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      system_prompt: systemPrompt || null,
      recursion_limit: recursionLimit,
      skills,
      mcp_servers: mcpServers,
    }
    if (apiKey) {
      form.api_key = apiKey
    }

    const res = await agenteService.saveConfig(form)
    if (res.success && res.data) {
      toast({ title: 'Configuracao salva com sucesso!' })
      setApiKey('')
      setApiKeyPreview(res.data.api_key_preview || '')
      onConfigChange(res.data)
    } else {
      toast({
        title: 'Erro ao salvar',
        description: res.error || 'Tente novamente',
        variant: 'destructive',
      })
    }
    setSaving(false)
  }

  function handleToggleSkill(skillId: string) {
    setSkills((prev) =>
      prev.includes(skillId) ? prev.filter((s) => s !== skillId) : [...prev, skillId]
    )
  }

  function handleAddMcpServer() {
    setMcpServers((prev) => [
      ...prev,
      { name: '', url: '', enabled: true, description: '' },
    ])
  }

  function handleRemoveMcpServer(index: number) {
    setMcpServers((prev) => prev.filter((_, i) => i !== index))
  }

  function handleUpdateMcpServer(index: number, field: keyof AgentMcpServer, value: string | boolean) {
    setMcpServers((prev) =>
      prev.map((srv, i) => (i === index ? { ...srv, [field]: value } : srv))
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    )
  }

  const availableModels = AGENT_MODELS[provider] || []

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Provider & Model */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu className="h-4 w-4 text-amber-500" />
            Provedor e Modelo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Provedor
              </label>
              <Select value={provider} onValueChange={(v) => handleProviderChange(v as AgentProvider)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Modelo
              </label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({(m.contextWindow / 1000).toFixed(0)}k)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Key */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4 text-amber-500" />
            API Key
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {apiKeyPreview && !apiKey && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
              <span>Chave configurada:</span>
              <code className="font-mono text-xs">{apiKeyPreview}</code>
            </div>
          )}
          <div className="relative">
            <Input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={apiKeyPreview ? 'Insira nova chave para substituir...' : 'sk-... ou sk-ant-...'}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sua chave e encriptada (AES-256-GCM) e nunca e exposta. Cada usuario tem sua propria chave.
          </p>
        </CardContent>
      </Card>

      {/* Model Parameters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4 text-amber-500" />
            Parametros do Modelo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Temperature */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Temperatura
              </label>
              <span className="text-xs font-mono text-slate-500">{temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-amber-500 dark:bg-slate-700"
            />
            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
              <span>Preciso (0)</span>
              <span>Criativo (2)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Maximo de Tokens na Resposta
            </label>
            <Input
              type="number"
              min={256}
              max={16384}
              step={256}
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)}
            />
          </div>

          {/* Top P */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Top P
              </label>
              <span className="text-xs font-mono text-slate-500">{topP.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-amber-500 dark:bg-slate-700"
            />
          </div>

          {/* Frequency Penalty */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Frequency Penalty
              </label>
              <span className="text-xs font-mono text-slate-500">{frequencyPenalty.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={frequencyPenalty}
              onChange={(e) => setFrequencyPenalty(parseFloat(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-amber-500 dark:bg-slate-700"
            />
          </div>

          {/* Presence Penalty */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Presence Penalty
              </label>
              <span className="text-xs font-mono text-slate-500">{presencePenalty.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={presencePenalty}
              onChange={(e) => setPresencePenalty(parseFloat(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-amber-500 dark:bg-slate-700"
            />
          </div>

          {/* Recursion Limit */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Limite de Etapas (Recursion Limit)
              </label>
              <span className="text-xs font-mono text-slate-500">{recursionLimit}</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={recursionLimit}
              onChange={(e) => setRecursionLimit(parseInt(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-amber-500 dark:bg-slate-700"
            />
            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
              <span>Rapido (5)</span>
              <span>Complexo (50)</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              Quantas etapas o agente pode executar por pergunta. Aumente para consultas mais complexas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-amber-500" />
              System Prompt
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSystemPrompt(DEFAULT_PROMPT)}
              className="gap-1 text-xs text-slate-500 hover:text-slate-700"
            >
              <RotateCcw className="h-3 w-3" />
              Restaurar padrao
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            placeholder="Deixe vazio para usar o prompt padrao da Megui..."
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            O prompt e combinado automaticamente com a descricao do schema do banco de dados.
            {!systemPrompt && ' Usando prompt padrao.'}
          </p>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4 text-amber-500" />
            Skills
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {AVAILABLE_SKILLS.map((skill) => (
            <div
              key={skill.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700"
            >
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {skill.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {skill.description}
                </p>
              </div>
              <Switch
                checked={skills.includes(skill.id)}
                onCheckedChange={() => handleToggleSkill(skill.id)}
              />
            </div>
          ))}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Skills adicionais (PDF, Excel, Graficos) serao adicionadas em breve.
          </p>
        </CardContent>
      </Card>

      {/* MCP Servers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Server className="h-4 w-4 text-amber-500" />
              Servidores MCP
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddMcpServer}
              className="gap-1 text-xs text-slate-500 hover:text-slate-700"
            >
              <Plus className="h-3 w-3" />
              Adicionar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mcpServers.length === 0 ? (
            <p className="text-center text-xs text-slate-400 dark:text-slate-500">
              Nenhum servidor MCP configurado. Servidores MCP permitem estender as capacidades do agente.
            </p>
          ) : (
            <div className="space-y-3">
              {mcpServers.map((srv, idx) => (
                <div
                  key={idx}
                  className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={srv.enabled}
                        onCheckedChange={(v) => handleUpdateMcpServer(idx, 'enabled', v)}
                      />
                      <span className="text-xs text-slate-500">
                        {srv.enabled ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveMcpServer(idx)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={srv.name}
                      onChange={(e) => handleUpdateMcpServer(idx, 'name', e.target.value)}
                      placeholder="Nome"
                      className="text-xs"
                    />
                    <Input
                      value={srv.url}
                      onChange={(e) => handleUpdateMcpServer(idx, 'url', e.target.value)}
                      placeholder="URL (ex: http://localhost:3001)"
                      className="text-xs"
                    />
                  </div>
                  <Input
                    value={srv.description || ''}
                    onChange={(e) => handleUpdateMcpServer(idx, 'description', e.target.value)}
                    placeholder="Descricao (opcional)"
                    className="text-xs"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end pb-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-amber-500 hover:bg-amber-600"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar Configuracao
        </Button>
      </div>
    </div>
  )
}
