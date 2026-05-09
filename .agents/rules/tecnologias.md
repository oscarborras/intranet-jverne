---
trigger: always_on
---

### Stack por defecto

* Framework: **Next.js 16 con App Router y Server Components**.  No uses next-pwa
* UI: **Tailwind CSS v4**
* UI Icons: **Lucide React**
* Base de datos / Auth: **Supabase-local** (self hosted)
* **Tipado:** Es obligatorio el uso de TypeScript. No se permite el uso de `any`. Define interfaces para cada objeto de datos.
* **Librería principal:** Recharts + shadcn/ui.

## Reglas de Visualización
* **La aplicación debe ser responsive, adaptada totalmente a móviles (Mobile-first) con botones fáciles de pulsar.
* **Estilo:** Usa siempre variables de color de Tailwind (`var(--chart-1)`, etc.).
* **Accesibilidad:** Todos los gráficos deben incluir `ChartTooltip` y etiquetas de accesibilidad.
* **Ubicación:** Los componentes de gráficas personalizados deben ir en `src/components/charts/`.
* **Lenguaje:** Escribe todo el código, nombres de variables y comentarios en **Inglés**.
* **Interfaz de Usuario:** Los textos visibles para el usuario final deben estar en **Español**.


# Objetivo: 
Crea una aplicación web progresiva (PWA) con diseño minimalista como intranet corporativo de un instituto de secundaria llamado IES Julio Verne.

# Requisitos funcionales:
Control de sesión de usuario eficiente y seguro y control de acceso a página según perfil.
Dashboard para acceso a todas las funcionalidades con visualización de ultimos anuncios e incidencias abiertas.
Calendario para consulta de eventos, reserva de espacios y recursos y consulta de días de libre disposición, que se actualiza en tiempo real usando realtime de supabase.
Gestión de perfiles de usuario: Admin,	Ordenanza,	Directiva,	Profesor.
Tablón de anuncios.
Gestión de incidencias TIC
Gestión de incidencias de mantenimiento de las instalaciones del Centro.
Reservas de espacios (SUM, sala de visitas) y carros de portátiles (Carro 1, 2 y 3)
Gestión de citas con familias del profesorado y directiva.