import { NextRequest, NextResponse } from 'next/server'
import { supabaseDB } from '@/lib/supabase-db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { hostId } = body

    if (!hostId) {
      return NextResponse.json(
        { success: false, error: 'Host ID es requerido' },
        { status: 400 }
      )
    }

    const updatedRoom = await supabaseDB.nextRound(id, hostId)
    
    if (!updatedRoom) {
      return NextResponse.json(
        { success: false, error: 'No se pudo pasar a la siguiente ronda' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      room: updatedRoom,
      message: 'Siguiente ronda iniciada'
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error al pasar a siguiente ronda' },
      { status: 500 }
    )
  }
}
