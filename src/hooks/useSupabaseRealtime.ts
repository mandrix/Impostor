import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Room } from '@/types/game'

export function useSupabaseRealtime(roomId: string, onUpdate: (room: Room) => void) {
  const subscribeToRoom = useCallback(() => {
    const subscription = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          console.log('Cambio en room:', payload)
          // Aquí podrías hacer fetch del room actualizado
          // o manejar el payload directamente
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('Cambio en jugadores:', payload)
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_states',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('Cambio en estado del juego:', payload)
        }
      )
      .subscribe()

    return subscription
  }, [roomId])

  useEffect(() => {
    const subscription = subscribeToRoom()

    return () => {
      subscription?.unsubscribe()
    }
  }, [subscribeToRoom])
}
