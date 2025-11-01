import React from 'react'
import { Button, Box, Text, VStack, HStack, Badge, useToast } from '@chakra-ui/react'
import { useRoomCleanup } from '@/hooks/useRoomCleanup'

export function RoomCleanupTest() {
  const { cleanupRooms, isCleaning, lastResult, error, clearError, clearResult } = useRoomCleanup()
  const toast = useToast()

  const handleCleanup = async () => {
    await cleanupRooms()
    
    if (lastResult) {
      toast({
        title: 'Limpieza completada',
        description: `Se eliminaron ${lastResult.totalCleaned} elementos`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const handleClearResults = () => {
    clearResult()
    clearError()
  }

  return (
    <Box p={4} borderWidth={1} borderRadius="lg" bg="gray.50">
      <VStack spacing={4} align="stretch">
        <Text fontSize="lg" fontWeight="bold">
          🧹 Prueba de Limpieza de Rooms
        </Text>
        
        <Text fontSize="sm" color="gray.600">
          Este componente permite probar la funcionalidad de limpieza automática de rooms huérfanos, 
          vacíos y jugadores desconectados.
        </Text>

        <HStack spacing={4}>
          <Button
            colorScheme="blue"
            onClick={handleCleanup}
            isLoading={isCleaning}
            loadingText="Limpiando..."
          >
            {isCleaning ? 'Limpiando...' : 'Limpiar Rooms'}
          </Button>

          <Button
            variant="outline"
            onClick={handleClearResults}
            size="sm"
          >
            Limpiar Resultados
          </Button>
        </HStack>

        {error && (
          <Box p={3} bg="red.100" borderRadius="md" border="1px" borderColor="red.300">
            <Text color="red.700" fontSize="sm">
              ❌ Error: {error}
            </Text>
          </Box>
        )}

        {lastResult && (
          <Box p={4} bg="green.100" borderRadius="md" border="1px" borderColor="green.300">
            <Text color="green.700" fontSize="sm" fontWeight="bold" mb={2}>
              ✅ Limpieza Completada
            </Text>
            
            <VStack spacing={2} align="stretch">
              <HStack justify="space-between">
                <Text fontSize="sm">Rooms huérfanos:</Text>
                <Badge colorScheme="red">{lastResult.orphanedRooms}</Badge>
              </HStack>
              
              <HStack justify="space-between">
                <Text fontSize="sm">Rooms vacíos:</Text>
                <Badge colorScheme="orange">{lastResult.emptyRooms}</Badge>
              </HStack>
              
              <HStack justify="space-between">
                <Text fontSize="sm">Jugadores desconectados:</Text>
                <Badge colorScheme="yellow">{lastResult.disconnectedPlayers}</Badge>
              </HStack>
              
              <HStack justify="space-between">
                <Text fontSize="sm" fontWeight="bold">Total eliminado:</Text>
                <Badge colorScheme="green" fontSize="md">{lastResult.totalCleaned}</Badge>
              </HStack>
            </VStack>
          </Box>
        )}

        <Box p={3} bg="blue.100" borderRadius="md" border="1px" borderColor="blue.300">
          <Text color="blue.700" fontSize="xs">
            <strong>Funcionalidades implementadas:</strong>
            <br />• Validación por nombre de jugador (no duplicados)
            <br />• Manejo de sesiones para jugadores existentes
            <br />• Limpieza automática de rooms huérfanos
            <br />• Limpieza de rooms vacíos
            <br />• Limpieza de jugadores desconectados
            <br />• Sistema de salida funcional
          </Text>
        </Box>
      </VStack>
    </Box>
  )
}





