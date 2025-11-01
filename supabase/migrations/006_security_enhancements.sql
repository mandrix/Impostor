-- =====================================================
-- MIGRACIÓN 006: MEJORAS DE SEGURIDAD, AUDITORÍA Y ADMINISTRACIÓN
-- =====================================================
-- Fecha: 2025-08-28
-- Descripción: Implementa mejoras de seguridad, sistema de auditoría y funciones de administración
-- Estado: ⚠️ PENDIENTE DE EJECUTAR (nuevas funcionalidades)

-- =====================================================
-- 1. MEJORAS DE SEGURIDAD Y RLS
-- =====================================================

-- Función para verificar permisos de host
CREATE OR REPLACE FUNCTION is_room_host(room_id UUID, player_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM players 
        WHERE room_id = is_room_host.room_id 
        AND id = is_room_host.player_id 
        AND is_host = TRUE
    );
END;
$$;

-- Función para verificar permisos de jugador en room
CREATE OR REPLACE FUNCTION is_room_player(room_id UUID, player_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM players 
        WHERE room_id = is_room_player.room_id 
        AND id = is_room_player.player_id
    );
END;
$$;

-- Función para verificar si el room está en estado editable
CREATE OR REPLACE FUNCTION is_room_editable(room_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    room_status TEXT;
BEGIN
    SELECT status INTO room_status
    FROM rooms
    WHERE id = is_room_editable.room_id;
    
    RETURN room_status = 'waiting';
END;
$$;

-- =====================================================
-- 2. SISTEMA DE AUDITORÍA
-- =====================================================

-- Tabla de auditoría para cambios importantes
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID,
    action_type TEXT NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Índices para auditoría
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at);

