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
