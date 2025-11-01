import React from 'react'
import { Button } from '@chakra-ui/react'
import { useRoomLeave } from '@/hooks/useRoomLeave'

interface LeaveRoomButtonProps {
  roomId: string
  playerId: string
  playerName: string
  variant?: 'solid' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  colorScheme?: string
}

export function LeaveRoomButton({ 
  roomId, 
  playerId, 
  playerName, 
  variant = 'outline',
  size = 'md',
  colorScheme = 'red'
}: LeaveRoomButtonProps) {
  const { leaveRoom, isLeaving, error } = useRoomLeave({
    roomId,
    playerId,
    playerName
  })

  const handleLeave = () => {
    if (window.confirm(`¿Estás seguro de que quieres salirte del room?`)) {
      leaveRoom()
    }
  }

  return (
    <div>
      <Button
        onClick={handleLeave}
        isLoading={isLeaving}
        loadingText="Saliendo..."
        variant={variant}
        size={size}
        colorScheme={colorScheme}
        leftIcon={<span>🚪</span>}
      >
        Salirse del Room
      </Button>
      
      {error && (
        <div style={{ color: 'red', marginTop: '8px', fontSize: '14px' }}>
          {error}
        </div>
      )}
    </div>
  )
}
