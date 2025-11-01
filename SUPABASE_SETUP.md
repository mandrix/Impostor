# 🚀 Migración a Supabase - Guía Completa

## 📋 **Resumen de Cambios Realizados**

### ✅ **Archivos Creados/Modificados:**
- `.gitignore` - Agregadas variables de entorno
- `src/lib/supabase.ts` - Cliente de Supabase
- `src/lib/supabase-db.ts` - Nueva implementación de DB
- `src/hooks/useSupabaseRealtime.ts` - Hook para tiempo real
- `supabase-setup.sql` - Script SQL para configurar DB
- `env.example` - Ejemplo de variables de entorno
- Todas las APIs actualizadas para usar Supabase

### 🔄 **APIs Migradas:**
- `POST /api/rooms` - Crear room
- `GET /api/rooms` - Obtener rooms disponibles
- `POST /api/rooms/[id]/join` - Unirse a room
- `POST /api/rooms/[id]/start-game` - Iniciar juego
- `POST /api/rooms/[id]/generate-word` - Generar palabra
- `GET /api/rooms/[id]/player-state` - Estado del jugador

## 🗄️ **Configuración de Base de Datos**

### **1. Ir a Supabase Dashboard:**
- Ve a [supabase.com](https://supabase.com)
- Accede a tu proyecto: `wmxpjudjrgxbhrpzqrlr`

### **2. Ejecutar Script SQL:**
- Ve a **SQL Editor**
- Haz clic en **"New query"**
- Copia y pega el contenido de `supabase-setup.sql`
- Haz clic en **"Run"**

### **3. Verificar Tablas Creadas:**
- Ve a **Table Editor**
- Deberías ver:
  - `rooms`
  - `players`
  - `game_states`
  - `game_actions`

## 🔐 **Variables de Entorno**

### **Crear archivo .env.local:**
```bash
# En la raíz de tu proyecto
cp env.example .env.local
```

### **Editar .env.local con tus credenciales:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://wmxpjudjrgxbhrpzqrlr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndteHBqdWRqcmd4YmhycHpxcmxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTA1ODMsImV4cCI6MjA3MTkyNjU4M30.SKFxSwnmqkhV1fHw9S7PBcKtUkiAjiKx4S74oy3nHGQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndteHBqdWRqcmd4YmhycHpxcmxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM1MDU4MywiZXhwIjoyMDcxOTI2NTgzfQ.xHrgLeAnF8ny0fPXRqmCGWZAOU9avyM7sn4SU24OZHw
SUPABASE_DB_PASSWORD=9*-EJBuBWB5@b?6
```

## 🧪 **Pruebas Locales**

### **1. Instalar dependencias:**
```bash
npm install
```

### **2. Ejecutar en desarrollo:**
```bash
npm run dev
```

### **3. Probar funcionalidades:**
- Crear room
- Unirse a room
- Iniciar juego
- Generar palabras

## 🚀 **Deploy en Vercel**

### **1. Commit y Push:**
```bash
git add .
git commit -m "Migración a Supabase completada"
git push origin main
```

### **2. Configurar Vercel:**
- Ve a tu proyecto en [vercel.com](https://vercel.com)
- En **Settings > Environment Variables**, agrega:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://wmxpjudjrgxbhrpzqrlr.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndteHBqdWRqcmd4YmhycHpxcmxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTA1ODMsImV4cCI6MjA3MTkyNjU4M30.SKFxSwnmqkhV1fHw9S7PBcKtUkiAjiKx4S74oy3nHGQ
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndteHBqdWRqcmd4YmhycHpxcmxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM1MDU4MywiZXhwIjoyMDcxOTI2NTgzfQ.xHrgLeAnF8ny0fPXRqmCGWZAOU9avyM7sn4SU24OZHw
  ```

### **3. Deploy automático:**
- Vercel detectará los cambios y hará deploy automáticamente

## 🔍 **Verificar Funcionamiento**

### **En Supabase Dashboard:**
- **Table Editor**: Ver tablas creadas
- **Logs**: Ver consultas ejecutándose
- **API**: Verificar endpoints funcionando

### **En tu aplicación:**
- Crear room exitosamente
- Ver rooms en el lobby
- Unirse a rooms
- Jugar partidas

## 🎯 **Beneficios de la Migración**

✅ **Datos persistentes** entre reinicios  
✅ **Escalabilidad global** con Vercel Edge  
✅ **Tiempo real** con Supabase Realtime  
✅ **Seguridad** con Row Level Security  
✅ **Gratis** hasta 500MB + 50k filas  
✅ **Integración perfecta** con Next.js  

## 🆘 **Solución de Problemas**

### **Error: "Faltan variables de entorno de Supabase"**
- Verifica que `.env.local` existe y tiene las credenciales correctas
- Reinicia el servidor de desarrollo

### **Error: "Table does not exist"**
- Ejecuta el script SQL en Supabase
- Verifica que las tablas se crearon correctamente

### **Error: "Permission denied"**
- Verifica las políticas RLS en Supabase
- Asegúrate de que las credenciales son correctas

## 📞 **Soporte**

Si tienes problemas:
1. Verifica los logs en Supabase Dashboard
2. Revisa la consola del navegador
3. Verifica que las variables de entorno estén configuradas

---

**¡Tu juego del impostor ahora está completamente migrado a Supabase! 🎭✨**
