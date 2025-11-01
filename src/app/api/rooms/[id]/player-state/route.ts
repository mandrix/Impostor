import { NextRequest, NextResponse } from 'next/server'
import { supabaseDB } from '@/lib/supabase-db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')

    console.log(`🔍 API GET /api/rooms/${id}/player-state - playerId: ${playerId}`)

    if (!playerId) {
      console.log(`❌ API GET /api/rooms/${id}/player-state - Player ID es requerido`)
      return NextResponse.json(
        { success: false, error: 'Player ID es requerido' },
        { status: 400 }
      )
    }

    const room = await supabaseDB.getRoomByIdWithLogging(id)
    if (!room) {
      console.log(`❌ API GET /api/rooms/${id}/player-state - Room no encontrado`)
      return NextResponse.json(
        { success: false, error: 'Room no encontrado' },
        { status: 404 }
      )
    }

    const playerGameState = await supabaseDB.getPlayerGameState(id, playerId)
    
    if (!playerGameState) {
      console.log(`❌ API GET /api/rooms/${id}/player-state - No se pudo obtener estado del jugador ${playerId}`)
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el estado del jugador' },
        { status: 500 }
      )
    }

    console.log(`✅ API GET /api/rooms/${id}/player-state - Estado obtenido exitosamente para jugador ${playerId}`)
    return NextResponse.json({
      success: true,
      gameState: playerGameState,
      message: 'Estado del jugador obtenido exitosamente'
    })
  } catch (error) {
    console.error(`💥 API GET /api/rooms/${id}/player-state - Error:`, error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener estado del jugador' },
      { status: 500 }
    )
  }
}
