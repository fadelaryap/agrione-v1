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
  private isConnecting = false

  connect(token: string, callbacks: WebSocketCallbacks = {}) {
    // Prevent multiple connections
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket: Already connecting, skipping...')
      return
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket: Already connected, updating callbacks only')
      this.callbacks = callbacks
      return
    }

    // Disconnect existing connection if any
    if (this.ws) {
      this.disconnect()
    }

    this.token = token
    this.callbacks = callbacks
    this.isConnecting = true

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
      this.isConnecting = false
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
      this.isConnecting = false
      this.callbacks.onError?.(error)
    }

    this.ws.onclose = (event) => {
      console.log('WebSocket closed', event.code, event.reason)
      this.isConnecting = false
      this.callbacks.onClose?.()
      // Only reconnect if it was an unexpected close (not manual disconnect with code 1000)
      if (event.code !== 1000) {
        this.reconnect()
      }
    }
  }

  private reconnect() {
    // Don't reconnect if already connecting or connected
    if (this.isConnecting || (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN))) {
      return
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts && this.token) {
      this.reconnectAttempts++
      setTimeout(() => {
        console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        if (this.token && !this.isConnecting) {
          this.connect(this.token, this.callbacks)
        }
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      console.log('Max reconnection attempts reached')
    }
  }

  disconnect() {
    if (this.ws) {
      // Set a flag to prevent reconnect
      const wasConnected = this.ws.readyState === WebSocket.OPEN
      this.ws.onclose = () => {
        // Prevent reconnect on manual disconnect
      }
      this.ws.close(1000, 'Manual disconnect') // 1000 = normal closure
      this.ws = null
    }
    this.isConnecting = false
    this.reconnectAttempts = 0
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  updateCallbacks(callbacks: WebSocketCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }
}

export const wsClient = new WebSocketClient()

