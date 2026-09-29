# Mostrador — POS básico

Prueba técnica para **Lead AI-Native Software Engineer**. Aplicación web de una pantalla para crear y buscar productos, preparar una venta, editar el precio de cada línea, eliminar líneas y guardar la venta en MySQL.

## Requisitos y alcance

| Requisito | Implementación |
| --- | --- |
| Productos con nombre, precio y código de barras | `POST /api/products`, tabla `products`, formulario en la pantalla principal. El código de barras es único. |
| Búsqueda por nombre o código de barras | `GET /api/products?search=...`, resultados seleccionables. |
| Venta actual | Líneas con nombre, precio editable, cantidad, eliminación y total. |
| Persistencia de ventas y detalle | `sales` y `sale_items`, con claves foráneas y copia del nombre/precio aplicado. |
| Procedimiento almacenado MySQL utilizado | `sp_register_sale`, definido en `db/002_sales.sql` e invocado desde `backend/src/infrastructure/saleRepository.js` por `POST /api/sales`. |
| Una pantalla, frontend y backend requeridos | Vue 2, Vuetify, Axios, Node.js, Express, Sequelize y MySQL. |
| Ramas y entregables | `feature/products` y `feature/sales`, integradas en `ProductionEnv`. |

No se implementan impresión, documentos, reportes, inventario, control de caja, métodos de pago, autenticación ni CRUD completo para cada tabla: están fuera del alcance solicitado.

## Tecnologías

- Node.js 20 o superior; desarrollado con Node.js 24.
- Express 4.21.2; Sequelize 6.37.5; mysql2 3.12.0.
- Vue 2.7.16; Vuetify 2.7.2; Axios 1.7.9; esbuild 0.24.2.
- MySQL 8.4 para ejecución reproducible con Docker Compose.

Vue 2 se usa porque la prueba lo exige. Para un producto de larga duración habría que planear su migración y mantenimiento.

## Estructura

```text
backend/src/
  domain/          Reglas puras: datos de producto y líneas de venta
  application/     Casos de uso y puertos implícitos de repositorio
  infrastructure/  Adaptadores Sequelize y procedimiento MySQL
  http/            Adaptador Express, validación de transporte y errores
  server.js        Composición de dependencias
frontend/
  index.html       Pantalla de catálogo y venta
  src/             Vue, Vuetify, Axios y estilos
db/               Scripts SQL reproducibles
scripts/          Compilación del frontend
```

Las dependencias apuntan hacia el dominio: las reglas de negocio no importan Express, Sequelize, Vue ni MySQL. Los casos de uso reciben repositorios por parámetro. La composición concreta ocurre en `server.js`. Se eligió esta separación porque facilita revisar y sustituir adaptadores sin convertir una prueba pequeña en un marco de clases innecesario.

## Instalación rápida

Se requieren Node.js, npm y Docker Desktop con `docker compose`.

```bash
git clone <URL_DEL_REPOSITORIO>
cd pos-ai-native
docker compose up -d db
cp .env.example .env
npm ci
npm run build
npm start
```

Abrir `http://localhost:3000`. La primera descarga de la imagen MySQL puede tardar. Comprobar el estado con `docker compose ps`; la base debe aparecer como saludable antes de iniciar el backend. El puerto MySQL del host es `3307` para reducir conflictos con una instalación local.

La instalación del contenedor ejecuta `db/001_products.sql` y `db/002_sales.sql` automáticamente **solo cuando el volumen de datos es nuevo**. Los archivos SQL siguen incluidos y pueden ejecutarse manualmente. No se usa `sequelize.sync()`: el esquema que se evalúa es el de los scripts versionados.

### MySQL instalado sin Docker

Crear la estructura y el procedimiento con un usuario administrativo:

```bash
mysql -u root -p < db/001_products.sql
mysql -u root -p < db/002_sales.sql
```

Crear un usuario de aplicación y darle acceso a la base:

