# 🚀 Sistema de Migraciones de Supabase - Impostor Game

## 📋 **Resumen del Sistema**

Este sistema de migraciones organiza todas las funcionalidades de la base de datos en **6 migraciones secuenciales** que reemplazan los archivos SQL anteriores y proporcionan un sistema completo, organizado y mantenible.

## 🗂️ **Estructura de Migraciones**

### **001_initial_schema_setup.sql** ✅ COMPLETADA
- **Estado**: Ya ejecutada en tu base de datos
- **Contenido**: Esquema base (4 tablas, índices, triggers, RLS)
- **Acción**: No ejecutar (solo para referencia)

### **002_database_functions.sql** ⚠️ PENDIENTE
- **Estado**: Reemplaza archivos anteriores
- **Contenido**: 8 funciones de limpieza automática + 2 de monitoreo + 1 trigger
- **Archivos reemplazados**: `supabase-database-functions*.sql`

### **003_automation_config.sql** ⚠️ PENDIENTE
- **Estado**: Reemplaza archivos anteriores
- **Contenido**: 6 cron jobs + 8 funciones de notificación + 1 trigger mejorado
- **Archivos reemplazados**: `supabase-automation-config*.sql`

### **004_game_mechanics.sql** ⚠️ PENDIENTE
- **Estado**: Nuevas funcionalidades
- **Contenido**: 4 funciones de temas + 3 de generación de palabras + 4 de gestión del juego + 2 de votación

### **005_room_management.sql** ⚠️ PENDIENTE
- **Estado**: Nuevas funcionalidades
- **Contenido**: 3 funciones de gestión de rooms + 3 de sesiones + 2 de estadísticas + 2 de validación

### **006_security_enhancements.sql** ⚠️ PENDIENTE
- **Estado**: Nuevas funcionalidades
- **Contenido**: 3 funciones de seguridad + sistema de auditoría + 4 de administración + 2 de mantenimiento

## 🎯 **Plan de Implementación**

### **Opción 1: Migración Incremental (Recomendada)**
1. **Ejecutar migración 002** - Funciones de limpieza
2. **Ejecutar migración 003** - Automatización y cron jobs
3. **Ejecutar migración 004** - Mecánicas del juego
4. **Ejecutar migración 005** - Gestión de rooms
5. **Ejecutar migración 006** - Seguridad y auditoría

### **Opción 2: Migración Completa (Si prefieres empezar limpio)**
1. **Hacer backup** de tu base de datos actual
2. **Eliminar** todas las funciones y triggers existentes
3. **Ejecutar** todas las migraciones en orden (001-006)

## 📝 **Instrucciones de Ejecución**

