'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import themesData from '@/data/themes.json'
import { Box, Button, Container, FormControl, FormLabel, Grid, GridItem, HStack, Heading, Input, Select, Stack, Text, VStack, useToast } from '@chakra-ui/react'
import { motion } from 'framer-motion'

const MotionBox = motion(Box)
const MotionButton = motion(Button)

interface Theme {
  id: string
  name: string
  words: string[]
}

type RevealState = {
  isVisible: boolean
  isDisabled: boolean
  shownText: string | null
}

export default function LocalPlayPage() {
  const router = useRouter()
  const toast = useToast()

  const themes: Theme[] = themesData as Theme[]

  const [numPlayers, setNumPlayers] = useState<number>(4)
  const [playerNames, setPlayerNames] = useState<string[]>([])
  const [selectedThemeId, setSelectedThemeId] = useState<string>(themes[0]?.id || '')

  const [playedWordsByTheme, setPlayedWordsByTheme] = useState<Record<string, Set<string>>>({})
  const [currentWord, setCurrentWord] = useState<string | null>(null)
  const [currentImpostorIndex, setCurrentImpostorIndex] = useState<number | null>(null)
  const [revealState, setRevealState] = useState<Record<number, RevealState>>({})

  const STORAGE_KEY = 'localGameState_v1'

  const selectedTheme = useMemo(() => themes.find(t => t.id === selectedThemeId) || themes[0], [themes, selectedThemeId])

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        numPlayers?: number
        playerNames?: string[]
        selectedThemeId?: string
        playedWordsByTheme?: Record<string, string[]>
        currentWord?: string | null
        currentImpostorIndex?: number | null
      }
      if (parsed.numPlayers && parsed.numPlayers >= 2 && parsed.numPlayers <= 20) setNumPlayers(parsed.numPlayers)
      if (Array.isArray(parsed.playerNames)) setPlayerNames(parsed.playerNames)
      if (parsed.selectedThemeId && themes.some(t => t.id === parsed.selectedThemeId)) setSelectedThemeId(parsed.selectedThemeId)
      if (parsed.playedWordsByTheme) {
        const restored: Record<string, Set<string>> = {}
        Object.entries(parsed.playedWordsByTheme).forEach(([k, arr]) => {
          restored[k] = new Set(arr)
        })
        setPlayedWordsByTheme(restored)
      }
      if (typeof parsed.currentWord === 'string' || parsed.currentWord === null) setCurrentWord(parsed.currentWord ?? null)
      if (typeof parsed.currentImpostorIndex === 'number' || parsed.currentImpostorIndex === null) setCurrentImpostorIndex(parsed.currentImpostorIndex ?? null)
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist to localStorage on changes (except transient revealState)
  useEffect(() => {
    try {
      const serializable: {
        numPlayers: number
        playerNames: string[]
        selectedThemeId: string
        playedWordsByTheme: Record<string, string[]>
        currentWord: string | null
        currentImpostorIndex: number | null
      } = {
        numPlayers,
        playerNames,
        selectedThemeId,
        playedWordsByTheme: Object.fromEntries(
          Object.entries(playedWordsByTheme).map(([k, set]) => [k, Array.from(set)])
        ),
        currentWord,
        currentImpostorIndex,
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable))
      }
    } catch {}
  }, [numPlayers, playerNames, selectedThemeId, playedWordsByTheme, currentWord, currentImpostorIndex])

  useEffect(() => {
    // Initialize names and reveal state when numPlayers changes
    setPlayerNames(prev => {
      const next = [...prev]
      if (next.length < numPlayers) {
        for (let i = next.length; i < numPlayers; i++) next.push('')
      } else if (next.length > numPlayers) {
        next.length = numPlayers
      }
      return next
    })
    resetReveals()
  }, [numPlayers])

  useEffect(() => {
    // Reset on theme change
    resetRoundState()
  }, [selectedThemeId])

  const resetReveals = () => {
    const next: Record<number, RevealState> = {}
    for (let i = 0; i < numPlayers; i++) {
      next[i] = { isVisible: false, isDisabled: false, shownText: null }
    }
    setRevealState(next)
  }

  const resetRoundState = () => {
    setCurrentWord(null)
    setCurrentImpostorIndex(null)
    resetReveals()
  }

  const allNamesFilled = useMemo(() => playerNames.every(n => n.trim().length >= 1), [playerNames])

  const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

  const getRemainingWords = (): string[] => {
    const played = playedWordsByTheme[selectedTheme.id] || new Set<string>()
    return selectedTheme.words.filter(w => !played.has(w))
  }

  const startOrNextRound = () => {
    if (!allNamesFilled) {
      toast({ title: 'Faltan nombres', description: 'Completa todos los nombres.', status: 'warning', duration: 2500, isClosable: true })
      return
    }
    const remaining = getRemainingWords()
    if (remaining.length === 0) {
      // Reset the played words for this theme
      setPlayedWordsByTheme(prev => ({ ...prev, [selectedTheme.id]: new Set<string>() }))
      toast({ title: 'Palabras agotadas', description: 'Se reiniciaron las palabras del tema.', status: 'info', duration: 2500, isClosable: true })
      // Use full list now
    }
    const pool = remaining.length > 0 ? remaining : selectedTheme.words
    const word = pickRandom(pool)
    const impostor = Math.floor(Math.random() * numPlayers)

    setCurrentWord(word)
    setCurrentImpostorIndex(impostor)
    setPlayedWordsByTheme(prev => {
      const next = new Set<string>(prev[selectedTheme.id] || [])
      next.add(word)
      return { ...prev, [selectedTheme.id]: next }
    })
    resetReveals()
    toast({ title: 'Nueva ronda', description: 'Se eligieron palabra e impostor.', status: 'success', duration: 1500 })
  }

  const changeTheme = (themeId: string) => {
    setSelectedThemeId(themeId)
    // keep played words per theme persisted in state, but reset the current round
    toast({ title: 'Tema cambiado', status: 'info', duration: 1200 })
  }

  const handleReveal = (index: number) => {
    if (revealState[index]?.isDisabled) return
    if (currentWord == null || currentImpostorIndex == null) {
      toast({ title: 'Primero inicia la ronda', status: 'warning', duration: 1500 })
      return
    }
    const isImpostor = index === currentImpostorIndex
    const text = isImpostor ? 'IMPOSTOR' : currentWord

    setRevealState(prev => ({
      ...prev,
      [index]: { isVisible: true, isDisabled: false, shownText: text }
    }))

    setTimeout(() => {
      setRevealState(prev => ({
        ...prev,
        [index]: { isVisible: false, isDisabled: true, shownText: null }
      }))
    }, 5000)
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <MotionBox initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <VStack spacing={2} align="start">
            <Heading size="lg">Modo Local (sin conexión)</Heading>
            <Text color="gray.600">Juega en la misma laptop. No usa Supabase.</Text>
          </VStack>
        </MotionBox>

        <Box p={6} bg="white" borderRadius="xl" shadow="md" border="1px" borderColor="gray.200">
          <Stack spacing={6}>
            <HStack spacing={6} align="end" wrap="wrap">
              <FormControl maxW="200px">
                <FormLabel>Número de jugadores</FormLabel>
                <Input type="number" min={2} max={20} value={numPlayers} onChange={e => setNumPlayers(Math.max(2, Math.min(20, Number(e.target.value) || 2)))} />
              </FormControl>

              <FormControl maxW="320px">
                <FormLabel>Tema</FormLabel>
                <Select value={selectedThemeId} onChange={e => changeTheme(e.target.value)}>
                  {themes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </FormControl>

              <HStack spacing={3}>
                <MotionButton colorScheme="brand" onClick={startOrNextRound} whileHover={{ scale: 1.02 }}>
                  {currentWord ? 'Siguiente Ronda' : 'Iniciar Ronda'}
                </MotionButton>
                <Button variant="outline" onClick={() => resetRoundState()}>Reiniciar Ronda</Button>
              </HStack>
            </HStack>

            <Box>
              <FormLabel>Nombre de jugadores</FormLabel>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={4}>
                {Array.from({ length: numPlayers }).map((_, i) => (
                  <GridItem key={i}>
                    <Input
                      placeholder={`Jugador ${i + 1}`}
                      value={playerNames[i] || ''}
                      onChange={e => {
                        const next = [...playerNames]
                        next[i] = e.target.value
                        setPlayerNames(next)
                      }}
                    />
                  </GridItem>
                ))}
              </Grid>
            </Box>
          </Stack>
        </Box>

        <Box p={6} bg="white" borderRadius="xl" shadow="md" border="1px" borderColor="gray.200">
          <VStack align="stretch" spacing={4}>
            <HStack justify="space-between">
              <Heading size="md">Revelar palabra</Heading>
              <Text color="gray.500">Las palabras se ocultan a los 5s y el botón queda deshabilitado</Text>
            </HStack>

            <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }} gap={4}>
              {Array.from({ length: numPlayers }).map((_, i) => {
                const name = (playerNames[i] || `Jugador ${i + 1}`).trim() || `Jugador ${i + 1}`
                const state = revealState[i] || { isVisible: false, isDisabled: false, shownText: null }
                const label = state.isVisible
                  ? (state.shownText || '')
                  : state.isDisabled
                    ? `${name} (revelado)`
                    : name
                return (
                  <Button
                    key={i}
                    onClick={() => handleReveal(i)}
                    isDisabled={state.isDisabled}
                    colorScheme={state.isVisible ? 'green' : 'brand'}
                    height="64px"
                  >
                    {label}
                  </Button>
                )
              })}
            </Grid>
          </VStack>
        </Box>

        <HStack justify="space-between">
          <Button variant="ghost" onClick={() => router.push('/')}>Volver al inicio</Button>
          <Text color="gray.500">Tema: {selectedTheme?.name} · Palabras usadas: {(playedWordsByTheme[selectedTheme.id]?.size || 0)}/{selectedTheme?.words.length}</Text>
        </HStack>
      </VStack>
    </Container>
  )
}
