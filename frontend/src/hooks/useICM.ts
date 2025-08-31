import { useState, useCallback } from 'react'
import { useWallet } from './useWallet'

interface ICMMessage {
  id: string
  content: string
  recipient: string
  destinationSubnet: string
  status: 'pending' | 'completed' | 'failed'
  timestamp: string
  txHash?: string
}

export function useICM() {
  const { address } = useWallet()
  const [messages, setMessages] = useState<ICMMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (messageData: {
    sourceChain: string
    destinationChainId: string
    recipient: string
    message: string
    amount: string
    walletAddress: string
  }) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/icm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      })

      if (!response.ok) {
        throw new Error('Failed to send ICM message')
      }

      const result = await response.json()
      
      // Add message to local state
      const newMessage: ICMMessage = {
        id: result.messageId || Date.now().toString(),
        content: messageData.message,
        recipient: messageData.recipient,
        destinationSubnet: messageData.destinationChainId,
        status: 'pending',
        timestamp: new Date().toISOString(),
        txHash: result.txHash
      }
      
      setMessages(prev => [newMessage, ...prev])
      
      return result
    } catch (error) {
      console.error('Failed to send ICM message:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [address])

  const getMessageHistory = useCallback(async () => {
    if (!address) return

    try {
      const response = await fetch(`/api/icm/history?address=${address}`)
      if (!response.ok) {
        throw new Error('Failed to fetch message history')
      }
      
      const history = await response.json()
      setMessages(history)
    } catch (error) {
      console.error('Failed to fetch message history:', error)
    }
  }, [address])

  const getStats = useCallback(async () => {
    if (!address) {
      return {
        totalSent: 0,
        totalReceived: 0,
        pendingMessages: 0,
        successRate: 0
      }
    }

    try {
      const response = await fetch(`/api/icm/stats?address=${address}`)
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      return {
        totalSent: messages.length,
        totalReceived: 0,
        pendingMessages: messages.filter(m => m.status === 'pending').length,
        successRate: Math.round((messages.filter(m => m.status === 'completed').length / messages.length) * 100) || 0
      }
    }
  }, [address, messages])

  const getAnalytics = useCallback(async () => {
    if (!address) {
      return {
        messagesBySubnet: [],
        messagesByDay: [],
        averageDeliveryTime: 0,
        totalVolume: 0
      }
    }

    try {
      const response = await fetch(`/api/icm/analytics?address=${address}`)
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      return {
        messagesBySubnet: [],
        messagesByDay: [],
        averageDeliveryTime: 2.5,
        totalVolume: 0
      }
    }
  }, [address])

  return {
    messages,
    isLoading,
    sendMessage,
    getMessageHistory,
    getStats,
    getAnalytics
  }
}