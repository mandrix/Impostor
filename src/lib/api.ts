import { Room, Player } from '@/types/game'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export interface CreateRoomData {
  playerName: string
}

export interface JoinRoomData {
  playerName: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Crear un nuevo room
export async function createRoom(data: CreateRoomData): Promise<ApiResponse<Room>> {
  try {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Error al crear room')
    }

    return {
      success: true,
      data: result.room,
      message: result.message
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

// Obtener todos los rooms disponibles
export async function getRooms(): Promise<ApiResponse<Room[]>> {
  try {
    const response = await fetch('/api/rooms', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Error al obtener rooms')
    }

    return {
      success: true,
      data: result.rooms
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

// Obtener un room específico
export async function getRoom(roomId: string): Promise<ApiResponse<Room>> {
  try {
    const response = await fetch(`/api/rooms/${roomId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Error al obtener room')
    }

    return {
      success: true,
      data: result.room
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

// Unirse a un room
export async function joinRoom(roomId: string, data: JoinRoomData): Promise<ApiResponse<{ room: Room; player: Player }>> {
  try {
    const response = await fetch(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Error al unirse al room')
    }

    return {
      success: true,
      data: {
        room: result.room,
        player: result.player
      },
      message: result.message
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

// Actualizar un room
export async function updateRoom(roomId: string, data: Partial<Room>): Promise<ApiResponse<Room>> {
  try {
    const response = await fetch(`/api/rooms/${roomId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Error al actualizar room')
    }

    return {
      success: true,
      data: result.room,
      message: result.message
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

// Salirse de un room
export async function leaveRoom(roomId: string, playerId: string, playerName: string) {
  try {
    const response = await fetch(`/api/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerId, playerName }),
    })

    if (!response.ok) {
      throw new Error('Error al salirse del room')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error saliéndose del room:', error)
    throw error
  }
}

// Limpiar rooms huérfanos (solo admin)
export async function cleanupOrphanedRooms() {
  try {
    const response = await fetch('/api/admin/cleanup-orphaned-rooms', {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('Error durante la limpieza')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error durante la limpieza:', error)
    throw error
  }
}
