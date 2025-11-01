import { useState } from 'react'
import { leaveRoom } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface UseRoomLeaveProps {
  roomId: string
  playerId: string
  playerName: string
}

export function useRoomLeave({ roomId, playerId, playerName }: UseRoomLeaveProps) {
  const [isLeaving, setIsLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const leaveRoomHandler = async () => {
    try {
      setIsLeaving(true)
      setError(null)

      console.log(`🚪 ${playerName} saliéndose del room ${roomId}`)

      const result = await leaveRoom(roomId, playerId, playerName)

      if (result.success) {
        if (result.action === 'host_left') {
          // El host se salió, redirigir a todos al inicio
          console.log('💥 Host se salió, redirigiendo al inicio...')
          alert('El host se salió del room. El room ha sido eliminado.')
          router.push('/')
        } else {
          // Solo un jugador se salió
          console.log('✅ Jugador se salió exitosamente')
          alert(`${playerName} se salió del room`)
          router.push('/')
        }
      } else {
        setError(result.error || 'Error al salirse del room')
      }
    } catch (err) {
      console.error('💥 Error saliéndose del room:', err)
      setError('Error al salirse del room')
    } finally {
      setIsLeaving(false)
    }
  }

  return {
    leaveRoom: leaveRoomHandler,
    isLeaving,
    error,
    clearError: () => setError(null)
  }
}
