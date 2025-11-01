-- =====================================================
-- MIGRACIÓN 003: CONFIGURACIÓN DE AUTOMATIZACIÓN Y CRON JOBS
-- =====================================================
-- Fecha: 2025-08-28
-- Descripción: Configura cron jobs automáticos y funciones avanzadas de notificación
-- Estado: ⚠️ PENDIENTE DE EJECUTAR (reemplaza archivos anteriores)

-- NOTA: Esta migración reemplaza los archivos:
-- - supabase-automation-config.sql
-- - supabase-automation-config-fixed.sql

-- =====================================================
-- 1. CONFIGURACIÓN DE CRON JOBS AUTOMÁTICOS
-- =====================================================

-- Habilitar la extensión pg_cron si no está habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cron job para limpieza automática cada 5 minutos
SELECT cron.schedule(
    'cleanup-rooms-every-5-minutes',
    '*/5 * * * *', -- Cada 5 minutos
    'SELECT cleanup_all_rooms();'
);

-- Cron job para limpieza de jugadores inactivos cada 10 minutos
SELECT cron.schedule(
    'cleanup-inactive-players',
    '*/10 * * * *', -- Cada 10 minutos
    'SELECT cleanup_disconnected_players();'
);

-- Cron job para limpieza completa cada hora
SELECT cron.schedule(
    'full-cleanup-hourly',
    '0 * * * *', -- Cada hora
    'SELECT cleanup_all_rooms();'
);

-- Cron job para monitoreo de salud cada 15 minutos
SELECT cron.schedule(
    'monitor-database-health',
    '*/15 * * * *', -- Cada 15 minutos
    'SELECT monitor_database_health();'
);

-- =====================================================
-- 2. FUNCIONES DE NOTIFICACIÓN Y LOGGING
-- =====================================================

