'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Box, Container, VStack, HStack, Heading, Text, Button, Card, CardBody, Badge, Avatar, useToast, Progress, IconButton, Tooltip, Spinner, Center, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Select, FormControl, FormLabel, FormHelperText } from '@chakra-ui/react'
import { Users, Crown, Play, Settings, Share2, Copy, Check, Gamepad2, Sparkles, Timer, UserPlus, ArrowRight, Star, Zap, Wifi, RefreshCw, Clock } from 'lucide-react'
import { Room, Player, Theme } from '@/types/game'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getRoom, joinRoom, updateRoom } from '@/lib/api'
import { useGameCommunication } from '@/hooks/useGameCommunication'

const MotionCard = motion(Card)
const MotionBox = motion(Box)
const MotionButton = motion(Button)

// Schema para configurar el juego
const gameConfigSchema = z.object({
  theme: z.string().min(1, 'Debes seleccionar un tema'),
})

type GameConfigFormData = z.infer<typeof gameConfigSchema>

// Temas disponibles
const availableThemes: Theme[] = [
  {
    id: 'animals',
    name: '🐾 Animales',
    words: ['León', 'Tigre', 'Elefante', 'Jirafa', 'Cebra', 'Mono', 'Pingüino', 'Delfín', 'Águila', 'Serpiente']
  },
  {
    id: 'food',
    name: '🍕 Comida',
    words: ['Pizza', 'Hamburguesa', 'Sushi', 'Pasta', 'Ensalada', 'Helado', 'Chocolate', 'Manzana', 'Naranja', 'Plátano']
  },
  {
    id: 'colors',
    name: '🎨 Colores',
    words: ['Rojo', 'Azul', 'Verde', 'Amarillo', 'Morado', 'Naranja', 'Rosa', 'Negro', 'Blanco', 'Gris']
  },
  {
    id: 'jobs',
    name: '💼 Profesiones',
    words: ['Doctor', 'Profesor', 'Ingeniero', 'Artista', 'Chef', 'Policía', 'Bombero', 'Piloto', 'Veterinario', 'Músico']
  },
  {
    id: 'sports',
    name: '⚽ Deportes',
    words: ['Fútbol', 'Baloncesto', 'Tenis', 'Natación', 'Atletismo', 'Boxeo', 'Golf', 'Voleibol', 'Hockey', 'Rugby']
  },
  {
    id: 'countries',
    name: '🌍 Países',
    words: ['México', 'España', 'Francia', 'Japón', 'Brasil', 'Canadá', 'Australia', 'Italia', 'Alemania', 'China']
  }
]

