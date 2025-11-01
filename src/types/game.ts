export interface Player {
  id: string
  name: string
  isHost: boolean
  isImpostor: boolean
  hasVoted: boolean
  isAlive: boolean
  // Nuevo: para identificar jugadores únicamente
  sessionId: string
  // Nuevo: para tracking de conexión
  lastSeen: Date
  isConnected: boolean
}

export interface Room {
  id: string
  name: string
  hostId: string
  players: Player[]
  maxPlayers: number
  status: 'waiting' | 'playing' | 'finished'
  currentRound: number
  maxRounds: number
  // Nuevo: para control del juego
  gameState?: GameState
  // Nuevo: para sincronización
  lastUpdated: Date
  // Nuevo: para control del host
  currentPhase: GamePhase
  // Existente
  playedWords: string[]
  currentWord?: string
  currentTheme?: string
  createdAt: Date
}

// Nuevo: Estados específicos del juego
export interface GameState {
  id: string
  roomId: string
  status: 'waiting' | 'playing' | 'paused' | 'finished'
  currentRound: number
  maxRounds: number
  currentTheme?: string
  currentWord?: string
  players: Player[]
  // Nuevo: para control del host
  phase: GamePhase
  // Nuevo: para sincronización
  roundStartTime?: Date
  roundEndTime?: Date
  // Nuevo: para tracking de acciones
  actions: GameAction[]
  // Existente
  impostorCount: number
  createdAt: Date
}

// Nuevo: Fases del juego para control del host
export type GamePhase = 
  | 'waiting'           // Esperando que el host inicie
  | 'theme_selection'   // Host selecciona tema
  | 'word_generation'   // Generando palabra
  | 'playing'           // Jugando (mostrando palabras)
  | 'discussion'        // Discusión entre jugadores
  | 'voting'            // Votación (si se implementa)
  | 'round_end'         // Fin de ronda
  | 'game_end'          // Fin del juego

// Nuevo: Acciones del host para sincronización
export interface GameAction {
  id: string
  roomId: string // Room donde ocurrió la acción
  type: 'start_game' | 'change_theme' | 'generate_word' | 'next_round' | 'end_game'
  playerId: string // Quién ejecutó la acción
  timestamp: Date
  data?: any // Datos adicionales de la acción
}

export interface Theme {
  id: string
  name: string
  words: string[]
}

// Nuevo: Mensajes de comunicación entre host y jugadores
export interface GameMessage {
  id: string
  roomId: string
  type: 'system' | 'host' | 'player' | 'game_update'
  senderId?: string
  content: string
  timestamp: Date
  isPrivate: boolean // Si es solo para un jugador específico
  targetPlayerId?: string // Para mensajes privados
}

// Nuevo: Estado de conexión del jugador
export interface PlayerConnection {
  playerId: string
  roomId: string
  isConnected: boolean
  lastSeen: Date
  sessionId: string
}

// Nuevo: Respuesta de la API con más contexto
export interface GameApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  // Nuevo: para sincronización
  timestamp: Date
  roomState?: Room
  requiresUpdate?: boolean
}
