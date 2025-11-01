#!/bin/bash

# =====================================================
# SCRIPT DE INSTALACIÓN AUTOMÁTICA DE FUNCIONES DE DB
# =====================================================

echo "🚀 Iniciando migración a funciones de base de datos..."
echo "=================================================="

# Verificar que estamos en el directorio correcto
if [ ! -f "supabase-database-functions.sql" ]; then
    echo "❌ Error: No se encontró supabase-database-functions.sql"
    echo "   Asegúrate de estar en el directorio raíz del proyecto"
    exit 1
fi

if [ ! -f "supabase-automation-config.sql" ]; then
    echo "❌ Error: No se encontró supabase-automation-config.sql"
    echo "   Asegúrate de estar en el directorio raíz del proyecto"
    exit 1
fi

echo "✅ Archivos SQL encontrados correctamente"

# Crear directorio de backup
echo "📁 Creando directorio de backup..."
mkdir -p database-backup
cp supabase-database-functions.sql database-backup/
cp supabase-automation-config.sql database-backup/
echo "✅ Backup creado en database-backup/"

# Mostrar instrucciones de instalación
echo ""
echo "🎯 PASOS PARA IMPLEMENTAR EN SUPABASE:"
echo "======================================"
echo ""
echo "1️⃣  Ve a tu proyecto en Supabase Dashboard"
echo "2️⃣  Navega a SQL Editor"
echo "3️⃣  Ejecuta PRIMERO: supabase-database-functions.sql"
echo "4️⃣  Ejecuta SEGUNDO: supabase-automation-config.sql"
echo "5️⃣  Verifica que no hay errores en los logs"
echo ""
echo "🔍 VERIFICACIÓN POST-INSTALACIÓN:"
echo "=================================="
echo ""
echo "Ejecuta estas consultas para verificar la instalación:"
echo ""
echo "-- Verificar funciones creadas:"
echo "SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%cleanup%';"
echo ""
echo "-- Verificar triggers:"
echo "SELECT trigger_name, event_manipulation, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public';"
echo ""
echo "-- Probar limpieza manual:"
echo "SELECT cleanup_all_rooms();"
echo ""
echo "-- Ver estadísticas:"
echo "SELECT get_cleanup_stats();"
echo ""
echo "-- Monitorear salud:"
echo "SELECT monitor_database_health();"
echo ""

# Crear archivo de verificación
cat > database-backup/verification-queries.sql << 'EOF'
-- =====================================================
-- CONSULTAS DE VERIFICACIÓN POST-INSTALACIÓN
-- =====================================================

-- 1. Verificar funciones creadas
SELECT 
    routine_name, 
    routine_type,
    '✅ Función creada' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%cleanup%'
ORDER BY routine_name;

-- 2. Verificar triggers
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    '✅ Trigger activo' as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

-- 3. Verificar índices creados
SELECT 
    indexname,
    tablename,
    '✅ Índice creado' as status
FROM pg_indexes 
WHERE indexname LIKE '%cleanup%' 
   OR indexname LIKE '%orphaned%'
   OR indexname LIKE '%disconnected%'
ORDER BY indexname;

-- 4. Probar función de limpieza
SELECT cleanup_all_rooms() as resultado_limpieza;

-- 5. Ver estadísticas
SELECT get_cleanup_stats() as estadisticas;

-- 6. Monitorear salud de la DB
SELECT monitor_database_health() as estado_salud;

-- 7. Ver métricas de performance
SELECT get_performance_metrics() as metricas_performance;

-- 8. Verificar cron jobs (si pg_cron está habilitado)
SELECT 
    jobid,
    jobname,
    schedule,
    '✅ Cron job activo' as status
FROM cron.job 
WHERE jobname LIKE '%cleanup%'
ORDER BY jobname;
EOF

echo "📝 Archivo de verificación creado: database-backup/verification-queries.sql"
echo ""

# Crear archivo de rollback
cat > database-backup/rollback-instructions.sql << 'EOF'
-- =====================================================
-- INSTRUCCIONES DE ROLLBACK (SI ES NECESARIO)
-- =====================================================

-- ⚠️  ADVERTENCIA: Solo ejecutar si necesitas revertir la migración
-- ⚠️  Esto eliminará TODA la funcionalidad de limpieza automática

-- 1. Cancelar todos los cron jobs de limpieza
SELECT cancel_all_cleanup_jobs();

-- 2. Eliminar triggers
DROP TRIGGER IF EXISTS auto_delete_empty_room ON players;
DROP TRIGGER IF EXISTS update_last_seen ON players;