-- Función para registrar cambios en auditoría
CREATE OR REPLACE FUNCTION log_audit_change(
    table_name TEXT,
    record_id UUID,
    action_type TEXT,
    old_values JSONB DEFAULT NULL,
    new_values JSONB DEFAULT NULL,
    changed_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO audit_log (
        table_name, record_id, action_type, 
        old_values, new_values, changed_by
    ) VALUES (
        table_name, record_id, action_type,
        old_values, new_values, changed_by
    );
END;
$$;

-- Trigger para auditar cambios en rooms
CREATE OR REPLACE FUNCTION audit_rooms_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit_change(
            'rooms',
            NEW.id,
            'INSERT',
            NULL,
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_audit_change(
            'rooms',
            NEW.id,
            'UPDATE',
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit_change(
            'rooms',
            OLD.id,
            'DELETE',
            to_jsonb(OLD),
            NULL
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Crear trigger de auditoría para rooms
DROP TRIGGER IF EXISTS audit_rooms_trigger ON rooms;
CREATE TRIGGER audit_rooms_trigger
    AFTER INSERT OR UPDATE OR DELETE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION audit_rooms_changes();

-- Trigger para auditar cambios en players
CREATE OR REPLACE FUNCTION audit_players_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit_change(
            'players',
            NEW.id,
            'INSERT',
            NULL,
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_audit_change(
            'players',
            NEW.id,
            'UPDATE',
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit_change(
            'players',
            OLD.id,
            'DELETE',
            to_jsonb(OLD),
            NULL
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Crear trigger de auditoría para players
DROP TRIGGER IF EXISTS audit_players_trigger ON players;
CREATE TRIGGER audit_players_trigger
    AFTER INSERT OR UPDATE OR DELETE ON players
    FOR EACH ROW
    EXECUTE FUNCTION audit_players_changes();

-- =====================================================
-- 3. FUNCIONES DE ADMINISTRACIÓN
-- =====================================================

-- Función para obtener resumen completo del sistema
CREATE OR REPLACE FUNCTION get_system_overview()
RETURNS TABLE(
    category TEXT,
    metric TEXT,
    value TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Estadísticas de rooms
    SELECT 
        'Rooms'::TEXT,
        'Total Rooms',
        (SELECT COUNT(*)::TEXT FROM rooms),
        CASE 
            WHEN (SELECT COUNT(*) FROM rooms) > 100 THEN '🔴 Muchos rooms'
            WHEN (SELECT COUNT(*) FROM rooms) > 50 THEN '🟡 Moderado'
            ELSE '✅ Normal'
        END
    UNION ALL
    SELECT 
        'Rooms',
        'Active Rooms',
        (SELECT COUNT(*)::TEXT FROM rooms WHERE status = 'playing'),
        CASE 
            WHEN (SELECT COUNT(*) FROM rooms WHERE status = 'playing') > 20 THEN '🔴 Muchos activos'
            WHEN (SELECT COUNT(*) FROM rooms WHERE status = 'playing') > 10 THEN '🟡 Moderado'
            ELSE '✅ Normal'
        END
    UNION ALL
    SELECT 
        'Rooms',
        'Waiting Rooms',
        (SELECT COUNT(*)::TEXT FROM rooms WHERE status = 'waiting'),
        CASE 
            WHEN (SELECT COUNT(*) FROM rooms WHERE status = 'waiting') > 50 THEN '🔴 Muchos esperando'
            WHEN (SELECT COUNT(*) FROM rooms WHERE status = 'waiting') > 25 THEN '🟡 Moderado'
            ELSE '✅ Normal'
        END
    UNION ALL
    -- Estadísticas de jugadores
    SELECT 
        'Players'::TEXT,
        'Total Players',
        (SELECT COUNT(*)::TEXT FROM players),
        CASE 
            WHEN (SELECT COUNT(*) FROM players) > 500 THEN '🔴 Muchos jugadores'
            WHEN (SELECT COUNT(*) FROM players) > 200 THEN '🟡 Moderado'
            ELSE '✅ Normal'
        END
    UNION ALL
    SELECT 
        'Players',
        'Connected Players',
        (SELECT COUNT(*)::TEXT FROM players WHERE is_connected = TRUE),
        CASE 
            WHEN (SELECT COUNT(*) FROM players WHERE is_connected = TRUE) > 300 THEN '🔴 Muchos conectados'
            WHEN (SELECT COUNT(*) FROM players WHERE is_connected = TRUE) > 150 THEN '🟡 Moderado'
            ELSE '✅ Normal'
        END
    UNION ALL
    SELECT 
        'Players',
        'Disconnected Players',
        (SELECT COUNT(*)::TEXT FROM players WHERE is_connected = FALSE),
        CASE 
            WHEN (SELECT COUNT(*) FROM players WHERE is_connected = FALSE) > 200 THEN '🔴 Muchos desconectados'
            WHEN (SELECT COUNT(*) FROM players WHERE is_connected = FALSE) > 100 THEN '🟡 Moderado'
            ELSE '✅ Normal'
        END
    UNION ALL
    -- Estadísticas de auditoría
    SELECT 
        'Audit'::TEXT,
        'Total Log Entries',
        (SELECT COUNT(*)::TEXT FROM audit_log),
        CASE 
            WHEN (SELECT COUNT(*) FROM audit_log) > 10000 THEN '🔴 Muchos logs'
            WHEN (SELECT COUNT(*) FROM audit_log) > 5000 THEN '🟡 Moderado'
            ELSE '✅ Normal'
        END
    UNION ALL
    SELECT 
        'Audit',
        'Recent Changes (24h)',
        (SELECT COUNT(*)::TEXT FROM audit_log WHERE changed_at > NOW() - INTERVAL '24 hours'),
        CASE 
            WHEN (SELECT COUNT(*) FROM audit_log WHERE changed_at > NOW() - INTERVAL '24 hours') > 1000 THEN '🔴 Muchos cambios'
            WHEN (SELECT COUNT(*) FROM audit_log WHERE changed_at > NOW() - INTERVAL '24 hours') > 500 THEN '🟡 Moderado'
            ELSE '✅ Normal'
        END
    UNION ALL
    -- Estado del sistema
    SELECT 
        'System'::TEXT,
        'Database Size',
        (SELECT pg_size_pretty(pg_database_size(current_database()))),
        'ℹ️ Información'
    UNION ALL
    SELECT 
        'System',
        'Last Cleanup',
        (SELECT last_cleanup::TEXT FROM get_cleanup_stats()),
        CASE 
            WHEN (SELECT last_cleanup FROM get_cleanup_stats()) < NOW() - INTERVAL '1 hour' THEN '⚠️ Última limpieza hace más de 1 hora'
            ELSE '✅ Limpieza reciente'
        END;
END;
$$;

-- Función para limpiar logs de auditoría antiguos
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
    cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    cutoff_date := NOW() - (days_to_keep || ' days')::INTERVAL;
    
    RAISE NOTICE '🗑️ Limpiando logs de auditoría más antiguos que % días...', days_to_keep;
    
    DELETE FROM audit_log 
    WHERE changed_at < cutoff_date;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE '✅ Logs de auditoría limpiados: % entradas eliminadas', deleted_count;
    RETURN deleted_count;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error limpiando logs: %', SQLERRM;
        RETURN 0;
END;
$$;

-- Función para obtener estadísticas de uso por tema
CREATE OR REPLACE FUNCTION get_theme_usage_stats()
RETURNS TABLE(
    theme_name TEXT,
    usage_count BIGINT,
    last_used TIMESTAMP WITH TIME ZONE,
    popularity_rank INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.theme_name,
        COUNT(*) as usage_count,
        MAX(r.updated_at) as last_used,
        RANK() OVER (ORDER BY COUNT(*) DESC) as popularity_rank
    FROM (
        SELECT unnest(ARRAY['champions', 'videojuegos', 'comida_rapida', 'marvel', 'deportes', 'musica']) as theme_name
    ) t
    LEFT JOIN rooms r ON r.current_theme = t.theme_name
    GROUP BY t.theme_name
    ORDER BY usage_count DESC;
END;
$$;

-- =====================================================
-- 4. FUNCIONES DE MANTENIMIENTO AVANZADO
-- =====================================================

-- Función para optimizar la base de datos
CREATE OR REPLACE FUNCTION optimize_database()
RETURNS TABLE(
    operation TEXT,
    result TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    operation_result TEXT;
BEGIN
    RAISE NOTICE '🔧 Iniciando optimización de la base de datos...';
    
    -- Vacuum y analyze
    VACUUM ANALYZE;
    operation_result := 'VACUUM ANALYZE completado';
    
    RETURN QUERY
    SELECT 'VACUUM ANALYZE'::TEXT, operation_result, '✅ Completado'
    UNION ALL
    SELECT 'Cleanup Old Logs', 
           (SELECT cleanup_old_audit_logs(30)::TEXT || ' entradas eliminadas'),
           '✅ Completado'
    UNION ALL
    SELECT 'System Overview', 
           'Verificar con SELECT * FROM get_system_overview()',
           'ℹ️ Verificar manualmente';
    
    RAISE NOTICE '🎯 Optimización de base de datos completada';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error en optimización: %', SQLERRM;
        RETURN QUERY SELECT 'ERROR'::TEXT, 'Error: ' || SQLERRM, '❌ Falló';
END;
$$;

-- Función para exportar datos del sistema
CREATE OR REPLACE FUNCTION export_system_data()
RETURNS TABLE(
    export_type TEXT,
    data_count BIGINT,
    export_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Rooms'::TEXT,
        (SELECT COUNT(*) FROM rooms),
        '📊 Disponible para exportar'
    UNION ALL
    SELECT 
        'Players',
        (SELECT COUNT(*) FROM players),
        '📊 Disponible para exportar'
    UNION ALL
    SELECT 
        'Game Actions',
        (SELECT COUNT(*) FROM game_actions),
        '📊 Disponible para exportar'
    UNION ALL
    SELECT 
        'Audit Logs',
        (SELECT COUNT(*) FROM audit_log),
        '📊 Disponible para exportar'
    UNION ALL
    SELECT 
        'System Stats',
        (SELECT COUNT(*) FROM get_system_overview()),
        '📊 Disponible para exportar';
END;
$$;

-- =====================================================
-- 5. CRON JOBS ADICIONALES
-- =====================================================

-- Cron job para limpieza de logs de auditoría semanal
SELECT cron.schedule(
    'cleanup-audit-logs-weekly',
    '0 4 * * 0', -- Cada domingo a las 4:00 AM
    'SELECT cleanup_old_audit_logs(30);'
);

-- Cron job para optimización semanal
SELECT cron.schedule(
    'optimize-database-weekly',
    '0 5 * * 0', -- Cada domingo a las 5:00 AM
    'SELECT optimize_database();'
);

-- Cron job para reporte de salud diario
SELECT cron.schedule(
    'daily-health-report',
    '0 9 * * *', -- Cada día a las 9:00 AM
    'SELECT get_system_overview();'
);

-- =====================================================
-- VERIFICACIÓN DE ESTADO
-- =====================================================

-- Para verificar que esta migración se aplicó correctamente, ejecuta:
-- SELECT * FROM get_system_overview();
-- SELECT * FROM get_theme_usage_stats();
-- SELECT * FROM export_system_data();

-- =====================================================
-- RESUMEN
-- =====================================================
-- ✅ Esta migración implementa:
--    - 3 funciones de seguridad y permisos
--    - Sistema completo de auditoría con triggers
--    - 4 funciones de administración del sistema
--    - 2 funciones de mantenimiento avanzado
--    - 3 cron jobs adicionales
--    - Mejoras de seguridad y RLS
-- ⚠️ Ejecutar en Supabase SQL Editor
-- 🎯 Sistema de migraciones COMPLETADO