export default function RoomPage() {
  const router = useRouter()
  const params = useParams()
  const roomId = params.id as string
  const toast = useToast()
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure()
  const { isOpen: isThemeModalOpen, onOpen: onThemeModalOpen, onClose: onThemeModalClose } = useDisclosure()
  
  const [isStartingGame, setIsStartingGame] = useState(false)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)

  const gameConfigForm = useForm<GameConfigFormData>({
    resolver: zodResolver(gameConfigSchema),
    defaultValues: {
      theme: '',
    }
  })

  // Estado local para el jugador actual
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('')
  const [currentPlayerIsHost, setCurrentPlayerIsHost] = useState<boolean>(false)

  // Usar el nuevo hook de comunicación del juego
  const {
    roomData,
    playerGameState,
    isLoading,
    error,
    lastUpdate,
    startGame,
    generateNewWord,
    changeTheme,
    nextRound,
    refreshData,
    clearError,
    currentPlayer: hookCurrentPlayer,
    isHost,
    currentPhase,
    playerWord,
    isConnected,
  } = useGameCommunication({
    roomId,
    playerId: currentPlayerId,
    isHost: currentPlayerIsHost,
  })

  // Inicializar el jugador cuando se carga el room
  useEffect(() => {
    if (roomData && !currentPlayer) {
      const storedRoomData = localStorage.getItem('roomData')
      const playerName = localStorage.getItem('playerName')
      
      if (storedRoomData && playerName) {
        const parsedData = JSON.parse(storedRoomData)
        const player = roomData.players.find(p => p.name === playerName)
        
        if (player) {
          setCurrentPlayer(player)
          setCurrentPlayerId(player.id)
          setCurrentPlayerIsHost(player.isHost)
        }
      }
    }
  }, [roomData, currentPlayer])

  // Inicializar la conexión del jugador cuando se carga el componente
  useEffect(() => {
    initializePlayerConnection()
  }, [roomId])

  // Mostrar errores del hook
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      clearError()
    }
  }, [error, toast, clearError])

  // Función para inicializar la conexión del jugador
  const initializePlayerConnection = async () => {
    try {
      const storedRoomData = localStorage.getItem('roomData')
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

      // Si no hay roomData, el jugador debe unirse primero
      if (!storedRoomData) {
        toast({
          title: 'Error',
          description: 'No tienes acceso a este room. Regresa al lobby para unirte.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
        router.push('/lobby')
        return
      }

      const parsedData = JSON.parse(storedRoomData)
      
      // Verificar que el roomId coincida
      if (parsedData.roomId !== roomId) {
        toast({
          title: 'Error',
          description: 'No tienes acceso a este room',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
        router.push('/lobby')
        return
      }

      // ✅ NUEVO: Si no hay playerId, intentar unirse al room
      if (!parsedData.playerId) {
        try {
          const response = await joinRoom(roomId, { playerName })
          if (response.success && response.data?.player) {
            // Actualizar localStorage con el playerId
            localStorage.setItem('roomData', JSON.stringify({
              ...parsedData,
              playerId: response.data.player.id
            }))
            
            // Establecer el jugador actual
            setCurrentPlayer(response.data.player)
            setCurrentPlayerId(response.data.player.id)
            setCurrentPlayerIsHost(response.data.player.isHost)
            
            toast({
              title: '¡Unido exitosamente!',
              description: 'Te has unido al room',
              status: 'success',
              duration: 2000,
              isClosable: true,
            })
            return
          }
        } catch (joinError) {
          console.error('Error uniéndose al room:', joinError)
          toast({
            title: 'Error al unirse',
            description: 'No se pudo unir al room. Regresa al lobby.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          })
          router.push('/lobby')
          return
        }
      }
      
      // Buscar el jugador en el room usando el playerId o nombre
      if (roomData) {
        const player = parsedData.playerId 
          ? roomData.players.find(p => p.id === parsedData.playerId)
          : roomData.players.find(p => p.name === playerName)
          
        if (player) {
          setCurrentPlayer(player)
          setCurrentPlayerId(player.id)
          setCurrentPlayerIsHost(player.isHost)
        } else {
          // ✅ NUEVO: Si el jugador no está en el room, intentar unirse
          toast({
            title: 'Jugador no encontrado',
            description: 'Intentando unirse al room...',
            status: 'info',
            duration: 2000,
            isClosable: true,
          })
          
          try {
            const response = await joinRoom(roomId, { playerName })
            if (response.success && response.data?.player) {
              setCurrentPlayer(response.data.player)
              setCurrentPlayerId(response.data.player.id)
              setCurrentPlayerIsHost(response.data.player.isHost)
              
              // Actualizar localStorage
              localStorage.setItem('roomData', JSON.stringify({
                ...parsedData,
                playerId: response.data.player.id
              }))
            }
          } catch (error) {
            toast({
              title: 'Error al unirse',
              description: 'No se pudo unir al room',
              status: 'error',
              duration: 3000,
              isClosable: true,
            })
            router.push('/lobby')
          }
        }
      }
      
    } catch (error) {
      console.error('Error al inicializar conexión:', error)
      toast({
        title: 'Error',
        description: 'Error al inicializar la conexión',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      router.push('/')
    }
  }

  // Efecto para manejar cuando roomData cambia y establecer el playerId
  useEffect(() => {
    if (roomData && !currentPlayerId) {
      const playerName = localStorage.getItem('playerName')
      if (playerName) {
        const player = roomData.players.find(p => p.name === playerName)
        if (player) {
          setCurrentPlayer(player)
          setCurrentPlayerId(player.id)
          setCurrentPlayerIsHost(player.isHost)
        }
      }
    }
  }, [roomData, currentPlayerId])

  const handleStartGame = async (data: GameConfigFormData) => {
    if (!currentPlayer || !isHost) return
    
    try {
      setIsStartingGame(true)
      
      // Usar el nuevo hook para iniciar el juego
      const success = await startGame(data.theme)
      
      if (success) {
        toast({
          title: '¡Juego iniciado!',
          description: 'El juego ha comenzado exitosamente',
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
        
        onThemeModalClose()
      }
      
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo iniciar el juego',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsStartingGame(false)
    }
  }

  const handleShareRoom = async () => {
    try {
      const shareUrl = `${window.location.origin}/room/${roomId}`
      await navigator.clipboard.writeText(shareUrl)
      
      toast({
        title: '¡Enlace copiado!',
        description: 'El enlace del room ha sido copiado al portapapeles',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo copiar el enlace',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  const getThemeName = (themeId: string) => {
    const theme = availableThemes.find(t => t.id === themeId)
    return theme ? theme.name : 'Tema no encontrado'
  }

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={20}>
        <Center>
          <VStack spacing={6}>
            <Spinner size="xl" color="brand.500" />
            <Text fontSize="lg" color="gray.600">
              Conectando al room...
            </Text>
          </VStack>
        </Center>
      </Container>
    )
  }

  if (!roomData || !currentPlayer) {
    return (
      <Container maxW="container.xl" py={20}>
        <Center>
          <VStack spacing={6}>
            <Text fontSize="lg" color="red.500">
              Error: No se pudo cargar el room
            </Text>
            <Button onClick={() => router.push('/')}>
              Volver al inicio
            </Button>
          </VStack>
        </Center>
      </Container>
    )
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header del Room */}
        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Box p={6} bg="white" borderRadius="xl" shadow="lg" border="1px" borderColor="gray.200">
            <VStack spacing={4}>
              <HStack spacing={4} align="center">
                <Box p={3} bg="brand.100" borderRadius="full">
                  <Gamepad2 size={30} color="#6366F1" />
                </Box>
                <VStack align="start" spacing={1}>
                  <Heading size="xl" color="brand.600">
                    {roomData.name}
                  </Heading>
                  <Text color="gray.600" fontSize="lg">
                    Room ID: {roomData.id}
                  </Text>
                </VStack>
              </HStack>

                             <HStack spacing={6} color="gray.600" fontSize="sm">
                 <HStack spacing={2}>
                   <Users size={16} />
                   <Text>{roomData.players.length} / {roomData.maxPlayers} jugadores</Text>
                 </HStack>
                 <HStack spacing={2}>
                   <Star size={16} />
                   <Text>Estado: {roomData.status === 'waiting' ? 'Esperando' : 'Jugando'}</Text>
                 </HStack>
                 <HStack spacing={2}>
                   <Gamepad2 size={16} />
                   <Text>Fase: {currentPhase === 'waiting' ? 'Esperando' : 
                     currentPhase === 'theme_selection' ? 'Selección de Tema' :
                     currentPhase === 'word_generation' ? 'Generando Palabra' :
                     currentPhase === 'playing' ? 'Jugando' :
                     currentPhase === 'discussion' ? 'Discusión' :
                     currentPhase === 'voting' ? 'Votación' :
                     currentPhase === 'round_end' ? 'Fin de Ronda' :
                     currentPhase === 'game_end' ? 'Fin del Juego' : 'Desconocida'}</Text>
                 </HStack>
                 <HStack spacing={2}>
                   <Wifi size={16} />
                   <Text color={isConnected ? 'green.500' : 'red.500'}>
                     {isConnected ? 'Conectado' : 'Desconectado'}
                   </Text>
                 </HStack>
               </HStack>

              {/* Barra de progreso de jugadores */}
              <Box w="full">
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="sm" color="gray.600">
                    Jugadores en el room
                  </Text>
                  <Text fontSize="sm" color="gray.600" fontWeight="semibold">
                    {roomData.players.length}/{roomData.maxPlayers}
                  </Text>
                </HStack>
                <Progress
                  value={(roomData.players.length / roomData.maxPlayers) * 100}
                  colorScheme="brand"
                  borderRadius="full"
                  size="lg"
                />
              </Box>
            </VStack>
          </Box>
        </MotionBox>

        {/* Controles del Host */}
        {isHost && (
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Box p={6} bg="white" borderRadius="xl" shadow="lg" border="1px" borderColor="gray.200">
              <VStack spacing={4}>
                <Heading size="md" color="brand.600" display="flex" alignItems="center" gap={2}>
                  <Crown size={24} />
                  Controles del Host
                </Heading>
                
                <HStack spacing={4} w="full" justify="center">
                  <MotionButton
                    colorScheme="brand"
                    leftIcon={<Play />}
                    onClick={onThemeModalOpen}
                    size="lg"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    bgGradient="linear(to-r, brand.500, brand.600)"
                    _hover={{
                      bgGradient: "linear(to-r, brand.600, brand.700)",
                      transform: "translateY(-2px)",
                      boxShadow: "lg",
                    }}
                  >
                    Iniciar Juego
                  </MotionButton>

                  <MotionButton
                    variant="outline"
                    colorScheme="brand"
                    leftIcon={<Settings />}
                    onClick={onSettingsOpen}
                    size="lg"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Configuración
                  </MotionButton>
                </HStack>
              </VStack>
            </Box>
          </MotionBox>
        )}

        {/* Lista de Jugadores */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Box p={6} bg="white" borderRadius="xl" shadow="lg" border="1px" borderColor="gray.200">
            <VStack spacing={4}>
              <Heading size="md" color="gray.700" display="flex" alignItems="center" gap={2}>
                <Users size={24} />
                Jugadores en el Room
              </Heading>

              <Box w="full">
                <AnimatePresence>
                  {roomData.players.map((player, index) => (
                    <MotionCard
                      key={player.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      mb={3}
                      shadow="sm"
                      _hover={{ shadow: "md" }}
                      whileHover={{ x: 5 }}
                    >
                      <CardBody>
                        <HStack justify="space-between" align="center">
                          <HStack spacing={4}>
                            <Avatar
                              name={player.name}
                              size="md"
                              bg={player.isHost ? 'yellow.500' : 'brand.500'}
                            />
                            <VStack align="start" spacing={1}>
                              <HStack spacing={2}>
                                <Text fontWeight="semibold" fontSize="lg">
                                  {player.name}
                                </Text>
                                {player.isHost && (
                                  <Badge colorScheme="yellow" size="sm" display="flex" alignItems="center" gap={1}>
                                    <Crown size={12} />
                                    Host
                                  </Badge>
                                )}
                              </HStack>
                              <Text fontSize="sm" color="gray.500">
                                {player.isHost ? 'Creador del room' : 'Jugador'}
                              </Text>
                            </VStack>
                          </HStack>

                          <HStack spacing={2}>
                            {player.isHost && (
                              <Tooltip label="Configuración del room">
                                <IconButton
                                  aria-label="Configuración"
                                  icon={<Settings size={16} />}
                                  variant="ghost"
                                  colorScheme="gray"
                                  onClick={onSettingsOpen}
                                />
                              </Tooltip>
                            )}
                          </HStack>
                        </HStack>
                      </CardBody>
                    </MotionCard>
                  ))}
                </AnimatePresence>
              </Box>

              {/* Mensaje para nuevos jugadores */}
              {roomData.players.length < roomData.maxPlayers && (
                <Box p={4} bg="blue.50" borderRadius="lg" border="1px" borderColor="blue.200" w="full">
                  <HStack spacing={3} justify="center">
                    <UserPlus size={20} color="#3182CE" />
                    <Text color="blue.700" fontSize="sm">
                      Comparte el enlace del room para que más jugadores se unan
                    </Text>
                  </HStack>
                </Box>
              )}
            </VStack>
          </Box>
        </MotionBox>

        {/* Acciones del Jugador */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Box p={6} bg="white" borderRadius="xl" shadow="lg" border="1px" borderColor="gray.200">
            <VStack spacing={4}>
              <Heading size="md" color="gray.700" display="flex" alignItems="center" gap={2}>
                <Zap size={24} />
                Acciones Rápidas
              </Heading>
              
              <HStack spacing={4} w="full" justify="center">
                <MotionButton
                  variant="outline"
                  colorScheme="brand"
                  leftIcon={<Share2 />}
                  onClick={handleShareRoom}
                  size="md"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Compartir Room
                </MotionButton>

                                 <MotionButton
                   variant="outline"
                   colorScheme="brand"
                   leftIcon={<RefreshCw />}
                   onClick={refreshData}
                   size="md"
                   whileHover={{ scale: 1.02, y: -2 }}
                   whileTap={{ scale: 0.98 }}
                 >
                   Refrescar
                 </MotionButton>

                 <MotionButton
                   variant="ghost"
                   colorScheme="gray"
                   leftIcon={<ArrowRight />}
                   onClick={() => router.push('/lobby')}
                   size="md"
                   whileHover={{ scale: 1.02, y: -2 }}
                   whileTap={{ scale: 0.98 }}
                 >
                   Volver al Lobby
                 </MotionButton>
              </HStack>
            </VStack>
          </Box>
        </MotionBox>

        {/* Estado de la conexión y última actualización */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <Box p={4} bg="gray.50" borderRadius="lg" textAlign="center">
            <VStack spacing={2}>
              <HStack spacing={4} justify="center">
                <HStack spacing={2}>
                  <Wifi size={16} color={isConnected ? 'green' : 'red'} />
                  <Text fontSize="sm" color={isConnected ? 'green.600' : 'red.600'}>
                    {isConnected ? 'Conectado' : 'Desconectado'}
                  </Text>
                </HStack>
                {lastUpdate && (
                  <HStack spacing={2}>
                    <Clock size={16} />
                    <Text fontSize="sm" color="gray.600">
                      Última actualización: {lastUpdate.toLocaleTimeString()}
                    </Text>
                  </HStack>
                )}
              </HStack>
              <Text fontSize="xs" color="gray.500">
                Actualizaciones automáticas cada 2-3 segundos
              </Text>
            </VStack>
          </Box>
        </MotionBox>
      </VStack>

      {/* Modal de selección de tema */}
      <Modal isOpen={isThemeModalOpen} onClose={onThemeModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader display="flex" alignItems="center" gap={2}>
            <Sparkles size={24} />
            Seleccionar Tema para el Juego
          </ModalHeader>
          <ModalCloseButton />
          <Box as="form" onSubmit={gameConfigForm.handleSubmit(handleStartGame)}>
            <ModalBody>
              <VStack spacing={6}>
                <FormControl isInvalid={!!gameConfigForm.formState.errors.theme}>
                  <FormLabel>Tema de Palabras</FormLabel>
                  <Select
                    placeholder="Selecciona un tema"
                    {...gameConfigForm.register('theme')}
                    _focus={{
                      borderColor: 'brand.500',
                      boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
                    }}
                  >
                    {availableThemes.map(theme => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name} ({theme.words.length} palabras)
                      </option>
                    ))}
                  </Select>
                  <FormHelperText>
                    Elige el tema de palabras para esta partida
                  </FormHelperText>
                </FormControl>

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
              <Button variant="ghost" mr={3} onClick={onThemeModalClose}>
                Cancelar
              </Button>
              <MotionButton
                type="submit"
                colorScheme="brand"
                isLoading={isStartingGame}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isStartingGame ? 'Iniciando...' : 'Iniciar Juego'}
              </MotionButton>
            </ModalFooter>
          </Box>
        </ModalContent>
      </Modal>
    </Container>
  )
}
