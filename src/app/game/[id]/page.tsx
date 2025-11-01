'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Box, Container, VStack, HStack, Heading, Text, Button, Card, CardBody, Badge, Avatar, useToast, Progress, IconButton, Tooltip, Spinner, Center, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Select, FormControl, FormLabel, FormHelperText } from '@chakra-ui/react'
import { Users, Crown, Play, Settings, Share2, Copy, Check, Gamepad2, Sparkles, Timer, UserPlus, ArrowRight, Star, Zap, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { Room, Player, Theme } from '@/types/game'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getRoom, updateRoom } from '@/lib/api'

const MotionCard = motion(Card)
const MotionBox = motion(Box)
const MotionButton = motion(Button)

// Schema para cambiar tema
const changeThemeSchema = z.object({
  theme: z.string().min(1, 'Debes seleccionar un tema'),
})

type ChangeThemeFormData = z.infer<typeof changeThemeSchema>

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

export default function GamePage() {
  const router = useRouter()
  const params = useParams()
  const gameId = params.id as string
  const toast = useToast()
  const { isOpen: isChangeThemeModalOpen, onOpen: onChangeThemeModalOpen, onClose: onChangeThemeModalClose } = useDisclosure()
  
  const [isLoading, setIsLoading] = useState(true)
  const [roomData, setRoomData] = useState<Room | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [showWord, setShowWord] = useState(false)
  const [currentWord, setCurrentWord] = useState('')
  const [isGeneratingWord, setIsGeneratingWord] = useState(false)
  const [isChangingTheme, setIsChangingTheme] = useState(false)

  const changeThemeForm = useForm<ChangeThemeFormData>({
    resolver: zodResolver(changeThemeSchema),
    defaultValues: {
      theme: '',
    }
  })

  useEffect(() => {
    initializeGame()
  }, [gameId])

  // Configurar actualizaciones en tiempo real
  useEffect(() => {
    if (!roomData) return

    // Actualizar room cada 3 segundos para ver cambios en tiempo real
    const interval = setInterval(async () => {
      try {
        const roomResponse = await getRoom(gameId)
        if (roomResponse.success && roomResponse.data) {
          setRoomData(roomResponse.data)
          // Actualizar palabra si cambió
          if (roomResponse.data.currentWord !== currentWord) {
            setCurrentWord(roomResponse.data.currentWord || '')
            setShowWord(false) // Ocultar palabra inicialmente
          }
        }
      } catch (error) {
        console.error('Error al actualizar room:', error)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [roomData, gameId, currentWord])

  const initializeGame = async () => {
    try {
      setIsLoading(true)
      
      // Obtener datos del room desde localStorage
      const storedRoomData = localStorage.getItem('roomData')
      if (!storedRoomData) {
        toast({
          title: 'Error',
          description: 'No se encontraron datos del room',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
        router.push('/')
        return
      }

      const parsedData = JSON.parse(storedRoomData)
      
      // Obtener el room desde la API
      const roomResponse = await getRoom(gameId)
      if (!roomResponse.success || !roomResponse.data) {
        throw new Error(roomResponse.error || 'Room no encontrado')
      }

      const room = roomResponse.data
      
      // Verificar si el jugador está en el room
      const player = room.players.find(p => p.name === parsedData.playerName)
      if (!player) {
        throw new Error('No estás en este room')
      }

      setRoomData(room)
      setCurrentPlayer(player)
      
      // Obtener la palabra actual del jugador
      if (room.currentTheme && room.currentWord) {
        setCurrentWord(room.currentWord)
      }
      
      toast({
        title: '¡Juego iniciado!',
        description: 'Tu palabra está lista',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo cargar el juego',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewWord = async () => {
    if (!roomData || !currentPlayer) return
    
    try {
      setIsGeneratingWord(true)
      
      // Generar nueva palabra automáticamente usando la API
      const response = await fetch(`/api/rooms/${gameId}/generate-word`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          themeId: roomData.currentTheme,
        }),
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Error al generar nueva palabra')
      }

      // Actualizar estado local
      setRoomData(data.room)
      setCurrentWord(data.word)
      setShowWord(false) // Ocultar palabra inicialmente
      
      toast({
        title: '¡Nueva palabra generada!',
        description: 'La palabra ha sido actualizada para todos los jugadores',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo generar nueva palabra',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsGeneratingWord(false)
    }
  }

  const handleChangeTheme = async (data: ChangeThemeFormData) => {
    if (!roomData || !currentPlayer) return
    
    try {
      setIsChangingTheme(true)
      
      // Cambiar tema usando la API
      const response = await fetch(`/api/rooms/${gameId}/change-theme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          themeId: data.theme,
        }),
      })

      const responseData = await response.json()
      
      if (!responseData.success) {
        throw new Error(responseData.error || 'Error al cambiar tema')
      }

      // Actualizar estado local
      setRoomData(responseData.room)
      setCurrentWord('') // Limpiar palabra actual
      setShowWord(false) // Ocultar palabra
      
      toast({
        title: '¡Tema cambiado!',
        description: 'El tema ha sido actualizado y se han limpiado las palabras jugadas',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo cambiar el tema',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsChangingTheme(false)
      onChangeThemeModalClose()
    }
  }

  const toggleWordVisibility = () => {
    setShowWord(!showWord)
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
              Iniciando juego...
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
              Error: No se pudo cargar el juego
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
        {/* Header del Juego */}
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
                    Juego en Progreso
                  </Heading>
                  <Text color="gray.600" fontSize="lg">
                    Room: {roomData.name}
                  </Text>
                </VStack>
              </HStack>

              <HStack spacing={6} color="gray.600" fontSize="sm">
                <HStack spacing={2}>
                  <Users size={16} />
                  <Text>{roomData.players.length} jugadores</Text>
                </HStack>
                {roomData.currentTheme && (
                  <HStack spacing={2}>
                    <Sparkles size={16} />
                    <Text>Tema: {getThemeName(roomData.currentTheme)}</Text>
                  </HStack>
                )}
              </HStack>
            </VStack>
          </Box>
        </MotionBox>

        {/* Palabra del Jugador */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Box p={8} bg="green.50" borderRadius="xl" shadow="lg" border="1px" borderColor="green.200">
            <VStack spacing={6}>
              <Heading size="lg" color="green.700" display="flex" alignItems="center" gap={2}>
                <Eye size={24} />
                Tu Palabra
              </Heading>

              {currentWord ? (
                <VStack spacing={4}>
                  <Box p={6} bg="white" borderRadius="lg" shadow="md" w="full" textAlign="center">
                    <VStack spacing={4}>
                      <Text fontSize="lg" color="gray.600">
                        Tema: {getThemeName(roomData.currentTheme || '')}
                      </Text>
                      
                      <Box p={4} bg="green.100" borderRadius="lg" border="1px" borderColor="green.300">
                        <Text fontSize="2xl" fontWeight="bold" color="green.800">
                          {showWord ? currentWord : '••••••••'}
                        </Text>
                      </Box>
                      
                      <MotionButton
                        colorScheme="green"
                        leftIcon={showWord ? <EyeOff size={20} /> : <Eye size={20} />}
                        onClick={toggleWordVisibility}
                        size="lg"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {showWord ? 'Ocultar Palabra' : 'Mostrar Palabra'}
                      </MotionButton>
                    </VStack>
                  </Box>
                </VStack>
              ) : (
                <Box p={6} bg="white" borderRadius="lg" shadow="md" w="full" textAlign="center">
                  <VStack spacing={4}>
                    <Text fontSize="lg" color="gray.600">
                      No hay palabra asignada
                    </Text>
                    <Text fontSize="md" color="gray.500">
                      El host debe generar una nueva palabra
                    </Text>
                  </VStack>
                </Box>
              )}

              {/* Controles del Host */}
              {currentPlayer.isHost && (
                <VStack spacing={4} w="full">
                  <Heading size="md" color="brand.600" display="flex" alignItems="center" gap={2}>
                    <Crown size={20} />
                    Controles del Host
                  </Heading>
                  
                  <HStack spacing={4} w="full" justify="center">
                    <MotionButton
                      colorScheme="brand"
                      leftIcon={<RefreshCw />}
                      onClick={handleNewWord}
                      isLoading={isGeneratingWord}
                      size="lg"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isGeneratingWord ? 'Generando...' : 'Generar Nueva Palabra'}
                    </MotionButton>

                    <MotionButton
                      colorScheme="orange"
                      leftIcon={<Sparkles />}
                      onClick={onChangeThemeModalOpen}
                      size="lg"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cambiar Tema
                    </MotionButton>
                  </HStack>
                </VStack>
              )}
            </VStack>
          </Box>
        </MotionBox>

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
                Jugadores en el Juego ({roomData.players.length})
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
                                {/* NO MOSTRAR SI ES IMPOSTOR O INOCENTE - ES SECRETO */}
                                <Badge colorScheme="gray" size="sm">
                                  Jugador
                                </Badge>
                              </HStack>
                              <Text fontSize="sm" color="gray.500">
                                {player.isHost ? 'Creador del room' : 'Jugador'}
                              </Text>
                            </VStack>
                          </HStack>

                          <HStack spacing={2}>
                            <Box w={2} h={2} bg="green.500" borderRadius="full" />
                            <Text fontSize="sm" color="green.600" fontWeight="medium">
                              En juego
                            </Text>
                          </HStack>
                        </HStack>
                      </CardBody>
                    </MotionCard>
                  ))}
                </AnimatePresence>
              </Box>
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
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/room/${gameId}`
                    navigator.clipboard.writeText(shareUrl)
                    toast({
                      title: '¡Enlace copiado!',
                      description: 'El enlace del room ha sido copiado al portapapeles',
                      status: 'success',
                      duration: 3000,
                      isClosable: true,
                    })
                  }}
                  size="md"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Compartir Room
                </MotionButton>

                <MotionButton
                  variant="ghost"
                  colorScheme="gray"
                  leftIcon={<ArrowRight />}
                  onClick={() => router.push(`/room/${gameId}`)}
                  size="md"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Volver al Room
                </MotionButton>
              </HStack>
            </VStack>
          </Box>
        </MotionBox>
      </VStack>

      {/* Modal para cambiar tema */}
      <Modal isOpen={isChangeThemeModalOpen} onClose={onChangeThemeModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader display="flex" alignItems="center" gap={2}>
            <Sparkles size={24} />
            Cambiar Tema del Juego
          </ModalHeader>
          <ModalCloseButton />
          <Box as="form" onSubmit={changeThemeForm.handleSubmit(handleChangeTheme)}>
            <ModalBody>
              <VStack spacing={6}>
                <FormControl isInvalid={!!changeThemeForm.formState.errors.theme}>
                  <FormLabel>Nuevo Tema de Palabras</FormLabel>
                  <Select
                    placeholder="Selecciona un nuevo tema"
                    {...changeThemeForm.register('theme')}
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
                    Al cambiar el tema se limpiará el historial de palabras jugadas
                  </FormHelperText>
                </FormControl>

                {/* Información sobre el cambio de tema */}
                <Box p={4} bg="orange.50" borderRadius="lg" border="1px" borderColor="orange.200">
                  <VStack spacing={2} align="start">
                    <Text fontSize="sm" color="orange.700" fontWeight="semibold">
                      ⚠️ ¿Qué pasa al cambiar el tema?
                    </Text>
                    <Text fontSize="sm" color="orange.600">
                      • Se limpiará el historial de palabras jugadas
                    </Text>
                    <Text fontSize="sm" color="orange.600">
                      • Se podrán usar todas las palabras del nuevo tema
                    </Text>
                    <Text fontSize="sm" color="orange.600">
                      • La palabra actual se eliminará
                    </Text>
                  </VStack>
                </Box>
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onChangeThemeModalClose}>
                Cancelar
              </Button>
              <MotionButton
                type="submit"
                colorScheme="orange"
                isLoading={isChangingTheme}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isChangingTheme ? 'Cambiando...' : 'Cambiar Tema'}
              </MotionButton>
            </ModalFooter>
          </Box>
        </ModalContent>
      </Modal>
    </Container>
  )
}
