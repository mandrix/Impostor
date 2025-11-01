# 🚀 Guía de Deploy en Vercel

## 📋 Requisitos Previos

- ✅ Cuenta en [Vercel](https://vercel.com)
- ✅ Repositorio en GitHub/GitLab/Bitbucket
- ✅ Proyecto Next.js funcionando localmente

## 🌐 Deploy Automático (Recomendado)

### 1. **Conectar Repositorio**
1. Ve a [vercel.com](https://vercel.com) y inicia sesión
2. Haz clic en "New Project"
3. Selecciona tu repositorio de GitHub
4. Vercel detectará automáticamente que es un proyecto Next.js

### 2. **Configuración Automática**
- **Framework Preset**: Next.js (detectado automáticamente)
- **Root Directory**: `./` (por defecto)
- **Build Command**: `npm run build` (por defecto)
- **Output Directory**: `.next` (por defecto)
- **Install Command**: `npm install` (por defecto)

### 3. **Variables de Entorno**
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
```

### 4. **Deploy**
- Haz clic en "Deploy"
- Vercel construirá y desplegará tu aplicación
- Obtendrás una URL como: `https://tu-app.vercel.app`

## 🔧 Deploy Manual

### 1. **Instalar Vercel CLI**
```bash
npm i -g vercel
```

### 2. **Login en Vercel**
```bash
vercel login
```

### 3. **Deploy desde el Proyecto**
```bash
cd impostor-game
vercel --prod
```

### 4. **Seguir las Instrucciones**
- Selecciona tu cuenta
- Elige el proyecto o crea uno nuevo
- Confirma la configuración
- Espera a que se complete el deploy

## ⚙️ Configuración Avanzada

### **vercel.json**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "app/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### **Variables de Entorno en Vercel**
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega las variables necesarias

## 🔄 Deploy Continuo

### **Configurar Webhooks**
1. En tu repositorio de GitHub
2. Settings → Webhooks
3. Agregar URL de Vercel
4. Seleccionar eventos: `push`, `pull_request`

### **Automatización**
- Cada `push` a `main` activará un deploy automático
- Los Pull Requests generarán previews automáticos
- Deploy automático en merge a `main`

## 📱 Dominios Personalizados

### 1. **Agregar Dominio**
1. Vercel Dashboard → Domains
2. Agregar tu dominio personalizado
3. Configurar DNS según las instrucciones

### 2. **Configuración DNS**
```dns
# Ejemplo para Cloudflare
Type: CNAME
Name: @
Target: cname.vercel-dns.com
```

## 🚨 Solución de Problemas

### **Build Fails**
```bash
# Verificar build local
npm run build

# Verificar tipos
npm run type-check

# Verificar linting
npm run lint
```

### **Errores Comunes**
- **Module not found**: Verificar dependencias en `package.json`
- **Type errors**: Ejecutar `npm run type-check`
- **Build timeout**: Verificar `vercel.json` y optimizaciones

### **Logs de Deploy**
1. Vercel Dashboard → Deployments
2. Seleccionar deploy fallido
3. Ver logs detallados

## 📊 Monitoreo y Analytics

### **Vercel Analytics**
- Activar en Settings → Analytics
- Métricas de performance
- Core Web Vitals
- Análisis de usuarios

### **Logs en Tiempo Real**
```bash
vercel logs --follow
```

## 🔒 Seguridad

### **Headers de Seguridad**
Ya configurados en `next.config.ts`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: origin-when-cross-origin`

### **Variables de Entorno**
- Nunca committear `.env` files
- Usar Vercel Environment Variables
- Rotar claves regularmente

## 🚀 Optimizaciones para Producción

### **Build Optimizations**
- ✅ `output: 'standalone'`
- ✅ `compress: true`
- ✅ `poweredByHeader: false`
- ✅ `generateEtags: false`

### **Performance**
- ✅ Lazy loading automático
- ✅ Code splitting
- ✅ Image optimization
- ✅ Bundle analyzer

## 📱 PWA y Offline

### **Configuración PWA**
```typescript
// next.config.ts
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
})
```

### **Manifest.json**
```json
{
  "name": "Impostor Game",
  "short_name": "Impostor",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#0ea5e9"
}
```

## 🔄 Rollback

### **Revertir a Versión Anterior**
1. Vercel Dashboard → Deployments
2. Seleccionar versión estable
3. Promover a producción

### **Deploy Específico**
```bash
vercel --prod --force
```

## 📞 Soporte

### **Recursos Útiles**
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

### **Contacto**
- **Vercel Support**: support@vercel.com
- **GitHub Issues**: Reportar bugs del proyecto
- **Discussions**: Preguntas y sugerencias

---

## 🎯 Checklist de Deploy

- [ ] Proyecto compila localmente (`npm run build`)
- [ ] Tests pasan (`npm run test`)
- [ ] Linting limpio (`npm run lint`)
- [ ] Variables de entorno configuradas
- [ ] Dominio configurado (opcional)
- [ ] Deploy exitoso en Vercel
- [ ] Aplicación funcionando en producción
- [ ] Analytics configurado
- [ ] Monitoreo activo

**¡Tu Impostor Game estará listo para jugadores de todo el mundo! 🌍🎮**
