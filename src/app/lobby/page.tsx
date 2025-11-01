'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Container, VStack, HStack, Heading, Text, Button, Card, CardBody, Badge, Avatar, useToast, Input, InputGroup, InputLeftElement, Select, IconButton, Tooltip, Spinner, Center, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, FormControl, FormLabel, FormErrorMessage } from '@chakra-ui/react'
import { Search, Users, Crown, Play, Plus, RefreshCw, Globe, Wifi, WifiOff, TrendingUp, Clock, UserCheck, Gamepad2, Sparkles } from 'lucide-react'
import { Room, Player } from '@/types/game'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getRooms, createRoom, joinRoom } from '@/lib/api'
import { RoomCleanupTest } from '@/components/RoomCleanupTest'
import { LobbyDebug } from '@/components/LobbyDebug'

const MotionCard = motion(Card)
const MotionBox = motion(Box)
const MotionButton = motion(Button)

// Schema simplificado - solo botón para crear room
const createRoomSchema = z.object({})

type CreateRoomFormData = z.infer<typeof createRoomSchema>

export default function LobbyPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const { isOpen: isCreateRoomOpen, onOpen: onCreateRoomOpen, onClose: onCreateRoomClose } = useDisclosure()
  const toast = useToast()

  const createRoomForm = useForm<CreateRoomFormData>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {}
  })

  // Conectar al servidor y cargar rooms
  useEffect(() => {
    const connectToServer = async () => {
      console.log('🚀 Iniciando conexión al servidor...')
      setConnectionStatus('connecting')
      
      try {
        console.log('⏳ Simulando delay de conexión...')
        // Simular delay de conexión
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        console.log('📡 Cargando rooms disponibles...')
        // Cargar rooms disponibles
        await loadRooms()
        
        console.log('✅ Conexión establecida exitosamente')
        setConnectionStatus('connected')
      } catch (error) {
        console.error('💥 Error de conexión:', error)
        setConnectionStatus('disconnected')
        toast({
          title: 'Error de conexión',
          description: 'No se pudo conectar al servidor',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
      }
    }

    console.log('🎯 Ejecutando useEffect inicial del lobby')
    connectToServer()

    // Configurar actualizaciones en tiempo real cada 5 segundos
    const interval = setInterval(() => {
      console.log('🔄 Actualización automática de rooms...')
      loadRooms()
    }, 5000)
    
    return () => {
      console.log('🧹 Limpiando intervalo del lobby')
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    filterAndSortRooms()
  }, [searchTerm, statusFilter, sortBy, rooms])

  const loadRooms = async () => {
    try {
      console.log('🔄 Iniciando carga de rooms...')
      setIsLoading(true)
      
      console.log('📡 Llamando a getRooms()...')
      const response = await getRooms()
      console.log('📥 Respuesta recibida:', response)
      
      if (response.success && response.data) {
        console.log(`✅ Rooms cargados exitosamente: ${response.data.length}`)
        setRooms(response.data)
        setFilteredRooms(response.data)
        setLastUpdate(new Date())
      } else {
        console.log('⚠️ No se pudieron cargar rooms:', response.error)
        setRooms([])
        setFilteredRooms([])
      }
    } catch (error) {
      console.error('💥 Error al cargar rooms:', error)
      setRooms([])
      setFilteredRooms([])
    } finally {
      console.log('🏁 Finalizando carga de rooms')
      setIsLoading(false)
    }
  }

  const filterAndSortRooms = () => {
    let filtered = rooms.filter(room => {
      const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || room.status === statusFilter
      return matchesSearch && matchesStatus
    })

    // Ordenar rooms
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'players':
          return b.players.length - a.players.length
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    setFilteredRooms(filtered)
  }

  const handleJoinRoom = async (roomId: string) => {
    try {
      // Obtener nombre del jugador del localStorage
      const playerName = localStorage.getItem('playerName')
      if (!playerName) {
        toast({
          title: 'Error',
          description: 'No se encontró tu nombre guardado',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
        router.push('/')
        return
      }

      // ✅ NUEVO: Llamar a la API para unirse al room
      const response = await joinRoom(roomId, { playerName })
      
      if (!response.success) {
        throw new Error(response.error || 'Error al unirse al room')
      }

      // ✅ Guardar datos del room para este jugador
      localStorage.setItem('roomData', JSON.stringify({
        roomId: roomId,
        playerName: playerName,
        isHost: false,
        playerId: response.data?.player?.id // ✅ Guardar el ID del jugador
      }))

      toast({
        title: '¡Unido exitosamente!',
        description: `Te has unido al room "${response.data?.room?.name}"`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      })

      // Redirigir al room después de unirse exitosamente
      router.push(`/room/${roomId}`)
      
    } catch (error) {
      console.error('Error uniéndose al room:', error)
      toast({
        title: 'Error al unirse',
        description: error instanceof Error ? error.message : 'No se pudo unir al room',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  const handleCreateRoom = async () => {
    try {
      // Obtener nombre del jugador guardado
      const playerName = localStorage.getItem('playerName')
      if (!playerName) {
        toast({
          title: 'Error',
          description: 'No se encontró tu nombre guardado',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
        router.push('/')
        return
      }

      // Crear room usando la API (el software decide automáticamente los impostores)
      const response = await createRoom({
        playerName: playerName,
      })

      if (!response.success) {
        throw new Error(response.error || 'Error al crear room')
      }

      // Guardar datos del jugador en localStorage
      localStorage.setItem('playerData', JSON.stringify({
        playerName: playerName,
        isHost: true,
      }))
      
      toast({
        title: '¡Room creado!',
        description: `Room "${playerName}" creado exitosamente`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      onCreateRoomClose()
      createRoomForm.reset()

      // Recargar rooms para mostrar el nuevo
      await loadRooms()

      // Redirigir al room creado
      router.push(`/room/${response.data?.id}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo crear el room',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    try {
      await loadRooms()
      
      toast({
        title: 'Refrescando',
        description: 'Buscando rooms disponibles...',
        status: 'info',
        duration: 1000,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo refrescar la lista',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'green'
      case 'playing':
        return 'blue'
      case 'finished':
        return 'gray'
      default:
        return 'gray'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'Esperando'
      case 'playing':
        return 'Jugando'
      case 'finished':
        return 'Terminado'
      default:
        return 'Desconocido'
    }
  }

  const formatTimeAgo = (date: Date | string) => {
    // Convertir string a Date si es necesario
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    // Verificar que la fecha sea válida
    if (isNaN(dateObj.getTime())) {
      return 'Fecha desconocida'
    }
    
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Ahora mismo'
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)}h`
    return `Hace ${Math.floor(diffInMinutes / 1440)}d`
  }

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi color="green" size={16} />
      case 'connecting':
        return <Spinner size="sm" color="yellow.500" />
      case 'disconnected':
        return <WifiOff color="red" size={16} />
    }
  }

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Conectado'
      case 'connecting':
        return 'Conectando...'
      case 'disconnected':
        return 'Desconectado'
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Box textAlign="center">
            <Heading size="xl" color="brand.600" mb={2} display="flex" alignItems="center" justifyContent="center" gap={3}>
              <Globe size={30} />
              🏠 Lobby Global
              <Globe size={30} />
            </Heading>
            <Text color="gray.600" fontSize="lg">
              Encuentra un room para jugar o crea uno nuevo
            </Text>
          </Box>
        </MotionBox>

        {/* Estado de conexión */}
        <MotionBox
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Box p={4} bg="white" borderRadius="lg" shadow="sm" border="1px" borderColor="gray.200">
            <HStack justify="center" spacing={3}>
              {getConnectionIcon()}
              <Text fontSize="sm" fontWeight="medium" color={connectionStatus === 'connected' ? 'green.600' : connectionStatus === 'connecting' ? 'yellow.600' : 'red.600'}>
                {getConnectionText()}
              </Text>
              {connectionStatus === 'connected' && (
                <Text fontSize="xs" color="gray.500">
                  • Actualizaciones en tiempo real cada 5 segundos
                </Text>
              )}
            </HStack>
          </Box>
        </MotionBox>

        {/* Controles */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Box p={6} bg="white" borderRadius="lg" shadow="md">
            <VStack spacing={4}>
              {/* Barra de búsqueda y filtros */}
              <HStack spacing={4} w="full" flexWrap="wrap">
                <InputGroup flex={1} minW="300px">
                  <InputLeftElement>
                    <Search size={20} />
                  </InputLeftElement>
                  <Input
                    placeholder="Buscar rooms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    _focus={{
                      borderColor: 'brand.500',
                      boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
                    }}
                  />
                </InputGroup>
                
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  w="200px"
                >
                  <option value="all">Todos los estados</option>
                  <option value="waiting">Esperando</option>
                  <option value="playing">Jugando</option>
                  <option value="finished">Terminados</option>
                </Select>

                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  w="180px"
                >
                  <option value="recent">Más recientes</option>
                  <option value="players">Más jugadores</option>
                  <option value="name">Por nombre</option>
                </Select>

                <Tooltip label="Refrescar rooms">
                  <IconButton
                    aria-label="Refrescar"
                    icon={<RefreshCw />}
                    onClick={handleRefresh}
                    variant="outline"
                    isLoading={isRefreshing}
                    colorScheme="brand"
                  />
                </Tooltip>
              </HStack>

              {/* Botón crear room */}
              <MotionButton
                colorScheme="brand"
                leftIcon={<Plus />}
                onClick={onCreateRoomOpen}
                w="full"
                size="lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                bgGradient="linear(to-r, brand.500, brand.600)"
                _hover={{
                  bgGradient: "linear(to-r, brand.600, brand.700)",
                  transform: "translateY(-2px)",
                  boxShadow: "lg",
                }}
              >
                Crear Nuevo Room
              </MotionButton>
            </VStack>
          </Box>
        </MotionBox>

        {/* Lista de rooms */}
        <AnimatePresence>
          {isLoading ? (
            <MotionBox
              key="loading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <Box p={8} bg="white" borderRadius="lg" shadow="md" textAlign="center">
                <VStack spacing={4}>
                  <Spinner size="xl" color="brand.500" />
                  <Text color="gray.600" fontSize="lg">
                    Cargando rooms disponibles...
                  </Text>
                </VStack>
              </Box>
            </MotionBox>
          ) : filteredRooms.length === 0 ? (
            <MotionBox
              key="no-rooms"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <Box p={8} bg="white" borderRadius="lg" shadow="md" textAlign="center">
                <VStack spacing={4}>
                  <Box display="flex" alignItems="center" justifyContent="center" gap={3}>
                    <Gamepad2 size={40} color="#718096" />
                    <Sparkles size={30} color="#718096" />
                  </Box>
                  <Text color="gray.500" fontSize="lg">
                    No hay rooms disponibles en este momento
                  </Text>
                  <Text color="gray.400" fontSize="md">
                    ¡Sé el primero en crear un room y empezar a jugar!
                  </Text>
                  <MotionButton
                    colorScheme="brand"
                    leftIcon={<Plus />}
                    onClick={onCreateRoomOpen}
                    size="md"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Crear Primer Room
                  </MotionButton>
                </VStack>
              </Box>
            </MotionBox>
          ) : (
            <VStack spacing={4} align="stretch">
              {filteredRooms.map((room, index) => (
                <MotionCard
                  key={room.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  shadow="md"
                  _hover={{ shadow: 'lg' }}
                  whileHover={{ y: -2 }}
                >
                  <CardBody>
                    <HStack justify="space-between" align="start">
                      <VStack align="start" spacing={3} flex={1}>
                        <HStack spacing={3}>
                          <Heading size="md" color="brand.600">
                            {room.name}
                          </Heading>
                          <Badge colorScheme={getStatusColor(room.status)}>
                            {getStatusText(room.status)}
                          </Badge>
                        </HStack>
                        
                        <HStack spacing={6} color="gray.600" fontSize="sm">
                          <HStack spacing={2}>
                            <Users size={16} />
                            <Text>{room.players.length} / {room.maxPlayers} jugadores</Text>
                          </HStack>
                          <HStack spacing={2}>
                            <Clock size={16} />
                            <Text>{formatTimeAgo(room.createdAt)}</Text>
                          </HStack>
                        </HStack>

                        {/* Jugadores */}
                        <Box>
                          <Text fontSize="sm" color="gray.500" mb={2} display="flex" alignItems="center" gap={2}>
                            <UserCheck size={14} />
                            Jugadores:
                          </Text>
                          <HStack spacing={2} flexWrap="wrap">
                            {room.players.map((player) => (
                              <HStack key={player.id} spacing={1}>
                                <Avatar size="xs" name={player.name} />
                                <Text fontSize="sm" fontWeight="medium">
                                  {player.name}
                                </Text>
                                {player.isHost && (
                                  <Crown size={12} color="gold" />
                                )}
                              </HStack>
                            ))}
                          </HStack>
                        </Box>
                      </VStack>

                      <VStack spacing={3} align="end">
                        <MotionButton
                          colorScheme="brand"
                          size="sm"
                          onClick={() => handleJoinRoom(room.id)}
                          isDisabled={room.status !== 'waiting'}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {room.status === 'waiting' ? 'Unirse' : 'Ver'}
                        </MotionButton>
                        
                        {room.status === 'waiting' && room.players.length < room.maxPlayers && (
                          <Text fontSize="xs" color="green.500" display="flex" alignItems="center" gap={1}>
                            <TrendingUp size={12} />
                            Espacios disponibles
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                  </CardBody>
                </MotionCard>
              ))}
            </VStack>
          )}
        </AnimatePresence>

        {/* Estadísticas */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Box p={4} bg="gray.50" borderRadius="lg" textAlign="center">
            <Text fontSize="sm" color="gray.600">
              Mostrando {filteredRooms.length} de {rooms.length} rooms disponibles
            </Text>
          </Box>
        </MotionBox>

        {/* Componente de prueba de limpieza */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <RoomCleanupTest />
        </MotionBox>
      </VStack>

      {/* Componente de debug */}
      <LobbyDebug
        connectionStatus={connectionStatus}
        isLoading={isLoading}
        roomsCount={rooms.length}
        filteredRoomsCount={filteredRooms.length}
        lastUpdate={lastUpdate}
      />

      {/* Modal para crear room */}
      <Modal isOpen={isCreateRoomOpen} onClose={onCreateRoomClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader display="flex" alignItems="center" gap={2}>
            <Gamepad2 size={24} />
            Crear Nuevo Room
          </ModalHeader>
          <ModalCloseButton />
          <Box as="form" onSubmit={createRoomForm.handleSubmit(handleCreateRoom)}>
            <ModalBody>
              <VStack spacing={4}>
                {/* Información sobre el room que se creará */}
                <Box p={4} bg="green.50" borderRadius="lg" border="1px" borderColor="green.200">
                  <VStack spacing={2} align="start">
                    <Text fontSize="sm" color="green.700" fontWeight="semibold">
                      ℹ️ Información del Room
                    </Text>
                    <Text fontSize="sm" color="green.600">
                      • Nombre: Se usará tu nombre guardado
                    </Text>
                    <Text fontSize="sm" color="green.600">
                      • Máximo: 15 jugadores
                    </Text>
                    <Text fontSize="sm" color="green.600">
                      • Estado: Esperando jugadores
                    </Text>
                  </VStack>
                </Box>

                {/* Información sobre el juego simplificado */}
                <Box p={4} bg="blue.50" borderRadius="lg" border="1px" borderColor="blue.200">
                  <VStack spacing={2} align="start">
                    <Text fontSize="sm" color="blue.700" fontWeight="semibold">
                      ℹ️ ¿Cómo funciona?
                    </Text>
                    <Text fontSize="sm" color="blue.600">
                      • El software asigna automáticamente los impostores
                    </Text>
                    <Text fontSize="sm" color="blue.600">
                      • Sin límites de tiempo ni rondas
                    </Text>
                    <Text fontSize="sm" color="blue.600">
                      • Solo generamos palabras para que juegues
                    </Text>
                  </VStack>
                </Box>
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onCreateRoomClose}>
                Cancelar
              </Button>
              <MotionButton
                type="submit"
                colorScheme="brand"
                isLoading={createRoomForm.formState.isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Crear Room
              </MotionButton>
            </ModalFooter>
          </Box>
        </ModalContent>
      </Modal>
    </Container>
  )
}