### **Paso 1: Acceder a Supabase**
1. Ve a [supabase.com](https://supabase.com)
2. Selecciona tu proyecto
3. Ve a **SQL Editor**

### **Paso 2: Ejecutar Migraciones**
1. **Copia** el contenido de cada migración
2. **Pega** en el SQL Editor
3. **Ejecuta** el script completo
4. **Verifica** que no hay errores

### **Paso 3: Verificar Estado**
Después de cada migración, ejecuta las consultas de verificación:

```sql
-- Para migración 002
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%cleanup%';

-- Para migración 003
SELECT * FROM get_cron_jobs_status();

-- Para migración 004
SELECT get_random_theme();

-- Para migración 005
SELECT * FROM get_room_stats('tu-room-id-aqui');

-- Para migración 006
SELECT * FROM get_system_overview();
```

## 🔧 **Funcionalidades Principales**

### **Sistema de Limpieza Automática**
- ✅ Limpieza de rooms huérfanos
- ✅ Limpieza de rooms vacíos
- ✅ Limpieza de jugadores desconectados
- ✅ Limpieza de rooms antiguos (>24h)
- ✅ Limpieza de acciones antiguas (>7 días)

### **Cron Jobs Automáticos**
- 🕐 Cada 5 minutos: Limpieza básica
- 🕐 Cada 10 minutos: Limpieza de jugadores
- 🕐 Cada hora: Limpieza completa
- 🕐 Cada 15 minutos: Monitoreo de salud
- 🕐 Diario a las 2 AM: Limpieza avanzada
- 🕐 Semanal: Optimización y limpieza de logs

### **Mecánicas del Juego**
- 🎲 6 temas con palabras predefinidas
- 🎯 Generación aleatoria de palabras
- 🎭 Asignación automática de roles
- 🗳️ Sistema de votación
- 🔄 Gestión de rondas

### **Gestión de Rooms**
- 🏠 Creación completa de rooms
- 👤 Unión y abandono de jugadores
- 📊 Estadísticas detalladas
- 🔒 Validación de permisos

### **Seguridad y Auditoría**
- 🛡️ Verificación de permisos
- 📝 Log completo de cambios
- 📊 Monitoreo del sistema
- 🔧 Funciones de mantenimiento

## 🚨 **Consideraciones Importantes**

### **Antes de Ejecutar**
- ✅ Verifica que tienes acceso de administrador en Supabase
- ✅ Haz backup de tu base de datos actual
- ✅ Lee cada migración para entender qué hace

### **Durante la Ejecución**
- ⚠️ Ejecuta las migraciones en orden (001 → 006)
- ⚠️ No interrumpas la ejecución
- ⚠️ Verifica que no hay errores después de cada migración

### **Después de Ejecutar**
- ✅ Verifica el estado con las consultas de verificación
- ✅ Prueba las funcionalidades básicas
- ✅ Monitorea los cron jobs

## 📊 **Monitoreo del Sistema**

### **Consultas de Estado**
```sql
-- Estado general del sistema
SELECT * FROM get_system_overview();

-- Estado de los cron jobs
SELECT * FROM get_cron_jobs_status();

-- Estadísticas de limpieza
SELECT * FROM get_cleanup_stats();

-- Salud de la base de datos
SELECT * FROM monitor_database_health();

-- Uso de temas
SELECT * FROM get_theme_usage_stats();
```

### **Limpieza Manual**
```sql
-- Limpieza completa
SELECT cleanup_all_rooms();

-- Limpieza avanzada
SELECT * FROM advanced_cleanup_all();

-- Optimización
SELECT * FROM optimize_database();
```

## 🆘 **Solución de Problemas**

### **Error: "Function already exists"**
- ✅ Normal, significa que la función ya existe
- ✅ La migración la actualizará

### **Error: "Extension pg_cron does not exist"**
- ⚠️ Contacta al soporte de Supabase
- ⚠️ pg_cron debe estar habilitado en tu proyecto

### **Error: "Permission denied"**
- ⚠️ Verifica que tienes permisos de administrador
- ⚠️ Usa el SQL Editor con credenciales correctas

### **Cron Jobs no funcionan**
- ⚠️ Verifica que pg_cron esté habilitado
- ⚠️ Ejecuta manualmente: `SELECT cleanup_all_rooms();`

## 📞 **Soporte**

Si encuentras problemas:
1. **Revisa** los logs de error en Supabase
2. **Verifica** que todas las migraciones anteriores se ejecutaron
3. **Consulta** la documentación de Supabase
4. **Contacta** al equipo de desarrollo

## 🎉 **Beneficios del Nuevo Sistema**

- 🚀 **Mejor Performance**: Funciones optimizadas en la base de datos
- 🛡️ **Mayor Seguridad**: RLS y validaciones mejoradas
- 🔄 **Automatización**: Limpieza automática sin intervención manual
- 📊 **Monitoreo**: Visibilidad completa del estado del sistema
- 🧹 **Mantenimiento**: Fácil de mantener y actualizar
- 📝 **Auditoría**: Log completo de todos los cambios
- 🎮 **Funcionalidades**: Sistema completo de mecánicas del juego

---

**🎯 ¡Tu base de datos estará completamente optimizada y lista para producción!**



