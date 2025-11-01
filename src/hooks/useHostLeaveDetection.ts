import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface UseHostLeaveDetectionProps {
  roomId: string
  isHost: boolean
  playerName: string
}

export function useHostLeaveDetection({ roomId, isHost, playerName }: UseHostLeaveDetectionProps) {
  const [hostLeft, setHostLeft] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Solo los jugadores que NO son host necesitan detectar si el host se sale
    if (isHost) return

    // Función para verificar si el room aún existe
    const checkRoomExists = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`)
        
        if (!response.ok) {
          // El room no existe, probablemente el host se salió
          console.log('💥 Room no encontrado, el host probablemente se salió')
          setHostLeft(true)
          
          // Mostrar mensaje y redirigir
          alert('El host se salió del room. El room ha sido eliminado.')
          router.push('/')
        }
      } catch (error) {
        console.error('Error verificando room:', error)
      }
    }

    // Verificar cada 5 segundos
    const interval = setInterval(checkRoomExists, 5000)

    return () => clearInterval(interval)
  }, [roomId, isHost, router])

  return {
    hostLeft,
    setHostLeft
  }
}
