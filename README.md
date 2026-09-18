# Event Register

Quiero desarrollar una aplicación llamada provisionalmente FOGA Eventos, pero ANTES DE CREAR O MODIFICAR CÓDIGO quiero que analices la propuesta completa, revises las capacidades y limitaciones reales del entorno actual de Lovable y me respondas técnicamente todas las preguntas del final.

NO IMPLEMENTES NADA TODAVÍA.
NO CREES SUPABASE.
NO ACTIVES LOVABLE CLOUD.
NO GENERES BASES DE DATOS NI BACKEND.
NO MODIFIQUES ARCHIVOS.

Primero necesito un informe de viabilidad y una arquitectura recomendada.

1. OBJETIVO

FOGA Eventos será un sistema extremadamente sencillo de toma de pedidos y caja para puestos gastronómicos que trabajan en festivales, ferias y eventos.

El requisito fundamental es que la versión final funcione 100 % sin Internet.

En algunos eventos puede haber 10.000–20.000 personas y las redes móviles quedan saturadas. Por lo tanto, una vez instalada, ninguna operación esencial puede depender de:

Internet

Supabase

Lovable Cloud

APIs externas

servidor remoto

autenticación online

navegador conectado a Internet

La computadora debe poder iniciar Windows sin conexión, abrir FOGA Eventos y continuar vendiendo, guardando pedidos e imprimiendo normalmente.

2. FLUJO DE VENTA

La pantalla principal debe ser extremadamente rápida.

Debe mostrar:

Número correlativo del pedido.

Campo opcional para nombre del cliente.

Botones grandes con los productos disponibles.

Precio de cada producto.

Pedido actual.

Cantidad de cada producto.

Posibilidad de aumentar/disminuir cantidad.

Eliminar producto.

Total automáticamente calculado.

Botón EFECTIVO.

Botón DÉBITO.

Ejemplo:

Pedido #0047
Cliente: Martín

2 × Chorizo — $400
1 × Coca-Cola — $120

TOTAL: $520

[EFECTIVO] [DÉBITO]

Al seleccionar el medio de pago:

Registrar la venta.

Registrar fecha y hora.

Registrar nombre si fue ingresado.

Registrar número de pedido.

Registrar productos, cantidades y precios utilizados en ese momento.

Registrar total.

Registrar medio de pago.

Imprimir la comanda.

Limpiar la pantalla.

Crear automáticamente el siguiente número correlativo.

3. COMANDA

Debe poder trabajar posteriormente con una impresora térmica instalada en Windows.

Ejemplo:

PEDIDO #0047
MARTÍN

2 CHORIZO
1 COCA-COLA

13:42

La comanda de preparación NO necesita mostrar precios.

Necesitamos también:

Reimprimir última comanda.

Reimprimir una comanda desde el historial.

Evitar que una reimpresión genere una nueva venta.

4. MENÚ EDITABLE

El propietario debe poder modificar el menú sin intervención de un programador.

Debe poder:

Agregar producto.

Editar nombre.

Editar precio.

Desactivar producto.

Reactivarlo.

Ordenar los productos.

Los productos activos aparecen como botones grandes en Venta.

IMPORTANTE:

Modificar posteriormente el precio de un producto NO puede modificar ventas históricas.

Cada venta debe conservar el nombre y precio utilizados cuando fue realizada.

5. CAJA

Debe existir una pantalla simple que muestre la jornada actual:

EFECTIVO
DÉBITO
TOTAL
CANTIDAD DE PEDIDOS

Debe existir historial de ventas.

Cada venta debe permitir consultar:

Número.

Nombre.

Hora.

Productos.

Total.

Medio de pago.

Debe existir la posibilidad de anular una venta con confirmación.

Una venta anulada debe conservarse en el historial como ANULADA para mantener trazabilidad, pero debe descontarse correctamente de los totales válidos de caja.

Debe poder cerrar una jornada y comenzar otra sin eliminar el historial anterior.

6. FUNCIONAMIENTO OFFLINE

La versión definitiva será una aplicación instalada en Windows.

Mi flujo habitual de desarrollo es Lovable y quiero aprovechar Lovable para desarrollar y probar la interfaz y la lógica.

Una posibilidad que estamos evaluando es:

LOVABLE
→ aplicación web/prototipo
→ exportar código
→ empaquetar como aplicación Windows
→ almacenamiento/base de datos local
→ impresora térmica Windows

Durante la fase Lovable podemos utilizar almacenamiento local temporal si es apropiado.

Para producción estamos considerando una base local como SQLite, pero quiero que evalúes si esta arquitectura es realmente la más adecuada.

No quiero introducir Supabase o servicios cloud para luego tener que eliminarlos.

7. SEGURIDAD DE LOS DATOS

Aunque sea una aplicación pequeña, una venta confirmada no puede desaparecer porque:

se cierre accidentalmente el programa;

se reinicie Windows;

se corte la energía;

no exista Internet.

Necesitamos persistencia local confiable.

También quiero posteriormente alguna solución sencilla para:

backup manual;

exportación de datos;

restauración;

eventualmente copiar el respaldo a un pendrive.

Nada de esto debe requerir Internet.

8. ALCANCE QUE NO QUEREMOS

NO queremos convertir esto en un ERP.