-- 3. Eliminar funciones (DESCOMENTAR SOLO SI ES NECESARIO)
-- DROP FUNCTION IF EXISTS delete_room_complete(UUID);
-- DROP FUNCTION IF EXISTS is_room_orphaned(UUID);
-- DROP FUNCTION IF EXISTS is_room_empty(UUID);
-- DROP FUNCTION IF EXISTS cleanup_orphaned_rooms();
-- DROP FUNCTION IF EXISTS cleanup_empty_rooms();
-- DROP FUNCTION IF EXISTS cleanup_disconnected_players();
-- DROP FUNCTION IF EXISTS cleanup_all_rooms();
-- DROP FUNCTION IF EXISTS trigger_auto_delete_empty_room_enhanced();
-- DROP FUNCTION IF EXISTS trigger_update_last_seen();
-- DROP FUNCTION IF EXISTS log_cleanup_action(TEXT, JSONB);
-- DROP FUNCTION IF EXISTS notify_room_deletion(UUID, TEXT);
-- DROP FUNCTION IF EXISTS monitor_database_health();
-- DROP FUNCTION IF EXISTS get_performance_metrics();
-- DROP FUNCTION IF EXISTS send_webhook_notification(TEXT, JSONB);
-- DROP FUNCTION IF EXISTS schedule_delayed_cleanup(INTEGER);
-- DROP FUNCTION IF EXISTS cancel_all_cleanup_jobs();
-- DROP FUNCTION IF EXISTS cleanup_old_data();
-- DROP FUNCTION IF EXISTS get_cleanup_stats();
-- DROP FUNCTION IF EXISTS force_cleanup_rooms();

-- 4. Eliminar índices creados
DROP INDEX IF EXISTS idx_players_host_connected;
DROP INDEX IF EXISTS idx_players_last_seen;
DROP INDEX IF EXISTS idx_players_room_count;
DROP INDEX IF EXISTS idx_rooms_created_at_old;
DROP INDEX IF EXISTS idx_players_created_at_old;
DROP INDEX IF EXISTS idx_game_actions_created_at_old;

-- 5. Verificar que se eliminó todo
SELECT 'Rollback completado' as status;
EOF

echo "🔄 Archivo de rollback creado: database-backup/rollback-instructions.sql"
echo ""

# Crear archivo de configuración de entorno
cat > database-backup/env-config.md << 'EOF'
# Configuración de Variables de Entorno

## Variables Requeridas en Supabase

### 1. Habilitar pg_cron (si no está habilitado)
- Ve a Settings → Database
- Busca "pg_cron" en las extensiones
- Habilítala si no está activa

### 2. Verificar Permisos
- Las funciones se crean con SECURITY DEFINER
- Los permisos se otorgan automáticamente
- No se requieren variables de entorno adicionales

### 3. Configuración de Logs
- Los logs se muestran en la consola de Supabase
- Puedes verlos en SQL Editor → Logs
- También en Dashboard → Logs

## Monitoreo Recomendado

### Después de la instalación:
1. Verificar logs cada 5-10 minutos
2. Probar funciones manualmente
3. Monitorear cron jobs
4. Verificar triggers funcionando

### Alertas a configurar:
- Rooms huérfanos detectados
- Limpieza automática fallida
- Performance degradada
- Errores en funciones
EOF

echo "⚙️  Archivo de configuración creado: database-backup/env-config.md"
echo ""

# Mostrar resumen final
echo "🎉 INSTALACIÓN PREPARADA COMPLETAMENTE!"
echo "======================================"
echo ""
echo "📁 Archivos creados en database-backup/:"
echo "   ├── supabase-database-functions.sql"
echo "   ├── supabase-automation-config.sql"
echo "   ├── verification-queries.sql"
echo "   ├── rollback-instructions.sql"
echo "   └── env-config.md"
echo ""
echo "🚀 Próximos pasos:"
echo "   1. Ejecutar los archivos SQL en Supabase"
echo "   2. Verificar la instalación con las consultas"
echo "   3. Monitorear logs y funcionamiento"
echo "   4. Ajustar intervalos según necesidades"
echo ""
echo "📚 Documentación completa en: MIGRATION_TO_DATABASE_FUNCTIONS.md"
echo ""
echo "✅ ¡Todo listo para la migración!"
echo ""
echo "🔗 Enlaces útiles:"
echo "   - Supabase Dashboard: https://supabase.com/dashboard"
echo "   - Documentación: MIGRATION_TO_DATABASE_FUNCTIONS.md"
echo "   - Backup: database-backup/"
echo ""

# Hacer el script ejecutable
chmod +x install-database-functions.sh

echo "🔧 Script marcado como ejecutable"
echo "   Puedes ejecutarlo nuevamente con: ./install-database-functions.sh"




