import { useState, useEffect, useCallback, useRef } from 'react'
import { Room, Player, GameState, GamePhase } from '@/types/game'

interface UseGameCommunicationProps {
  roomId: string
  playerId: string
  isHost: boolean
}

interface PlayerGameState {
  roomId: string
  roomName: string
  currentPhase: GamePhase
  currentRound: number
  currentTheme?: string
  playerWord?: { word: string; isImpostor: boolean }
  players: Array<{
    id: string
    name: string
    isHost: boolean
    isConnected: boolean
  }>
  isHost: boolean
  lastUpdated: Date
}

export function useGameCommunication({ roomId, playerId, isHost }: UseGameCommunicationProps) {
  const [roomData, setRoomData] = useState<Room | null>(null)
  const [playerGameState, setPlayerGameState] = useState<PlayerGameState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  // Referencias para controlar los intervalos
  const roomUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const playerStateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Función para obtener datos del room
  const fetchRoomData = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`)
      const result = await response.json()
      
      if (result.success && result.room) {
        setRoomData(result.room)
        setLastUpdate(new Date())
        setError(null)
      } else {
        setError(result.error || 'Error al obtener datos del room')
      }
    } catch (error) {
      setError('Error de conexión')
    }
  }, [roomId])

  // Función para obtener estado específico del jugador
  const fetchPlayerGameState = useCallback(async () => {
    // No hacer la llamada si no hay playerId válido
    if (!playerId || playerId.trim() === '') {
      return
    }

    try {
      const response = await fetch(`/api/rooms/${roomId}/player-state?playerId=${playerId}`)
      const result = await response.json()
      
      if (result.success && result.gameState) {
        setPlayerGameState(result.gameState)
        setLastUpdate(new Date())
        setError(null)
      } else {
        setError(result.error || 'Error al obtener estado del jugador')
      }
    } catch (error) {
      setError('Error de conexión')
    }
  }, [roomId, playerId])

  // Función para iniciar el juego (solo host)
  const startGame = useCallback(async (themeId: string) => {
    if (!isHost || !playerId) {
      setError('Solo el host puede iniciar el juego')
      return false
    }

    try {
      const response = await fetch(`/api/rooms/${roomId}/start-game`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hostId: playerId,
          themeId: themeId,
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        // Recargar datos del room
        await fetchRoomData()
        await fetchPlayerGameState()
        return true
      } else {
        setError(result.error || 'No se pudo iniciar el juego')
        return false
      }
    } catch (error) {
      setError('Error de conexión')
      return false
    }
  }, [roomId, playerId, isHost, fetchRoomData, fetchPlayerGameState])

  // Función para generar nueva palabra (solo host)
  const generateNewWord = useCallback(async () => {
    if (!isHost || !playerId) {
      setError('Solo el host puede generar palabras')
      return false
    }

    try {
      const response = await fetch(`/api/rooms/${roomId}/generate-word`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hostId: playerId,
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        await fetchRoomData()
        await fetchPlayerGameState()
        return true
      } else {
        setError(result.error || 'No se pudo generar nueva palabra')
        return false
      }
    } catch (error) {
      setError('Error de conexión')
      return false
    }
  }, [roomId, playerId, isHost, fetchRoomData, fetchPlayerGameState])

  // Función para cambiar tema (solo host)
  const changeTheme = useCallback(async (themeId: string) => {
    if (!isHost || !playerId) {
      setError('Solo el host puede cambiar el tema')
      return false
    }

    try {
      const response = await fetch(`/api/rooms/${roomId}/change-theme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hostId: playerId,
          themeId: themeId,
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        await fetchRoomData()
        await fetchPlayerGameState()
        return true
      } else {
        setError(result.error || 'No se pudo cambiar el tema')
        return false
      }
    } catch (error) {
      setError('Error de conexión')
      return false
    }
  }, [roomId, playerId, isHost, fetchRoomData, fetchPlayerGameState])

  // Función para siguiente ronda (solo host)
  const nextRound = useCallback(async () => {
    if (!isHost || !playerId) {
      setError('Solo el host puede avanzar la ronda')
      return false
    }

    try {
      const response = await fetch(`/api/rooms/${roomId}/next-round`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hostId: playerId,
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        await fetchRoomData()
        await fetchPlayerGameState()
        return true
      } else {
        setError(result.error || 'No se pudo avanzar la ronda')
        return false
      }
    } catch (error) {
      setError('Error de conexión')
      return false
    }
  }, [roomId, playerId, isHost, fetchRoomData, fetchPlayerGameState])

  // Función para refrescar datos
  const refreshData = useCallback(async () => {
    await fetchRoomData()
    if (playerId && playerId.trim() !== '') {
      await fetchPlayerGameState()
    }
  }, [fetchRoomData, fetchPlayerGameState, playerId])

  // Función para limpiar errores
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Efecto para cargar datos iniciales
  useEffect(() => {
    if (roomId) {
      fetchRoomData()
    }
  }, [roomId, fetchRoomData])

  // Efecto para configurar intervalos de actualización
  useEffect(() => {
    // Solo configurar intervalos si tenemos roomId y playerId válidos
    if (!roomId || !playerId || playerId.trim() === '') {
      return
    }

    // Limpiar intervalos existentes
    if (roomUpdateIntervalRef.current) {
      clearInterval(roomUpdateIntervalRef.current)
    }
    if (playerStateIntervalRef.current) {
      clearInterval(playerStateIntervalRef.current)
    }

    // Configurar nuevo intervalo para datos del room (cada 3 segundos)
    roomUpdateIntervalRef.current = setInterval(() => {
      fetchRoomData()
    }, 3000)

    // Configurar nuevo intervalo para estado del jugador (cada 2 segundos)
    playerStateIntervalRef.current = setInterval(() => {
      fetchPlayerGameState()
    }, 2000)

    // Limpiar al desmontar
    return () => {
      if (roomUpdateIntervalRef.current) {
        clearInterval(roomUpdateIntervalRef.current)
      }
      if (playerStateIntervalRef.current) {
        clearInterval(playerStateIntervalRef.current)
      }
    }
  }, [roomId, playerId, fetchRoomData, fetchPlayerGameState])

  // Efecto para actualizar loading state
  useEffect(() => {
    if (roomData && playerId && playerId.trim() !== '') {
      setIsLoading(false)
    }
  }, [roomData, playerId])

  // Valores computados
  const currentPlayer = roomData?.players.find(p => p.id === playerId) || null
  const currentPhase = roomData?.currentPhase || 'waiting'
  const playerWord = playerGameState?.playerWord

  return {
    roomData,
    playerGameState,
    isLoading,
    error,
    lastUpdate,
    startGame,
    generateNewWord,
    changeTheme,
    nextRound,
    refreshData,
    clearError,
    currentPlayer,
    isHost,
    currentPhase,
    playerWord,
    isConnected: currentPlayer?.isConnected || false,
  }
}
