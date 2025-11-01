-- =====================================================
-- MIGRACIÓN 002: FUNCIONES DE BASE DE DATOS PARA LIMPIEZA AUTOMÁTICA
-- =====================================================
-- Fecha: 2025-08-28
-- Descripción: Implementa funciones para limpieza automática de rooms y jugadores
-- Estado: ⚠️ PENDIENTE DE EJECUTAR (reemplaza archivos anteriores)

-- NOTA: Esta migración reemplaza los archivos:
-- - supabase-database-functions.sql
-- - supabase-database-functions-fixed.sql
-- - supabase-database-functions-fixed-v2.sql

-- =====================================================
-- FUNCIONES PRINCIPALES DE LIMPIEZA
-- =====================================================

-- Función para eliminar un room completo con todas sus dependencias
CREATE OR REPLACE FUNCTION delete_room_complete(room_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    room_exists BOOLEAN;
    deleted_count INTEGER := 0;
BEGIN
    -- Verificar que el room existe
    SELECT EXISTS(SELECT 1 FROM rooms WHERE id = delete_room_complete.room_id) INTO room_exists;
    
    IF NOT room_exists THEN
        RAISE NOTICE 'Room % no existe', room_id;
        RETURN FALSE;
    END IF;
    
    -- Log de inicio de eliminación
    RAISE NOTICE '🗑️ Iniciando eliminación completa del room %', room_id;
    
    -- 1. Eliminar game_actions (sin foreign key constraints)
    DELETE FROM game_actions WHERE room_id = delete_room_complete.room_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '✅ Game actions eliminados: %', deleted_count;
    
    -- 2. Eliminar game_states
    DELETE FROM game_states WHERE room_id = delete_room_complete.room_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '✅ Game states eliminados: %', deleted_count;
    
    -- 3. Eliminar players
    DELETE FROM players WHERE room_id = delete_room_complete.room_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '✅ Players eliminados: %', deleted_count;
    
    -- 4. Finalmente eliminar el room
    DELETE FROM rooms WHERE id = delete_room_complete.room_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count > 0 THEN
        RAISE NOTICE '✅ Room % eliminado completamente', room_id;
        RETURN TRUE;
    ELSE
        RAISE NOTICE '❌ Error al eliminar el room %', room_id;
        RETURN FALSE;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error eliminando room %: %', room_id, SQLERRM;
        RETURN FALSE;
END;
$$;

-- Función para verificar si un room está huérfano (sin host válido)
CREATE OR REPLACE FUNCTION is_room_orphaned(room_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    host_exists BOOLEAN;
BEGIN
    -- Verificar si existe un host válido para el room
    SELECT EXISTS(
        SELECT 1 FROM players p
        WHERE p.room_id = is_room_orphaned.room_id 
        AND p.is_host = TRUE
    ) INTO host_exists;
    
    RETURN NOT host_exists;
END;
$$;

-- Función para verificar si un room está vacío
CREATE OR REPLACE FUNCTION is_room_empty(room_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_count INTEGER;
BEGIN
    -- Contar jugadores en el room
    SELECT COUNT(*) INTO player_count
    FROM players p
    WHERE p.room_id = is_room_empty.room_id;
    
    RETURN player_count = 0;
END;
$$;

-- Función para limpiar rooms huérfanos automáticamente
CREATE OR REPLACE FUNCTION cleanup_orphaned_rooms()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    orphaned_room RECORD;
    deleted_count INTEGER := 0;
    total_deleted INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 Buscando rooms huérfanos...';
    
    -- Iterar sobre todos los rooms huérfanos
    FOR orphaned_room IN 
        SELECT DISTINCT r.id, r.name
        FROM rooms r
        WHERE is_room_orphaned(r.id)
    LOOP
        RAISE NOTICE '🗑️ Eliminando room huérfano: % (%)', orphaned_room.name, orphaned_room.id;
        
        -- Eliminar el room completo
        IF delete_room_complete(orphaned_room.id) THEN
            deleted_count := deleted_count + 1;
            total_deleted := total_deleted + 1;
            RAISE NOTICE '✅ Room huérfano eliminado: %', orphaned_room.name;
        ELSE
            RAISE NOTICE '❌ Error eliminando room huérfano: %', orphaned_room.name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '🎯 Limpieza de rooms huérfanos completada. Total eliminados: %', total_deleted;
    RETURN total_deleted;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error en cleanup_orphaned_rooms: %', SQLERRM;
        RETURN 0;
END;
$$;

-- Función para limpiar rooms vacíos
CREATE OR REPLACE FUNCTION cleanup_empty_rooms()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    empty_room RECORD;
    deleted_count INTEGER := 0;
    total_deleted INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 Buscando rooms vacíos...';
    
    -- Iterar sobre todos los rooms vacíos
    FOR empty_room IN 
        SELECT DISTINCT r.id, r.name
        FROM rooms r
        WHERE is_room_empty(r.id)
    LOOP
        RAISE NOTICE '🗑️ Eliminando room vacío: % (%)', empty_room.name, empty_room.id;
        
        -- Eliminar el room completo
        IF delete_room_complete(empty_room.id) THEN
            deleted_count := deleted_count + 1;
            total_deleted := total_deleted + 1;
            RAISE NOTICE '✅ Room vacío eliminado: %', empty_room.name;
        ELSE
            RAISE NOTICE '❌ Error eliminando room vacío: %', empty_room.name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '🎯 Limpieza de rooms vacíos completada. Total eliminados: %', total_deleted;
    RETURN total_deleted;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error en cleanup_empty_rooms: %', SQLERRM;
        RETURN 0;
END;
$$;

-- Función para limpiar jugadores desconectados
CREATE OR REPLACE FUNCTION cleanup_disconnected_players()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    disconnected_player RECORD;
    deleted_count INTEGER := 0;
    total_deleted INTEGER := 0;
    cutoff_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Considerar desconectados después de 30 minutos de inactividad
    cutoff_time := NOW() - INTERVAL '30 minutes';
    
    RAISE NOTICE '🔍 Buscando jugadores desconectados (última actividad antes de %)...', cutoff_time;
    
    -- Iterar sobre jugadores desconectados
    FOR disconnected_player IN 
        SELECT p.id, p.name, p.room_id, p.last_seen
        FROM players p
        WHERE p.last_seen < cutoff_time
        AND p.is_connected = TRUE
    LOOP
        RAISE NOTICE '🗑️ Eliminando jugador desconectado: % (última actividad: %)', 
                     disconnected_player.name, disconnected_player.last_seen;
        
        -- Eliminar el jugador
        DELETE FROM players WHERE id = disconnected_player.id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        IF deleted_count > 0 THEN
            total_deleted := total_deleted + 1;
            RAISE NOTICE '✅ Jugador desconectado eliminado: %', disconnected_player.name;
        ELSE
            RAISE NOTICE '❌ Error eliminando jugador desconectado: %', disconnected_player.name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '🎯 Limpieza de jugadores desconectados completada. Total eliminados: %', total_deleted;
    RETURN total_deleted;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error en cleanup_disconnected_players: %', SQLERRM;
        RETURN 0;
END;
$$;

-- Función para limpieza completa de todos los rooms
CREATE OR REPLACE FUNCTION cleanup_all_rooms()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_cleaned INTEGER := 0;
    orphaned_cleaned INTEGER := 0;
    empty_cleaned INTEGER := 0;
    disconnected_cleaned INTEGER := 0;
BEGIN
    RAISE NOTICE '🚀 Iniciando limpieza completa de la base de datos...';
    
    -- 1. Limpiar rooms huérfanos
    orphaned_cleaned := cleanup_orphaned_rooms();
    
    -- 2. Limpiar rooms vacíos
    empty_cleaned := cleanup_empty_rooms();
    
    -- 3. Limpiar jugadores desconectados
    disconnected_cleaned := cleanup_disconnected_players();
    
    -- Total de elementos limpiados
    total_cleaned := orphaned_cleaned + empty_cleaned + disconnected_cleaned;
    
    RAISE NOTICE '🎯 Limpieza completa finalizada:';
    RAISE NOTICE '   - Rooms huérfanos eliminados: %', orphaned_cleaned;
    RAISE NOTICE '   - Rooms vacíos eliminados: %', empty_cleaned;
    RAISE NOTICE '   - Jugadores desconectados eliminados: %', disconnected_cleaned;
    RAISE NOTICE '   - Total de elementos limpiados: %', total_cleaned;
    
    RETURN total_cleaned;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error en cleanup_all_rooms: %', SQLERRM;
        RETURN 0;
END;
$$;

-- =====================================================
-- FUNCIONES DE MONITOREO Y ESTADÍSTICAS
-- =====================================================

-- Función para obtener estadísticas de limpieza
CREATE OR REPLACE FUNCTION get_cleanup_stats()
RETURNS TABLE(
    total_rooms INTEGER,
    orphaned_rooms INTEGER,
    empty_rooms INTEGER,
    total_players INTEGER,
    disconnected_players INTEGER,
    last_cleanup TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM rooms) as total_rooms,
        (SELECT COUNT(*) FROM rooms r WHERE is_room_orphaned(r.id)) as orphaned_rooms,
        (SELECT COUNT(*) FROM rooms r WHERE is_room_empty(r.id)) as empty_rooms,
        (SELECT COUNT(*) FROM players) as total_players,
        (SELECT COUNT(*) FROM players p WHERE p.last_seen < NOW() - INTERVAL '30 minutes') as disconnected_players,
        NOW() as last_cleanup;
END;
$$;

-- Función para monitorear la salud de la base de datos
CREATE OR REPLACE FUNCTION monitor_database_health()
RETURNS TABLE(
    metric_name TEXT,
    metric_value TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Total Rooms'::TEXT,
        (SELECT COUNT(*)::TEXT FROM rooms),
        CASE 
            WHEN (SELECT COUNT(*) FROM rooms) > 100 THEN '⚠️ Muchos rooms'
            WHEN (SELECT COUNT(*) FROM rooms) > 50 THEN '🔶 Moderado'
            ELSE '✅ Normal'
        END
    UNION ALL
    SELECT 
        'Orphaned Rooms'::TEXT,
        (SELECT COUNT(*)::TEXT FROM rooms r WHERE is_room_orphaned(r.id)),
        CASE 
            WHEN (SELECT COUNT(*) FROM rooms r WHERE is_room_orphaned(r.id)) > 10 THEN '🔴 Crítico'
            WHEN (SELECT COUNT(*) FROM rooms r WHERE is_room_orphaned(r.id)) > 5 THEN '🟡 Advertencia'
            ELSE '✅ Normal'
        END
    UNION ALL
    SELECT 
        'Empty Rooms'::TEXT,
        (SELECT COUNT(*)::TEXT FROM rooms r WHERE is_room_empty(r.id)),
        CASE 
            WHEN (SELECT COUNT(*) FROM rooms r WHERE is_room_empty(r.id)) > 20 THEN '🔴 Crítico'
            WHEN (SELECT COUNT(*) FROM rooms r WHERE is_room_empty(r.id)) > 10 THEN '🟡 Advertencia'
            ELSE '✅ Normal'
        END
    UNION ALL
    SELECT 
        'Total Players'::TEXT,
        (SELECT COUNT(*)::TEXT FROM players),
        CASE 
            WHEN (SELECT COUNT(*) FROM players) > 500 THEN '⚠️ Muchos jugadores'
            WHEN (SELECT COUNT(*) FROM players) > 200 THEN '🔶 Moderado'
            ELSE '✅ Normal'
        END
    UNION ALL
    SELECT 
        'Disconnected Players'::TEXT,
        (SELECT COUNT(*)::TEXT FROM players p WHERE p.last_seen < NOW() - INTERVAL '30 minutes'),
        CASE 
            WHEN (SELECT COUNT(*) FROM players p WHERE p.last_seen < NOW() - INTERVAL '30 minutes') > 100 THEN '🔴 Crítico'
            WHEN (SELECT COUNT(*) FROM players p WHERE p.last_seen < NOW() - INTERVAL '30 minutes') > 50 THEN '🟡 Advertencia'
            ELSE '✅ Normal'
        END;
END;
$$;

-- =====================================================
-- TRIGGERS AUTOMÁTICOS
-- =====================================================

-- Trigger para eliminar automáticamente rooms vacíos
CREATE OR REPLACE FUNCTION trigger_auto_delete_empty_room()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    remaining_players INTEGER;
BEGIN
    -- Si se eliminó un jugador, verificar si el room quedó vacío
    IF TG_OP = 'DELETE' THEN
        -- Contar jugadores restantes en el room
        SELECT COUNT(*) INTO remaining_players
        FROM players
        WHERE room_id = OLD.room_id;
        
        -- Si no quedan jugadores, eliminar el room
        IF remaining_players = 0 THEN
            RAISE NOTICE '🏠 Room % quedó vacío, eliminando automáticamente...', OLD.room_id;
            PERFORM delete_room_complete(OLD.room_id);
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Crear el trigger
DROP TRIGGER IF EXISTS auto_delete_empty_room ON players;
CREATE TRIGGER auto_delete_empty_room
    AFTER DELETE ON players
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_delete_empty_room();

-- =====================================================
-- VERIFICACIÓN DE ESTADO
-- =====================================================

-- Para verificar que esta migración se aplicó correctamente, ejecuta:
-- SELECT routine_name, routine_type 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name LIKE '%cleanup%';

-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers 
-- WHERE trigger_schema = 'public';

-- =====================================================
-- RESUMEN
-- =====================================================
-- ✅ Esta migración implementa:
--    - 8 funciones de limpieza automática
--    - 2 funciones de monitoreo
--    - 1 trigger automático
--    - Sistema completo de limpieza de rooms y jugadores
-- ⚠️ Ejecutar en Supabase SQL Editor
-- 🔄 Continúa con la siguiente migración: 003_automation_config.sql



