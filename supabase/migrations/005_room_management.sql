-- =====================================================
-- MIGRACIÓN 005: GESTIÓN AVANZADA DE ROOMS Y JUGADORES
-- =====================================================
-- Fecha: 2025-08-28
-- Descripción: Implementa funciones avanzadas para gestión de rooms, jugadores y sesiones
-- Estado: ⚠️ PENDIENTE DE EJECUTAR (nuevas funcionalidades)

-- =====================================================
-- 1. FUNCIONES DE GESTIÓN DE ROOMS
-- =====================================================

-- Función para crear un room completo con validaciones
CREATE OR REPLACE FUNCTION create_room_complete(
    room_name TEXT,
    host_name TEXT,
    max_players INTEGER DEFAULT 15,
    max_rounds INTEGER DEFAULT 999
)
RETURNS TABLE(
    room_id UUID,
    host_id UUID,
    room_name TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_room_id UUID;
    new_host_id UUID;
    new_game_state_id UUID;
BEGIN
    -- Validaciones
    IF room_name IS NULL OR length(trim(room_name)) = 0 THEN
        RAISE EXCEPTION 'El nombre del room no puede estar vacío';
    END IF;
    
    IF host_name IS NULL OR length(trim(host_name)) = 0 THEN
        RAISE EXCEPTION 'El nombre del host no puede estar vacío';
    END IF;
    
    IF max_players < 2 OR max_players > 20 THEN
        RAISE EXCEPTION 'El número máximo de jugadores debe estar entre 2 y 20';
    END IF;
    
    IF max_rounds < 1 OR max_rounds > 999 THEN
        RAISE EXCEPTION 'El número máximo de rondas debe estar entre 1 y 999';
    END IF;
    
    -- Generar IDs únicos
    new_room_id := gen_random_uuid();
    new_host_id := gen_random_uuid();
    new_game_state_id := gen_random_uuid();
    
    -- Crear el room
    INSERT INTO rooms (
        id, name, host_id, max_players, max_rounds, 
        status, current_round, created_at, updated_at
    ) VALUES (
        new_room_id, room_name, new_host_id, max_players, max_rounds,
        'waiting', 0, NOW(), NOW()
    );
    
    -- Crear el jugador host
    INSERT INTO players (
        id, room_id, name, is_host, is_impostor, 
        has_voted, is_alive, session_id, last_seen, 
        is_connected, created_at
    ) VALUES (
        new_host_id, new_room_id, host_name, TRUE, FALSE,
        FALSE, TRUE, gen_random_uuid(), NOW(),
        TRUE, NOW()
    );
    
    -- Crear estado inicial del juego
    INSERT INTO game_states (
        id, room_id, status, current_round, max_rounds,
        phase, round_start_time, impostor_count, created_at, updated_at
    ) VALUES (
        new_game_state_id, new_room_id, 'waiting', 0, max_rounds,
        'waiting', NULL, 0, NOW(), NOW()
    );
    
    -- Registrar acción del juego
    INSERT INTO game_actions (
        room_id, type, player_id, data, created_at
    ) VALUES (
        new_room_id, 'room_created', new_host_id,
        jsonb_build_object(
            'room_name', room_name,
            'host_name', host_name,
            'max_players', max_players,
            'max_rounds', max_rounds
        ), NOW()
    );
    
    RAISE NOTICE '🏠 Room "%" creado exitosamente con ID %', room_name, new_room_id;
    
    -- Retornar información del room creado
    RETURN QUERY
    SELECT 
        new_room_id,
        new_host_id,
        room_name,
        'waiting',
        NOW();
        
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error creando room: %', SQLERRM;
        RAISE EXCEPTION 'No se pudo crear el room: %', SQLERRM;
END;
$$;

-- Función para unir un jugador a un room
CREATE OR REPLACE FUNCTION join_room(
    room_id UUID,
    player_name TEXT
)
RETURNS TABLE(
    player_id UUID,
    room_id UUID,
    player_name TEXT,
    is_host BOOLEAN,
    session_id TEXT,
    joined_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_player_id UUID;
    new_session_id TEXT;
    room_exists BOOLEAN;
    room_status TEXT;
    player_count INTEGER;
    max_players_num INTEGER;
BEGIN
    -- Validaciones
    IF player_name IS NULL OR length(trim(player_name)) = 0 THEN
        RAISE EXCEPTION 'El nombre del jugador no puede estar vacío';
    END IF;
    
    -- Verificar que el room existe
    SELECT EXISTS(SELECT 1 FROM rooms WHERE id = join_room.room_id) INTO room_exists;
    IF NOT room_exists THEN
        RAISE EXCEPTION 'Room % no existe', room_id;
    END IF;
    
    -- Verificar que el room no esté lleno
    SELECT COUNT(*) INTO player_count
    FROM players
    WHERE room_id = join_room.room_id;
    
    SELECT max_players INTO max_players_num
    FROM rooms
    WHERE id = join_room.room_id;
    
    IF player_count >= max_players_num THEN
        RAISE EXCEPTION 'Room % está lleno (%/% jugadores)', room_id, player_count, max_players_num;
    END IF;
    
    -- Verificar que el room no esté en juego
    SELECT status INTO room_status
    FROM rooms
    WHERE id = join_room.room_id;
    
    IF room_status = 'playing' THEN
        RAISE EXCEPTION 'No se puede unir a un room que ya está en juego';
    END IF;
    
    -- Verificar que el nombre no esté duplicado en el room
    IF EXISTS(
        SELECT 1 FROM players 
        WHERE room_id = join_room.room_id 
        AND lower(name) = lower(player_name)
    ) THEN
        RAISE EXCEPTION 'Ya existe un jugador con el nombre "%" en este room', player_name;
    END IF;
    
    -- Generar IDs únicos
    new_player_id := gen_random_uuid();
    new_session_id := gen_random_uuid();
    
    -- Crear el jugador
    INSERT INTO players (
        id, room_id, name, is_host, is_impostor,
        has_voted, is_alive, session_id, last_seen,
        is_connected, created_at
    ) VALUES (
        new_player_id, room_id, player_name, FALSE, FALSE,
        FALSE, TRUE, new_session_id, NOW(),
        TRUE, NOW()
    );
    
    -- Registrar acción del juego
    INSERT INTO game_actions (
        room_id, type, player_id, data, created_at
    ) VALUES (
        room_id, 'player_joined', new_player_id,
        jsonb_build_object('player_name', player_name), NOW()
    );
    
    RAISE NOTICE '👤 Jugador "%" se unió al room %', player_name, room_id;
    
    -- Retornar información del jugador creado
    RETURN QUERY
    SELECT 
        new_player_id,
        room_id,
        player_name,
        FALSE,
        new_session_id,
        NOW();
        
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error uniendo jugador: %', SQLERRM;
        RAISE EXCEPTION 'No se pudo unir al room: %', SQLERRM;
END;
$$;

-- Función para que un jugador abandone un room
CREATE OR REPLACE FUNCTION leave_room(
    room_id UUID,
    player_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_name TEXT;
    is_host_player BOOLEAN;
    remaining_players INTEGER;
    room_name TEXT;
    player_left BOOLEAN := FALSE;
BEGIN
    -- Obtener información del jugador
    SELECT name, is_host INTO player_name, is_host_player
    FROM players
    WHERE id = leave_room.player_id AND room_id = leave_room.room_id;
    
    IF player_name IS NULL THEN
        RAISE EXCEPTION 'Jugador % no encontrado en room %', player_id, room_id;
    END IF;
    
    -- Obtener nombre del room
    SELECT name INTO room_name
    FROM rooms
    WHERE id = room_id;
    
    -- Si es el host, verificar si hay otros jugadores
    IF is_host_player THEN
        SELECT COUNT(*) INTO remaining_players
        FROM players
        WHERE room_id = leave_room.room_id AND id != leave_room.player_id;
        
        IF remaining_players > 0 THEN
            RAISE EXCEPTION 'El host no puede abandonar el room mientras haya otros jugadores';
        END IF;
    END IF;
    
    -- Eliminar el jugador
    DELETE FROM players
    WHERE id = leave_room.player_id AND room_id = leave_room.room_id;
    
    -- Registrar acción del juego
    INSERT INTO game_actions (
        room_id, type, player_id, data, created_at
    ) VALUES (
        room_id, 'player_left', leave_room.player_id,
        jsonb_build_object('player_name', player_name), NOW()
    );
    
    player_left := TRUE;
    RAISE NOTICE '👋 Jugador "%" abandonó el room "%"', player_name, room_name;
    
    RETURN player_left;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error abandonando room: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- =====================================================
-- 2. FUNCIONES DE GESTIÓN DE SESIONES
-- =====================================================

-- Función para actualizar última actividad de un jugador
CREATE OR REPLACE FUNCTION update_player_activity(
    player_id UUID,
    room_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    activity_updated BOOLEAN := FALSE;
BEGIN
    -- Actualizar última actividad
    UPDATE players 
    SET last_seen = NOW(),
        is_connected = TRUE
    WHERE id = update_player_activity.player_id 
    AND room_id = update_player_activity.room_id;
    
    IF FOUND THEN
        activity_updated := TRUE;
    END IF;
    
    RETURN activity_updated;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error actualizando actividad: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Función para marcar jugador como desconectado
CREATE OR REPLACE FUNCTION mark_player_disconnected(
    player_id UUID,
    room_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_name TEXT;
    marked_disconnected BOOLEAN := FALSE;
BEGIN
    -- Obtener nombre del jugador
    SELECT name INTO player_name
    FROM players
    WHERE id = mark_player_disconnected.player_id 
    AND room_id = mark_player_disconnected.room_id;
    
    IF player_name IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Marcar como desconectado
    UPDATE players 
    SET is_connected = FALSE,
        last_seen = NOW()
    WHERE id = mark_player_disconnected.player_id 
    AND room_id = mark_player_disconnected.room_id;
    
    marked_disconnected := TRUE;
    RAISE NOTICE '📱 Jugador "%" marcado como desconectado', player_name;
    
    RETURN marked_disconnected;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error marcando desconectado: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Función para obtener jugadores activos de un room
CREATE OR REPLACE FUNCTION get_active_players(room_id UUID)
RETURNS TABLE(
    player_id UUID,
    player_name TEXT,
    is_host BOOLEAN,
    is_impostor BOOLEAN,
    is_alive BOOLEAN,
    has_voted BOOLEAN,
    last_seen TIMESTAMP WITH TIME ZONE,
    is_connected BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.is_host,
        p.is_impostor,
        p.is_alive,
        p.has_voted,
        p.last_seen,
        p.is_connected
    FROM players p
    WHERE p.room_id = get_active_players.room_id
    ORDER BY p.is_host DESC, p.created_at ASC;
END;
$$;

-- =====================================================
-- 3. FUNCIONES DE ESTADÍSTICAS Y REPORTES
-- =====================================================

-- Función para obtener estadísticas de un room
CREATE OR REPLACE FUNCTION get_room_stats(room_id UUID)
RETURNS TABLE(
    metric TEXT,
    value TEXT,
    description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    room_info RECORD;
    player_stats RECORD;
    game_stats RECORD;
BEGIN
    -- Obtener información del room
    SELECT 
        r.name, r.status, r.current_round, r.max_rounds,
        r.current_theme, r.created_at, r.updated_at
    INTO room_info
    FROM rooms r
    WHERE r.id = get_room_stats.room_id;
    
    -- Obtener estadísticas de jugadores
    SELECT 
        COUNT(*) as total_players,
        COUNT(*) FILTER (WHERE is_host = TRUE) as host_count,
        COUNT(*) FILTER (WHERE is_impostor = TRUE) as impostor_count,
        COUNT(*) FILTER (WHERE is_alive = TRUE) as alive_players,
        COUNT(*) FILTER (WHERE has_voted = TRUE) as voted_players,
        COUNT(*) FILTER (WHERE is_connected = TRUE) as connected_players
    INTO player_stats
    FROM players
    WHERE room_id = get_room_stats.room_id;
    
    -- Obtener estadísticas del juego
    SELECT 
        gs.phase, gs.round_start_time, gs.impostor_count
    INTO game_stats
    FROM game_states gs
    WHERE gs.room_id = get_room_stats.room_id;
    
    -- Retornar estadísticas
    RETURN QUERY
    SELECT 'Room Name'::TEXT, room_info.name, 'Nombre del room'
    UNION ALL
    SELECT 'Status', room_info.status, 'Estado actual del room'
    UNION ALL
    SELECT 'Current Round', room_info.current_round::TEXT, 'Ronda actual'
    UNION ALL
    SELECT 'Max Rounds', room_info.max_rounds::TEXT, 'Máximo de rondas'
    UNION ALL
    SELECT 'Theme', COALESCE(room_info.current_theme, 'None'), 'Tema actual'
    UNION ALL
    SELECT 'Total Players', player_stats.total_players::TEXT, 'Total de jugadores'
    UNION ALL
    SELECT 'Host Count', player_stats.host_count::TEXT, 'Número de hosts'
    UNION ALL
    SELECT 'Impostor Count', player_stats.impostor_count::TEXT, 'Número de impostores'
    UNION ALL
    SELECT 'Alive Players', player_stats.alive_players::TEXT, 'Jugadores vivos'
    UNION ALL
    SELECT 'Voted Players', player_stats.voted_players::TEXT, 'Jugadores que han votado'
    UNION ALL
    SELECT 'Connected Players', player_stats.connected_players::TEXT, 'Jugadores conectados'
    UNION ALL
    SELECT 'Game Phase', COALESCE(game_stats.phase, 'None'), 'Fase actual del juego'
    UNION ALL
    SELECT 'Round Start Time', COALESCE(game_stats.round_start_time::TEXT, 'None'), 'Hora de inicio de la ronda'
    UNION ALL
    SELECT 'Created At', room_info.created_at::TEXT, 'Fecha de creación'
    UNION ALL
    SELECT 'Last Updated', room_info.updated_at::TEXT, 'Última actualización';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error obteniendo estadísticas: %', SQLERRM;
        RETURN QUERY SELECT 'ERROR'::TEXT, 'Error', 'Error obteniendo estadísticas: ' || SQLERRM;
END;
$$;

-- Función para obtener historial de acciones de un room
CREATE OR REPLACE FUNCTION get_room_action_history(
    room_id UUID,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
    action_id UUID,
    action_type TEXT,
    player_name TEXT,
    action_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ga.id,
        ga.type,
        COALESCE(p.name, 'System') as player_name,
        ga.data,
        ga.created_at
    FROM game_actions ga
    LEFT JOIN players p ON ga.player_id = p.id
    WHERE ga.room_id = get_room_action_history.room_id
    ORDER BY ga.created_at DESC
    LIMIT limit_count;
END;
$$;

-- =====================================================
-- 4. FUNCIONES DE VALIDACIÓN Y SANITIZACIÓN
-- =====================================================

-- Función para validar nombre de jugador
CREATE OR REPLACE FUNCTION validate_player_name(player_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar que no esté vacío
    IF player_name IS NULL OR length(trim(player_name)) = 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar longitud (entre 2 y 20 caracteres)
    IF length(trim(player_name)) < 2 OR length(trim(player_name)) > 20 THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar que solo contenga caracteres válidos (letras, números, espacios, guiones)
    IF NOT player_name ~ '^[a-zA-Z0-9\s\-_]+$' THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar que no sea solo espacios
    IF trim(player_name) = '' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Función para sanitizar nombre de jugador
CREATE OR REPLACE FUNCTION sanitize_player_name(player_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Convertir a minúsculas y capitalizar primera letra
    RETURN initcap(lower(trim(player_name)));
END;
$$;

-- =====================================================
-- VERIFICACIÓN DE ESTADO
-- =====================================================

-- Para verificar que esta migración se aplicó correctamente, ejecuta:
-- SELECT * FROM get_room_stats('tu-room-id-aqui');
-- SELECT validate_player_name('TestPlayer123');
-- SELECT sanitize_player_name('  test player  ');

-- =====================================================
-- RESUMEN
-- =====================================================
-- ✅ Esta migración implementa:
--    - 3 funciones de gestión de rooms
--    - 3 funciones de gestión de sesiones
--    - 2 funciones de estadísticas y reportes
--    - 2 funciones de validación y sanitización
--    - Sistema completo de gestión de rooms y jugadores
-- ⚠️ Ejecutar en Supabase SQL Editor
-- 🔄 Continúa con la siguiente migración: 006_security_enhancements.sql



