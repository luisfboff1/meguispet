import React, { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ChatInterface } from '@/components/agente/ChatInterface'
import { AgentConfigPanel } from '@/components/agente/AgentConfigPanel'
import { agenteService } from '@/services/agenteService'
import type { AgentConfig } from '@/types'
import { PermissionGate } from '@/components/auth/PermissionGate'

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
    <PermissionGate permission="agente" redirect="/dashboard">
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col overflow-hidden">
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
        <TabsContent value="config" className="mt-0 min-h-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b bg-card px-4 py-2">
            <Button
              onClick={() => setActiveTab('chat')}
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao chat
            </Button>
            <span className="text-xs font-medium text-muted-foreground">
              Configuração do agente
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AgentConfigPanel
              config={config}
              onConfigChange={handleConfigChange}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </PermissionGate>
  )
}
