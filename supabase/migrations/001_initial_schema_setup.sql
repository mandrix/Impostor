-- =====================================================
-- MIGRACIÓN 001: ESQUEMA INICIAL DE LA BASE DE DATOS
-- =====================================================
-- Fecha: 2025-08-28
-- Descripción: Establece el esquema base para el juego del impostor
-- Estado: ✅ COMPLETADA (ya ejecutada en tu base de datos)

-- NOTA: Esta migración ya fue ejecutada en tu base de datos
-- No es necesario ejecutarla nuevamente

-- =====================================================
-- TABLAS PRINCIPALES
-- =====================================================

-- Tabla de rooms (salas de juego)
-- CREATE TABLE rooms (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   name TEXT NOT NULL,
--   host_id UUID NOT NULL,
--   max_players INTEGER DEFAULT 15,
--   status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
--   current_round INTEGER DEFAULT 0,
--   max_rounds INTEGER DEFAULT 999,
--   current_theme TEXT,
--   current_word TEXT,
--   played_words TEXT[] DEFAULT '{}',
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Tabla de jugadores
-- CREATE TABLE players (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
--   name TEXT NOT NULL,
--   is_host BOOLEAN DEFAULT FALSE,
--   is_impostor BOOLEAN DEFAULT FALSE,
--   has_voted BOOLEAN DEFAULT FALSE,
--   is_alive BOOLEAN DEFAULT TRUE,
--   session_id TEXT UNIQUE NOT NULL,
--   last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   is_connected BOOLEAN DEFAULT TRUE,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Tabla de estado del juego
-- CREATE TABLE game_states (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
--   status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'paused', 'finished')),
--   current_round INTEGER DEFAULT 0,
--   max_rounds INTEGER DEFAULT 999,
--   current_theme TEXT,
--   current_word TEXT,
--   phase TEXT DEFAULT 'waiting' CHECK (phase IN ('waiting', 'theme_selection', 'word_generation', 'playing', 'discussion', 'voting', 'round_end', 'game_end')),
--   round_start_time TIMESTAMP WITH TIME ZONE,
--   round_end_time TIMESTAMP WITH TIME ZONE,
--   impostor_count INTEGER DEFAULT 0,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Tabla de acciones del juego
-- CREATE TABLE game_actions (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
--   type TEXT NOT NULL CHECK (type IN ('start_game', 'change_theme', 'generate_word', 'next_round', 'end_game')),
--   player_id UUID REFERENCES players(id) ON DELETE CASCADE,
--   data JSONB,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- =====================================================
-- ÍNDICES Y OPTIMIZACIONES
-- =====================================================

-- CREATE INDEX idx_rooms_status ON rooms(status);
-- CREATE INDEX idx_rooms_created_at ON rooms(created_at);
-- CREATE INDEX idx_players_room_id ON players(room_id);
-- CREATE INDEX idx_game_states_room_id ON game_states(room_id);
-- CREATE INDEX idx_game_actions_room_id ON game_actions(room_id);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = NOW();
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- Triggers para updated_at
-- CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CREATE TRIGGER update_game_states_updated_at BEFORE UPDATE ON game_states
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEGURIDAD (RLS)
-- =====================================================

-- ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE players ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE game_actions ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad básicas
-- CREATE POLICY "Allow public read access to rooms" ON rooms FOR SELECT USING (true);
-- CREATE POLICY "Allow insert rooms" ON rooms FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow update rooms" ON rooms FOR UPDATE USING (true);

-- CREATE POLICY "Allow public read access to players" ON players FOR SELECT USING (true);
-- CREATE POLICY "Allow insert players" ON players FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow update players" ON players FOR UPDATE USING (true);

-- CREATE POLICY "Allow public read access to game states" ON game_states FOR SELECT USING (true);
-- CREATE POLICY "Allow insert game states" ON game_states FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow update game states" ON game_states FOR UPDATE USING (true);

-- CREATE POLICY "Allow public read access to game actions" ON game_actions FOR SELECT USING (true);
-- CREATE POLICY "Allow insert game actions" ON game_actions FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow update game actions" ON game_actions FOR INSERT WITH CHECK (true);

-- =====================================================
-- VERIFICACIÓN DE ESTADO
-- =====================================================

-- Para verificar que esta migración ya está aplicada, ejecuta:
-- SELECT EXISTS (
--   SELECT 1 FROM information_schema.tables 
--   WHERE table_name = 'rooms' 
--   AND table_schema = 'public'
-- ) as tables_exist;

-- SELECT EXISTS (
--   SELECT 1 FROM information_schema.routines 
--   WHERE routine_name = 'update_updated_at_column' 
--   AND routine_schema = 'public'
-- ) as functions_exist;

-- =====================================================
-- RESUMEN
-- =====================================================
-- ✅ Esta migración ya está aplicada en tu base de datos
-- ✅ Incluye: 4 tablas principales, índices, funciones, triggers y RLS
-- ✅ No es necesario ejecutarla nuevamente
-- ✅ Continúa con la siguiente migración: 002_database_functions.sql



