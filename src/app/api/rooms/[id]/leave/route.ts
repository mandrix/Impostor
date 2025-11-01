import { NextRequest, NextResponse } from 'next/server'
import { supabaseDB } from '@/lib/supabase-db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { playerId, playerName } = body

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'Player ID es requerido' },
        { status: 400 }
      )
    }

    console.log(`🚪 API: Jugador ${playerName} (${playerId}) saliéndose del room ${id}`)

    // Remover jugador del room
    const success = await supabaseDB.removePlayer(id, playerId)
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'No se pudo remover el jugador' },
        { status: 500 }
      )
    }

    // Obtener información del room para determinar la respuesta
    const roomInfo = await supabaseDB.getRoomInfoForNotifications(id)
    
    if (roomInfo) {
      // Si el room aún existe, solo se salió un jugador normal
      return NextResponse.json({
        success: true,
        action: 'player_left',
        message: `${playerName} se salió del room`,
        roomInfo
      })
    } else {
      // Si el room no existe, significa que el host se salió y se eliminó todo
      return NextResponse.json({
        success: true,
        action: 'host_left',
        message: 'El host se salió del room. El room ha sido eliminado.',
        redirectTo: '/'
      })
    }
  } catch (error) {
    console.error(`💥 API: Error en /api/rooms/${id}/leave:`, error)
    return NextResponse.json(
      { success: false, error: 'Error al salirse del room' },
      { status: 500 }
    )
  }
}
