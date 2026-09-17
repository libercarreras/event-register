# Ajustes finales de CAJA

## Objetivo
Mantener el diseño y la lógica actuales, añadiendo únicamente claridad sobre anulaciones, cierre confirmado e historial por jornada.

## Cambios
- Mostrar cinco indicadores: EFECTIVO, DÉBITO, TOTAL, PEDIDOS válidos y ANULADOS.
- Mostrar `#001 — Cliente` solo cuando exista cliente; de lo contrario, únicamente `#001`.
- Mantener pedidos anulados en su lugar, con importe y datos originales visibles, etiqueta roja, detalle consultable y motivo cuando exista; ocultar la acción de anular para esos pedidos.
- Sustituir la confirmación simple de cierre por una confirmación compacta con fecha y resumen completo de la jornada.
- Añadir un selector compacto para consultar la jornada actual y jornadas cerradas, mostrando su resumen y pedidos sin permitir cerrarlas.
- Conservar reimpresión, estado de impresión y contador sin crear ventas nuevas.

## Detalles técnicos
- Reutilizar `listSessions`, `listOrders` y `sessionTotals` del repositorio local; no cambiar esquemas, snapshots ni persistencia.
- Mantener la jornada abierta global para VENTA y usar selección local solo en CAJA.
- Validar el resultado con compilación y una prueba en navegador que cubra jornada cerrada, apertura de nueva jornada y consulta histórica.
