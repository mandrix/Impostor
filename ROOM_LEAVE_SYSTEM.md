# 🚪 Sistema de Salida de Jugadores

## 📋 **Descripción General**

Este sistema maneja la salida de jugadores de los rooms de manera inteligente, eliminando automáticamente rooms cuando el host se sale y notificando a todos los jugadores afectados.

## 🎯 **Funcionalidades Implementadas**

### **1. Salida de Jugadores Normales**
- **Acción**: El jugador se sale del room
- **Resultado**: Solo se elimina el jugador del room
- **Redirección**: El jugador va al inicio

### **2. Salida del Host**
- **Acción**: El host se sale del room
- **Resultado**: Se elimina TODO el room (jugadores, estado del juego, acciones)
- **Redirección**: Todos los jugadores van al inicio con mensaje informativo

### **3. Limpieza Automática**
- **Detección**: Rooms "huérfanos" (sin host válido)
- **Limpieza**: Eliminación automática de rooms corruptos
- **Mantenimiento**: API de administración para limpieza manual

## 🔧 **APIs Creadas**

### **POST `/api/rooms/[id]/leave`**
```typescript
// Request
{
  "playerId": "uuid-del-jugador",
  "playerName": "Nombre del Jugador"
}

// Response - Jugador normal se sale
{
  "success": true,
  "action": "player_left",
  "message": "Nombre se salió del room",
  "roomInfo": { ... }
}

// Response - Host se sale
{
  "success": true,
  "action": "host_left",
  "message": "El host se salió del room. El room ha sido eliminado.",
  "redirectTo": "/"
}
```

### **POST `/api/admin/cleanup-orphaned-rooms`**
```typescript
// Response
{
  "success": true,
  "message": "Limpieza completada. X rooms huérfanos eliminados.",
  "deletedCount": 3
}
```

## 🎣 **Hooks Disponibles**

### **`useRoomLeave`**
```typescript
const { leaveRoom, isLeaving, error, clearError } = useRoomLeave({
  roomId: "room-id",
  playerId: "player-id", 
  playerName: "Nombre"
})

// Usar
leaveRoom() // Confirma y ejecuta la salida
```

### **`useHostLeaveDetection`**
```typescript
const { hostLeft } = useHostLeaveDetection({
  roomId: "room-id",
  isHost: false, // Solo para jugadores NO host
  playerName: "Nombre"
})

// hostLeft será true si el host se salió
```

## 🧩 **Componentes Disponibles**

### **`LeaveRoomButton`**
```typescript
<LeaveRoomButton
  roomId="room-id"
  playerId="player-id"
  playerName="Nombre"
  variant="outline"
  size="md"
  colorScheme="red"
/>
```

## 📊 **Flujo de Funcionamiento**

### **Jugador Normal se Sale:**
1. ✅ Usuario hace clic en "Salirse del Room"
2. ✅ Confirmación del usuario
3. ✅ API elimina jugador de la base de datos
4. ✅ Jugador es redirigido al inicio
5. ✅ Room continúa funcionando para otros jugadores

### **Host se Sale:**
1. ✅ Host hace clic en "Salirse del Room"
2. ✅ Confirmación del host
3. ✅ API elimina TODO el room (cascada)
4. ✅ Todos los jugadores son notificados
5. ✅ Todos son redirigidos al inicio
6. ✅ Room completamente eliminado

### **Detección Automática:**
1. ✅ Jugadores no-host verifican cada 5 segundos si el room existe
2. ✅ Si el room no existe, se detecta automáticamente
3. ✅ Notificación y redirección automática
4. ✅ No hay "hanging" o estados inconsistentes

## 🧹 **Mantenimiento y Limpieza**

### **Limpieza Automática:**
- **Detección**: Rooms sin host válido
- **Acción**: Eliminación completa del room
- **Logs**: Información detallada de cada operación

### **Limpieza Manual:**
```typescript
// Desde el código
import { cleanupOrphanedRooms } from '@/lib/api'

const result = await cleanupOrphanedRooms()
console.log(`${result.deletedCount} rooms eliminados`)
```

### **API de Administración:**
- **Endpoint**: `/api/admin/cleanup-orphaned-rooms`
- **Método**: POST
- **Uso**: Herramientas de administración, cron jobs, etc.

## 🔒 **Seguridad y Validaciones**

### **Validaciones Implementadas:**
- ✅ **Player ID requerido**: No se puede salir sin identificación
- ✅ **Verificación de host**: Solo el host puede eliminar el room completo
- ✅ **Eliminación en cascada**: Foreign keys respetadas
- ✅ **Logs detallados**: Auditoría completa de todas las operaciones

### **Manejo de Errores:**
- ✅ **Errores de base de datos**: Capturados y loggeados
- ✅ **Errores de red**: Fallback a estado anterior
- ✅ **Confirmación del usuario**: Doble verificación antes de salir
- ✅ **Mensajes informativos**: Usuario siempre sabe qué pasó

## 🚀 **Uso en el Frontend**

### **Ejemplo Básico:**
```typescript
import { LeaveRoomButton } from '@/components/LeaveRoomButton'
import { useHostLeaveDetection } from '@/hooks/useHostLeaveDetection'

function GameRoom({ roomId, playerId, playerName, isHost }) {
  // Detectar si el host se sale
  useHostLeaveDetection({ roomId, isHost, playerName })

  return (
    <div>
      {/* Contenido del room */}
      
      {/* Botón para salirse */}
      <LeaveRoomButton
        roomId={roomId}
        playerId={playerId}
        playerName={playerName}
      />
    </div>
  )
}
```

## 📝 **Logs y Debugging**

### **Logs Disponibles:**
- 🏗️ **Creación de rooms**
- 🚪 **Salida de jugadores**
- 💥 **Eliminación de rooms**
- 🧹 **Limpieza automática**
- ⚠️ **Detección de rooms huérfanos**

### **Debugging:**
```typescript
// En la consola del navegador
console.log('🔍 Verificando room:', roomId)
console.log('👤 Jugador saliendo:', playerName)
console.log('💥 Host se salió, eliminando room')
```

## 🎯 **Beneficios del Sistema**

1. **✅ Limpieza automática**: No hay rooms "zombies"
2. **✅ Experiencia consistente**: Usuarios siempre saben qué pasó
3. **✅ Base de datos limpia**: Sin datos inconsistentes
4. **✅ Notificaciones en tiempo real**: Usuarios informados inmediatamente
5. **✅ Redirección inteligente**: Flujo de usuario optimizado
6. **✅ Mantenimiento fácil**: APIs de administración disponibles

## 🔮 **Futuras Mejoras**

- **WebSocket**: Notificaciones en tiempo real sin polling
- **Historial**: Log de todas las salidas y entradas
- **Backup**: Respaldos antes de eliminar rooms importantes
- **Analytics**: Métricas de uso y patrones de salida