```sql
CREATE USER 'pos_app'@'localhost' IDENTIFIED BY 'CAMBIAR_ESTA_CLAVE';
GRANT SELECT, INSERT, UPDATE ON pos_assessment.* TO 'pos_app'@'localhost';
GRANT EXECUTE ON PROCEDURE pos_assessment.sp_register_sale TO 'pos_app'@'localhost';
```

Configurar `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD` en `.env`. En instalaciones que conectan por TCP a `127.0.0.1`, el host del usuario MySQL debe coincidir con la configuración real de MySQL. No subir `.env` al repositorio.

## Procedimiento almacenado y transacción

`sp_register_sale` recibe un JSON con líneas `{ productId, quantity, unitPrice }` y entrega `sale_id` y `total` por parámetros `OUT`. Valida el formato, comprueba que existan los productos, conserva el nombre y precio utilizados, crea la cabecera y el detalle, y calcula el total en MySQL. `saleRepository.js` lo llama con `CALL` usando Sequelize y obtiene los parámetros de salida en la **misma conexión**.

La transacción se abre en el adaptador Sequelize y abarca la llamada al procedimiento y la lectura de la respuesta. Si una línea es inválida, el procedimiento emite `SIGNAL`; Sequelize revierte la transacción. Esto evita guardar ventas parciales. El frontend calcula un total para mostrarlo, pero el total persistido lo calcula la base de datos.

## API

```http
GET /api/products?search=cafe
POST /api/products
Content-Type: application/json

{"name":"Café molido","barcode":"CAFE-001","price":"5.25"}
```

```http
POST /api/sales
Content-Type: application/json

{"items":[{"productId":1,"quantity":2,"unitPrice":"5.00"}]}
```

Las respuestas de error usan `{ "error": "CODIGO", "message": "Mensaje" }`. Un código de barras duplicado devuelve `409`; los datos inválidos devuelven `400`. Una venta exitosa devuelve identificador, total y cantidad de líneas.

## Verificación

```bash
npm test
npm run build
```

Además de los casos automatizados, verificar en el navegador: creación, búsqueda por nombre y barcode, añadir y quitar productos, cambio de precio, total, guardado y limpieza de la venta. Consultar `sales` y `sale_items` en MySQL para comprobar la persistencia y ejecutar una venta con producto inexistente para confirmar que no aparece una cabecera parcial.

## Git y uso de IA

La rama de entrega es `ProductionEnv`. `feature/products` contiene el primer entregable y `feature/sales` el segundo; cada una se integró con un merge identificable. Se conservaron commits separados para que la secuencia pueda revisarse.

Se utilizó **OpenAI Codex** como agente que trabajó directamente sobre el repositorio: definió el diseño inicial, creó archivos, integró frontend y backend, preparó SQL, ejecutó compilaciones y depuró los errores observados. El criterio técnico aplicado al revisar sus propuestas fue mantener el dominio independiente de los frameworks, usar `DECIMAL` en MySQL y centavos enteros en los cálculos del cliente, conservar precios históricos por línea y validar nuevamente en servidor y procedimiento. Se descartó usar el procedimiento solo para una consulta simple porque aportaba menos evidencia sobre atomicidad de ventas.

**Revisión personal del candidato antes de enviar:** ejecutar el flujo completo, leer el diff y el procedimiento, confirmar que puede explicar las decisiones y registrar aquí cualquier corrección o propuesta de IA descartada por él. Codex no puede atribuirse esa revisión personal en su nombre.

**Tiempo aproximado:** completar con el tiempo real al terminar la revisión personal. Entregables principales: catálogo de productos, venta con procedimiento MySQL, documentación y verificación.

## Consideraciones

- El proyecto es una prueba de alcance deliberadamente reducido; no hay autenticación ni gestión de pagos.
- Los precios enviados para una línea pueden diferir del precio del catálogo, tal como pide el requisito de edición. El producto original no se modifica.
- Al publicar el repositorio, confirmar que `.env`, datos locales y credenciales reales no estén incluidos.
