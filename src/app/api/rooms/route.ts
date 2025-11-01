import { NextRequest, NextResponse } from 'next/server'
import { supabaseDB } from '@/lib/supabase-db'

export async function GET() {
  try {
    console.log('🌐 API: GET /api/rooms - Iniciando...')
    
    const availableRooms = await supabaseDB.getAvailableRooms()
    console.log(`✅ API: Rooms obtenidos exitosamente: ${availableRooms.length}`)
    
    return NextResponse.json({
      success: true,
      rooms: availableRooms,
      total: availableRooms.length
    })
  } catch (error) {
    console.error('💥 API: Error obteniendo rooms:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener rooms' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { playerName } = body

    if (!playerName) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    const newRoom = await supabaseDB.createRoom(playerName)
    
    return NextResponse.json({
      success: true,
      room: newRoom,
      message: 'Room creado exitosamente'
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error al crear room' },
      { status: 500 }
    )
  }
}
