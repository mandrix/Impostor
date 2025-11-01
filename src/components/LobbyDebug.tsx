import React from 'react'
import { Box, Text, VStack, HStack, Badge, useToast } from '@chakra-ui/react'
import { Wifi, WifiOff, Clock, CheckCircle, XCircle } from 'lucide-react'

interface LobbyDebugProps {
  connectionStatus: 'connected' | 'connecting' | 'disconnected'
  isLoading: boolean
  roomsCount: number
  filteredRoomsCount: number
  lastUpdate?: Date
}

export function LobbyDebug({ 
  connectionStatus, 
  isLoading, 
  roomsCount, 
  filteredRoomsCount,
  lastUpdate 
}: LobbyDebugProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'green'
      case 'connecting': return 'yellow'
      case 'disconnected': return 'red'
      default: return 'gray'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle size={16} />
      case 'connecting': return <Clock size={16} />
      case 'disconnected': return <XCircle size={16} />
      default: return <Wifi size={16} />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Conectado'
      case 'connecting': return 'Conectando...'
      case 'disconnected': return 'Desconectado'
      default: return 'Desconocido'
    }
  }

  return (
    <Box 
      p={3} 
      bg="gray.100" 
      borderRadius="md" 
      border="1px" 
      borderColor="gray.300"
      fontSize="xs"
      position="fixed"
      top={4}
      right={4}
      zIndex={1000}
      minW="200px"
    >
      <VStack spacing={2} align="stretch">
        <Text fontWeight="bold" fontSize="xs">
          🐛 Debug del Lobby
        </Text>
        
        <HStack justify="space-between">
          <Text fontSize="xs">Estado:</Text>
          <Badge 
            colorScheme={getStatusColor(connectionStatus)} 
            size="sm"
            display="flex"
            alignItems="center"
            gap={1}
          >
            {getStatusIcon(connectionStatus)}
            {getStatusText(connectionStatus)}
          </Badge>
        </HStack>

        <HStack justify="space-between">
          <Text fontSize="xs">Cargando:</Text>
          <Badge 
            colorScheme={isLoading ? 'blue' : 'gray'} 
            size="sm"
          >
            {isLoading ? 'Sí' : 'No'}
          </Badge>
        </HStack>

        <HStack justify="space-between">
          <Text fontSize="xs">Rooms totales:</Text>
          <Badge colorScheme="purple" size="sm">
            {roomsCount}
          </Badge>
        </HStack>

        <HStack justify="space-between">
          <Text fontSize="xs">Rooms filtrados:</Text>
          <Badge colorScheme="teal" size="sm">
            {filteredRoomsCount}
          </Badge>
        </HStack>

        {lastUpdate && (
          <HStack justify="space-between">
            <Text fontSize="xs">Última actualización:</Text>
            <Text fontSize="xs" color="gray.600">
              {lastUpdate.toLocaleTimeString()}
            </Text>
          </HStack>
        )}

        <Box p={2} bg="blue.50" borderRadius="sm" border="1px" borderColor="blue.200">
          <Text fontSize="xs" color="blue.700">
            <strong>Instrucciones:</strong>
            <br />1. Abre la consola del navegador
            <br />2. Recarga la página
            <br />3. Observa los logs de conexión
          </Text>
        </Box>
      </VStack>
    </Box>
  )
}





