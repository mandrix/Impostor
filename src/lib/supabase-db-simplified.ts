import { supabase, supabaseAdmin } from './supabase'
import { Room, Player, GameState, GameAction, GamePhase } from '@/types/game'
import themes from '@/data/themes.json'

export class SupabaseDB {
  // Generar ID único
  private generateId(): string {
    return crypto.randomUUID()
  }

  // Crear un nuevo room
  async createRoom(playerName: string): Promise<Room> {
    try {
      // 1. Crear el room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          name: playerName,
          host_id: this.generateId(),
          status: 'waiting'
        })
        .select()
        .single()

      if (roomError) throw roomError

      // 2. Crear el jugador host
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: room.id,
          name: playerName,
          is_host: true,
          session_id: this.generateId()
        })
        .select()
        .single()

      if (playerError) throw playerError

      // 3. Crear estado inicial del juego
      const { data: gameState, error: gameStateError } = await supabase
        .from('game_states')
        .insert({
          room_id: room.id,
          status: 'waiting',
          phase: 'waiting'
        })
        .select()
        .single()

      if (gameStateError) throw gameStateError

      // 4. Retornar room completo
      return {
        id: room.id,
        name: room.name,
        hostId: player.id,
        players: [player],
        maxPlayers: room.max_players,
        status: room.status,
        currentRound: room.current_round,
        maxRounds: room.max_rounds,
        gameState: {
          id: gameState.id,
          roomId: room.id,
          status: gameState.status,
          currentRound: gameState.current_round,
          maxRounds: gameState.max_rounds,
          phase: gameState.phase as GamePhase,
          players: [player],
          actions: [],
          impostorCount: 0,
          createdAt: new Date(gameState.created_at)
        },
        lastUpdated: new Date(room.updated_at),
        currentPhase: gameState.phase as GamePhase,
        playedWords: room.played_words || [],
        currentWord: room.current_word,
        currentTheme: room.current_theme,
        createdAt: new Date(room.created_at)
      }
    } catch (error) {
      console.error('Error creando room:', error)
      throw new Error('No se pudo crear el room')
    }
  }

  // Obtener todos los rooms disponibles
  async getAvailableRooms(): Promise<Room[]> {
    try {
      console.log('🔍 Buscando rooms disponibles...')
      
      const { data: rooms, error } = await supabase
        .from('rooms')
        .select(`
          *,
          players (*),
          game_states (*)
        `)
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error en consulta de rooms:', error)
        throw error
      }

      console.log(`📊 Rooms encontrados: ${rooms?.length || 0}`)
      
      if (rooms && rooms.length > 0) {
        rooms.forEach((room, index) => {
          console.log(`🏠 Room ${index + 1}: ${room.name} con ${room.players?.length || 0} jugadores`)
        })
      }

      const mappedRooms = (rooms || []).map(room => this.mapRoomFromDB(room))
      console.log(`✅ Rooms mapeados exitosamente: ${mappedRooms.length}`)
      
      return mappedRooms
    } catch (error) {
      console.error('💥 Error obteniendo rooms:', error)
      return []
    }
  }

  // Obtener room por ID
  async getRoomById(id: string): Promise<Room | null> {
    try {
      const { data: room, error } = await supabase
        .from('rooms')
        .select(`
          *,
          players (*),
          game_states (*)
        `)
        .eq('id', id)
        .single()

      if (error) return null

      return this.mapRoomFromDB(room)
    } catch (error) {
      console.error('Error obteniendo room:', error)
      return null
    }
  }

  // Obtener room por ID con logging (para APIs)
  async getRoomByIdWithLogging(id: string): Promise<Room | null> {
    console.log(`🔍 Buscando room con ID: ${id}`)
    const room = await this.getRoomById(id)
    if (room) {
      console.log(`✅ Room encontrado: ${room.name} con ${room.players.length} jugadores`)
    } else {
      console.log(`❌ Room no encontrado con ID: ${id}`)
    }
    return room
  }

  // Unirse a un room
  async joinRoom(roomId: string, playerName: string): Promise<Player> {
    try {
      // Verificar que el room existe y tiene espacio
      const room = await this.getRoomById(roomId)
      if (!room) throw new Error('Room no encontrado')
      if (room.players.length >= room.maxPlayers) throw new Error('Room lleno')
      if (room.status !== 'waiting') throw new Error('El juego ya comenzó')

      // Crear nuevo jugador
      const { data: player, error } = await supabase
        .from('players')
        .insert({
          room_id: roomId,
          name: playerName,
          session_id: this.generateId()
        })
        .select()
        .single()

      if (error) throw error

      return player
    } catch (error) {
      console.error('Error uniéndose al room:', error)
      throw error
    }
  }

  // Iniciar juego
  async startGame(roomId: string, hostId: string, themeId: string): Promise<Room | null> {
    try {
      // Verificar que sea el host
      const { data: host, error: hostError } = await supabase
        .from('players')
        .select('*')
        .eq('id', hostId)
        .eq('room_id', roomId)
        .eq('is_host', true)
        .single()

      if (hostError || !host) throw new Error('Solo el host puede iniciar el juego')

      // Asignar impostores
      await this.assignImpostors(roomId)

      // Actualizar estado del juego
      const { data: gameState, error: gameStateError } = await supabase
        .from('game_states')
        .update({
          status: 'playing',
          phase: 'theme_selection',
          current_theme: themeId,
          current_round: 1,
          round_start_time: new Date().toISOString()
        })
        .eq('room_id', roomId)
        .select()
        .single()

      if (gameStateError) throw gameStateError

      // Actualizar room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .update({
          status: 'playing',
          current_theme: themeId,
          current_round: 1
        })
        .eq('id', roomId)
        .select()
        .single()

      if (roomError) throw roomError

      // Registrar acción
      await supabase
        .from('game_actions')
        .insert({
          room_id: roomId,
          type: 'start_game',
          player_id: hostId,
          data: { themeId }
        })

      return await this.getRoomById(roomId)
    } catch (error) {
      console.error('Error iniciando juego:', error)
      return null
    }
  }

  // Asignar impostores
  private async assignImpostors(roomId: string): Promise<void> {
    try {
      // Obtener jugadores del room
      const { data: players, error } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId)

      if (error || !players) return

      const playerCount = players.length
      const impostorCount = this.calculateImpostorCount(playerCount)

      // Seleccionar aleatoriamente quiénes serán impostores
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5)
      
      // Asignar impostores
      for (let i = 0; i < players.length; i++) {
        await supabase
          .from('players')
          .update({ is_impostor: i < impostorCount })
          .eq('id', players[i].id)
      }

      // Actualizar estado del juego
      await supabase
        .from('game_states')
        .update({ impostor_count: impostorCount })
        .eq('room_id', roomId)
    } catch (error) {
      console.error('Error asignando impostores:', error)
    }
  }

  // Calcular cantidad de impostores
  private calculateImpostorCount(playerCount: number): number {
    const random = Math.random() * 100
    
    if (playerCount <= 3) return 1
    else if (playerCount <= 5) return random < 70 ? 1 : 2
    else if (playerCount <= 8) {
      if (random < 50) return 1
      else if (random < 80) return 2
      else return 3
    } else if (playerCount <= 12) {
      if (random < 50) return 1
      else if (random < 75) return 2
      else if (random < 90) return 3
      else return 4
    } else {
      if (random < 50) return 1
      else if (random < 70) return 2
      else if (random < 85) return 3
      else if (random < 95) return 4
      else return 5
    }
  }

  // Generar nueva palabra
  async generateNewWord(roomId: string, hostId: string): Promise<Room | null> {
    try {
      // Verificar que sea el host
      const { data: host, error: hostError } = await supabase
        .from('players')
        .select('*')
        .eq('id', hostId)
        .eq('room_id', roomId)
        .eq('is_host', true)
        .single()

      if (hostError || !host) throw new Error('Solo el host puede generar palabras')

      // Obtener room y tema
      const room = await this.getRoomById(roomId)
      if (!room || !room.currentTheme) throw new Error('Tema no seleccionado')

      const theme = themes.find(t => t.id === room.currentTheme)
      if (!theme) throw new Error('Tema no encontrado')

      // Generar palabra no repetida
      const availableWords = theme.words.filter(word => !room.playedWords.includes(word))
      let selectedWord: string

      if (availableWords.length === 0) {
        // Resetear historial si no hay palabras disponibles
        selectedWord = theme.words[Math.floor(Math.random() * theme.words.length)]
        await supabase
          .from('rooms')
          .update({ played_words: [] })
          .eq('id', roomId)
      } else {
        selectedWord = availableWords[Math.floor(Math.random() * availableWords.length)]
      }

      // Actualizar room con nueva palabra
      const { data: updatedRoom, error: roomError } = await supabase
        .from('rooms')
        .update({
          current_word: selectedWord,
          played_words: [...(room.playedWords || []), selectedWord]
        })
        .eq('id', roomId)
        .select()
        .single()

      if (roomError) throw roomError

      // Actualizar estado del juego
      await supabase
        .from('game_states')
        .update({
          phase: 'playing',
          current_word: selectedWord,
          round_start_time: new Date().toISOString()
        })
        .eq('room_id', roomId)

      // Registrar acción
      await supabase
        .from('game_actions')
        .insert({
          room_id: roomId,
          type: 'generate_word',
          player_id: hostId,
          data: { word: selectedWord }
        })

      return await this.getRoomById(roomId)
    } catch (error) {
      console.error('Error generando palabra:', error)
      return null
    }
  }

  // Cambiar tema (solo host puede hacerlo)
  async changeTheme(roomId: string, hostId: string, newThemeId: string): Promise<Room | null> {
    try {
      // Verificar que sea el host
      const { data: host, error: hostError } = await supabase
        .from('players')
        .select('*')
        .eq('id', hostId)
        .eq('room_id', roomId)
        .eq('is_host', true)
        .single()

      if (hostError || !host) throw new Error('Solo el host puede cambiar el tema')

      // Verificar que el tema existe
      const theme = themes.find(t => t.id === newThemeId)
      if (!theme) throw new Error('Tema no encontrado')

      // Cambiar tema y resetear historial
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .update({
          current_theme: newThemeId,
          played_words: [],
          current_word: undefined
        })
        .eq('id', roomId)
        .select()
        .single()

      if (roomError) throw roomError

      // Actualizar estado del juego
      await supabase
        .from('game_states')
        .update({
          current_theme: newThemeId,
          phase: 'theme_selection',
          current_word: undefined
        })
        .eq('room_id', roomId)

      // Registrar acción
      await supabase
        .from('game_actions')
        .insert({
          room_id: roomId,
          type: 'change_theme',
          player_id: hostId,
          data: { newThemeId }
        })

      return await this.getRoomById(roomId)
    } catch (error) {
      console.error('Error cambiando tema:', error)
      return null
    }
  }

  // Siguiente ronda (solo host puede hacerlo)
  async nextRound(roomId: string, hostId: string): Promise<Room | null> {
    try {
      // Verificar que sea el host
      const { data: host, error: hostError } = await supabase
        .from('players')
        .select('*')
        .eq('id', hostId)
        .eq('room_id', roomId)
        .eq('is_host', true)
        .single()

      if (hostError || !host) throw new Error('Solo el host puede pasar a la siguiente ronda')

      // Verificar que el juego esté activo
      const room: Room | null = await this.getRoomById(roomId)
      if (!room || room.status !== 'playing') throw new Error('El juego no está activo')

      // Incrementar ronda
      const { data: updatedRoom, error: roomError } = await supabase
        .from('rooms')
        .update({
          current_round: room.currentRound + 1
        })
        .eq('id', roomId)
        .select()
        .single()

      if (roomError) throw roomError

      // Actualizar estado del juego
      await supabase
        .from('game_states')
        .update({
          current_round: room.currentRound + 1,
          phase: 'word_generation',
          current_word: undefined
        })
        .eq('room_id', roomId)

      // Registrar acción
      await supabase
        .from('game_actions')
        .insert({
          room_id: roomId,
          type: 'next_round',
          player_id: hostId,
          data: { round: room.currentRound + 1 }
        })

      return await this.getRoomById(roomId)
    } catch (error) {
      console.error('Error pasando a siguiente ronda:', error)
      return null
    }
  }

  // Obtener estado del juego para un jugador específico
  async getPlayerGameState(roomId: string, playerId: string): Promise<any> {
    try {
      const room = await this.getRoomById(roomId)
      if (!room) return null

      const player = room.players.find(p => p.id === playerId)
      if (!player) return null

      // Obtener palabra específica del jugador
      const playerWord = player.isImpostor ? 'IMPOSTOR' : room.currentWord

      return {
        roomId: room.id,
        roomName: room.name,
        currentPhase: room.gameState?.phase || 'waiting',
        currentRound: room.currentRound,
        currentTheme: room.currentTheme,
        playerWord: playerWord ? { word: playerWord, isImpostor: player.isImpostor } : undefined,
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
    } catch (error) {
      console.error('Error obteniendo estado del jugador:', error)
      return null
    }
  }

  // =====================================================
  // NUEVAS FUNCIONES QUE USAN LA BASE DE DATOS DIRECTAMENTE
  // =====================================================

  // Remover jugador del room (ahora usa la función de la DB)
  async removePlayer(roomId: string, playerId: string): Promise<boolean> {
    try {
      console.log(`🚪 Removiendo jugador ${playerId} del room ${roomId}`)
      
      // Verificar si es el host
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .eq('room_id', roomId)
        .single()

      if (playerError || !player) {
        console.log(`❌ Jugador ${playerId} no encontrado`)
        return false
      }

      const wasHost = player.is_host
      console.log(`👤 Jugador ${player.name} ${wasHost ? 'era host' : 'no era host'}`)

      // Si era host, eliminar todo el room usando la función de la DB
      if (wasHost) {
        console.log(`💥 Host se salió, eliminando room completo usando función de DB...`)
        
        // Usar la función de la base de datos
        const { data, error } = await supabase.rpc('delete_room_complete', {
          room_id: roomId
        })

        if (error) {
          console.error(`❌ Error eliminando room:`, error)
          return false
        }

        console.log(`✅ Room eliminado por función de DB:`, data)
        return true
      }

      // Si no era host, solo eliminar el jugador
      // El trigger automático se encargará de eliminar el room si queda vacío
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId)

      if (deleteError) {
        console.error(`❌ Error eliminando jugador:`, deleteError)
        return false
      }

      console.log(`✅ Jugador ${player.name} removido exitosamente`)
      return true
    } catch (error) {
      console.error(`💥 Error removiendo jugador:`, error)
      return false
    }
  }

  // Ejecutar limpieza automática usando la función de la DB
  async cleanupRooms(): Promise<any> {
    try {
      console.log(`🧹 Ejecutando limpieza automática desde la base de datos...`)
      
      // Usar la función de la base de datos
      const { data, error } = await supabase.rpc('cleanup_all_rooms')

      if (error) {
        console.error(`❌ Error en limpieza automática:`, error)
        throw error
      }

      console.log(`✅ Limpieza automática completada:`, data)
      return data
    } catch (error) {
      console.error(`💥 Error ejecutando limpieza:`, error)
      throw error
    }
  }

  // Obtener estadísticas de limpieza
  async getCleanupStats(): Promise<any> {
    try {
      console.log(`📊 Obteniendo estadísticas de limpieza...`)
      
      const { data, error } = await supabase.rpc('get_cleanup_stats')

      if (error) {
        console.error(`❌ Error obteniendo estadísticas:`, error)
        throw error
      }

      console.log(`✅ Estadísticas obtenidas:`, data)
      return data
    } catch (error) {
      console.error(`💥 Error obteniendo estadísticas:`, error)
      throw error
    }
  }

  // Monitorear salud de la base de datos
  async monitorDatabaseHealth(): Promise<any> {
    try {
      console.log(`🏥 Monitoreando salud de la base de datos...`)
      
      const { data, error } = await supabase.rpc('monitor_database_health')

      if (error) {
        console.error(`❌ Error monitoreando salud:`, error)
        throw error
      }

      console.log(`✅ Estado de salud:`, data)
      return data
    } catch (error) {
      console.error(`💥 Error monitoreando salud:`, error)
      throw error
    }
  }

  // Obtener métricas de performance
  async getPerformanceMetrics(): Promise<any> {
    try {
      console.log(`⚡ Obteniendo métricas de performance...`)
      
      const { data, error } = await supabase.rpc('get_performance_metrics')

      if (error) {
        console.error(`❌ Error obteniendo métricas:`, error)
        throw error
      }

      console.log(`✅ Métricas obtenidas:`, data)
      return data
    } catch (error) {
      console.error(`💥 Error obteniendo métricas:`, error)
      throw error
    }
  }

  // Mapear room desde la base de datos
  private mapRoomFromDB(dbRoom: any): Room {
    try {
      console.log(`🔄 Mapeando room: ${dbRoom.name}`)
      
      const gameState = dbRoom.game_states?.[0] ? {
        id: dbRoom.game_states[0].id,
        roomId: dbRoom.id,
        status: dbRoom.game_states[0].status,
        currentRound: dbRoom.game_states[0].current_round,
        maxRounds: dbRoom.game_states[0].max_rounds,
        currentTheme: dbRoom.game_states[0].current_theme,
        currentWord: dbRoom.game_states[0].current_word,
        phase: dbRoom.game_states[0].phase as GamePhase,
        players: dbRoom.players || [],
        roundStartTime: dbRoom.game_states[0].round_start_time ? new Date(dbRoom.game_states[0].round_start_time) : undefined,
        roundEndTime: dbRoom.game_states[0].round_end_time ? new Date(dbRoom.game_states[0].round_end_time) : undefined,
        actions: [],
        impostorCount: dbRoom.game_states[0].impostor_count,
        createdAt: new Date(dbRoom.game_states[0].created_at)
      } as GameState : undefined

      const room = {
        id: dbRoom.id,
        name: dbRoom.name,
        hostId: dbRoom.host_id,
        players: dbRoom.players || [],
        maxPlayers: dbRoom.max_players,
        status: dbRoom.status,
        currentRound: dbRoom.current_round,
        maxRounds: dbRoom.max_rounds,
        gameState,
        lastUpdated: new Date(dbRoom.updated_at),
        currentPhase: dbRoom.game_states?.[0]?.phase as GamePhase || 'waiting',
        playedWords: dbRoom.played_words || [],
        currentWord: dbRoom.current_word,
        currentTheme: dbRoom.current_theme,
        createdAt: new Date(dbRoom.created_at)
      }

      console.log(`✅ Room mapeado exitosamente: ${dbRoom.name} con ${dbRoom.players?.length || 0} jugadores`)
      return room
    } catch (error) {
      console.error(`💥 Error mapeando room ${dbRoom.name}:`, error)
      throw error
    }
  }
}

// Exportar instancia singleton
export const supabaseDB = new SupabaseDB()