Inicialmente NO necesitamos:

WhatsApp.

pedidos online.

clientes registrados.

login cloud.

delivery.

transferencias.

Mercado Pago.

stock complejo.

proveedores.

contabilidad.

facturación electrónica.

sincronización entre sucursales.

múltiples cajas conectadas.

cocina online.

CRM.

estadísticas complejas.

El objetivo es velocidad, estabilidad y simplicidad.

9. INTERFAZ

Debe estar optimizada para una notebook en un puesto gastronómico.

Queremos:

botones grandes;

muy pocos pasos;

información legible;

posibilidad de usar mouse o pantalla táctil;

evitar modales innecesarios;

operación rápida bajo presión.

La identidad puede seguir una estética FOGA:

interfaz profesional;

naranja como color principal de acción;

buena legibilidad;

diseño limpio y compacto.

10. PREGUNTAS QUE NECESITO QUE RESPONDAS ANTES DE PROGRAMAR

Analiza el entorno ACTUAL de este proyecto Lovable y responde una por una:

A — Lovable

¿Podemos desarrollar aquí toda la interfaz y lógica de este MVP sin Supabase ni Lovable Cloud?

¿Qué partes podemos probar completamente dentro de Lovable?

¿Qué partes NO podremos validar correctamente hasta convertirlo en aplicación de escritorio?

¿Qué almacenamiento local recomiendas exclusivamente para el prototipo dentro de Lovable?

¿Hay alguna decisión que debamos tomar AHORA para evitar problemas al exportar posteriormente?

B — Código y exportación

¿Cuál es exactamente el stack actual de ESTE proyecto?

¿Podremos sacar/exportar el código completo necesario para continuar el proyecto fuera de Lovable?

¿Hay dependencias o características específicas de Lovable que debamos evitar para que el código sea portable?

¿Conviene mantener separada desde ahora la capa de persistencia de la interfaz?

Propón una estructura que permita sustituir posteriormente almacenamiento web por SQLite sin reescribir la aplicación.

C — Aplicación Windows

Para ESTE proyecto concreto, compara Electron y Tauri como destino final.

¿Cuál requiere menos cambios sobre el código que producirá este proyecto?

¿Cuál simplifica más la integración con SQLite?

¿Cuál simplifica más la impresión en impresoras térmicas de Windows?

¿Cuál recomendarías técnicamente para este caso y por qué?

No elijas basándote solamente en cuál genera un ejecutable más pequeño. Prioriza simplicidad, estabilidad, impresión, mantenimiento y facilidad de transformar el proyecto proveniente de Lovable.

D — Base de datos

¿SQLite es una buena elección para la versión Windows?

Propón el esquema mínimo de datos para:

products

orders

order_items

payment_method

sessions/jornadas

Explica cómo preservarías el precio histórico de cada artículo.

Explica cómo manejarías números correlativos sin duplicados.

Explica cómo garantizarías que confirmar una venta sea una operación atómica y resistente a errores.

E — Impresión

¿Cómo debería integrarse posteriormente una impresora térmica de Windows?

¿Podremos imprimir usando la impresora configurada en Windows sin Internet?

¿Qué parte podemos simular en Lovable?

¿Qué parte solamente podremos probar en la aplicación Windows real?

¿Conviene generar HTML de comanda, PDF, comandos ESC/POS u otro método para este caso?

¿Cómo diseñarías la capa de impresión para poder cambiar de impresora sin tocar la lógica de ventas?

F — Fallos

Describe qué debería ocurrir si:

Se corta la energía inmediatamente después de cobrar.

Se guarda la venta pero falla la impresora.

Se imprime la comanda pero el programa se cierra.

Se pulsa dos veces rápidamente EFECTIVO.

Windows reinicia.

La impresora está apagada.

La impresora se queda sin papel.

El usuario cambia posteriormente el precio de un producto.

Se anula una venta.

Se intenta reimprimir una venta antigua.

Quiero que propongas mecanismos para evitar ventas duplicadas y pérdida de información.

G — Backup

¿Cómo implementarías un botón "Crear respaldo" completamente offline?

¿Qué archivos sería necesario respaldar?

¿Cómo implementarías "Restaurar respaldo" de forma segura?

¿Podría copiarse ese respaldo directamente a un pendrive?

H — Arquitectura final

Finalmente dame un diagrama como:

LOVABLE
↓
...
↓
APLICACIÓN WINDOWS

y separa claramente:

FASE LOVABLE

de

FASE APLICACIÓN WINDOWS

Indica qué componentes son temporales y cuáles podremos reutilizar.

11. REGLA IMPORTANTE

Todavía NO programes.

No quiero que crees componentes, archivos, tablas ni código.

Primero inspecciona el proyecto actual y responde las 40 preguntas.

Si detectas algún requisito que contradiga las capacidades actuales de Lovable, indícalo explícitamente.

Si consideras que alguna decisión que estoy proponiendo es técnicamente incorrecta, no la aceptes automáticamente: explica el problema y propón una alternativa.

Al final incluye solamente:

Arquitectura recomendada.

Riesgos que debemos resolver.

Decisiones que necesito tomar antes de empezar.

Qué construirías en la primera etapa una vez que yo autorice la implementación.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a2fcb0c5-45a5-464c-9111-cecfc7685728).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