-- Función para registrar acciones de limpieza
CREATE OR REPLACE FUNCTION log_cleanup_action(
    action_type TEXT,
    details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO game_actions (
        room_id,
        type,
        player_id,
        data,
        created_at
    ) VALUES (
        NULL, -- No hay room específico para limpieza global
        'cleanup',
        NULL, -- No hay jugador específico
        jsonb_build_object(
            'action_type', action_type,
            'details', details,
            'timestamp', NOW()
        ),
        NOW()
    );
END;
$$;

-- Función para notificar sobre rooms eliminados
CREATE OR REPLACE FUNCTION notify_room_deletion(room_id UUID, room_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Aquí podrías integrar con servicios de notificación
    -- Por ahora solo loggeamos
    PERFORM log_cleanup_action(
        'room_deleted',
        jsonb_build_object(
            'room_id', room_id,
            'room_name', room_name,
            'deletion_time', NOW()
        )
    );
    
    RAISE NOTICE '🔔 Notificación: Room "%" (%) eliminado', room_name, room_id;
END;
$$;

-- Función para notificar sobre jugadores eliminados
CREATE OR REPLACE FUNCTION notify_player_deletion(player_id UUID, player_name TEXT, room_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM log_cleanup_action(
        'player_deleted',
        jsonb_build_object(
            'player_id', player_id,
            'player_name', player_name,
            'room_id', room_id,
            'deletion_time', NOW()
        )
    );
    
    RAISE NOTICE '🔔 Notificación: Jugador "%" (%) eliminado del room %', player_name, player_id, room_id;
END;
$$;

-- =====================================================
-- 3. TRIGGERS MEJORADOS CON NOTIFICACIONES
-- =====================================================

-- Trigger mejorado para eliminación automática de rooms
CREATE OR REPLACE FUNCTION trigger_auto_delete_empty_room_enhanced()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    remaining_players INTEGER;
    room_name TEXT;
BEGIN
    -- Si se eliminó un jugador, verificar si el room quedó vacío
    IF TG_OP = 'DELETE' THEN
        -- Contar jugadores restantes en el room
        SELECT COUNT(*) INTO remaining_players
        FROM players
        WHERE room_id = OLD.room_id;
        
        -- Si no quedan jugadores, eliminar el room
        IF remaining_players = 0 THEN
            -- Obtener el nombre del room antes de eliminarlo
            SELECT name INTO room_name
            FROM rooms
            WHERE id = OLD.room_id;
            
            RAISE NOTICE '🏠 Room "%" quedó vacío, eliminando automáticamente...', room_name;
            
            -- Notificar antes de eliminar
            PERFORM notify_room_deletion(OLD.room_id, room_name);
            
            -- Eliminar el room
            PERFORM delete_room_complete(OLD.room_id);
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Reemplazar el trigger anterior con el mejorado
DROP TRIGGER IF EXISTS auto_delete_empty_room ON players;
CREATE TRIGGER auto_delete_empty_room_enhanced
    AFTER DELETE ON players
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_delete_empty_room_enhanced();

-- =====================================================
-- 4. FUNCIONES DE MANTENIMIENTO AVANZADO
-- =====================================================

-- Función para limpiar rooms antiguos (más de 24 horas)
CREATE OR REPLACE FUNCTION cleanup_old_rooms()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    old_room RECORD;
    deleted_count INTEGER := 0;
    total_deleted INTEGER := 0;
    cutoff_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Considerar antiguos después de 24 horas
    cutoff_time := NOW() - INTERVAL '24 hours';
    
    RAISE NOTICE '🔍 Buscando rooms antiguos (creados antes de %)...', cutoff_time;
    
    -- Iterar sobre rooms antiguos
    FOR old_room IN 
        SELECT r.id, r.name, r.created_at
        FROM rooms r
        WHERE r.created_at < cutoff_time
        AND r.status != 'playing' -- No eliminar rooms en juego activo
    LOOP
        RAISE NOTICE '🗑️ Eliminando room antiguo: % (creado: %)', 
                     old_room.name, old_room.created_at;
        
        -- Eliminar el room completo
        IF delete_room_complete(old_room.id) THEN
            deleted_count := deleted_count + 1;
            total_deleted := total_deleted + 1;
            RAISE NOTICE '✅ Room antiguo eliminado: %', old_room.name;
        ELSE
            RAISE NOTICE '❌ Error eliminando room antiguo: %', old_room.name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '🎯 Limpieza de rooms antiguos completada. Total eliminados: %', total_deleted;
    RETURN total_deleted;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error en cleanup_old_rooms: %', SQLERRM;
        RETURN 0;
END;
$$;

-- Función para limpiar acciones del juego antiguas
CREATE OR REPLACE FUNCTION cleanup_old_game_actions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
    cutoff_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Considerar antiguas después de 7 días
    cutoff_time := NOW() - INTERVAL '7 days';
    
    RAISE NOTICE '🔍 Limpiando acciones del juego antiguas (antes de %)...', cutoff_time;
    
    -- Eliminar acciones antiguas
    DELETE FROM game_actions 
    WHERE created_at < cutoff_time;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE '🎯 Limpieza de acciones antiguas completada. Total eliminadas: %', deleted_count;
    RETURN deleted_count;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error en cleanup_old_game_actions: %', SQLERRM;
        RETURN 0;
END;
$$;

-- Función para limpieza completa avanzada
CREATE OR REPLACE FUNCTION advanced_cleanup_all()
RETURNS TABLE(
    cleanup_type TEXT,
    items_cleaned INTEGER,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    orphaned_cleaned INTEGER := 0;
    empty_cleaned INTEGER := 0;
    disconnected_cleaned INTEGER := 0;
    old_rooms_cleaned INTEGER := 0;
    old_actions_cleaned INTEGER := 0;
BEGIN
    RAISE NOTICE '🚀 Iniciando limpieza avanzada completa...';
    
    -- 1. Limpieza básica
    orphaned_cleaned := cleanup_orphaned_rooms();
    empty_cleaned := cleanup_empty_rooms();
    disconnected_cleaned := cleanup_disconnected_players();
    
    -- 2. Limpieza avanzada
    old_rooms_cleaned := cleanup_old_rooms();
    old_actions_cleaned := cleanup_old_game_actions();
    
    -- Retornar resultados
    RETURN QUERY
    SELECT 'Orphaned Rooms'::TEXT, orphaned_cleaned, 
           CASE WHEN orphaned_cleaned > 0 THEN '✅ Completado' ELSE 'ℹ️ Sin cambios' END
    UNION ALL
    SELECT 'Empty Rooms'::TEXT, empty_cleaned,
           CASE WHEN empty_cleaned > 0 THEN '✅ Completado' ELSE 'ℹ️ Sin cambios' END
    UNION ALL
    SELECT 'Disconnected Players'::TEXT, disconnected_cleaned,
           CASE WHEN disconnected_cleaned > 0 THEN '✅ Completado' ELSE 'ℹ️ Sin cambios' END
    UNION ALL
    SELECT 'Old Rooms'::TEXT, old_rooms_cleaned,
           CASE WHEN old_rooms_cleaned > 0 THEN '✅ Completado' ELSE 'ℹ️ Sin cambios' END
    UNION ALL
    SELECT 'Old Game Actions'::TEXT, old_actions_cleaned,
           CASE WHEN old_actions_cleaned > 0 THEN '✅ Completado' ELSE 'ℹ️ Sin cambios' END;
    
    RAISE NOTICE '🎯 Limpieza avanzada completada:';
    RAISE NOTICE '   - Rooms huérfanos: %', orphaned_cleaned;
    RAISE NOTICE '   - Rooms vacíos: %', empty_cleaned;
    RAISE NOTICE '   - Jugadores desconectados: %', disconnected_cleaned;
    RAISE NOTICE '   - Rooms antiguos: %', old_rooms_cleaned;
    RAISE NOTICE '   - Acciones antiguas: %', old_actions_cleaned;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error en advanced_cleanup_all: %', SQLERRM;
        RETURN QUERY SELECT 'ERROR'::TEXT, 0, '❌ Error: ' || SQLERRM;
END;
$$;

-- =====================================================
-- 5. CRON JOBS ADICIONALES
-- =====================================================

-- Cron job para limpieza avanzada diaria a las 2 AM
SELECT cron.schedule(
    'advanced-cleanup-daily',
    '0 2 * * *', -- Cada día a las 2:00 AM
    'SELECT advanced_cleanup_all();'
);

-- Cron job para limpieza de acciones antiguas semanal
SELECT cron.schedule(
    'cleanup-old-actions-weekly',
    '0 3 * * 0', -- Cada domingo a las 3:00 AM
    'SELECT cleanup_old_game_actions();'
);

-- =====================================================
-- 6. FUNCIONES DE DIAGNÓSTICO
-- =====================================================

-- Función para obtener estado de los cron jobs
CREATE OR REPLACE FUNCTION get_cron_jobs_status()
RETURNS TABLE(
    job_name TEXT,
    schedule TEXT,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.jobname::TEXT,
        c.schedule::TEXT,
        c.last_run,
        c.next_run,
        CASE 
            WHEN c.last_run IS NULL THEN '⏳ Nunca ejecutado'
            WHEN c.last_run < NOW() - INTERVAL '1 hour' THEN '⚠️ Posible problema'
            ELSE '✅ Funcionando'
        END::TEXT
    FROM cron.job c
    ORDER BY c.jobname;
END;
$$;

-- Función para obtener resumen completo del sistema
CREATE OR REPLACE FUNCTION get_system_summary()
RETURNS TABLE(
    metric TEXT,
    value TEXT,
    recommendation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Database Health'::TEXT,
        (SELECT string_agg(status, ', ') FROM monitor_database_health()),
        CASE 
            WHEN (SELECT COUNT(*) FROM monitor_database_health() WHERE status LIKE '%Crítico%') > 0 THEN '🔴 Requiere atención inmediata'
            WHEN (SELECT COUNT(*) FROM monitor_database_health() WHERE status LIKE '%Advertencia%') > 0 THEN '🟡 Monitorear de cerca'
            ELSE '✅ Sistema saludable'
        END
    UNION ALL
    SELECT 
        'Cron Jobs Status'::TEXT,
        (SELECT COUNT(*)::TEXT FROM cron.job) || ' jobs configured',
        CASE 
            WHEN (SELECT COUNT(*) FROM cron.job WHERE last_run < NOW() - INTERVAL '1 hour') > 0 THEN '⚠️ Algunos jobs pueden tener problemas'
            ELSE '✅ Todos los jobs funcionando'
        END
    UNION ALL
    SELECT 
        'Last Cleanup'::TEXT,
        (SELECT last_cleanup::TEXT FROM get_cleanup_stats()),
        CASE 
            WHEN (SELECT last_cleanup FROM get_cleanup_stats()) < NOW() - INTERVAL '1 hour' THEN '⚠️ Última limpieza hace más de 1 hora'
            ELSE '✅ Limpieza reciente'
        END;
END;
$$;

-- =====================================================
-- VERIFICACIÓN DE ESTADO
-- =====================================================

-- Para verificar que esta migración se aplicó correctamente, ejecuta:
-- SELECT * FROM get_cron_jobs_status();
-- SELECT * FROM get_system_summary();
-- SELECT * FROM advanced_cleanup_all();

-- =====================================================
-- RESUMEN
-- =====================================================
-- ✅ Esta migración implementa:
--    - 6 cron jobs automáticos
--    - 8 funciones de notificación y limpieza avanzada
--    - 1 trigger mejorado
--    - Sistema completo de automatización
--    - Funciones de diagnóstico y monitoreo
-- ⚠️ Ejecutar en Supabase SQL Editor
-- 🔄 Continúa con la siguiente migración: 004_game_mechanics.sql



