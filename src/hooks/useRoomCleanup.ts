import { useState, useCallback } from 'react'

interface CleanupResult {
  orphanedRooms: number
  emptyRooms: number
  disconnectedPlayers: number
  totalCleaned: number
}

export function useRoomCleanup() {
  const [isCleaning, setIsCleaning] = useState(false)
  const [lastResult, setLastResult] = useState<CleanupResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cleanupRooms = useCallback(async () => {
    try {
      setIsCleaning(true)
      setError(null)

      const response = await fetch('/api/admin/cleanup-rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Error durante la limpieza')
      }

      const result = await response.json()
      
      if (result.success) {
        setLastResult(result.summary)
        console.log('🧹 Limpieza completada:', result.summary)
      } else {
        throw new Error(result.error || 'Error desconocido')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('💥 Error en limpieza:', errorMessage)
    } finally {
      setIsCleaning(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearResult = useCallback(() => {
    setLastResult(null)
  }, [])

  return {
    cleanupRooms,
    isCleaning,
    lastResult,
    error,
    clearError,
    clearResult
  }
}





