import { NextRequest, NextResponse } from 'next/server'
import { supabaseDB } from '@/lib/supabase-db'

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Iniciando limpieza automática de rooms...')
    
    // Limpiar rooms huérfanos (esto también elimina rooms vacíos y sus jugadores)
    const orphanedCount = await supabaseDB.cleanupOrphanedRooms()
    
    console.log(`✅ Limpieza completada: ${orphanedCount} rooms eliminados`)
    
    return NextResponse.json({
      success: true,
      message: 'Limpieza completada exitosamente',
      summary: {
        orphanedRooms: orphanedCount,
        totalCleaned: orphanedCount
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





