import React, { useState, useEffect } from 'react'
import { Bot, MessageSquare, Settings } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ChatInterface } from '@/components/agente/ChatInterface'
import { AgentConfigPanel } from '@/components/agente/AgentConfigPanel'
import { agenteService } from '@/services/agenteService'
import type { AgentConfig } from '@/types'

export default function AgentePage() {
  const [activeTab, setActiveTab] = useState('chat')
  const [config, setConfig] = useState<AgentConfig | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    setLoadingConfig(true)
    const res = await agenteService.getConfig()
    if (res.success && res.data) {
      setConfig(res.data)
    }
    setLoadingConfig(false)
  }

  function handleConfigChange(newConfig: AgentConfig) {
    setConfig(newConfig)
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <Bot className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Agente Megui
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assistente de IA para consultas de dados
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-6 dark:border-slate-700 dark:bg-slate-900">
          <TabsList className="h-10 w-full justify-start rounded-none border-0 bg-transparent p-0 sm:w-auto">
            <TabsTrigger
              value="chat"
              className="gap-2 rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger
              value="config"
              className="gap-2 rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configuracao</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Chat tab */}
        <TabsContent value="chat" className="mt-0 min-h-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
          {loadingConfig ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
          ) : (
            <ChatInterface
              config={config}
              onGoToConfig={() => setActiveTab('config')}
            />
          )}
        </TabsContent>

        {/* Config tab */}
        <TabsContent value="config" className="mt-0 min-h-0 flex-1 overflow-y-auto">
          <AgentConfigPanel
            config={config}
            onConfigChange={handleConfigChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
