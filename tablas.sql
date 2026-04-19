-- ================================================================
-- ESTRUCTURA COMPLETA DE BASE DE DATOS — SUPABASE
-- Tienda Online | Generada desde cero
-- ================================================================
-- Ejecuta este script completo en el SQL Editor de tu proyecto
-- Supabase. Crea todas las tablas, relaciones, políticas RLS,
-- funciones y triggers necesarios.
-- ================================================================


-- ================================================================
-- Descomenta este bloque solo si quieres borrar todo y empezar limpio.
-- ================================================================
-- DROP TABLE IF EXISTS items_venta      CASCADE;
-- DROP TABLE IF EXISTS ventas           CASCADE;
-- DROP TABLE IF EXISTS contador_tickets CASCADE;
-- DROP TABLE IF EXISTS productos        CASCADE;
-- DROP FUNCTION IF EXISTS fn_descontar_inventario() CASCADE;
-- DROP FUNCTION IF EXISTS fn_reponer_inventario()   CASCADE;


-- ================================================================
-- TABLA 1: productos
-- Inventario de productos del usuario.
-- ================================================================
CREATE TABLE IF NOT EXISTS productos (
    id              BIGINT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "codigoBarras"  TEXT,                               -- comillas por camelCase original del JS
    nombre          TEXT            NOT NULL,
    precio          NUMERIC(12, 2)  NOT NULL CHECK (precio > 0),
    cantidad        INT             NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    imagen          TEXT,                               -- URL pública en Supabase Storage
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_productos_user_id ON productos (user_id);


-- ================================================================
-- TABLA 2: ventas
-- Cabecera de cada ticket/venta registrada.
-- ================================================================
CREATE TABLE IF NOT EXISTS ventas (
    id              BIGINT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    global_id       BIGINT          NOT NULL,           -- timestamp JS usado internamente
    numero_ticket   TEXT            NOT NULL,           -- ej: "0001", "0042"
    total           NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    fecha           TEXT            NOT NULL,           -- fecha+hora localizada, ej: "19/4/2026, 10:32:00"
    fecha_limpia    TEXT            NOT NULL,           -- solo fecha,            ej: "19/4/2026"
    user_id         UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ventas_user_id      ON ventas (user_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_limpia ON ventas (fecha_limpia);
CREATE INDEX IF NOT EXISTS idx_ventas_global_id    ON ventas (global_id);


-- ================================================================
-- TABLA 3: items_venta
-- Líneas de detalle de cada venta.
-- Al insertar un item  → trigger descuenta cantidad en productos.
-- Al eliminar un item  → trigger repone   cantidad en productos.
-- Se borra en cascada cuando se elimina la venta padre.
-- ================================================================
CREATE TABLE IF NOT EXISTS items_venta (
    id          BIGINT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venta_id    BIGINT          NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    product_id  BIGINT          REFERENCES productos(id) ON DELETE SET NULL,  -- NULL si el producto fue borrado después
    nombre      TEXT            NOT NULL,               -- snapshot del nombre al momento de vender
    cantidad    INT             NOT NULL CHECK (cantidad > 0),
    precio      NUMERIC(12, 2)  NOT NULL,               -- snapshot del precio al momento de vender
    subtotal    NUMERIC(12, 2)  NOT NULL,
    user_id     UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_venta_venta_id   ON items_venta (venta_id);
CREATE INDEX IF NOT EXISTS idx_items_venta_product_id ON items_venta (product_id);
CREATE INDEX IF NOT EXISTS idx_items_venta_user_id    ON items_venta (user_id);


-- ================================================================
-- TABLA 4: contador_tickets
-- Un registro por usuario. Reemplaza los dos valores de localStorage:
--   'ultimaFechaVenta'     → ultima_fecha
--   'contadorDiarioVentas' → contador_diario
-- ================================================================
CREATE TABLE IF NOT EXISTS contador_tickets (
    id              BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    ultima_fecha    TEXT        NOT NULL,               -- ej: "19/4/2026"
    contador_diario INT         NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contador_tickets_user_id ON contador_tickets (user_id);


-- ================================================================
-- TRIGGERS DE INVENTARIO
-- Manejan el descuento y reposición de stock automáticamente
-- en la base de datos. Son la fuente de verdad: si el JS falla
-- a mitad de una operación, la BD mantiene la consistencia.
-- ================================================================

-- ----------------------------------------------------------------
-- TRIGGER A: Descontar inventario al INSERTAR un item_venta
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_descontar_inventario()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.product_id IS NOT NULL THEN
        UPDATE productos
        SET
            cantidad   = cantidad - NEW.cantidad,
            updated_at = NOW()
        WHERE id = NEW.product_id;

        -- Seguridad: rechaza la inserción si el stock quedó negativo
        IF (SELECT cantidad FROM productos WHERE id = NEW.product_id) < 0 THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto con id = %', NEW.product_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_descontar_inventario ON items_venta;

CREATE TRIGGER trg_descontar_inventario
AFTER INSERT ON items_venta
FOR EACH ROW
EXECUTE FUNCTION fn_descontar_inventario();


-- ----------------------------------------------------------------
-- TRIGGER B: Reponer inventario al ELIMINAR un item_venta
-- Como items_venta tiene ON DELETE CASCADE desde ventas,
-- al eliminar una venta este trigger se ejecuta por cada item.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_reponer_inventario()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Solo repone si el producto aún existe en el catálogo
    IF OLD.product_id IS NOT NULL THEN
        UPDATE productos
        SET
            cantidad   = cantidad + OLD.cantidad,
            updated_at = NOW()
        WHERE id = OLD.product_id;
    END IF;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_reponer_inventario ON items_venta;

CREATE TRIGGER trg_reponer_inventario
AFTER DELETE ON items_venta
FOR EACH ROW
EXECUTE FUNCTION fn_reponer_inventario();


-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- Cada usuario solo puede ver y modificar sus propios datos.
-- ================================================================

-- ----------------------------------------------------------------
-- RLS: productos
-- ----------------------------------------------------------------
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "productos: select propio"
    ON productos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "productos: insert propio"
    ON productos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "productos: update propio"
    ON productos FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "productos: delete propio"
    ON productos FOR DELETE
    USING (auth.uid() = user_id);


-- ----------------------------------------------------------------
-- RLS: ventas
-- ----------------------------------------------------------------
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ventas: select propio"
    ON ventas FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "ventas: insert propio"
    ON ventas FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ventas: delete propio"
    ON ventas FOR DELETE
    USING (auth.uid() = user_id);


-- ----------------------------------------------------------------
-- RLS: items_venta
-- ----------------------------------------------------------------
ALTER TABLE items_venta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "items_venta: select propio"
    ON items_venta FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "items_venta: insert propio"
    ON items_venta FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "items_venta: delete propio"
    ON items_venta FOR DELETE
    USING (auth.uid() = user_id);


-- ----------------------------------------------------------------
-- RLS: contador_tickets
-- ----------------------------------------------------------------
ALTER TABLE contador_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contador_tickets: select propio"
    ON contador_tickets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "contador_tickets: insert propio"
    ON contador_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contador_tickets: update propio"
    ON contador_tickets FOR UPDATE
    USING (auth.uid() = user_id);


-- ================================================================
-- STORAGE BUCKET: productos
-- Almacena las imágenes del inventario.
-- ================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('productos', 'productos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage productos: upload propio"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'productos'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "storage productos: delete propio"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'productos'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "storage productos: lectura publica"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'productos');


-- ================================================================
-- DIAGRAMA DE RELACIONES (referencia rápida)
-- ================================================================
--
--  auth.users
--      │
--      ├──► productos        (user_id FK)
--      │       id  ◄─────────────────────────────────┐
--      │       "codigoBarras"                         │ ON DELETE SET NULL
--      │       nombre                                 │
--      │       precio                        items_venta.product_id
--      │       cantidad  ◄── TRIGGERS: descuenta al vender,
--      │       imagen                        repone al eliminar venta
--      │
--      ├──► ventas           (user_id FK)
--      │       id  ◄──────────────────────┐
--      │       global_id                  │ ON DELETE CASCADE
--      │       numero_ticket          items_venta.venta_id
--      │       total
--      │       fecha
--      │       fecha_limpia
--      │
--      ├──► items_venta      (user_id FK)
--      │       venta_id   → ventas.id       CASCADE DELETE
--      │       product_id → productos.id    SET NULL on delete
--      │       nombre     (snapshot al momento de venta)
--      │       cantidad
--      │       precio     (snapshot al momento de venta)
--      │       subtotal
--      │
--      └──► contador_tickets (user_id FK, UNIQUE — 1 fila por usuario)
--              ultima_fecha
--              contador_diario
--
-- ================================================================