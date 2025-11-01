import { NextRequest, NextResponse } from 'next/server'
import { supabaseDB } from '@/lib/supabase-db'

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 API: Iniciando limpieza de rooms huérfanos...')
    
    // Ejecutar limpieza
    const deletedCount = await supabaseDB.cleanupOrphanedRooms()
    
    console.log(`✅ API: Limpieza completada. ${deletedCount} rooms eliminados`)
    
    return NextResponse.json({
      success: true,
      message: `Limpieza completada. ${deletedCount} rooms huérfanos eliminados.`,
      deletedCount
    })
  } catch (error) {
    console.error('💥 API: Error en limpieza de rooms:', error)
    return NextResponse.json(
      { success: false, error: 'Error durante la limpieza' },
      { status: 500 }
    )
  }
}
