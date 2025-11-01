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

    const updatedRoom = await supabaseDB.changeTheme(id, hostId, themeId)
    
    if (!updatedRoom) {
      return NextResponse.json(
        { success: false, error: 'No se pudo cambiar el tema' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      room: updatedRoom,
      message: 'Tema cambiado exitosamente'
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error al cambiar tema' },
      { status: 500 }
    )
  }
}
