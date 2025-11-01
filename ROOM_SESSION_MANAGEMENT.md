# 🎮 Sistema de Manejo de Sesiones y Limpieza de Rooms

## 📋 **Descripción General**

Este documento describe las mejoras implementadas para resolver el problema de dependencias entre rooms y jugadores, implementando un sistema de validación por nombre y manejo de sesiones.

## 🎯 **Problemas Resueltos**

### **1. Dependencia del Room y Jugador**
- **Antes**: Los rooms permanecían activos aunque los jugadores se salieran
- **Ahora**: Sistema automático de limpieza que elimina rooms vacíos y huérfanos

### **2. Creación de Jugadores Duplicados**
- **Antes**: Se creaba un nuevo jugador cada vez que se unía a un room
- **Ahora**: Validación por nombre que reutiliza jugadores existentes

### **3. Manejo de Sesiones**
- **Antes**: No había concepto de sesión
- **Ahora**: Sistema de sesiones basado en nombre de jugador

## 🔧 **Funcionalidades Implementadas**

### **1. Validación por Nombre de Jugador**

#### **En `createRoom`:**
```typescript
// Verificar si ya existe un room con este nombre de host
const existingRoom = await supabase
  .from('rooms')
  .select('*, players (*)')
  .eq('name', playerName)
  .eq('status', 'waiting')
  .single()

if (existingRoom) {
  // Reutilizar room existente y actualizar sesión del host
  const updatedHost = await supabase
    .from('players')
    .update({
      session_id: this.generateId(),
      last_seen: new Date().toISOString(),
      is_connected: true
    })
    .eq('id', existingHost.id)
}
```

#### **En `joinRoom`:**
```typescript
// Verificar si ya existe un jugador con ese nombre en el room
const existingPlayer = room.players.find(p => p.name === playerName.trim())

if (existingPlayer) {
  // Actualizar la sesión del jugador existente
  const updatedPlayer = await supabase
    .from('players')
    .update({
      session_id: this.generateId(),
      last_seen: new Date().toISOString(),
      is_connected: true
    })
    .eq('id', existingPlayer.id)
}
```

### **2. Sistema de Limpieza Automática**

#### **Limpieza de Rooms Huérfanos:**
```typescript
async cleanupOrphanedRooms(): Promise<number> {
  // Buscar rooms sin host válido
  const { data: rooms } = await supabase.from('rooms').select('id')
  
  for (const room of rooms) {
    if (await this.isRoomOrphaned(room.id)) {
      await this.deleteRoom(room.id)
    }
  }
}
```

#### **Limpieza de Rooms Vacíos:**
```typescript
async cleanupEmptyRooms(): Promise<number> {
  // Buscar rooms sin jugadores
  const { data: emptyRooms } = await supabase
    .from('rooms')
    .select('id')
    .not('id', 'in', `(SELECT DISTINCT room_id FROM players WHERE room_id IS NOT NULL)`)
  
  for (const room of emptyRooms) {
    await this.deleteRoom(room.id)
  }
}
```

#### **Limpieza de Jugadores Desconectados:**
```typescript
async cleanupDisconnectedPlayers(): Promise<number> {
  // Buscar jugadores que no se han conectado en 30 minutos
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  
  const { data: disconnectedPlayers } = await supabase
    .from('players')
    .select('id, room_id, name')
    .lt('last_seen', thirtyMinutesAgo)
  
  for (const player of disconnectedPlayers) {
    await this.removePlayer(player.room_id, player.id)
  }
}
```

### **3. Sistema de Salida Mejorado**

#### **En `removePlayer`:**
```typescript
async removePlayer(roomId: string, playerId: string): Promise<boolean> {
  // Verificar si es el host
  const player = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .eq('room_id', roomId)
    .single()

  if (player.is_host) {
    // Si era host, eliminar todo el room
    return await this.deleteRoom(roomId)
  } else {
    // Si no era host, solo eliminar el jugador
    await supabase.from('players').delete().eq('id', playerId)
    
    // Verificar si el room quedó vacío
    const remainingPlayers = await supabase
      .from('players')
      .select('id')
      .eq('room_id', roomId)
    
    if (remainingPlayers.data?.length === 0) {
      await this.deleteRoom(roomId)
    }
  }
}
```

