import { Room, Player, GameState, GamePhase, GameAction, PlayerConnection } from '@/types/game'
import themes from '@/data/themes.json'

class InMemoryDB {
  private rooms: Room[] = []
  private playerConnections: PlayerConnection[] = []
  private gameActions: GameAction[] = []

  // Generar ID único para room
  generateRoomId(): string {
    return Math.random().toString(36).substr(2, 9).toUpperCase()
  }

  // Generar ID único para jugador
  generatePlayerId(): string {
    return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Generar ID único para sesión
  generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Generar ID único para acción
  generateActionId(): string {
    return `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Crear un nuevo room con estado del juego inicializado
  createRoom(playerName: string): Room {
    const roomId = this.generateRoomId()
    const playerId = this.generatePlayerId()
    const sessionId = this.generateSessionId()
    
    // Crear jugador host
    const hostPlayer: Player = {
      id: playerId,
      name: playerName,
      isHost: true,
      isImpostor: false,
      hasVoted: false,
      isAlive: true,
      sessionId: sessionId,
      lastSeen: new Date(),
      isConnected: true,
    }

    // Crear estado inicial del juego
    const initialGameState: GameState = {
      id: this.generateRoomId(),
      roomId: roomId,
      status: 'waiting',
      currentRound: 0,
      maxRounds: 999,
      currentTheme: undefined,
      currentWord: undefined,
      players: [hostPlayer],
      phase: 'waiting',
      roundStartTime: undefined,
      roundEndTime: undefined,
      actions: [],
      impostorCount: 0,
      createdAt: new Date(),
    }

    // Crear room
    const room: Room = {
      id: roomId,
      name: playerName,
      hostId: playerId,
      players: [hostPlayer],
      maxPlayers: 15,
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

    // Registrar conexión del jugador
    this.playerConnections.push({
      playerId: playerId,
      roomId: roomId,
      isConnected: true,
      lastSeen: new Date(),
      sessionId: sessionId,
    })

    this.rooms.push(room)
    return room
  }

  // Obtener todos los rooms
  getAllRooms(): Room[] {
    return this.rooms
  }

  // Obtener rooms por estado
  getRoomsByStatus(status: string): Room[] {
    return this.rooms.filter(room => room.status === status)
  }

  // Obtener room por ID
  getRoomById(id: string): Room | null {
    return this.rooms.find(room => room.id === id) || null
  }

  // Actualizar room
  updateRoom(id: string, updates: Partial<Room>): Room | null {
    const roomIndex = this.rooms.findIndex(room => room.id === id)
    if (roomIndex === -1) return null

    this.rooms[roomIndex] = {
      ...this.rooms[roomIndex],
      ...updates,
      lastUpdated: new Date(),
    }

    return this.rooms[roomIndex]
  }

  // Agregar jugador al room
  addPlayerToRoom(roomId: string, player: Player): Room | null {
    const room = this.getRoomById(roomId)
    if (!room) return null

    // Verificar si el room está lleno
    if (room.players.length >= room.maxPlayers) return null

    // Verificar si el jugador ya está en el room
    if (room.players.some(p => p.name === player.name)) return null

    // Generar sessionId único para este jugador
    const sessionId = this.generateSessionId()
    const playerWithSession: Player = {
      ...player,
      sessionId: sessionId,
      lastSeen: new Date(),
      isConnected: true,
    }

    // Agregar jugador al room
    room.players.push(playerWithSession)

    // Registrar conexión del jugador
    this.playerConnections.push({
      playerId: player.id,
      roomId: roomId,
      isConnected: true,
      lastSeen: new Date(),
      sessionId: sessionId,
    })

    // Actualizar estado del juego
    if (room.gameState) {
      room.gameState.players = room.players
    }

    room.lastUpdated = new Date()
    return room
  }

  // Remover jugador del room
  removePlayerFromRoom(roomId: string, playerId: string): Room | null {
    const room = this.getRoomById(roomId)
    if (!room) return null

    // Remover jugador
    room.players = room.players.filter(p => p.id !== playerId)
    
    // Si no quedan jugadores, eliminar el room
    if (room.players.length === 0) {
      this.rooms = this.rooms.filter(r => r.id !== roomId)
      return null
    }

    // Si el host se fue, asignar nuevo host
    if (!room.players.some(p => p.isHost)) {
      room.players[0].isHost = true
      room.hostId = room.players[0].id
    }

    // Actualizar estado del juego
    if (room.gameState) {
      room.gameState.players = room.players
    }

    // Remover conexión del jugador
    this.playerConnections = this.playerConnections.filter(
      conn => !(conn.playerId === playerId && conn.roomId === roomId)
    )

    room.lastUpdated = new Date()
    return room
  }

  // Actualizar estado de conexión del jugador
  updatePlayerConnection(playerId: string, roomId: string, isConnected: boolean): void {
    const connection = this.playerConnections.find(
      conn => conn.playerId === playerId && conn.roomId === roomId
    )
    
    if (connection) {
      connection.isConnected = isConnected
      connection.lastSeen = new Date()
    }

    // Actualizar también en el room
    const room = this.getRoomById(roomId)
    if (room) {
      const player = room.players.find(p => p.id === playerId)
      if (player) {
        player.isConnected = isConnected
        player.lastSeen = new Date()
      }
    }
  }

  // Registrar acción del host
  recordGameAction(roomId: string, playerId: string, actionType: GameAction['type'], data?: any): GameAction | null {
    const room = this.getRoomById(roomId)
    if (!room) return null

    const action: GameAction = {
      id: this.generateActionId(),
      roomId: roomId,
      type: actionType,
      playerId: playerId,
      timestamp: new Date(),
      data: data,
    }

    this.gameActions.push(action)

    // Agregar acción al estado del juego del room
    if (room.gameState) {
      room.gameState.actions.push(action)
    }

    return action
  }

  // Iniciar juego (solo host puede hacerlo)
  startGame(roomId: string, hostId: string, themeId: string): Room | null {
    const room = this.getRoomById(roomId)
    if (!room) return null

    // Verificar que sea el host
    const host = room.players.find(p => p.id === hostId && p.isHost)
    if (!host) return null

    // Buscar tema
    const theme = themes.find(t => t.id === themeId)
    if (!theme) return null

    // Asignar impostores
    const roomWithImpostors = this.assignImpostors(room)
    if (!roomWithImpostors) return null

    // Actualizar estado del juego
    if (roomWithImpostors.gameState) {
      roomWithImpostors.gameState.status = 'playing'
      roomWithImpostors.gameState.phase = 'theme_selection'
      roomWithImpostors.gameState.currentTheme = themeId
      roomWithImpostors.gameState.currentRound = 1
      roomWithImpostors.gameState.roundStartTime = new Date()
    }

    // Registrar acción
    this.recordGameAction(roomId, hostId, 'start_game', { themeId })

    roomWithImpostors.status = 'playing'
    roomWithImpostors.currentTheme = themeId
    roomWithImpostors.currentRound = 1
    roomWithImpostors.lastUpdated = new Date()

    return roomWithImpostors
  }

  // Generar nueva palabra (solo host puede hacerlo)
  generateNewWord(roomId: string, hostId: string): Room | null {
    const room = this.getRoomById(roomId)
    if (!room) return null

    // Verificar que sea el host
    const host = room.players.find(p => p.id === hostId && p.isHost)
    if (!host) return null

    // Verificar que el juego esté activo
    if (room.status !== 'playing' || !room.currentTheme) return null

    // Buscar tema
    const theme = themes.find(t => t.id === room.currentTheme)
    if (!theme) return null

    // Generar palabra no repetida
    const availableWords = theme.words.filter(word => !room.playedWords.includes(word))
    if (availableWords.length === 0) {
      // Si no hay palabras disponibles, resetear historial
      room.playedWords = []
      room.currentWord = theme.words[Math.floor(Math.random() * theme.words.length)]
    } else {
      room.currentWord = availableWords[Math.floor(Math.random() * availableWords.length)]
    }

    // Agregar palabra al historial
    room.playedWords.push(room.currentWord!)

    // Actualizar estado del juego
    if (room.gameState) {
      room.gameState.currentWord = room.currentWord
      room.gameState.phase = 'playing'
      room.gameState.roundStartTime = new Date()
    }

    // Registrar acción
    this.recordGameAction(roomId, hostId, 'generate_word', { word: room.currentWord })

    room.lastUpdated = new Date()
    return room
  }

  // Cambiar tema (solo host puede hacerlo)
  changeTheme(roomId: string, hostId: string, newThemeId: string): Room | null {
    const room = this.getRoomById(roomId)
    if (!room) return null

    // Verificar que sea el host
    const host = room.players.find(p => p.id === hostId && p.isHost)
    if (!host) return null

    // Verificar que el tema existe
    const theme = themes.find(t => t.id === newThemeId)
    if (!theme) return null

    // Cambiar tema y resetear historial
    room.currentTheme = newThemeId
    room.playedWords = []
    room.currentWord = undefined

    // Actualizar estado del juego
    if (room.gameState) {
      room.gameState.currentTheme = newThemeId
      room.gameState.phase = 'theme_selection'
      room.gameState.currentWord = undefined
    }

    // Registrar acción
    this.recordGameAction(roomId, hostId, 'change_theme', { newThemeId })

    room.lastUpdated = new Date()
    return room
  }

  // Siguiente ronda (solo host puede hacerlo)
  nextRound(roomId: string, hostId: string): Room | null {
    const room = this.getRoomById(roomId)
    if (!room) return null

    // Verificar que sea el host
    const host = room.players.find(p => p.id === hostId && p.isHost)
    if (!host) return null

    // Verificar que el juego esté activo
    if (room.status !== 'playing') return null

    // Incrementar ronda
    room.currentRound++

    // Actualizar estado del juego
    if (room.gameState) {
      room.gameState.currentRound = room.currentRound
      room.gameState.phase = 'word_generation'
      room.gameState.currentWord = undefined
    }

    // Registrar acción
    this.recordGameAction(roomId, hostId, 'next_round', { round: room.currentRound })

    room.lastUpdated = new Date()
    return room
  }

  // Obtener palabra específica para un jugador (sin revelar si es impostor)
  getPlayerWord(roomId: string, playerId: string): { word: string; isImpostor: boolean } | null {
    const room = this.getRoomById(roomId)
    if (!room) return null

    // Verificar que el juego esté activo
    if (room.status !== 'playing' || !room.currentWord) return null

    // Buscar jugador
    const player = room.players.find(p => p.id === playerId)
    if (!player) return null

    return {
      word: player.isImpostor ? 'IMPOSTOR' : room.currentWord!,
      isImpostor: player.isImpostor,
    }
  }

  // Obtener estado del juego para un jugador específico
  getPlayerGameState(roomId: string, playerId: string): any {
    const room = this.getRoomById(roomId)
    if (!room) return null

    const player = room.players.find(p => p.id === playerId)
    if (!player) return null

    // Retornar información específica del jugador
    return {
      roomId: room.id,
      roomName: room.name,
      currentPhase: room.gameState?.phase || 'waiting',
      currentRound: room.currentRound,
      currentTheme: room.currentTheme,
      playerWord: this.getPlayerWord(roomId, playerId),
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isConnected: p.isConnected,
        // NO revelar si es impostor
      })),
      isHost: player.isHost,
      lastUpdated: room.lastUpdated,
    }
  }

  // Asignar impostores automáticamente
  assignImpostors(room: Room): Room | null {
    const playerCount = room.players.length
    
    if (playerCount < 2) {
      return room // Necesitamos al menos 2 jugadores
    }

    // Calcular cantidad de impostores según probabilidades
    const impostorCount = this.calculateImpostorCount(playerCount)
    
    // Seleccionar aleatoriamente quiénes serán impostores
    const shuffledPlayers = [...room.players].sort(() => Math.random() - 0.5)
    
    // Asignar impostores
    for (let i = 0; i < room.players.length; i++) {
      room.players[i].isImpostor = i < impostorCount
    }

    // Actualizar estado del juego
    if (room.gameState) {
      room.gameState.impostorCount = impostorCount
    }

    return room
  }

  // Calcular cantidad de impostores según probabilidades
  private calculateImpostorCount(playerCount: number): number {
    const random = Math.random() * 100 // 0-100
    
    // Probabilidades según el número de jugadores
    if (playerCount <= 3) {
      // Para pocos jugadores, solo 1 impostor
      return 1
    } else if (playerCount <= 5) {
      // 1-2 impostores
      if (random < 70) return 1
      else return 2
    } else if (playerCount <= 8) {
      // 1-3 impostores
      if (random < 50) return 1
      else if (random < 80) return 2
      else return 3
    } else if (playerCount <= 12) {
      // 1-4 impostores
      if (random < 50) return 1
      else if (random < 75) return 2
      else if (random < 90) return 3
      else return 4
    } else {
      // 1-5 impostores para muchos jugadores
      if (random < 50) return 1
      else if (random < 70) return 2
      else if (random < 85) return 3
      else if (random < 95) return 4
      else return 5
    }
  }

  // Limpiar rooms antiguos
  cleanupOldRooms(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    this.rooms = this.rooms.filter(room => room.lastUpdated > oneHourAgo)
  }

  // Obtener estadísticas
  getStats(): { totalRooms: number; activeRooms: number; totalPlayers: number } {
    const activeRooms = this.rooms.filter(room => room.status !== 'finished')
    const totalPlayers = this.rooms.reduce((sum, room) => sum + room.players.length, 0)
    
    return {
      totalRooms: this.rooms.length,
      activeRooms: activeRooms.length,
      totalPlayers: totalPlayers,
    }
  }

  // Eliminar room
  deleteRoom(roomId: string): boolean {
    const initialLength = this.rooms.length
    this.rooms = this.rooms.filter(room => room.id !== roomId)
    
    // Limpiar conexiones relacionadas
    this.playerConnections = this.playerConnections.filter(conn => conn.roomId !== roomId)
    
    // Limpiar acciones relacionadas
    this.gameActions = this.gameActions.filter(action => {
      const room = this.getRoomById(action.roomId)
      return room !== null
    })
    
    return this.rooms.length < initialLength
  }

  // Método para diagnosticar el estado de la base de datos
  diagnose(): void {
    console.log('🔍 DIAGNÓSTICO DE LA BASE DE DATOS')
    console.log('=====================================')
    console.log(`📊 Total de rooms: ${this.rooms.length}`)
    console.log(`🔗 Total de conexiones: ${this.playerConnections.length}`)
    console.log(`🎮 Total de acciones: ${this.gameActions.length}`)
    
    if (this.rooms.length > 0) {
      console.log('\n🏠 ROOMS EN LA BASE DE DATOS:')
      this.rooms.forEach((room, index) => {
        console.log(`  ${index + 1}. ID: ${room.id}, Nombre: ${room.name}, Jugadores: ${room.players.length}`)
        console.log(`     Estado: ${room.status}, Fase: ${room.currentPhase}`)
        console.log(`     Creado: ${room.createdAt.toISOString()}`)
        console.log(`     Última actualización: ${room.lastUpdated.toISOString()}`)
      })
    } else {
      console.log('❌ No hay rooms en la base de datos')
    }
    
    if (this.playerConnections.length > 0) {
      console.log('\n🔗 CONEXIONES DE JUGADORES:')
      this.playerConnections.forEach((conn, index) => {
        console.log(`  ${index + 1}. Player: ${conn.playerId}, Room: ${conn.roomId}, Conectado: ${conn.isConnected}`)
      })
    } else {
      console.log('❌ No hay conexiones de jugadores')
    }
    
    console.log('=====================================')
  }

  // Método para verificar la integridad de los datos
  verifyIntegrity(): { isValid: boolean; issues: string[] } {
    const issues: string[] = []
    
    // Verificar que todos los rooms tienen jugadores
    this.rooms.forEach(room => {
      if (room.players.length === 0) {
        issues.push(`Room ${room.id} no tiene jugadores`)
      }
      
      // Verificar que el host existe
      const host = room.players.find(p => p.isHost)
      if (!host) {
        issues.push(`Room ${room.id} no tiene host`)
      }
      
      // Verificar que las conexiones coinciden
      const roomConnections = this.playerConnections.filter(conn => conn.roomId === room.id)
      if (roomConnections.length !== room.players.length) {
        issues.push(`Room ${room.id} tiene ${room.players.length} jugadores pero ${roomConnections.length} conexiones`)
      }
    })
    
    // Verificar que todas las conexiones tienen rooms válidos
    this.playerConnections.forEach(conn => {
      const room = this.rooms.find(r => r.id === conn.roomId)
      if (!room) {
        issues.push(`Conexión del jugador ${conn.playerId} apunta a room inexistente ${conn.roomId}`)
      }
    })
    
    return {
      isValid: issues.length === 0,
      issues
    }
  }
}

// Exportar instancia singleton
export const db = new InMemoryDB()

// Limpiar rooms antiguos cada hora
setInterval(() => {
  db.cleanupOldRooms()
}, 60 * 60 * 1000)
