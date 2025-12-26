type NotificationMessage = {
  type: string
  data: {
    id: number
    user_id: number
    type: string
    title: string
    message: string
    link: string
    read: boolean
    created_at: string
  }
}

type WebSocketCallbacks = {
  onNotification?: (notification: NotificationMessage['data']) => void
  onError?: (error: Event) => void
  onClose?: () => void
}

class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private callbacks: WebSocketCallbacks = {}
  private token: string | null = null

  connect(token: string, callbacks: WebSocketCallbacks = {}) {
    this.token = token
    this.callbacks = callbacks

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
    // Convert HTTP/HTTPS URL to WebSocket URL
    let wsUrl = API_URL.replace('/api', '')
    if (wsUrl.startsWith('http://')) {
      wsUrl = wsUrl.replace('http://', 'ws://')
    } else if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://')
    }
    // Add token as query parameter for authentication
    wsUrl = wsUrl + '/api/ws?token=' + encodeURIComponent(token)

    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      try {
        const message: NotificationMessage = JSON.parse(event.data)
        if (message.type === 'new_notification' && message.data) {
          this.callbacks.onNotification?.(message.data)
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.callbacks.onError?.(error)
    }

    this.ws.onclose = () => {
      console.log('WebSocket closed')
      this.callbacks.onClose?.()
      this.reconnect()
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.token) {
      this.reconnectAttempts++
      setTimeout(() => {
        console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        if (this.token) {
          this.connect(this.token, this.callbacks)
        }
      }, this.reconnectDelay * this.reconnectAttempts)
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

export const wsClient = new WebSocketClient()