## 🚀 **APIs Creadas**

### **POST `/api/admin/cleanup-rooms`**
```typescript
// Ejecuta limpieza automática completa
{
  "success": true,
  "message": "Limpieza completada exitosamente",
  "summary": {
    "orphanedRooms": 2,
    "emptyRooms": 1,
    "disconnectedPlayers": 3,
    "totalCleaned": 6
  }
}
```

## 🎣 **Hooks Disponibles**

### **`useRoomCleanup`**
```typescript
const { 
  cleanupRooms, 
  isCleaning, 
  lastResult, 
  error 
} = useRoomCleanup()

// Usar
await cleanupRooms()
```

## 🧪 **Componente de Prueba**

### **`RoomCleanupTest`**
- Botón para ejecutar limpieza manual
- Muestra resultados de la limpieza
- Incluido en la página del lobby para pruebas

## 📊 **Flujo de Funcionamiento**

### **1. Creación de Room:**
```
Usuario crea room → Verificar si existe room con mismo nombre
├─ Si existe: Reutilizar room y actualizar sesión del host
└─ Si no existe: Crear nuevo room
```

### **2. Unirse a Room:**
```
Usuario se une → Verificar si ya existe jugador con ese nombre
├─ Si existe: Actualizar sesión del jugador existente
└─ Si no existe: Crear nuevo jugador
```

### **3. Salida de Room:**
```
Usuario sale → Verificar tipo de jugador
├─ Si es host: Eliminar room completo
└─ Si no es host: Eliminar solo jugador
   └─ Si room queda vacío: Eliminar room
```

### **4. Limpieza Automática:**
```
Limpieza programada → Ejecutar en paralelo
├─ Limpiar rooms huérfanos
├─ Limpiar rooms vacíos
└─ Limpiar jugadores desconectados
```

## 🔍 **Logging y Debugging**

### **Logs Implementados:**
- 🏠 Creación de rooms
- 🔄 Reutilización de rooms existentes
- 🆕 Creación de nuevos jugadores
- 🔄 Actualización de sesiones
- 🚪 Salida de jugadores
- 🗑️ Eliminación de elementos
- 🧹 Proceso de limpieza

### **Ejemplo de Log:**
```
🏠 Creando room para Alejandro...
🔄 Room "Alejandro" ya existe, uniendo al jugador existente...
✅ Host Alejandro reconectado al room existente
```

## ⚡ **Beneficios de la Implementación**

1. **Eliminación de Duplicados**: No más jugadores con el mismo nombre
2. **Persistencia de Sesiones**: Los jugadores mantienen su estado
3. **Limpieza Automática**: Rooms vacíos se eliminan automáticamente
4. **Mejor Performance**: Menos datos innecesarios en la base de datos
5. **Experiencia de Usuario**: Reconexión automática a rooms existentes
6. **Mantenimiento**: Sistema automático de limpieza

## 🚨 **Consideraciones de Seguridad**

- **Validación de Nombres**: Solo se permiten nombres válidos
- **Limpieza Segura**: Solo se eliminan elementos huérfanos/vacíos
- **Logging Completo**: Todas las operaciones se registran
- **Manejo de Errores**: Errores se capturan y manejan apropiadamente

## 🔮 **Próximos Pasos**

1. **Implementar Limpieza Programada**: Ejecutar automáticamente cada X tiempo
2. **Métricas de Limpieza**: Dashboard con estadísticas de limpieza
3. **Notificaciones**: Alertar a administradores sobre problemas
4. **Backup Automático**: Respaldar datos antes de limpieza masiva
5. **Configuración**: Permitir ajustar parámetros de limpieza





