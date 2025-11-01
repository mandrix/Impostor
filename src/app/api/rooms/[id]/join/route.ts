import { NextRequest, NextResponse } from 'next/server'
import { supabaseDB } from '@/lib/supabase-db'
import { Player } from '@/types/game'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { playerName } = body

    if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nombre del jugador requerido y válido' },
        { status: 400 }
      )
    }

    const room = await supabaseDB.getRoomById(id)
    
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si el room está lleno
    if (room.players.length >= room.maxPlayers) {
      return NextResponse.json(
        { success: false, error: 'Room lleno' },
        { status: 400 }
      )
    }

    // Verificar si el room ya está jugando
    if (room.status !== 'waiting') {
      return NextResponse.json(
        { success: false, error: 'El juego ya ha comenzado' },
        { status: 400 }
      )
    }

    // El método joinRoom ahora maneja automáticamente si el jugador ya existe
    // Si existe, actualiza su sesión; si no, crea uno nuevo
    const updatedPlayer = await supabaseDB.joinRoom(id, playerName.trim())
    
    if (!updatedPlayer) {
      return NextResponse.json(
        { success: false, error: 'No se pudo unir al room' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      player: updatedPlayer,
      message: 'Jugador unido exitosamente'
    })
  } catch (error) {
    console.error('Error en join room:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
