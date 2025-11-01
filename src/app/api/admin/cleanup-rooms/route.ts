import { NextRequest, NextResponse } from 'next/server'
import { supabaseDB } from '@/lib/supabase-db'

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Iniciando limpieza automática de rooms...')
    
    // Limpiar rooms huérfanos
    const orphanedCount = await supabaseDB.cleanupOrphanedRooms()
    
    // Limpiar rooms vacíos
    const emptyCount = await supabaseDB.cleanupEmptyRooms()
    
    // Limpiar jugadores desconectados
    const disconnectedCount = await supabaseDB.cleanupDisconnectedPlayers()
    
    const totalCleaned = orphanedCount + emptyCount + disconnectedCount
    
    console.log(`✅ Limpieza completada: ${totalCleaned} elementos eliminados`)
    
    return NextResponse.json({
      success: true,
      message: 'Limpieza completada exitosamente',
      summary: {
        orphanedRooms: orphanedCount,
        emptyRooms: emptyCount,
        disconnectedPlayers: disconnectedCount,
        totalCleaned
      }
    })
  } catch (error) {
    console.error('💥 Error en limpieza automática:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error durante la limpieza automática' 
      },
      { status: 500 }
    )
  }
}





