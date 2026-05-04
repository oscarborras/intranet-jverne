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
