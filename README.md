# Tappealo — Panel de Gestión

Panel de administración para restaurantes que utilizan **Tappealo**, una plataforma de pedidos digitales mediante menú QR.

Permite administrar productos, categorías, pedidos, stock, pagos y configuraciones del comercio desde una interfaz web moderna.

---

# 🚀 Tecnologías

- **React**
- **TypeScript**
- **Vite**
- **TailwindCSS**
- **Shadcn UI**
- **Firebase**
  - Firestore
  - Storage
  - Authentication
  - Cloud Functions
- **Mercado Pago API**

---

# 🧠 Funcionalidades

## Gestión del menú
- Crear / editar productos
- Crear / editar categorías
- Activar / desactivar productos
- Control de stock
- Importación de productos mediante Excel

## Pedidos
- Visualización en tiempo real
- Estados del pedido
- Gestión de flujo de cocina

## Configuración del comercio
- Logo del restaurante
- Dirección
- Link de Google Maps
- Redes sociales

## Métodos de pago
- Mercado Pago
- Efectivo
- Configuración de credenciales

## Gestión del menú QR
- Generación de QR por mesa
- Control del estado del servicio

---

# 📁 Estructura del proyecto
src/
components/ui > botones etc
components/
AdminRoute.tsx    Ruteo de admin              
ImportProductsExcel.tsx         Componente de exportacion de excel para menu
OrderColumn.tsx                 Columna de pedidos
PromotionFormModal.tsx          Modal de promociones - form
CategoriesModal.tsx             Modal de categorias - form
NavLink.tsx                     Navegacion del sistema
OrderHistory.tsx                Historial de pedidos
PromotionItemsModal.tsx         Modal de lista de productos para el modal de promociones
FeaturedProductsModal.tsx       Modal productos destacados
Notifications.tsx               Notificaciones
PrintableReceipt.tsx            Ticket para imprimir
StockManagement.tsx             Pantalla Stock
ImageUploadBox.tsx              Subir imagen
OrderCard.tsx                   Card de las ordenes
PromosManagement.tsx            Pantalla Promos

hooks/
use-mobile.tsx          
useAdminVenues.ts    obtener menues - admin   
useCategories.ts      funciones de categorias
usePaymentMehtods.ts   funciones de metodos de pagos
useQZPrinter.ts  funciones de impresora - a futuro
use-toast.ts     notificaciones
useAuth.ts      funciones de autenticacion
useNotificationSound.ts notificaciones - sonido
useProducts.ts       funciones de productos
useQrLocationsMap.ts  obtener nombre de qr a partir de id
useAdminUsers.ts    funciones para administrar usuarios - admin
useCalls.ts     funciones para llamadas de cliente - mozo    
useOrders.ts    funciones para comandas
usePromotions.ts      funciones para promociones
useQrs.ts funciones para QR

pages/ todas las pantallas

integrations/firebase configuracion firebase
assets
lib

# api
functions/ api del sistema para que se conecte el menu publico
index todos los endpoints 




# 📁 EJECUTAR PROYECTO

npm run dev



---

# ⚙️ Instalación

```bash
git clone 
cd orderflow-tappealo-vision-1

npm install
