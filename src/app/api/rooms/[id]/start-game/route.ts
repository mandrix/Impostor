import { NextRequest, NextResponse } from 'next/server'
import { supabaseDB } from '@/lib/supabase-db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { hostId, themeId } = body

    if (!hostId || !themeId) {
      return NextResponse.json(
        { success: false, error: 'Host ID y Theme ID son requeridos' },
        { status: 400 }
      )
    }

    const updatedRoom = await supabaseDB.startGame(id, hostId, themeId)
    
    if (!updatedRoom) {
      return NextResponse.json(
        { success: false, error: 'No se pudo iniciar el juego' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      room: updatedRoom,
      message: 'Juego iniciado exitosamente'
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error al iniciar juego' },
      { status: 500 }
    )
  }
}
