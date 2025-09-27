import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Check, Trash2, Filter } from 'lucide-react'

interface Notification {
  id: number
  title: string
  message: string
  time: string
  read: boolean
  type: 'warning' | 'success' | 'info'
}

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('meguispet-notifications')
      if (saved) {
        setNotifications(JSON.parse(saved))
      }
    }
  }, [])

  const saveNotifications = (newNotifications: Notification[]) => {
    setNotifications(newNotifications)
    if (typeof window !== 'undefined') {
      localStorage.setItem('meguispet-notifications', JSON.stringify(newNotifications))
    }
  }

  const markAsRead = (id: number) => {
    const updated = notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    )
    saveNotifications(updated)
  }

  const markAllAsRead = () => {
    const updated = notifications.map(notif => ({ ...notif, read: true }))
    saveNotifications(updated)
  }

  const deleteNotification = (id: number) => {
    const updated = notifications.filter(notif => notif.id !== id)
    saveNotifications(updated)
  }

  const clearAll = () => {
    saveNotifications([])
  }

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read
    if (filter === 'read') return notif.read
    return true
  })

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-50 border-yellow-200'
      case 'success': return 'bg-green-50 border-green-200'
      case 'info': return 'bg-blue-50 border-blue-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return '⚠️'
      case 'success': return '✅'
      case 'info': return 'ℹ️'
      default: return '📢'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
          <p className="text-gray-600">Gerencie suas notificações</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={markAllAsRead}
            disabled={notifications.every(n => n.read)}
          >
            <Check className="mr-2 h-4 w-4" />
            Marcar todas como lidas
          </Button>
          <Button 
            variant="outline" 
            onClick={clearAll}
            disabled={notifications.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Limpar todas
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              Todas ({notifications.length})
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              onClick={() => setFilter('unread')}
            >
              Não lidas ({notifications.filter(n => !n.read).length})
            </Button>
            <Button
              variant={filter === 'read' ? 'default' : 'outline'}
              onClick={() => setFilter('read')}
            >
              Lidas ({notifications.filter(n => n.read).length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Notificações */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <Card 
              key={notification.id}
              className={`${getTypeColor(notification.type)} ${
                notification.read ? 'opacity-60' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {notification.time}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(notification.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Bell className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'Nenhuma notificação' : 
               filter === 'unread' ? 'Nenhuma notificação não lida' : 
               'Nenhuma notificação lida'}
            </h3>
            <p className="text-gray-600 text-center">
              {filter === 'all' ? 'Você não tem notificações no momento' :
               filter === 'unread' ? 'Todas as suas notificações foram lidas' :
               'Você ainda não leu nenhuma notificação'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
