import { NextRequest, NextResponse } from 'next/server'
import { Room } from '@/types/game'
import { supabaseDB } from '@/lib/supabase-db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    console.log(`🔍 API GET /api/rooms/${id} - Buscando room...`)

    const room = await supabaseDB.getRoomByIdWithLogging(id)

    if (!room) {
      console.log(`❌ API GET /api/rooms/${id} - Room no encontrado`)
      return NextResponse.json(
        { success: false, error: 'Room no encontrado' },
        { status: 404 }
      )
    }

    console.log(`✅ API GET /api/rooms/${id} - Room encontrado exitosamente`)
    return NextResponse.json({
      success: true,
      room
    })
  } catch (error) {
    console.error(`💥 API GET /api/rooms/${id} - Error:`, error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener room' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()

    // Obtener el room actual
    const room = await supabaseDB.getRoomById(id)
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room no encontrado' },
        { status: 404 }
      )
    }

    // Por ahora, solo retornamos el room actual
    // En el futuro, se puede implementar la actualización completa
    return NextResponse.json({
      success: true,
      room,
      message: 'Room obtenido exitosamente'
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error al obtener room' },
      { status: 500 }
    )
  }
}
