-- ================================================================
-- SCRIPT COMPLETO — SUPABASE
-- Versión: combos online + descuento inventario automático
-- ✅ es_admin() filtra por email real del admin
-- ✅ SEGURO: no borra datos ni historiales existentes
-- ✅ Tickets físicos con prefijo V-
-- ✅ Tickets online con prefijo ONLINE-
-- ✅ Tickets combo online con prefijo COMBO-ONLINE-
-- ✅ items_pedido tiene combo_id para identificar combos online
-- ✅ Trigger descuenta inventario de productos regulares Y combos
-- ✅ Trigger crea ticket ONLINE- y ticket COMBO-ONLINE- al confirmar
-- ================================================================


-- ================================================================
-- PASO 0: LIMPIAR TRIGGERS Y FUNCIONES ANTERIORES
-- (Solo estructuras, NUNCA datos)
-- ================================================================
DROP TRIGGER IF EXISTS trg_descontar_inventario         ON items_venta;
DROP TRIGGER IF EXISTS trg_reponer_inventario           ON items_venta;
DROP TRIGGER IF EXISTS trg_descontar_inventario_pedido  ON pedidos;
DROP TRIGGER IF EXISTS trg_descontar_inventario_fisico  ON items_venta;
DROP TRIGGER IF EXISTS trg_reponer_inventario_fisico    ON items_venta;

DROP FUNCTION IF EXISTS fn_descontar_inventario()               CASCADE;
DROP FUNCTION IF EXISTS fn_reponer_inventario()                 CASCADE;
DROP FUNCTION IF EXISTS fn_descontar_inventario_fisico()        CASCADE;
DROP FUNCTION IF EXISTS fn_reponer_inventario_fisico()          CASCADE;
DROP FUNCTION IF EXISTS fn_descontar_inventario_pedido()        CASCADE;
DROP FUNCTION IF EXISTS es_admin()                              CASCADE;
DROP FUNCTION IF EXISTS cambiar_estado_pedido(BIGINT, TEXT, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS get_admin_user_id()                     CASCADE;


-- ================================================================
-- PASO 0B: LIMPIAR POLÍTICAS RLS EXISTENTES
-- ================================================================
DO $$ BEGIN
    DROP POLICY IF EXISTS "productos: select propio"         ON productos;
    DROP POLICY IF EXISTS "productos: select tienda"         ON productos;
    DROP POLICY IF EXISTS "productos: select tienda publica" ON productos;
    DROP POLICY IF EXISTS "productos: insert propio"         ON productos;
    DROP POLICY IF EXISTS "productos: update propio"         ON productos;
    DROP POLICY IF EXISTS "productos: delete propio"         ON productos;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "ventas: select propio" ON ventas;
    DROP POLICY IF EXISTS "ventas: insert propio" ON ventas;
    DROP POLICY IF EXISTS "ventas: delete propio" ON ventas;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "items_venta: select propio" ON items_venta;
    DROP POLICY IF EXISTS "items_venta: insert propio" ON items_venta;
    DROP POLICY IF EXISTS "items_venta: delete propio" ON items_venta;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "contador_tickets: select propio" ON contador_tickets;
    DROP POLICY IF EXISTS "contador_tickets: insert propio" ON contador_tickets;
    DROP POLICY IF EXISTS "contador_tickets: update propio" ON contador_tickets;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "pedidos: cliente select"    ON pedidos;
    DROP POLICY IF EXISTS "pedidos: cliente insert"    ON pedidos;
    DROP POLICY IF EXISTS "pedidos: cliente cancelar"  ON pedidos;
    DROP POLICY IF EXISTS "pedidos: admin select todo" ON pedidos;
    DROP POLICY IF EXISTS "pedidos: admin update todo" ON pedidos;
    DROP POLICY IF EXISTS "pedidos: admin delete todo" ON pedidos;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "items_pedido: cliente select"    ON items_pedido;
    DROP POLICY IF EXISTS "items_pedido: cliente insert"    ON items_pedido;
    DROP POLICY IF EXISTS "items_pedido: admin select todo" ON items_pedido;
    DROP POLICY IF EXISTS "items_pedido: admin delete todo" ON items_pedido;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "combos: select propio"  ON combos;
    DROP POLICY IF EXISTS "combos: insert propio"  ON combos;
    DROP POLICY IF EXISTS "combos: update propio"  ON combos;
    DROP POLICY IF EXISTS "combos: delete propio"  ON combos;
    DROP POLICY IF EXISTS "combos: select tienda"  ON combos;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "combo_productos: select propio" ON combo_productos;
    DROP POLICY IF EXISTS "combo_productos: insert propio" ON combo_productos;
    DROP POLICY IF EXISTS "combo_productos: delete propio" ON combo_productos;
    DROP POLICY IF EXISTS "combo_productos: select tienda" ON combo_productos;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "usuarios_admin: select propio" ON usuarios_admin;
    DROP POLICY IF EXISTS "usuarios_admin: insert propio" ON usuarios_admin;
    DROP POLICY IF EXISTS "usuarios_admin: update propio" ON usuarios_admin;
    DROP POLICY IF EXISTS "usuarios_admin: admin select"  ON usuarios_admin;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "clientes_tienda: select propio" ON clientes_tienda;
    DROP POLICY IF EXISTS "clientes_tienda: insert propio" ON clientes_tienda;
    DROP POLICY IF EXISTS "clientes_tienda: update propio" ON clientes_tienda;
    DROP POLICY IF EXISTS "clientes_tienda: admin select"  ON clientes_tienda;
EXCEPTION WHEN undefined_table THEN NULL; END $$;


-- ================================================================
-- PASO 1A: MIGRAR DATOS EXISTENTES SIN PERDER NADA
-- ================================================================
DO $$ BEGIN
    UPDATE pedidos SET metodo_pago = 'contraentrega' WHERE metodo_pago = 'wompi';
    UPDATE pedidos SET estado = 'cancelado' WHERE estado IN ('esperando_pago','pago_fallido');
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE pedidos DROP COLUMN IF EXISTS wompi_transaction_id;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Agregar combo_id a items_pedido para vincular combos comprados online
DO $$ BEGIN
    ALTER TABLE items_pedido
        ADD COLUMN combo_id UUID REFERENCES combos(id) ON DELETE SET NULL;
EXCEPTION
    WHEN undefined_table    THEN NULL;
    WHEN duplicate_column   THEN NULL;
END $$;

-- Migrar combo_productos existentes: agregar cantidad si no existe
DO $$ BEGIN
    ALTER TABLE combo_productos
        ADD COLUMN IF NOT EXISTS cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad >= 1);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Migrar combos existentes: agregar stock si no existe
