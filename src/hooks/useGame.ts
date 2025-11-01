import { useState, useEffect, useCallback } from 'react'
import { Player, GameState, Room, Theme } from '@/types/game'
import { generatePlayerId, generateRoomId } from '@/lib/utils'

export function useGame() {
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const createPlayer = useCallback((name: string): Player => {
    const player: Player = {
      id: generatePlayerId(),
      name,
      isHost: false,
      isImpostor: false,
      hasVoted: false,
      isAlive: true,
      sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lastSeen: new Date(),
      isConnected: true,
    }
    setCurrentPlayer(player)
    return player
  }, [])

  const createRoom = useCallback((name: string, maxPlayers: number, host: Player): Room => {
    // Crear estado inicial del juego
    const initialGameState: GameState = {
      id: generateRoomId(),
      roomId: generateRoomId(),
      status: 'waiting',
      currentRound: 0,
      maxRounds: 999,
      currentTheme: undefined,
      currentWord: undefined,
      players: [host],
      phase: 'waiting',
      roundStartTime: undefined,
      roundEndTime: undefined,
      actions: [],
      impostorCount: 0,
      createdAt: new Date(),
    }

    const room: Room = {
      id: generateRoomId(),
      name,
      hostId: host.id,
      players: [host],
      maxPlayers,
      status: 'waiting',
      currentRound: 0,
      maxRounds: 999,
      gameState: initialGameState,
      lastUpdated: new Date(),
      currentPhase: 'waiting',
      playedWords: [],
      currentWord: undefined,
      currentTheme: undefined,
      createdAt: new Date(),
    }
    setCurrentRoom(room)
    return room
  }, [])

  const joinRoom = useCallback((room: Room, player: Player) => {
    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full')
    }

    const updatedRoom = {
      ...room,
      players: [...room.players, player],
    }
    setCurrentRoom(updatedRoom)
    setCurrentPlayer(player)
  }, [])

  const startGame = useCallback((theme: Theme, impostorCount: number = 1) => {
    if (!currentRoom || !currentPlayer) return

    const gameState: GameState = {
      id: generateRoomId(),
      roomId: currentRoom.id,
      status: 'playing',
      currentRound: 1,
      maxRounds: currentRoom.maxRounds,
      currentTheme: theme.id,
      currentWord: theme.words[Math.floor(Math.random() * theme.words.length)],
      players: currentRoom.players,
      phase: 'playing',
      roundStartTime: new Date(),
      roundEndTime: undefined,
      actions: [],
      impostorCount,
      createdAt: new Date(),
    }

    setGameState(gameState)
  }, [currentRoom, currentPlayer])

  const nextRound = useCallback((theme: Theme) => {
    if (!gameState || !currentPlayer) return

    const newRound = gameState.currentRound + 1
    const newWord = theme.words[Math.floor(Math.random() * theme.words.length)]

    setGameState(prev => prev ? {
      ...prev,
      currentRound: newRound,
      currentWord: newWord,
      status: 'playing',
      players: prev.players.map(p => ({ ...p, hasVoted: false, isAlive: true }))
    } : null)
  }, [gameState, currentPlayer])

  const voteForPlayer = useCallback((targetId: string) => {
    if (!gameState || !currentPlayer) return

    setGameState(prev => prev ? {
      ...prev,
      players: prev.players.map(p => 
        p.id === currentPlayer.id 
          ? { ...p, hasVoted: true }
          : p
      )
    } : null)
  }, [gameState, currentPlayer])

  const getPlayerWord = useCallback(() => {
    if (!gameState || !currentPlayer) return ''
    
    const player = gameState.players.find(p => p.id === currentPlayer.id)
    if (!player) return ''
    
    return player.isImpostor ? 'IMPOSTOR' : gameState.currentWord
  }, [gameState, currentPlayer])

  const resetGame = useCallback(() => {
    setGameState(null)
    setCurrentRoom(null)
    setCurrentPlayer(null)
  }, [])

  return {
    currentPlayer,
    currentRoom,
    gameState,
    isConnected,
    createPlayer,
    createRoom,
    joinRoom,
    startGame,
    nextRound,
    voteForPlayer,
    getPlayerWord,
    resetGame,
    isHost: currentPlayer?.isHost || false,
    isImpostor: currentPlayer?.isImpostor || false,
    playerWord: getPlayerWord(),
  }
}
