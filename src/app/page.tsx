'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Container, VStack, HStack, Heading, Text, Button, Input, FormControl, FormLabel, FormErrorMessage, useToast } from '@chakra-ui/react'
import { Gamepad2, User, Plus, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createRoom } from '@/lib/api'

const MotionBox = motion(Box)
const MotionButton = motion(Button)

// Schema para el formulario
const playerSchema = z.object({
  playerName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(20, 'El nombre no puede exceder 20 caracteres'),
})

type PlayerFormData = z.infer<typeof playerSchema>

export default function HomePage() {
  const router = useRouter()
  const toast = useToast()
  const [savedPlayerName, setSavedPlayerName] = useState<string>('')
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)

  const form = useForm<PlayerFormData>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      playerName: '',
    }
  })

  // Cargar nombre guardado al iniciar
  useEffect(() => {
    const storedName = localStorage.getItem('playerName')
    if (storedName) {
      setSavedPlayerName(storedName)
      form.setValue('playerName', storedName)
    }
  }, [])

  const handleSaveName = (data: PlayerFormData) => {
    // Guardar nombre en localStorage
    localStorage.setItem('playerName', data.playerName)
    setSavedPlayerName(data.playerName)
    
    toast({
      title: '¡Nombre guardado!',
      description: `Tu nombre "${data.playerName}" ha sido guardado`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    })
  }

  const handleCreateRoom = async () => {
    if (!savedPlayerName) {
      toast({
        title: 'Nombre requerido',
        description: 'Debes guardar tu nombre primero',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    try {
      setIsCreatingRoom(true)
      
      // Crear room usando la función de la API
      const response = await createRoom({
        playerName: savedPlayerName,
      })
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Error al crear room')
      }

      // Guardar datos del room en localStorage
      localStorage.setItem('roomData', JSON.stringify({
        roomId: response.data.id,
        playerName: savedPlayerName,
        isHost: true,
      }))

      toast({
        title: '¡Room creado!',
        description: `Room "${response.data.name}" creado exitosamente`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      // Redirigir directamente al room creado
      router.push(`/room/${response.data.id}`)
      
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo crear el room',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsCreatingRoom(false)
    }
  }

  const handleSearchRoom = () => {
    if (!savedPlayerName) {
      toast({
        title: 'Nombre requerido',
        description: 'Debes guardar tu nombre primero',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return
    }
    
    router.push('/lobby')
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header Principal */}
        <MotionBox
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          textAlign="center"
        >
          <VStack spacing={6}>
            <Box p={4} bg="brand.100" borderRadius="full" display="inline-block">
              <Gamepad2 size={60} color="#6366F1" />
            </Box>
            <VStack spacing={4}>
              <Heading size="2xl" color="brand.600">
                🎮 Juego del Impostor
              </Heading>
              <Text fontSize="xl" color="gray.600" maxW="2xl">
                Encuentra al impostor entre tus amigos. ¿Podrás descubrir quién está mintiendo?
              </Text>
            </VStack>
          </VStack>
        </MotionBox>

        {/* Nombre del Jugador Guardado */}
        {savedPlayerName && (
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Box p={6} bg="white" borderRadius="xl" shadow="lg" border="1px" borderColor="gray.200">
              <VStack spacing={4}>
                <Heading size="lg" color="brand.600" display="flex" alignItems="center" gap={2}>
                  <User size={24} />
                  ¡Bienvenido de vuelta!
                </Heading>

                <Box p={4} bg="green.50" borderRadius="lg" border="1px" borderColor="green.200">
                  <HStack justify="space-between" align="center">
                    <VStack align="start" spacing={1}>
                      <Text fontSize="lg" color="green.700" fontWeight="semibold">
                        Tu nombre: {savedPlayerName}
                      </Text>
                      <Text fontSize="sm" color="green.600">
                        Guardado en tu dispositivo
                      </Text>
                    </VStack>
                  </HStack>
                </Box>

                {/* Botones de Acción */}
                <VStack spacing={4} pt={4}>
                  <MotionButton
                    colorScheme="brand"
                    size="lg"
                    w="full"
                    leftIcon={<Plus />}
                    onClick={handleCreateRoom}
                    isLoading={isCreatingRoom}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    bgGradient="linear(to-r, brand.500, brand.600)"
                    _hover={{
                      bgGradient: "linear(to-r, brand.600, brand.700)",
                      transform: "translateY(-2px)",
                      boxShadow: "xl",
                    }}
                  >
                    {isCreatingRoom ? 'Creando...' : 'Crear Room'}
                  </MotionButton>

                  <MotionButton
                    variant="outline"
                    colorScheme="brand"
                    size="lg"
                    w="full"
                    leftIcon={<Search />}
                    onClick={handleSearchRoom}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    _hover={{
                      transform: "translateY(-2px)",
                      boxShadow: "lg",
                    }}
                  >
                    Buscar Room
                  </MotionButton>

                  <MotionButton
                    variant="ghost"
                    colorScheme="brand"
                    size="lg"
                    w="full"
                    onClick={() => router.push('/local')}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Jugar en Modo Local (sin conexión)
                  </MotionButton>
                </VStack>
              </VStack>
            </Box>
          </MotionBox>
        )}

        {/* Formulario Principal */}
        {!savedPlayerName && (
          <MotionBox
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Box p={8} bg="white" borderRadius="xl" shadow="xl" border="1px" borderColor="gray.200">
              <VStack spacing={6}>
                <Heading size="lg" color="brand.600" display="flex" alignItems="center" gap={2}>
                  <User size={24} />
                  ¡Comienza a Jugar!
                </Heading>

                <Box as="form" onSubmit={form.handleSubmit(handleSaveName)} w="full">
                  <VStack spacing={6} align="stretch">
                    {/* Nombre del Jugador */}
                    <FormControl isInvalid={!!form.formState.errors.playerName}>
                      <FormLabel fontSize="lg" fontWeight="semibold" color="gray.700">
                        Tu Nombre
                      </FormLabel>
                      <Input
                        size="lg"
                        placeholder="Ingresa tu nombre"
                        {...form.register('playerName')}
                        _focus={{
                          borderColor: 'brand.500',
                          boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
                        }}
                      />
                      <FormErrorMessage>
                        {form.formState.errors.playerName?.message}
                      </FormErrorMessage>
                    </FormControl>

                    {/* Botón de Acción */}
                    <VStack spacing={4} pt={4}>
                      <MotionButton
                        type="submit"
                        colorScheme="brand"
                        size="lg"
                        w="full"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        bgGradient="linear(to-r, brand.500, brand.600)"
                        _hover={{
                          bgGradient: "linear(to-r, brand.600, brand.700)",
                          transform: "translateY(-2px)",
                          boxShadow: "xl",
                        }}
                      >
                        Guardar Nombre
                      </MotionButton>
                    </VStack>
                  </VStack>
                </Box>
              </VStack>
            </Box>
          </MotionBox>
        )}
      </VStack>
    </Container>
  )
}