DO $$ BEGIN
    ALTER TABLE combos
        ADD COLUMN IF NOT EXISTS stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0);
EXCEPTION WHEN undefined_table THEN NULL; END $$;


-- ================================================================
-- PASO 1B: AJUSTAR CONSTRAINTS (sin tocar filas de datos)
-- ================================================================
DO $$ BEGIN
    ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_metodo_pago_check;
    ALTER TABLE pedidos ADD CONSTRAINT pedidos_metodo_pago_check
        CHECK (metodo_pago IN ('contraentrega'));
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_check;
    ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_check
        CHECK (estado IN ('pendiente','pago_confirmado','despachado','entregado','cancelado'));
EXCEPTION WHEN undefined_table THEN NULL; END $$;


-- ================================================================
-- PASO 2: TABLAS PRINCIPALES (IF NOT EXISTS = seguro, no borra nada)
-- ================================================================

CREATE TABLE IF NOT EXISTS productos (
    id              BIGINT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "codigoBarras"  TEXT,
    nombre          TEXT            NOT NULL,
    precio          NUMERIC(12,2)   NOT NULL CHECK (precio > 0),
    cantidad        INT             NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    imagen          TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_productos_user_id ON productos (user_id);

CREATE TABLE IF NOT EXISTS ventas (
    id              BIGINT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    global_id       BIGINT          NOT NULL,
    numero_ticket   TEXT            NOT NULL,
    total           NUMERIC(12,2)   NOT NULL DEFAULT 0,
    fecha           TEXT            NOT NULL,
    fecha_limpia    TEXT            NOT NULL,
    user_id         UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ventas_user_id      ON ventas (user_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_limpia ON ventas (fecha_limpia);
CREATE INDEX IF NOT EXISTS idx_ventas_global_id    ON ventas (global_id);

CREATE TABLE IF NOT EXISTS items_venta (
    id          BIGINT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venta_id    BIGINT          NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    product_id  BIGINT          REFERENCES productos(id) ON DELETE SET NULL,
    nombre      TEXT            NOT NULL,
    cantidad    INT             NOT NULL CHECK (cantidad > 0),
    precio      NUMERIC(12,2)   NOT NULL,
    subtotal    NUMERIC(12,2)   NOT NULL,
    user_id     UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_items_venta_venta_id   ON items_venta (venta_id);
CREATE INDEX IF NOT EXISTS idx_items_venta_product_id ON items_venta (product_id);
CREATE INDEX IF NOT EXISTS idx_items_venta_user_id    ON items_venta (user_id);

CREATE TABLE IF NOT EXISTS contador_tickets (
    id              BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    ultima_fecha    TEXT        NOT NULL,
    contador_diario INT         NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contador_tickets_user_id ON contador_tickets (user_id);

CREATE TABLE IF NOT EXISTS pedidos (
    id                   BIGINT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id              UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cliente_nombre       TEXT            NOT NULL,
    cliente_email        TEXT            NOT NULL,
    cliente_tel          TEXT            NOT NULL,
    direccion            TEXT            NOT NULL,
    notas                TEXT,
    total                NUMERIC(12,2)   NOT NULL,
    metodo_pago          TEXT            NOT NULL DEFAULT 'contraentrega'
                                          CHECK (metodo_pago IN ('contraentrega')),
    estado               TEXT            NOT NULL DEFAULT 'pendiente'
                                          CHECK (estado IN (
                                              'pendiente','pago_confirmado',
                                              'despachado','entregado','cancelado'
                                          )),
    fecha                TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    fecha_confirmacion   TIMESTAMPTZ,
    created_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pedidos_user_id ON pedidos (user_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado  ON pedidos (estado);

CREATE TABLE IF NOT EXISTS items_pedido (
    id          BIGINT          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id   BIGINT          NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    product_id  BIGINT          REFERENCES productos(id) ON DELETE SET NULL,
    -- combo_id identifica que este ítem es un combo (product_id será NULL)
    combo_id    UUID            REFERENCES combos(id)   ON DELETE SET NULL,
    nombre      TEXT            NOT NULL,
    cantidad    INT             NOT NULL CHECK (cantidad > 0),
    precio      NUMERIC(12,2)   NOT NULL,
    subtotal    NUMERIC(12,2)   NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_items_pedido_pedido_id  ON items_pedido (pedido_id);
CREATE INDEX IF NOT EXISTS idx_items_pedido_product_id ON items_pedido (product_id);
CREATE INDEX IF NOT EXISTS idx_items_pedido_combo_id   ON items_pedido (combo_id);


-- ================================================================
-- PASO 3: COLUMNA "categoria" EN PRODUCTOS
-- ================================================================
ALTER TABLE productos ADD COLUMN IF NOT EXISTS categoria TEXT;

ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_categoria_check;
ALTER TABLE productos ADD CONSTRAINT productos_categoria_check
    CHECK (categoria IN ('Perecederos','Abarrotes','Bebidas','Congelados','Hogar','Higiene','Otras'));

CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos (categoria);


-- ================================================================
-- PASO 4: TABLA usuarios_admin
-- ================================================================
CREATE TABLE IF NOT EXISTS usuarios_admin (
    id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre      TEXT,
    email       TEXT        NOT NULL,
    avatar_url  TEXT,
    rol         TEXT        NOT NULL DEFAULT 'operador'
                             CHECK (rol IN ('superadmin','operador')),
    activo      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE usuarios_admin IS
    'Usuarios que acceden a la app de gestión (index.html). '
    'Se crea una fila aquí al primer login con Google.';


-- ================================================================
-- PASO 5: TABLA clientes_tienda
-- ================================================================
CREATE TABLE IF NOT EXISTS clientes_tienda (
    id              UUID            PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre          TEXT,
    email           TEXT            NOT NULL,
    telefono        TEXT,
    direccion_pred  TEXT,
    total_pedidos   INT             NOT NULL DEFAULT 0,
    total_gastado   NUMERIC(12,2)   NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE clientes_tienda IS
    'Compradores registrados en la tienda online. '
    'No tienen acceso a la app de gestión.';

CREATE INDEX IF NOT EXISTS idx_clientes_tienda_email ON clientes_tienda (email);


-- ================================================================
-- PASO 6: TABLAS COMBOS Y COMBO_PRODUCTOS
-- ================================================================
CREATE TABLE IF NOT EXISTS combos (
    id          UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre      TEXT            NOT NULL,
    descripcion TEXT,
    precio      NUMERIC(12,2)   NOT NULL CHECK (precio >= 0),
    precio_suma NUMERIC(12,2),
    stock       INT             NOT NULL DEFAULT 0 CHECK (stock >= 0),
    user_id     UUID            REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_combos_user_id ON combos (user_id);

CREATE TABLE IF NOT EXISTS combo_productos (
    id          UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
    combo_id    UUID            NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
    -- product_id es TEXT por compatibilidad con el JS existente
    product_id  TEXT,
    nombre      TEXT            NOT NULL,
    precio      NUMERIC(12,2)   NOT NULL,
    imagen      TEXT,
    cantidad    INT             NOT NULL DEFAULT 1 CHECK (cantidad >= 1),
    user_id     UUID            REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_combo_productos_combo_id ON combo_productos (combo_id);


-- ================================================================
-- PASO 7: FUNCIÓN es_admin()
-- Solo devuelve TRUE para el email exacto del dueño.
-- ================================================================
CREATE OR REPLACE FUNCTION es_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id    = auth.uid()
          AND email = 'chindoyfranklin9@gmail.com'
    );
$$;


-- ================================================================
-- PASO 8: FUNCIÓN get_admin_user_id()
-- Usada por la tienda online para filtrar productos/combos del admin.
-- SECURITY DEFINER → funciona aunque el cliente sea anónimo.
-- ================================================================
CREATE OR REPLACE FUNCTION get_admin_user_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM auth.users
    WHERE email = 'chindoyfranklin9@gmail.com'
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_admin_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_user_id() TO anon;


-- ================================================================
-- PASO 9: TRIGGER — VENTAS FÍSICAS (descuento de inventario)
--
-- Reglas de tickets:
--   V-*              → ventas físicas    → SÍ descuentan aquí
--   ONLINE-*         → ventas online     → NO descuentan aquí (trigger pedidos)
--   COMBO-*          → combos físicos    → SÍ descuentan aquí
--   COMBO-ONLINE-*   → combos online     → NO descuentan aquí (trigger pedidos)
-- ================================================================
CREATE OR REPLACE FUNCTION fn_descontar_inventario_fisico()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ticket TEXT;
BEGIN
    -- Si el ítem no tiene producto asociado, nada que descontar
    IF NEW.product_id IS NULL THEN RETURN NEW; END IF;

    SELECT numero_ticket INTO v_ticket FROM ventas WHERE id = NEW.venta_id;

    -- Saltar tickets gestionados por el trigger de pedidos online
    IF v_ticket LIKE 'ONLINE-%' OR v_ticket LIKE 'COMBO-ONLINE-%' THEN
        RETURN NEW;
    END IF;

    IF (SELECT cantidad FROM productos WHERE id = NEW.product_id) < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto id=%.', NEW.product_id;
    END IF;

    UPDATE productos
    SET cantidad   = cantidad - NEW.cantidad,
        updated_at = NOW()
    WHERE id = NEW.product_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_descontar_inventario_fisico
AFTER INSERT ON items_venta
FOR EACH ROW EXECUTE FUNCTION fn_descontar_inventario_fisico();


-- ================================================================
-- PASO 10: TRIGGER — REPOSICIÓN al eliminar ticket físico
-- ================================================================
CREATE OR REPLACE FUNCTION fn_reponer_inventario_fisico()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ticket TEXT;
BEGIN
    IF OLD.product_id IS NULL THEN RETURN OLD; END IF;

    SELECT numero_ticket INTO v_ticket FROM ventas WHERE id = OLD.venta_id;

    -- Saltar tickets gestionados por el trigger de pedidos online
    IF v_ticket LIKE 'ONLINE-%' OR v_ticket LIKE 'COMBO-ONLINE-%' THEN
        RETURN OLD;
    END IF;

    UPDATE productos
    SET cantidad   = cantidad + OLD.cantidad,
        updated_at = NOW()
    WHERE id = OLD.product_id;

    RETURN OLD;
END;
$$;

CREATE TRIGGER trg_reponer_inventario_fisico
AFTER DELETE ON items_venta
FOR EACH ROW EXECUTE FUNCTION fn_reponer_inventario_fisico();


-- ================================================================
-- PASO 11: TRIGGER — PEDIDOS ONLINE
-- Se activa cuando el admin confirma el pago (pendiente → pago_confirmado).
--
-- Acciones:
--   1. Verifica stock de productos regulares y de productos dentro de combos
--   2. Descuenta inventario: productos regulares + productos de combos
--   3. Crea ticket ONLINE-{pedido_id} con TODOS los ítems del pedido
--   4. Por cada combo en el pedido, crea ticket COMBO-ONLINE-{pedido_id}-{item_id}
--      con el detalle de los productos que componen el combo
-- ================================================================
CREATE OR REPLACE FUNCTION fn_descontar_inventario_pedido()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_venta_id       BIGINT;
    v_admin_id       UUID;
    v_combo_venta_id BIGINT;
    v_combo_item     RECORD;
BEGIN
    -- Solo actuar cuando el estado cambia A pago_confirmado
    IF NEW.estado <> 'pago_confirmado' OR OLD.estado = 'pago_confirmado' THEN
        RETURN NEW;
    END IF;

    -- ── 1. Verificar stock: productos regulares ──────────────────
    IF EXISTS (
        SELECT 1
        FROM items_pedido ip
        JOIN productos p ON p.id = ip.product_id
        WHERE ip.pedido_id = NEW.id
          AND p.cantidad < ip.cantidad
    ) THEN
        RAISE EXCEPTION 'Stock insuficiente en uno o más productos del pedido #%.', NEW.id;
    END IF;

    -- ── 2. Verificar stock: productos dentro de combos ───────────
    IF EXISTS (
        SELECT 1
        FROM items_pedido ip
        JOIN combo_productos cp ON cp.combo_id = ip.combo_id
        JOIN productos p
          ON p.id = NULLIF(cp.product_id, '')::BIGINT
        WHERE ip.pedido_id = NEW.id
          AND ip.combo_id IS NOT NULL
          AND p.cantidad < (cp.cantidad * ip.cantidad)
    ) THEN
        RAISE EXCEPTION 'Stock insuficiente en productos de un combo del pedido #%.', NEW.id;
    END IF;

    -- ── 3. Descontar inventario: productos regulares ─────────────
    UPDATE productos p
    SET cantidad   = p.cantidad - ip.cantidad,
        updated_at = NOW()
    FROM items_pedido ip
    WHERE ip.pedido_id = NEW.id
      AND ip.product_id = p.id;

    -- ── 4. Descontar inventario: productos dentro de combos ───────
    UPDATE productos p
    SET cantidad   = p.cantidad - (cp.cantidad * ip.cantidad),
        updated_at = NOW()
    FROM items_pedido ip
    JOIN combo_productos cp ON cp.combo_id = ip.combo_id
    WHERE ip.pedido_id  = NEW.id
      AND ip.combo_id   IS NOT NULL
      AND cp.product_id IS NOT NULL
      AND cp.product_id != ''
      AND p.id = cp.product_id::BIGINT;

    -- Sellar fecha de confirmación en el pedido
    NEW.fecha_confirmacion := NOW();

    -- ── 5. Obtener el user_id del administrador ───────────────────
    SELECT id INTO v_admin_id
    FROM auth.users
    WHERE email = 'chindoyfranklin9@gmail.com'
    LIMIT 1;

    IF v_admin_id IS NULL THEN
        RETURN NEW;  -- sin admin no hay historial, pero el descuento ya ocurrió
    END IF;

    -- ── 6. Crear ticket ONLINE-{id} con todos los ítems ──────────
    --      (incluye línea de resumen del combo para referencia visual)
    INSERT INTO ventas (global_id, numero_ticket, total, fecha, fecha_limpia, user_id)
    VALUES (
        EXTRACT(EPOCH FROM NOW())::BIGINT,
        'ONLINE-' || NEW.id,
        NEW.total,
        TO_CHAR(NOW(), 'DD/MM/YYYY, HH24:MI:SS'),
        TO_CHAR(NOW(), 'DD/MM/YYYY'),
        v_admin_id
    ) RETURNING id INTO v_venta_id;

    -- Todos los ítems del pedido (productos regulares + resumen de combos)
    INSERT INTO items_venta (venta_id, product_id, nombre, cantidad, precio, subtotal, user_id)
    SELECT v_venta_id,
           ip.product_id,   -- NULL para ítems de combo (sin FK a productos)
           ip.nombre,
           ip.cantidad,
           ip.precio,
           ip.subtotal,
           v_admin_id
    FROM items_pedido ip
    WHERE ip.pedido_id = NEW.id;

    -- ── 7. Crear ticket COMBO-ONLINE por cada combo del pedido ────
    FOR v_combo_item IN (
        SELECT ip.id       AS ip_id,
               ip.cantidad AS ip_qty,
               ip.combo_id,
               c.nombre    AS c_nombre,
               c.precio    AS c_precio
        FROM items_pedido ip
        JOIN combos c ON c.id = ip.combo_id
        WHERE ip.pedido_id = NEW.id
          AND ip.combo_id IS NOT NULL
    ) LOOP

        INSERT INTO ventas (global_id, numero_ticket, total, fecha, fecha_limpia, user_id)
        VALUES (
            -- global_id único combinando epoch y el ID del ítem
            EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 + v_combo_item.ip_id,
            'COMBO-ONLINE-' || NEW.id || '-' || v_combo_item.ip_id,
            v_combo_item.c_precio * v_combo_item.ip_qty,
            TO_CHAR(NOW(), 'DD/MM/YYYY, HH24:MI:SS'),
            TO_CHAR(NOW(), 'DD/MM/YYYY'),
            v_admin_id
        ) RETURNING id INTO v_combo_venta_id;

        -- Detalle: productos individuales que componen el combo
        INSERT INTO items_venta (venta_id, product_id, nombre, cantidad, precio, subtotal, user_id)
        SELECT
            v_combo_venta_id,
            CASE
                WHEN cp.product_id IS NOT NULL AND cp.product_id != ''
                     AND cp.product_id ~ '^\d+$'
                THEN cp.product_id::BIGINT
                ELSE NULL
            END,
            cp.nombre,
            cp.cantidad * v_combo_item.ip_qty,
            cp.precio,
            cp.precio * cp.cantidad * v_combo_item.ip_qty,
            v_admin_id
        FROM combo_productos cp
        WHERE cp.combo_id = v_combo_item.combo_id;

    END LOOP;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_descontar_inventario_pedido
BEFORE UPDATE ON pedidos
FOR EACH ROW EXECUTE FUNCTION fn_descontar_inventario_pedido();


-- ================================================================
-- PASO 12: RPC cambiar_estado_pedido
-- El admin lo llama desde el panel para confirmar/despachar/entregar.
-- SECURITY DEFINER garantiza que el trigger se ejecuta con privilegios.
-- ================================================================
CREATE OR REPLACE FUNCTION cambiar_estado_pedido(
    p_pedido_id          BIGINT,
    p_nuevo_estado       TEXT,
    p_fecha_confirmacion TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT es_admin() THEN
        RAISE EXCEPTION 'No tienes permisos para cambiar el estado del pedido.';
    END IF;
    IF p_nuevo_estado NOT IN ('pendiente','pago_confirmado','despachado','entregado','cancelado') THEN
        RAISE EXCEPTION 'Estado no válido: %', p_nuevo_estado;
    END IF;
    UPDATE pedidos SET estado = p_nuevo_estado WHERE id = p_pedido_id;
END;
$$;

GRANT EXECUTE ON FUNCTION cambiar_estado_pedido(BIGINT, TEXT, TIMESTAMPTZ) TO authenticated;


-- ================================================================
-- PASO 13: RLS — PRODUCTOS
-- ================================================================
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "productos: select propio"
    ON productos FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "productos: insert propio"
    ON productos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "productos: update propio"
    ON productos FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "productos: delete propio"
    ON productos FOR DELETE USING (auth.uid() = user_id);

-- Clientes autenticados ven productos con stock del admin
CREATE POLICY "productos: select tienda publica"
    ON productos FOR SELECT
    USING (auth.role() = 'authenticated' AND cantidad > 0);


-- ================================================================
-- PASO 14: RLS — VENTAS e ITEMS_VENTA
-- ================================================================
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ventas: select propio"
    ON ventas FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ventas: insert propio"
    ON ventas FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ventas: delete propio"
    ON ventas FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE items_venta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "items_venta: select propio"
    ON items_venta FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "items_venta: insert propio"
    ON items_venta FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "items_venta: delete propio"
    ON items_venta FOR DELETE USING (auth.uid() = user_id);


-- ================================================================
-- PASO 15: RLS — CONTADOR_TICKETS
-- ================================================================
ALTER TABLE contador_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contador_tickets: select propio"
    ON contador_tickets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "contador_tickets: insert propio"
    ON contador_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contador_tickets: update propio"
    ON contador_tickets FOR UPDATE USING (auth.uid() = user_id);


-- ================================================================
-- PASO 16: RLS — PEDIDOS
-- ================================================================
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- El cliente ve y crea sus propios pedidos
CREATE POLICY "pedidos: cliente select"
    ON pedidos FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "pedidos: cliente insert"
    ON pedidos FOR INSERT WITH CHECK (auth.uid() = user_id);

-- El cliente solo puede cancelar pedidos pendientes propios
CREATE POLICY "pedidos: cliente cancelar"
    ON pedidos FOR UPDATE
    USING (auth.uid() = user_id AND estado = 'pendiente');

-- El admin ve y gestiona todos los pedidos
CREATE POLICY "pedidos: admin select todo"
    ON pedidos FOR SELECT USING (es_admin());

CREATE POLICY "pedidos: admin update todo"
    ON pedidos FOR UPDATE USING (es_admin());

CREATE POLICY "pedidos: admin delete todo"
    ON pedidos FOR DELETE USING (es_admin());


-- ================================================================
-- PASO 17: RLS — ITEMS_PEDIDO
-- ================================================================
ALTER TABLE items_pedido ENABLE ROW LEVEL SECURITY;

-- El cliente puede ver y crear ítems de sus propios pedidos
CREATE POLICY "items_pedido: cliente select"
    ON items_pedido FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM pedidos p
        WHERE p.id = items_pedido.pedido_id AND p.user_id = auth.uid()
    ));

CREATE POLICY "items_pedido: cliente insert"
    ON items_pedido FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM pedidos p
        WHERE p.id = items_pedido.pedido_id AND p.user_id = auth.uid()
    ));

-- El admin ve y elimina ítems de cualquier pedido
CREATE POLICY "items_pedido: admin select todo"
    ON items_pedido FOR SELECT USING (es_admin());

CREATE POLICY "items_pedido: admin delete todo"
    ON items_pedido FOR DELETE USING (es_admin());


-- ================================================================
-- PASO 18: RLS — COMBOS
-- Admin: gestiona sus propios combos (CRUD completo).
-- Clientes autenticados: solo lectura de combos del admin.
-- ================================================================
ALTER TABLE combos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "combos: select propio"
    ON combos FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "combos: insert propio"
    ON combos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "combos: update propio"
    ON combos FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "combos: delete propio"
    ON combos FOR DELETE USING (auth.uid() = user_id);

-- Cualquier autenticado puede leer combos; el JS ya filtra por adminUserId
CREATE POLICY "combos: select tienda"
    ON combos FOR SELECT
    USING (auth.role() = 'authenticated');


-- ================================================================
-- PASO 19: RLS — COMBO_PRODUCTOS
-- ================================================================
ALTER TABLE combo_productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "combo_productos: select propio"
    ON combo_productos FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "combo_productos: insert propio"
    ON combo_productos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "combo_productos: delete propio"
    ON combo_productos FOR DELETE USING (auth.uid() = user_id);

-- Cualquier autenticado puede leer combo_productos; el JS ya filtra por adminUserId
CREATE POLICY "combo_productos: select tienda"
    ON combo_productos FOR SELECT
    USING (auth.role() = 'authenticated');


-- ================================================================
-- PASO 20: RLS — USUARIOS_ADMIN
-- ================================================================
ALTER TABLE usuarios_admin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_admin: select propio"
    ON usuarios_admin FOR SELECT USING (auth.uid() = id);

CREATE POLICY "usuarios_admin: insert propio"
    ON usuarios_admin FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "usuarios_admin: update propio"
    ON usuarios_admin FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "usuarios_admin: admin select"
    ON usuarios_admin FOR SELECT USING (es_admin());


-- ================================================================
-- PASO 21: RLS — CLIENTES_TIENDA
-- ================================================================
ALTER TABLE clientes_tienda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_tienda: select propio"
    ON clientes_tienda FOR SELECT USING (auth.uid() = id);

CREATE POLICY "clientes_tienda: insert propio"
    ON clientes_tienda FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "clientes_tienda: update propio"
    ON clientes_tienda FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "clientes_tienda: admin select"
    ON clientes_tienda FOR SELECT USING (es_admin());


-- ================================================================
-- PASO 22: STORAGE BUCKET — productos
-- ================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('productos', 'productos', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
    DROP POLICY IF EXISTS "storage productos: upload propio"   ON storage.objects;
    DROP POLICY IF EXISTS "storage productos: delete propio"   ON storage.objects;
    DROP POLICY IF EXISTS "storage productos: lectura publica" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Políticas de storage no existían, continuando...';
END $$;

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
-- PASO 23: GRANTS FINALES
-- ================================================================
GRANT EXECUTE ON FUNCTION get_admin_user_id()                      TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_user_id()                      TO anon;
GRANT EXECUTE ON FUNCTION cambiar_estado_pedido(BIGINT, TEXT, TIMESTAMPTZ) TO authenticated;


-- ================================================================
-- FIN DEL SCRIPT
--
-- FLUJO COMPLETO DE UNA VENTA ONLINE CON COMBO:
--
--   1. Cliente compra combo en tienda online (ventas/)
--      → items_pedido inserta: product_id=NULL, combo_id=UUID, nombre='🎁 Combo: X'
--
--   2. Admin confirma pago en panel (tienda-online/) → RPC cambiar_estado_pedido
--      → Trigger fn_descontar_inventario_pedido:
--         a. Verifica stock de productos regulares Y de combo_productos
--         b. Descuenta inventario: UPDATE productos (regulares + combo)
--         c. Crea ticket ONLINE-{pedido_id}  → aparece en Ventas Online y Estadísticas
--         d. Crea ticket COMBO-ONLINE-{id}   → aparece en Historial Combos con badge 🌐
--
-- PREFIJOS DE TICKETS EN ventas.numero_ticket:
--   V-NNNN             → venta física          → descuenta en trg_descontar_inventario_fisico
--   COMBO-NNNN         → combo físico          → descuenta en trg_descontar_inventario_fisico
--   ONLINE-N           → pedido online         → descuenta en trg_descontar_inventario_pedido
--   COMBO-ONLINE-N-M   → combo de pedido online → descuenta en trg_descontar_inventario_pedido
--                                                  (EXCLUIDO de fn_descontar_inventario_fisico)
-- ================================================================
