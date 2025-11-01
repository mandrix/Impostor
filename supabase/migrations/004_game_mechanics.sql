-- =====================================================
-- MIGRACIÓN 004: MECÁNICAS DEL JUEGO Y FUNCIONALIDADES AVANZADAS
-- =====================================================
-- Fecha: 2025-08-28
-- Descripción: Implementa mecánicas del juego, generación de palabras y gestión de temas
-- Estado: ⚠️ PENDIENTE DE EJECUTAR (nuevas funcionalidades)

-- =====================================================
-- 1. FUNCIONES DE GESTIÓN DE TEMAS
-- =====================================================

-- Función para obtener un tema aleatorio
CREATE OR REPLACE FUNCTION get_random_theme()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    available_themes TEXT[] := ARRAY[
        'champions', 'videojuegos', 'comida_rapida', 
        'marvel', 'deportes', 'musica'
    ];
    random_theme TEXT;
BEGIN
    -- Seleccionar tema aleatorio
    random_theme := available_themes[1 + floor(random() * array_length(available_themes, 1))];
    
    RAISE NOTICE '🎲 Tema seleccionado: %', random_theme;
    RETURN random_theme;
END;
$$;

-- Función para obtener palabras de un tema específico
CREATE OR REPLACE FUNCTION get_theme_words(theme_name TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    theme_words TEXT[];
BEGIN
    -- Definir palabras para cada tema
    CASE theme_name
        WHEN 'champions' THEN
            theme_words := ARRAY[
                'Ahri', 'Yasuo', 'Lux', 'Darius', 'Jinx', 'Thresh', 'Lee Sin', 'Zed',
                'Vayne', 'Garen', 'Katarina', 'Malphite', 'Morgana', 'Riven', 'Sona',
                'Teemo', 'Udyr', 'Varus', 'Warwick', 'Xerath', 'Yorick', 'Ziggs'
            ];
        WHEN 'videojuegos' THEN
            theme_words := ARRAY[
                'Minecraft', 'Fortnite', 'Call of Duty', 'GTA V', 'FIFA', 'League of Legends',
                'Overwatch', 'PUBG', 'Apex Legends', 'Valorant', 'CS:GO', 'Dota 2',
                'World of Warcraft', 'Red Dead Redemption', 'The Witcher'
            ];
        WHEN 'comida_rapida' THEN
            theme_words := ARRAY[
                'Hamburguesa', 'Pizza', 'Hot Dog', 'Tacos', 'Sushi', 'Kebab',
                'Chicken Wings', 'Burrito', 'Sandwich', 'Nuggets', 'Papas Fritas',
                'Onion Rings', 'Mozzarella Sticks', 'Chicken Tenders', 'Fish & Chips'
            ];
        WHEN 'marvel' THEN
            theme_words := ARRAY[
                'Iron Man', 'Captain America', 'Thor', 'Hulk', 'Black Widow',
                'Spider-Man', 'Doctor Strange', 'Black Panther', 'Ant-Man', 'Captain Marvel',
                'Scarlet Witch', 'Vision', 'Falcon', 'Winter Soldier', 'Loki'
            ];
        WHEN 'deportes' THEN
            theme_words := ARRAY[
                'Fútbol', 'Basketball', 'Tennis', 'Golf', 'Baseball',
                'Volleyball', 'Hockey', 'Rugby', 'Cricket', 'Boxing',
                'MMA', 'Swimming', 'Athletics', 'Cycling', 'Skiing'
            ];
        WHEN 'musica' THEN
            theme_words := ARRAY[
                'Rock', 'Pop', 'Hip Hop', 'Jazz', 'Classical', 'Electronic',
                'Country', 'R&B', 'Reggae', 'Blues', 'Folk', 'Metal',
                'Punk', 'Indie', 'Alternative', 'Latin'
            ];
        ELSE
            theme_words := ARRAY['default_word'];
    END CASE;
    
    RAISE NOTICE '📚 Tema "%" tiene % palabras', theme_name, array_length(theme_words, 1);
    RETURN theme_words;
END;
$$;

-- =====================================================
-- 2. FUNCIONES DE GENERACIÓN DE PALABRAS
-- =====================================================

-- Función para generar una palabra aleatoria para un room
CREATE OR REPLACE FUNCTION generate_random_word(room_id UUID, theme_name TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    selected_theme TEXT;
    available_words TEXT[];
    selected_word TEXT;
    played_words TEXT[];
    remaining_words TEXT[];
    word_count INTEGER;
BEGIN
    -- Si no se especifica tema, seleccionar uno aleatorio
    IF theme_name IS NULL THEN
        selected_theme := get_random_theme();
    ELSE
        selected_theme := theme_name;
    END IF;
    
    -- Obtener palabras del tema
    available_words := get_theme_words(selected_theme);
    
    -- Obtener palabras ya jugadas en este room
    SELECT COALESCE(played_words, ARRAY[]::TEXT[]) INTO played_words
    FROM rooms
    WHERE id = room_id;
    
    -- Filtrar palabras no jugadas
    SELECT ARRAY(
        SELECT unnest(available_words)
        EXCEPT
        SELECT unnest(played_words)
    ) INTO remaining_words;
    
    -- Si no hay palabras disponibles, resetear la lista
    IF array_length(remaining_words, 1) IS NULL OR array_length(remaining_words, 1) = 0 THEN
        RAISE NOTICE '🔄 Todas las palabras del tema "%" han sido jugadas, reseteando...', selected_theme;
        remaining_words := available_words;
        
        -- Limpiar palabras jugadas
        UPDATE rooms 
        SET played_words = ARRAY[]::TEXT[]
        WHERE id = room_id;
    END IF;
    
    -- Seleccionar palabra aleatoria
    word_count := array_length(remaining_words, 1);
    selected_word := remaining_words[1 + floor(random() * word_count)];
    
    -- Agregar palabra a la lista de jugadas
    UPDATE rooms 
    SET played_words = array_append(played_words, selected_word),
        current_word = selected_word,
        current_theme = selected_theme,
        updated_at = NOW()
    WHERE id = room_id;
    
    RAISE NOTICE '🎯 Palabra generada para room %: "%" (tema: %)', room_id, selected_word, selected_theme;
    RETURN selected_word;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error generando palabra: %', SQLERRM;
        RETURN 'error_word';
END;
$$;

-- Función para asignar roles de impostor
CREATE OR REPLACE FUNCTION assign_impostor_roles(room_id UUID, impostor_count INTEGER DEFAULT 1)
RETURNS TABLE(
    player_id UUID,
    player_name TEXT,
    is_impostor BOOLEAN,
    assigned_word TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    room_players RECORD;
    impostor_indices INTEGER[];
    current_theme TEXT;
    current_word TEXT;
    player_count INTEGER;
    i INTEGER;
BEGIN
    -- Verificar que el room existe y tiene jugadores
    SELECT COUNT(*) INTO player_count
    FROM players
    WHERE room_id = assign_impostor_roles.room_id;
    
    IF player_count = 0 THEN
        RAISE EXCEPTION 'Room % no tiene jugadores', room_id;
    END IF;
    
    -- Obtener tema y palabra actual
    SELECT current_theme, current_word INTO current_theme, current_word
    FROM rooms
    WHERE id = room_id;
    
    IF current_word IS NULL THEN
        RAISE EXCEPTION 'No hay palabra asignada para el room %', room_id;
    END IF;
    
    -- Generar índices aleatorios para impostores
    impostor_indices := ARRAY[]::INTEGER[];
    FOR i IN 1..impostor_count LOOP
        LOOP
            -- Generar índice aleatorio
            i := 1 + floor(random() * player_count);
            -- Verificar que no esté duplicado
            EXIT WHEN NOT (i = ANY(impostor_indices));
        END LOOP;
        impostor_indices := array_append(impostor_indices, i);
    END LOOP;
    
    -- Asignar roles a todos los jugadores
    FOR room_players IN 
        SELECT p.id, p.name, p.room_id
        FROM players p
        WHERE p.room_id = assign_impostor_roles.room_id
        ORDER BY p.created_at
    LOOP
        -- Verificar si este jugador es impostor
        IF room_players.id = ANY(
            SELECT p2.id 
            FROM players p2 
            WHERE p2.room_id = assign_impostor_roles.room_id 
            ORDER BY p2.created_at 
            LIMIT 1 OFFSET (impostor_indices[1] - 1)
        ) THEN
            -- Es impostor
            UPDATE players 
            SET is_impostor = TRUE,
                has_voted = FALSE,
                is_alive = TRUE
            WHERE id = room_players.id;
            
            RETURN QUERY
            SELECT room_players.id, room_players.name, TRUE, 'IMPOSTOR'::TEXT;
        ELSE
            -- Es inocente
            UPDATE players 
            SET is_impostor = FALSE,
                has_voted = FALSE,
                is_alive = TRUE
            WHERE id = room_players.id;
            
            RETURN QUERY
            SELECT room_players.id, room_players.name, FALSE, current_word;
        END IF;
    END LOOP;
    
    RAISE NOTICE '🎭 Roles asignados para room %: % impostores de % jugadores', 
                 room_id, impostor_count, player_count;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error asignando roles: %', SQLERRM;
        RETURN;
END;
$$;

-- =====================================================
-- 3. FUNCIONES DE GESTIÓN DEL JUEGO
-- =====================================================

-- Función para iniciar un juego
CREATE OR REPLACE FUNCTION start_game(room_id UUID, theme_name TEXT DEFAULT NULL, impostor_count INTEGER DEFAULT 1)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    room_exists BOOLEAN;
    player_count INTEGER;
    game_started BOOLEAN := FALSE;
BEGIN
    -- Verificar que el room existe
    SELECT EXISTS(SELECT 1 FROM rooms WHERE id = start_game.room_id) INTO room_exists;
    IF NOT room_exists THEN
        RAISE EXCEPTION 'Room % no existe', room_id;
    END IF;
    
    -- Verificar que hay suficientes jugadores
    SELECT COUNT(*) INTO player_count
    FROM players
    WHERE room_id = start_game.room_id;
    
    IF player_count < 2 THEN
        RAISE EXCEPTION 'Se necesitan al menos 2 jugadores para iniciar el juego';
    END IF;
    
    IF player_count < (impostor_count + 1) THEN
        RAISE EXCEPTION 'Se necesitan al menos % jugadores para % impostores', 
                       (impostor_count + 1), impostor_count;
    END IF;
    
    -- Generar palabra aleatoria
    PERFORM generate_random_word(room_id, theme_name);
    
    -- Asignar roles de impostor
    PERFORM assign_impostor_roles(room_id, impostor_count);
    
    -- Actualizar estado del room
    UPDATE rooms 
    SET status = 'playing',
        current_round = 1,
        updated_at = NOW()
    WHERE id = room_id;
    
    -- Actualizar estado del juego
    UPDATE game_states 
    SET status = 'playing',
        phase = 'playing',
        current_round = 1,
        round_start_time = NOW(),
        impostor_count = impostor_count,
        updated_at = NOW()
    WHERE room_id = room_id;
    
    -- Registrar acción del juego
    INSERT INTO game_actions (room_id, type, player_id, data, created_at)
    VALUES (room_id, 'start_game', NULL, 
            jsonb_build_object(
                'theme', theme_name,
                'impostor_count', impostor_count,
                'player_count', player_count
            ), NOW());
    
    game_started := TRUE;
    RAISE NOTICE '🎮 Juego iniciado en room % con tema "%" y % impostores', 
                 room_id, theme_name, impostor_count;
    
    RETURN game_started;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error iniciando juego: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Función para cambiar tema del juego
CREATE OR REPLACE FUNCTION change_game_theme(room_id UUID, new_theme TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    theme_exists BOOLEAN;
    theme_changed BOOLEAN := FALSE;
BEGIN
    -- Verificar que el tema existe
    SELECT EXISTS(
        SELECT 1 FROM unnest(get_theme_words(new_theme))
    ) INTO theme_exists;
    
    IF NOT theme_exists THEN
        RAISE EXCEPTION 'Tema "%" no es válido', new_theme;
    END IF;
    
    -- Actualizar tema en el room
    UPDATE rooms 
    SET current_theme = new_theme,
        played_words = ARRAY[]::TEXT[],
        current_word = NULL,
        updated_at = NOW()
    WHERE id = room_id;
    
    -- Actualizar estado del juego
    UPDATE game_states 
    SET current_theme = new_theme,
        updated_at = NOW()
    WHERE room_id = room_id;
    
    -- Registrar acción del juego
    INSERT INTO game_actions (room_id, type, player_id, data, created_at)
    VALUES (room_id, 'change_theme', NULL, 
            jsonb_build_object('new_theme', new_theme), NOW());
    
    theme_changed := TRUE;
    RAISE NOTICE '🎨 Tema cambiado a "%" en room %', new_theme, room_id;
    
    RETURN theme_changed;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error cambiando tema: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Función para pasar a la siguiente ronda
CREATE OR REPLACE FUNCTION next_round(room_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_round_num INTEGER;
    max_rounds_num INTEGER;
    round_advanced BOOLEAN := FALSE;
BEGIN
    -- Obtener información de la ronda actual
    SELECT current_round, max_rounds INTO current_round_num, max_rounds_num
    FROM rooms
    WHERE id = room_id;
    
    -- Verificar si se puede avanzar
    IF current_round_num >= max_rounds_num THEN
        RAISE EXCEPTION 'Ya se alcanzó el máximo de rondas (%)', max_rounds_num;
    END IF;
    
    -- Generar nueva palabra para la siguiente ronda
    PERFORM generate_random_word(room_id);
    
    -- Asignar nuevos roles
    PERFORM assign_impostor_roles(room_id, 1); -- Por defecto 1 impostor
    
    -- Actualizar ronda en el room
    UPDATE rooms 
    SET current_round = current_round_num + 1,
        updated_at = NOW()
    WHERE id = room_id;
    
    -- Actualizar estado del juego
    UPDATE game_states 
    SET current_round = current_round_num + 1,
        phase = 'playing',
        round_start_time = NOW(),
        round_end_time = NULL,
        updated_at = NOW()
    WHERE room_id = room_id;
    
    -- Resetear votos de jugadores
    UPDATE players 
    SET has_voted = FALSE
    WHERE room_id = room_id;
    
    -- Registrar acción del juego
    INSERT INTO game_actions (room_id, type, player_id, data, created_at)
    VALUES (room_id, 'next_round', NULL, 
            jsonb_build_object('new_round', current_round_num + 1), NOW());
    
    round_advanced := TRUE;
    RAISE NOTICE '🔄 Ronda avanzada a % en room %', (current_round_num + 1), room_id;
    
    RETURN round_advanced;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error avanzando ronda: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- =====================================================
-- 4. FUNCIONES DE VOTACIÓN
-- =====================================================

-- Función para registrar un voto
CREATE OR REPLACE FUNCTION register_vote(room_id UUID, voter_id UUID, target_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    vote_registered BOOLEAN := FALSE;
    voter_name TEXT;
    target_name TEXT;
BEGIN
    -- Obtener nombres para logging
    SELECT name INTO voter_name FROM players WHERE id = voter_id;
    SELECT name INTO target_name FROM players WHERE id = target_id;
    
    -- Verificar que el votante no haya votado ya
    IF EXISTS(SELECT 1 FROM players WHERE id = voter_id AND has_voted = TRUE) THEN
        RAISE EXCEPTION 'El jugador % ya ha votado', voter_name;
    END IF;
    
    -- Verificar que el objetivo está vivo
    IF EXISTS(SELECT 1 FROM players WHERE id = target_id AND is_alive = FALSE) THEN
        RAISE EXCEPTION 'No se puede votar por un jugador muerto';
    END IF;
    
    -- Registrar el voto
    UPDATE players 
    SET has_voted = TRUE
    WHERE id = voter_id;
    
    -- Registrar acción del juego
    INSERT INTO game_actions (room_id, type, player_id, data, created_at)
    VALUES (room_id, 'vote', voter_id, 
            jsonb_build_object('target_id', target_id, 'target_name', target_name), NOW());
    
    vote_registered := TRUE;
    RAISE NOTICE '🗳️ Voto registrado: % votó por % en room %', voter_name, target_name, room_id;
    
    RETURN vote_registered;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error registrando voto: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Función para obtener resultados de votación
CREATE OR REPLACE FUNCTION get_voting_results(room_id UUID)
RETURNS TABLE(
    target_id UUID,
    target_name TEXT,
    vote_count BIGINT,
    is_eliminated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Contar votos por cada jugador
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        COUNT(ga.id) as vote_count,
        p.is_alive = FALSE as is_eliminated
    FROM players p
    LEFT JOIN game_actions ga ON ga.player_id = p.id 
        AND ga.type = 'vote' 
        AND ga.room_id = room_id
    WHERE p.room_id = room_id
    GROUP BY p.id, p.name, p.is_alive
    ORDER BY vote_count DESC, p.name;
END;
$$;

-- =====================================================
-- VERIFICACIÓN DE ESTADO
-- =====================================================

-- Para verificar que esta migración se aplicó correctamente, ejecuta:
-- SELECT get_random_theme();
-- SELECT get_theme_words('champions');
-- SELECT get_cron_jobs_status();

-- =====================================================
-- RESUMEN
-- =====================================================
-- ✅ Esta migración implementa:
--    - 4 funciones de gestión de temas
--    - 3 funciones de generación de palabras
--    - 4 funciones de gestión del juego
--    - 2 funciones de votación
--    - Sistema completo de mecánicas del juego
-- ⚠️ Ejecutar en Supabase SQL Editor
-- 🔄 Continúa con la siguiente migración: 005_room_management.sql



