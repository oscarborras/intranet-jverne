---
trigger: always_on
---

# Reglas de programación

## Fecha local del servidor

Nunca uses `new Date().toISOString().split("T")[0]` para obtener la fecha actual — devuelve la fecha en UTC, lo que causa errores cuando el servidor está en una zona horaria distinta de UTC (por ejemplo, a las 00:30 CEST el resultado sería el día anterior).

Usa siempre los métodos locales:

```typescript
const _now = new Date();
const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
```

## Estado compartido en interfaces con pestañas

Cuando un componente tiene varias pestañas renderizadas condicionalmente (`{activeTab === "x" && <Componente />}`), cada pestaña se **desmonta y remonta** al cambiar de tab. Esto hace que cualquier `useState` local se reinicialice con los datos originales, perdiendo los cambios realizados en otras pestañas.

**Regla:** Si dos o más pestañas leen o modifican el mismo conjunto de datos (p. ej. una lista de registros), ese estado debe vivir en el componente padre que contiene el tab bar, no en cada pestaña por separado.

**Patrón correcto:**

```typescript
// Componente padre (tab container)
const [liveData, setLiveData] = useState<Registro[]>(datosIniciales);

// Pasar a cada pestaña que lo necesite:
<TabA datos={liveData} onDatosChange={setLiveData} />
<TabB datos={liveData} onDatosChange={setLiveData} />
```

```typescript
// Dentro de cada pestaña: NO usar useState para la lista
// Usar el prop directamente y llamar al callback al mutar
export function TabA({ datos, onDatosChange }: Props) {
  // Lectura: usar `datos` prop (useMemo con datos en dependencias)
  // Escritura: onDatosChange(prev => [...prev, nuevoRegistro])
  //            onDatosChange(prev => prev.filter(r => !idsEliminados.has(r.id)))
}
```

**Por qué:** El estado elevado al padre persiste mientras el padre esté montado, independientemente de qué pestaña esté activa. Así todas las pestañas ven siempre los datos actualizados sin recargar la página.

## Callback OAuth detrás de proxy inverso (Nginx)

Nunca uses `new URL(request.url).origin` para construir la URL de redirección en el callback OAuth — en producción detrás de Nginx u otro proxy, `request.url` contiene el origin interno del servidor Node (p. ej. `http://localhost:3000`), no el dominio público.

Construye siempre el origin a partir de las cabeceras del proxy:

```typescript
import { headers } from "next/headers";

const headersList = await headers();
const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
const proto = headersList.get("x-forwarded-proto") ?? "https";
const origin = `${proto}://${host}`;
```
