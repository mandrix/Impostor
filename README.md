# 🎭 Impostor Game

Un juego multijugador del impostor desarrollado con **Next.js 15**, completamente funcional y listo para producción global.

## ✨ Características

### 🎮 **Gameplay Completo**
- **Creación automática de rooms** - Solo un clic para crear
- **Máximo 15 jugadores** por room
- **Sistema de temas** con múltiples categorías
- **Detección automática de impostores**
- **Sistema de votación** integrado
- **Múltiples rondas** configurables

### 🌐 **Funcionalidades Web**
- **Interfaz responsive** y moderna
- **Animaciones fluidas** con Framer Motion
- **Actualizaciones en tiempo real** simuladas
- **Navegación intuitiva** entre páginas
- **Sistema de invitaciones** con links compartibles

### 🎨 **Diseño y UX**
- **Chakra UI** para componentes de alta calidad
- **Tailwind CSS** para estilos personalizados
- **Iconos Lucide React** para una experiencia visual rica
- **Efectos de hover** y transiciones suaves
- **Tema personalizado** con colores del juego

## 🚀 Tecnologías Utilizadas

- **Frontend**: Next.js 15 + App Router
- **UI Components**: Chakra UI + Radix UI
- **Styling**: Tailwind CSS + CSS-in-JS
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Language**: TypeScript
- **Deploy**: Vercel (optimizado)

## 📱 Cómo Jugar

### 1. **Inicio**
- Ingresa tu nombre
- Elige crear un room o buscar uno existente

### 2. **Crear Room**
- Haz clic en "Crear Room Automáticamente"
- El room se crea instantáneamente con tu nombre
- Comparte el link con amigos

### 3. **Unirse a Room**
- Navega al lobby global
- Filtra y busca rooms disponibles
- Únete a cualquier room con espacios

### 4. **Configurar Juego**
- El host selecciona un tema
- Configura número de impostores y rondas
- Inicia el juego cuando todos estén listos

### 5. **Jugar**
- Cada jugador recibe su palabra o rol
- Los inocentes deben encontrar al impostor
- El impostor debe confundir y sobrevivir
- Sistema de votación para eliminar sospechosos

## 🎯 Temas Disponibles

- **Campeones de League of Legends** (22 palabras)
- **Videojuegos Famosos** (15 palabras)
- **Comida Rápida** (15 palabras)
- **Películas de Marvel** (15 palabras)
- **Deportes** (15 palabras)
- **Música** (16 palabras)

## 🛠️ Instalación y Desarrollo

### **Requisitos**
- Node.js 18+ 
- npm o yarn

### **Instalación Local**
```bash
# Clonar el repositorio
git clone <tu-repo>
cd impostor-game

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

### **Scripts Disponibles**
```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # Linting del código
npm run type-check   # Verificación de tipos
npm run format       # Formateo del código
```

## 🌍 Deploy en Vercel

### **Deploy Automático**
1. Conecta tu repositorio de GitHub a Vercel
2. Vercel detectará automáticamente que es un proyecto Next.js
3. El deploy se realizará automáticamente en cada push

### **Deploy Manual**
```bash
# Instalar Vercel CLI
npm i -g vercel

# Login en Vercel
vercel login

# Deploy
vercel --prod
```

### **Configuración de Vercel**
- ✅ **Optimizado para Edge Functions**
- ✅ **Compresión automática**
- ✅ **Headers de seguridad**
- ✅ **Build standalone**
- ✅ **Optimización de imágenes**

## 🔧 Configuración

### **Variables de Entorno**
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
```

### **Personalización**
- **Temas**: Edita `src/data/themes.json`
- **Colores**: Modifica `src/theme/index.ts`
- **Animaciones**: Ajusta en `tailwind.config.js`

## 📱 Responsive Design

- ✅ **Mobile First** - Optimizado para móviles
- ✅ **Tablet** - Interfaz adaptativa
- ✅ **Desktop** - Experiencia completa
- ✅ **Touch Friendly** - Gestos táctiles

## 🎨 Personalización de Temas

### **Agregar Nuevos Temas**
```json
{
  "nuevo_tema": {
    "name": "Nombre del Tema",
    "words": ["Palabra1", "Palabra2", "Palabra3"]
  }
}
```

### **Modificar Colores**
```typescript
// src/theme/index.ts
colors: {
  brand: {
    500: '#tu-color',
    600: '#tu-color-oscuro'
  }
}
```

## 🚀 Próximas Funcionalidades

- [ ] **Socket.IO** para comunicación real en tiempo real
- [ ] **Base de datos** para persistencia de datos
- [ ] **Autenticación** de usuarios
- [ ] **Chat en vivo** dentro de los rooms
- [ ] **Estadísticas** del juego
- [ ] **Historial** de partidas
- [ ] **Temas personalizados** por usuario
- [ ] **Diferentes modos** de juego

## 🔒 Seguridad

- ✅ **Headers de seguridad** configurados
- ✅ **Validación de formularios** con Zod
- ✅ **Sanitización** de inputs
- ✅ **CORS** configurado para Vercel

## 📊 Performance

- ✅ **Lazy loading** de componentes
- ✅ **Optimización de imágenes**
- ✅ **Code splitting** automático
- ✅ **Bundle analyzer** integrado
- ✅ **Compresión** automática

## 🤝 Contribuir

1. **Fork** el proyecto
2. **Crea** una rama para tu feature
3. **Commit** tus cambios
4. **Push** a la rama
5. **Abre** un Pull Request

### **Guías de Contribución**
- Usa **TypeScript** estricto
- Sigue el **eslint config**
- Mantén el **formato** del código
- Agrega **tests** para nuevas funcionalidades

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. Ver el archivo `LICENSE` para más detalles.

## 👥 Autores

- **Mandrix** - Desarrollo principal y arquitectura
- **Contribuidores** - Mejoras y funcionalidades

## 🆘 Soporte

- **Issues**: Reporta bugs en GitHub Issues
- **Discussions**: Preguntas y sugerencias
- **Wiki**: Documentación detallada

## 🌟 Agradecimientos

- **Next.js Team** por el framework increíble
- **Chakra UI** por los componentes de calidad
- **Vercel** por la plataforma de deploy
- **Comunidad** por el feedback y contribuciones

---

**¡Disfruta jugando al Impostor Game! 🎭✨**
