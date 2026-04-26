-- 1. metodo_pago (sin dependencias)
INSERT INTO metodo_pago (nombre)
VALUES ('EFECTIVO'),
    ('TARJETA DE DEBITO'),
    ('TARJETA DE CREDITO'),
    ('QR / TRANSFERENCIA');
-- ============================================================
-- 2. turno_caja (sin dependencias)
INSERT INTO turno_caja (
        apertura,
        cierre,
        monto_apertura,
        estado,
        total_calculado_teorico,
        total_calculado_en_caja,
        monto_cierre_transaccion,
        monto_cierre_efectivo
    )
VALUES (
        '2026-04-21 08:00:00+00',
        '2026-04-21 16:00:00+00',
        500.00,
        'CERRADO',
        118.00,
        80.00,
        38.00,
        571.00
    ),
    (
        '2026-04-21 16:00:00+00',
        '2026-04-22 00:00:00+00',
        300.00,
        'CERRADO',
        0.00,
        0.00,
        0.00,
        300.00
    ),
    (
        '2026-04-22 08:00:00+00',
        NULL,
        300.00,
        'ABIERTO',
        NULL,
        NULL,
        NULL,
        NULL
    );
-- ============================================================
-- 4. proveedor (sin dependencias)
INSERT INTO proveedor (
        nombre,
        contacto,
        telefono,
        email,
        direccion,
        activo
    )
VALUES (
        'Distribuidora Avicola Sur S.R.L.',
        'Juan Condori',
        '22345678',
        'avicola.sur@gmail.com',
        'Av. Los Pinos 123, La Paz',
        true
    ),
    (
        'Alimentos Andinos Bolivia S.A.',
        'Maria Salinas',
        '22987654',
        'alimentos.andinos@mail.com',
        'Calle Comercio 456, El Alto',
        true
    ),
    (
        'Frialp Productos Frescos',
        'Pedro Aguilar',
        '22112233',
        'frialp@frialp.com.bo',
        'Zona Villa Fátima 789, La Paz',
        true
    );
-- ============================================================
-- 5. tipo_movimiento (sin dependencias)
-- afecta_stock: 1 = entrada, -1 = salida
INSERT INTO tipo_movimiento (nombre, afecta_stock)
VALUES ('COMPRA', 1),
    ('CONSUMO', -1),
    ('AJUSTE ENTRADA', 1),
    ('AJUSTE SALIDA', -1),
    ('MERMA', -1);
-- ============================================================
-- 6. categoria_ingrediente (sin dependencias)
INSERT INTO categoria_ingrediente (nombre)
VALUES ('Carnes y Aves'),
    ('Aceites y Grasas'),
    ('Harinas y Almidones'),
    ('Vegetales y Frescos'),
    ('Lácteos'),
    ('Salsas y Condimentos'),
    ('Bebidas'),
    ('Panificados');
-- ============================================================
-- 7. categoria_producto (sin dependencias)
INSERT INTO categoria_producto (nombre)
VALUES ('POLLO'),
    ('BALDES'),
    ('HAMBURGUESAS'),
    ('HAMBURGUESAS XL'),
    ('WRAPS Y ENSALADAS'),
    ('ACOMPAÑAMIENTOS'),
    ('POSTRES'),
    ('EXTRAS');
-- ============================================================
-- 8. estado_pedido (sin dependencias)
INSERT INTO estado_pedido (nombre, descripcion)
VALUES (
        'PENDIENTE',
        'Pedido recibido, esperando confirmación'
    ),
    (
        'EN PROCESO',
        'Pedido en cocina siendo preparado'
    ),
    (
        'LISTO',
        'Pedido preparado, listo para entregar'
    ),
    ('ENTREGADO', 'Pedido entregado al cliente'),
    ('ANULADO', 'Pedido cancelado o anulado');
-- ============================================================
-- 9. producto (depende de: categoria_producto)
--    Solo 5 productos del menú real
--    precio_combo / precio_con_papa / precio_solo en Bs.
INSERT INTO producto (
        codigo,
        nombre,
        descripcion,
        id_categoria_producto,
        precio_combo,
        precio_con_papa,
        precio_solo,
        disponible
    )
VALUES (
        'POLL-ANT',
        'Combo Antojito',
        '1 Presa de Pollo (Pierna, Ala o Muslo), Papa o Arroz Personal, Gaseosa Personal, 1 Salsa Copacabana',
        1,
        30.00,
        24.00,
        NULL,
        true
    ),
    (
        'POLL-CUA',
        'Combo 1/4 Pollo',
        '1/4 Pollo (Muslo con Pierna o Pechuga con Ala), Papa o Arroz Personal, Gaseosa Personal, 1 Salsa Copacabana',
        1,
        40.00,
        36.00,
        31.00,
        true
    ),
    (
        'POLL-FIE',
        'Combo Fiesta',
        '2 Presas de Pollo, Papa o Arroz Personal, Gaseosa Personal, 1 Salsa Copacabana',
        1,
        41.00,
        37.00,
        33.00,
        true
    ),
    (
        'HAMB-REC',
        'Combo Recreo',
        'Carne, Tomate, Papa Personal, Gaseosa Personal',
        3,
        30.00,
        25.00,
        22.00,
        true
    ),
    (
        'HAMB-COP',
        'Combo Copacabana',
        'Carne, Tocino, Lechuga, Tomate, Papa Mediana, Gaseosa Mediana',
        3,
        41.00,
        34.00,
        29.00,
        true
    );
-- ============================================================
-- 10. Ingredientes (depende de: categoria_ingrediente)
INSERT INTO Ingredientes (
        nombre,
        descripcion,
        unidad_medida,
        stock_actual,
        stock_minimo,
        costo_unitario_avg,
        valor_inventario,
        agotado,
        activo,
        id_categoria_ingrediente
    )
VALUES (
        'Pollo entero troceado',
        'Pollo fresco nacional troceado en presas',
        'kg',
        150.000,
        20.000,
        28.50,
        4275.00,
        false,
        true,
        1
    ),
    (
        'Aceite vegetal refinado',
        'Aceite para fritura profunda',
        'L',
        80.000,
        10.000,
        8.20,
        656.00,
        false,
        true,
        2
    ),
    (
        'Harina sazonada especial',
        'Mezcla de harina con especias para apanado',
        'kg',
        50.000,
        5.000,
        12.00,
        600.00,
        false,
        true,
        3
    ),
    (
        'Papa blanca pelada',
        'Papa blanca fresca pelada lista para freír',
        'kg',
        90.000,
        15.000,
        4.50,
        405.00,
        false,
        true,
        4
    ),
    (
        'Pan de hamburguesa',
        'Pan de sésamo estándar para hamburguesa',
        'u',
        200.000,
        30.000,
        2.80,
        560.00,
        false,
        true,
        8
    ),
    (
        'Carne molida de res',
        'Carne molida especial para hamburguesas',
        'kg',
        40.000,
        8.000,
        35.00,
        1400.00,
        false,
        true,
        1
    ),
    (
        'Lechuga fresca',
        'Lechuga americana en hojas',
        'kg',
        10.000,
        2.000,
        6.00,
        60.00,
        false,
        true,
        4
    ),
    (
        'Tomate fresco',
        'Tomate perita fresco en rodajas',
        'kg',
        12.000,
        2.000,
        5.50,
        66.00,
        false,
        true,
        4
    ),
    (
        'Tocino ahumado',
        'Tocino en lonchas ahumado',
        'kg',
        8.000,
        1.000,
        42.00,
        336.00,
        false,
        true,
        1
    ),
    (
        'Salsa Copacabana',
        'Salsa especial de la casa en sachets',
        'u',
        500.000,
        50.000,
        0.80,
        400.00,
        false,
        true,
        6
    );
-- ============================================================
-- 11. receta (depende de: producto, Ingredientes)
--     3 recetas representativas por producto (5 productos)
-- Receta: Combo Antojito (id_producto=1)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
VALUES (1, 1, 0.250),
    -- 250g pollo
    (1, 2, 0.150),
    -- 150ml aceite
    (1, 3, 0.080);
-- 80g harina sazonada
-- Receta: Combo 1/4 Pollo (id_producto=2)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
VALUES (2, 1, 0.350),
    -- 350g pollo
    (2, 2, 0.200),
    -- 200ml aceite
    (2, 3, 0.100);
-- 100g harina sazonada
-- Receta: Combo Fiesta (id_producto=3)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
VALUES (3, 1, 0.500),
    -- 500g pollo (2 presas)
    (3, 2, 0.250),
    -- 250ml aceite
    (3, 3, 0.120);
-- 120g harina sazonada
-- Receta: Combo Recreo - hamburguesa (id_producto=4)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
VALUES (4, 6, 0.150),
    -- 150g carne molida
    (4, 5, 1.000),
    -- 1 pan de hamburguesa
    (4, 8, 0.050);
-- 50g tomate
-- Receta: Combo Copacabana - hamburguesa (id_producto=5)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
VALUES (5, 6, 0.150),
    -- 150g carne molida
    (5, 5, 1.000),
    -- 1 pan de hamburguesa
    (5, 7, 0.040),
    -- 40g lechuga
    (5, 8, 0.050),
    -- 50g tomate
    (5, 9, 0.030);
-- 30g tocino
-- ============================================================
-- 12. pedido (depende de: Usuarios, estado_pedido)
INSERT INTO pedido (
        id_estado,
        numero_ticket,
        origen_web,
        subtotal,
        descuento_pct,
        descuento_monto,
        total,
        instrucciones
    )
VALUES (
        4,
        'TICK-2026-0001',
        false,
        71.00,
        0.00,
        0.00,
        71.00,
        'Sin instrucciones especiales'
    ),
    (
        4,
        'TICK-2026-0002',
        true,
        40.00,
        5.00,
        2.00,
        38.00,
        'Sin cebolla por favor'
    ),
    (
        2,
        'TICK-2026-0003',
        false,
        41.00,
        0.00,
        0.00,
        41.00,
        NULL
    );
-- ============================================================
-- 13. detalle_pedido (depende de: pedido, producto)
-- Pedido 1: Combo Antojito x1 + Combo Recreo x1
INSERT INTO detalle_pedido (
        id_pedido,
        id_producto,
        tipo_precio,
        cantidad,
        precio_unitario,
        subtotal
    )
VALUES (1, 1, 'COMBO', 1, 30.00, 30.00),
    (1, 4, 'COMBO', 1, 41.00, 41.00);
-- Pedido 2: Combo 1/4 Pollo x1
INSERT INTO detalle_pedido (
        id_pedido,
        id_producto,
        tipo_precio,
        cantidad,
        precio_unitario,
        subtotal
    )
VALUES (2, 2, 'COMBO', 1, 40.00, 40.00);
-- Pedido 3: Combo Fiesta x1
INSERT INTO detalle_pedido (
        id_pedido,
        id_producto,
        tipo_precio,
        cantidad,
        precio_unitario,
        subtotal
    )
VALUES (3, 3, 'COMBO', 1, 41.00, 41.00);
-- ============================================================
-- 14. historial_estado_pedido (depende de: pedido, estado_pedido)
INSERT INTO historial_estado_pedido (id_pedido, id_estado, fecha)
VALUES (1, 1, '2026-04-21 10:00:00+00'),
    (1, 2, '2026-04-21 10:05:00+00'),
    (1, 4, '2026-04-21 10:25:00+00'),
    (2, 1, '2026-04-21 11:00:00+00'),
    (2, 4, '2026-04-21 11:20:00+00'),
    (3, 1, '2026-04-22 09:00:00+00'),
    (3, 2, '2026-04-22 09:05:00+00');
-- ============================================================
-- 15. pago (depende de: pedido, turno_caja, metodo_pago)
INSERT INTO pago (
        id_pedido,
        id_turno_caja,
        id_metodo,
        monto_pagado,
        monto_cambio
    )
VALUES (1, 1, 1, 80.00, 9.00),
    (2, 1, 4, 38.00, 0.00),
    (3, 3, 1, 50.00, 9.00);
-- ============================================================
-- 16. movimiento_inventario (depende de: Ingredientes, tipo_movimiento, proveedor)
INSERT INTO movimiento_inventario (
        id_insumo,
        id_tipo_movimiento,
        id_proveedor,
        cantidad,
        costo_unitario,
        lote,
        motivo
    )
VALUES -- Compras iniciales de stock
    (
        1,
        1,
        1,
        150.000,
        28.50,
        'LOTE-2604-A',
        'Compra semanal de pollo'
    ),
    (
        6,
        1,
        1,
        40.000,
        35.00,
        'LOTE-2604-B',
        'Compra semanal de carne molida'
    ),
    (
        4,
        1,
        2,
        90.000,
        4.50,
        'LOTE-2604-C',
        'Compra semanal de papa'
    ),
    -- Consumos por ventas del día
    (
        1,
        2,
        NULL,
        1.100,
        NULL,
        NULL,
        'Consumo por pedidos del turno mañana'
    ),
    (
        6,
        2,
        NULL,
        0.300,
        NULL,
        NULL,
        'Consumo hamburguesas turno mañana'
    ),
    (
        4,
        2,
        NULL,
        0.500,
        NULL,
        NULL,
        'Consumo papa turno mañana'
    );
-- ============================================================
-- VERIFICACIONES
SELECT 'metodo_pago' AS tabla,
    COUNT(*) AS registros
FROM metodo_pago
UNION ALL
SELECT 'turno_caja',
    COUNT(*)
FROM turno_caja
UNION ALL
SELECT 'proveedor',
    COUNT(*)
FROM proveedor
UNION ALL
SELECT 'tipo_movimiento',
    COUNT(*)
FROM tipo_movimiento
UNION ALL
SELECT 'categoria_ingrediente',
    COUNT(*)
FROM categoria_ingrediente
UNION ALL
SELECT 'categoria_producto',
    COUNT(*)
FROM categoria_producto
UNION ALL
SELECT 'estado_pedido',
    COUNT(*)
FROM estado_pedido
UNION ALL
SELECT 'producto',
    COUNT(*)
FROM producto
UNION ALL
SELECT 'Ingredientes',
    COUNT(*)
FROM Ingredientes
UNION ALL
SELECT 'receta',
    COUNT(*)
FROM receta
UNION ALL
SELECT 'pedido',
    COUNT(*)
FROM pedido
UNION ALL
SELECT 'detalle_pedido',
    COUNT(*)
FROM detalle_pedido
UNION ALL
SELECT 'historial_estado_pedido',
    COUNT(*)
FROM historial_estado_pedido
UNION ALL
SELECT 'pago',
    COUNT(*)
FROM pago
UNION ALL
SELECT 'movimiento_inventario',
    COUNT(*)
FROM movimiento_inventario
ORDER BY tabla;
-- ============================================================
-- SEED MENÚ COMPLETO - Pollos Copacabana
-- Script incremental: asume que el seed inicial ya fue ejecutado
-- (metodo_pago, turno_caja, usuarios, proveedor, tipo_movimiento,
--  categoria_ingrediente, estado_pedido ya existen con IDs 1-N)
-- Orden respeta dependencias FK en todo momento
-- ============================================================
-- ============================================================
-- PASO 1: categoria_producto
-- Ya existen en el seed inicial (IDs 1-8):
--   1=POLLO, 2=BALDES, 3=HAMBURGUESAS, 4=HAMBURGUESAS XL,
--   5=WRAPS Y ENSALADAS, 6=ACOMPAÑAMIENTOS, 7=POSTRES, 8=EXTRAS
-- No se necesita insertar nada nuevo aquí.
-- ============================================================
-- Verificación
SELECT id_categoria_producto,
    nombre
FROM categoria_producto
ORDER BY id_categoria_producto;
-- ============================================================
-- PASO 2: categoria_ingrediente
-- Ya existen en el seed inicial (IDs 1-8).
-- Agregamos algunas categorías que el menú completo necesita.
-- ============================================================
INSERT INTO categoria_ingrediente (nombre)
VALUES ('Frutas y Conservas'),
    -- para ensaladas (durazno, etc.)
    ('Cereales y Granos');
-- para quinua
-- Verificación
SELECT id_categoria_ingrediente,
    nombre
FROM categoria_ingrediente
ORDER BY id_categoria_ingrediente;
-- ============================================================
-- PASO 3: producto
-- El seed inicial tiene 5 productos (IDs 1-5).
-- Insertamos TODOS los productos del menú completo.
-- Convención tipo_precio por producto:
--   precio_combo   = COMBO (con gaseosa)
--   precio_con_papa = CON_PAPA (sin gaseosa, con papa/arroz)
--   precio_solo    = SOLO  (solo el ítem principal)
-- Para ACOMPAÑAMIENTOS/POSTRES/EXTRAS usamos precio_solo únicamente.
-- ============================================================
-- ────────────────────────────────
-- CATEGORÍA 1: POLLO (faltantes)
-- ────────────────────────────────
INSERT INTO producto (
        codigo,
        nombre,
        descripcion,
        id_categoria_producto,
        precio_combo,
        precio_con_papa,
        precio_solo,
        disponible
    )
VALUES (
        'POLL-TRI',
        'Combo Trío',
        '3 Presas de Pollo, Papa o Arroz Mediano, Gaseosa Mediana, 2 Salsas Copacabana',
        1,
        58.00,
        52.00,
        46.00,
        true
    ),
    (
        'POLL-ESP',
        'Combo Especial',
        '4 Presas de Pollo, Papa o Arroz Mediano, Gaseosa Mediana, 3 Salsas Copacabana',
        1,
        73.00,
        65.00,
        58.00,
        true
    ),
    (
        'POLL-COP',
        'Combo Copalitos',
        '6 Filetes de Pechuga, Papa o Arroz Mediano, Gaseosa Mediana, 2 Salsas Copacabana',
        1,
        52.00,
        46.00,
        NULL,
        true
    );
-- Nota: Copalitos tiene también venta por unidad (1/2 Docena=40, Docena=68)
-- Esos se modelan como productos separados en EXTRAS para poder pedirlos solos.
-- ────────────────────────────────
-- CATEGORÍA 2: BALDES
-- ────────────────────────────────
INSERT INTO producto (
        codigo,
        nombre,
        descripcion,
        id_categoria_producto,
        precio_combo,
        precio_con_papa,
        precio_solo,
        disponible
    )
VALUES (
        'BALD-PIP',
        'Combo Pipocas de Pollo',
        'Pipocas de Pollo, Papa Personal, Gaseosa Personal, 2 Salsas Copacabana',
        2,
        45.00,
        41.00,
        37.00,
        true
    ),
    (
        'BALD-ALI',
        'Combo Balde Alitas',
        '8 Piezas de Alitas, Papa o Arroz Mediano, Gaseosa Mediana, 1 Salsa Copacabana y 1 Salsa Miel y Mostaza o Barbacoa',
        2,
        56.00,
        47.00,
        41.00,
        true
    ),
    (
        'BALD-C08',
        'Combo Balde Copacabana 8 Presas',
        '8 Presas de Pollo, 2 Papas o Arroz Grande, 3 Gaseosas Grandes, 6 Salsas Copacabana. Órdenes para llevar con Coca-Cola de 2 lts.',
        2,
        140.00,
        132.00,
        112.00,
        true
    ),
    (
        'BALD-C12',
        'Combo Balde Copacabana 12 Presas',
        '12 Presas de Pollo, 3 Papas o Arroz Grande, 3 Gaseosas Grandes. Órdenes para llevar con Coca-Cola de 2 lts.',
        2,
        204.00,
        197.00,
        166.00,
        true
    );
-- ────────────────────────────────
-- CATEGORÍA 3: HAMBURGUESAS (faltantes; Recreo y Copacabana ya existen como IDs 4 y 5)
-- ────────────────────────────────
INSERT INTO producto (
        codigo,
        nombre,
        descripcion,
        id_categoria_producto,
        precio_combo,
        precio_con_papa,
        precio_solo,
        disponible
    )
VALUES (
        'HAMB-QUE',
        'Combo Queso',
        'Carne, Queso, Papa Mediana, Gaseosa Mediana',
        3,
        36.00,
        29.00,
        25.00,
        true
    ),
    (
        'HAMB-DOB',
        'Combo Doble',
        '2 Carnes, Tocino, Queso, Tomate, Lechuga, Papa Mediana, Gaseosa Mediana',
        3,
        49.00,
        43.00,
        38.00,
        true
    ),
    (
        'HAMB-BIC',
        'Combo Bicentenario',
        'Hamburguesa Copacabana + 1 Presa de Pollo, Papa o Arroz Mediano, Gaseosa Mediana',
        3,
        56.00,
        51.00,
        44.00,
        true
    ),
    (
        'HAMB-PCR',
        'Combo Hamburguesa de Pollo Crocante',
        'Carne de Pollo, Lechuga, Tomate, Aderezos, Papa Mediana, Gaseosa Mediana',
        3,
        46.00,
        41.00,
        36.00,
        true
    );
-- ────────────────────────────────
-- CATEGORÍA 4: HAMBURGUESAS XL
-- ────────────────────────────────
INSERT INTO producto (
        codigo,
        nombre,
        descripcion,
        id_categoria_producto,
        precio_combo,
        precio_con_papa,
        precio_solo,
        disponible
    )
VALUES (
        'HXLQ-QUE',
        'Combo Queso XL',
        'Hamburguesa XL con Queso, Papa Mediana, Gaseosa Mediana',
        4,
        49.00,
        43.00,
        38.00,
        true
    ),
    (
        'HXLQ-COP',
        'Combo Copacabana XL',
        'Hamburguesa XL Copacabana, Papa Mediana, Gaseosa Mediana',
        4,
        56.00,
        49.00,
        43.00,
        true
    ),
    (
        'HXLQ-DOB',
        'Combo Doble XL',
        'Hamburguesa Doble XL, Papa Mediana, Gaseosa Mediana',
        4,
        66.00,
        59.00,
        54.00,
        true
    ),
    (
        'HXLQ-QUI',
        'Combo Hamburguesa de Quinua',
        'Hamburguesa de Quinua, Queso, Tomate, Lechuga, Palta, Papa Mediana, Gaseosa Mediana',
        4,
        43.00,
        37.00,
        32.00,
        true
    );
-- ────────────────────────────────
-- CATEGORÍA 5: WRAPS Y ENSALADAS
-- ────────────────────────────────
INSERT INTO producto (
        codigo,
        nombre,
        descripcion,
        id_categoria_producto,
        precio_combo,
        precio_con_papa,
        precio_solo,
        disponible
    )
VALUES (
        'WRAP-EST',
        'Combo Wrap Espinaca y Tocino',
        'Wrap, Espinaca, Tocino, Queso, Palta, Papa Personal, Gaseosa Personal',
        5,
        37.00,
        33.00,
        29.00,
        true
    ),
    (
        'WRAP-COP',
        'Combo Wrap Copalitos',
        'Wrap con Copalitos, Papa o Arroz Mediano, Gaseosa Mediana',
        5,
        37.00,
        33.00,
        29.00,
        true
    ),
    (
        'ENSA-PRI',
        'Combo Ensalada Primavera de Pollo',
        'Filetes Ahumados de Pechuga de Pollo, Queso, Mezcla de Lechugas, Tomate, Maíz Dulce y Zanahoria. Incluye Gaseosa Mediana o Agua 600cc, 1 Salsa Italian y 1 Salsa Ranch',
        5,
        38.00,
        NULL,
        32.50,
        true
    ),
    (
        'ENSA-QUI',
        'Combo Ensalada de Quinua',
        'Quinua, Copalitos, Zanahoria, Repollo, Palta, Maíz Dulce, Durazno en Conserva, Tomate, Salsa Acevichada. Incluye Gaseosa Mediana o Agua 600cc',
        5,
        43.00,
        NULL,
        38.00,
        true
    );
-- ────────────────────────────────
-- CATEGORÍA 6: ACOMPAÑAMIENTOS
-- Se modelan como productos individuales (precio_solo = su precio)
-- precio_combo / precio_con_papa = NULL (no aplica)
-- ────────────────────────────────
INSERT INTO producto (
        codigo,
        nombre,
        descripcion,
        id_categoria_producto,
        precio_combo,
        precio_con_papa,
        precio_solo,
        disponible
    )
VALUES (
        'ACOM-PAP-P',
        'Papa Personal',
        'Porción personal de papas fritas',
        6,
        NULL,
        NULL,
        11.50,
        true
    ),
    (
        'ACOM-PAP-M',
        'Papa Mediana',
        'Porción mediana de papas fritas',
        6,
        NULL,
        NULL,
        13.50,
        true
    ),
    (
        'ACOM-PAP-G',
        'Papa Grande',
        'Porción grande de papas fritas',
        6,
        NULL,
        NULL,
        16.00,
        true
    ),
    (
        'ACOM-ARR-P',
        'Arroz Personal',
        'Porción personal de arroz',
        6,
        NULL,
        NULL,
        8.50,
        true
    ),
    (
        'ACOM-ARR-M',
        'Arroz Mediano',
        'Porción mediana de arroz',
        6,
        NULL,
        NULL,
        10.50,
        true
    ),
    (
        'ACOM-ARR-G',
        'Arroz Grande',
        'Porción grande de arroz',
        6,
        NULL,
        NULL,
        22.00,
        true
    ),
    (
        'ACOM-COL-P',
        'Coleslaw Personal',
        'Porción personal de coleslaw',
        6,
        NULL,
        NULL,
        9.50,
        true
    ),
    (
        'ACOM-COL-M',
        'Coleslaw Mediano',
        'Porción mediana de coleslaw',
        6,
        NULL,
        NULL,
        11.50,
        true
    ),
    (
        'ACOM-COL-G',
        'Coleslaw Grande',
        'Porción grande de coleslaw',
        6,
        NULL,
        NULL,
        23.00,
        true
    ),
    (
        'ACOM-GAS-P',
        'Gaseosa Personal',
        'Gaseosa tamaño personal',
        6,
        NULL,
        NULL,
        9.50,
        true
    ),
    (
        'ACOM-GAS-M',
        'Gaseosa Mediana',
        'Gaseosa tamaño mediano',
        6,
        NULL,
        NULL,
        12.00,
        true
    ),
    (
        'ACOM-GAS-G',
        'Gaseosa Grande',
        'Gaseosa tamaño grande',
        6,
        NULL,
        NULL,
        15.00,
        true
    );
-- ────────────────────────────────
-- CATEGORÍA 7: POSTRES
-- ────────────────────────────────
INSERT INTO producto (
        codigo,
        nombre,
        descripcion,
        id_categoria_producto,
        precio_combo,
        precio_con_papa,
        precio_solo,
        disponible
    )
VALUES (
        'POST-DON',
        'Donut',
        'Donut glaseado',
        7,
        NULL,
        NULL,
        7.50,
        true
    ),
    (
        'POST-MOU',
        'Mousse',
        'Mousse de sabores variados',
        7,
        NULL,
        NULL,
        7.50,
        true
    ),
    (
        'POST-PIE',
        'Pie',
        'Pie de Frutilla, Maracuyá o Mora',
        7,
        NULL,
        NULL,
        12.00,
        true
    );
-- ────────────────────────────────
-- CATEGORÍA 8: EXTRAS
-- ────────────────────────────────
INSERT INTO producto (
        codigo,
        nombre,
        descripcion,
        id_categoria_producto,
        precio_combo,
        precio_con_papa,
        precio_solo,
        disponible
    )
VALUES (
        'EXTR-QTO',
        'Queso o Tocino',
        'Extra de queso o tocino',
        8,
        NULL,
        NULL,
        6.00,
        true
    ),
    (
        'EXTR-PLA',
        'Platanitos',
        'Porción de platanitos fritos',
        8,
        NULL,
        NULL,
        5.00,
        true
    ),
    (
        'EXTR-SAL',
        'Salsas Especiales',
        'Salsa Copacabana, Miel y Mostaza o Barbacoa',
        8,
        NULL,
        NULL,
        2.00,
        true
    ),
    (
        'EXTR-SAC',
        'Salsa Acevichada',
        'Salsa acevichada (nueva)',
        8,
        NULL,
        NULL,
        3.00,
        true
    ),
    (
        'EXTR-COP-MD',
        'Copalitos 1/2 Docena',
        '6 Filetes de Pechuga de Pollo',
        8,
        NULL,
        NULL,
        40.00,
        true
    ),
    (
        'EXTR-COP-DC',
        'Copalitos Docena',
        '12 Filetes de Pechuga de Pollo',
        8,
        NULL,
        NULL,
        68.00,
        true
    );
-- Verificación de productos insertados
SELECT p.codigo,
    p.nombre,
    cp.nombre AS categoria,
    p.precio_combo,
    p.precio_con_papa,
    p.precio_solo
FROM producto p
    JOIN categoria_producto cp ON p.id_categoria_producto = cp.id_categoria_producto
ORDER BY cp.id_categoria_producto,
    p.codigo;
-- ============================================================
-- PASO 4: Ingredientes
-- Agregamos los ingredientes que necesita el menú completo y que
-- no estaban en el seed inicial (IDs 1-10 ya existen).
-- ============================================================
INSERT INTO Ingredientes (
        nombre,
        descripcion,
        unidad_medida,
        stock_actual,
        stock_minimo,
        costo_unitario_avg,
        valor_inventario,
        agotado,
        activo,
        id_categoria_ingrediente
    )
VALUES -- Para ensaladas y wraps
    (
        'Espinaca fresca',
        'Hojas de espinaca fresca',
        'kg',
        5.000,
        1.000,
        7.00,
        35.00,
        false,
        true,
        4
    ),
    (
        'Palta fresca',
        'Palta (aguacate) fresco',
        'kg',
        6.000,
        1.000,
        15.00,
        90.00,
        false,
        true,
        4
    ),
    (
        'Maíz dulce en conserva',
        'Maíz dulce en lata',
        'kg',
        4.000,
        0.500,
        8.00,
        32.00,
        false,
        true,
        9
    ),
    (
        'Zanahoria rallada',
        'Zanahoria fresca rallada',
        'kg',
        3.000,
        0.500,
        4.00,
        12.00,
        false,
        true,
        4
    ),
    (
        'Repollo blanco',
        'Repollo blanco fresco para coleslaw',
        'kg',
        8.000,
        1.000,
        3.50,
        28.00,
        false,
        true,
        4
    ),
    (
        'Durazno en conserva',
        'Durazno en almíbar en conserva',
        'kg',
        3.000,
        0.500,
        9.00,
        27.00,
        false,
        true,
        9
    ),
    (
        'Quinua cocida',
        'Quinua boliviana cocida lista para ensalada',
        'kg',
        5.000,
        1.000,
        12.00,
        60.00,
        false,
        true,
        10
    ),
    (
        'Queso en lonchas',
        'Queso amarillo en lonchas para hamburguesa',
        'kg',
        6.000,
        1.000,
        28.00,
        168.00,
        false,
        true,
        5
    ),
    -- Para acompañamientos
    (
        'Plátano para chips',
        'Plátano verde para freír como platanitos',
        'kg',
        5.000,
        1.000,
        5.00,
        25.00,
        false,
        true,
        4
    ),
    -- Para postres
    (
        'Mezcla para donut',
        'Mezcla en polvo para donuts glaseados',
        'kg',
        3.000,
        0.500,
        18.00,
        54.00,
        false,
        true,
        3
    ),
    (
        'Mezcla para mousse',
        'Mezcla para mousse de sabores variados',
        'kg',
        2.000,
        0.500,
        20.00,
        40.00,
        false,
        true,
        5
    ),
    (
        'Base para pie',
        'Base de galleta para pie + relleno variado',
        'u',
        20.000,
        5.000,
        8.00,
        160.00,
        false,
        true,
        3
    ),
    -- Para salsas / aderezos
    (
        'Salsa Ranch',
        'Salsa Ranch en sachets',
        'u',
        200.000,
        30.000,
        0.90,
        180.00,
        false,
        true,
        6
    ),
    (
        'Salsa Italian',
        'Salsa Italian en sachets',
        'u',
        200.000,
        30.000,
        0.90,
        180.00,
        false,
        true,
        6
    ),
    (
        'Salsa Miel y Mostaza',
        'Salsa Miel y Mostaza en sachets',
        'u',
        300.000,
        50.000,
        0.80,
        240.00,
        false,
        true,
        6
    ),
    (
        'Salsa Barbacoa',
        'Salsa Barbacoa en sachets',
        'u',
        300.000,
        50.000,
        0.80,
        240.00,
        false,
        true,
        6
    ),
    (
        'Salsa Acevichada',
        'Salsa Acevichada en sachets (nueva)',
        'u',
        200.000,
        30.000,
        1.00,
        200.00,
        false,
        true,
        6
    ),
    -- Para wraps
    (
        'Tortilla de trigo',
        'Tortilla de trigo grande para wraps',
        'u',
        150.000,
        20.000,
        1.50,
        225.00,
        false,
        true,
        3
    ),
    -- Para pipocas/copalitos
    (
        'Filete de pechuga',
        'Filete de pechuga de pollo para copalitos',
        'kg',
        30.000,
        5.000,
        32.00,
        960.00,
        false,
        true,
        1
    ),
    -- Alitas
    (
        'Alitas de pollo',
        'Alitas de pollo frescas',
        'kg',
        40.000,
        8.000,
        22.00,
        880.00,
        false,
        true,
        1
    );
-- Verificación de ingredientes
SELECT id_insumo,
    nombre,
    unidad_medida,
    stock_actual,
    costo_unitario_avg
FROM Ingredientes
ORDER BY id_insumo;
-- ============================================================
-- PASO 5: receta
-- Recetas representativas (3 ingredientes por producto como mínimo)
-- para los productos nuevos.
-- IDs de Ingredientes del seed inicial:
--   1=Pollo troceado, 2=Aceite vegetal, 3=Harina sazonada,
--   4=Papa blanca, 5=Pan hamburguesa, 6=Carne molida,
--   7=Lechuga, 8=Tomate, 9=Tocino, 10=Salsa Copacabana
-- IDs nuevos (asumiendo inserción en orden, empezando en 11):
--   11=Espinaca, 12=Palta, 13=Maíz dulce, 14=Zanahoria,
--   15=Repollo, 16=Durazno, 17=Quinua, 18=Queso,
--   19=Plátano chips, 20=Mezcla donut, 21=Mezcla mousse,
--   22=Base pie, 23=Salsa Ranch, 24=Salsa Italian,
--   25=Salsa Miel y Mostaza, 26=Salsa Barbacoa, 27=Salsa Acevichada,
--   28=Tortilla trigo, 29=Filete pechuga, 30=Alitas de pollo
-- ============================================================
-- Para obtener los IDs reales de los productos nuevos usamos subqueries
-- en lugar de hardcodear IDs, para evitar errores si el serial difiere.
-- Combo Trío (POLL-TRI)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (1, 0.750),
            -- 750g pollo (3 presas)
            (2, 0.300),
            -- 300ml aceite
            (3, 0.140) -- 140g harina sazonada
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'POLL-TRI';
-- Combo Especial (POLL-ESP)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (1, 1.000),
            -- 1kg pollo (4 presas)
            (2, 0.400),
            (3, 0.160)
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'POLL-ESP';
-- Combo Copalitos (POLL-COP)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (29, 0.360),
            -- 6 filetes pechuga ~60g c/u
            (2, 0.200),
            (3, 0.100)
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'POLL-COP';
-- Combo Pipocas (BALD-PIP)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (29, 0.300),
            -- filetes para pipocas
            (2, 0.200),
            (3, 0.100)
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'BALD-PIP';
-- Combo Balde Alitas (BALD-ALI)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (30, 0.800),
            -- 8 alitas ~100g c/u
            (2, 0.400),
            (3, 0.150)
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'BALD-ALI';
-- Combo Balde Copa 8 Presas (BALD-C08)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (1, 2.000),
            -- 8 presas ~250g c/u
            (2, 0.800),
            (3, 0.400)
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'BALD-C08';
-- Combo Balde Copa 12 Presas (BALD-C12)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (1, 3.000),
            -- 12 presas
            (2, 1.200),
            (3, 0.600)
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'BALD-C12';
-- Combo Queso hamburguesa (HAMB-QUE)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (6, 0.150),
            -- carne molida
            (5, 1.000),
            -- pan
            (18, 0.030) -- queso
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'HAMB-QUE';
-- Combo Doble (HAMB-DOB)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (6, 0.300),
            -- 2 carnes molidas
            (5, 1.000),
            (18, 0.030),
            (9, 0.030),
            -- tocino
            (7, 0.040),
            -- lechuga
            (8, 0.050) -- tomate
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'HAMB-DOB';
-- Combo Bicentenario (HAMB-BIC)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (6, 0.150),
            -- carne hamburguesa
            (5, 1.000),
            (1, 0.250),
            -- 1 presa pollo
            (9, 0.030),
            (7, 0.040),
            (8, 0.050)
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'HAMB-BIC';
-- Combo Hamburguesa Pollo Crocante (HAMB-PCR)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (29, 0.180),
            -- filete pechuga
            (5, 1.000),
            (7, 0.040),
            (8, 0.050),
            (3, 0.080) -- harina sazonada apanado
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'HAMB-PCR';
-- Combo Queso XL (HXLQ-QUE)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (6, 0.200),
            (5, 1.000),
            (18, 0.040)
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'HXLQ-QUE';
-- Combo Copacabana XL (HXLQ-COP)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (6, 0.200),
            (5, 1.000),
            (9, 0.040),
            (7, 0.050),
            (8, 0.060)
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'HXLQ-COP';
-- Combo Doble XL (HXLQ-DOB)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (6, 0.400),
            -- 2 carnes XL
            (5, 1.000),
            (18, 0.050),
            (9, 0.040),
            (7, 0.050),
            (8, 0.060)
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'HXLQ-DOB';
-- Combo Hamburguesa de Quinua (HXLQ-QUI)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (17, 0.150),
            -- quinua cocida
            (5, 1.000),
            (18, 0.030),
            (8, 0.050),
            (7, 0.040),
            (12, 0.050) -- palta
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'HXLQ-QUI';
-- Combo Wrap Espinaca y Tocino (WRAP-EST)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (28, 1.000),
            -- tortilla
            (11, 0.060),
            -- espinaca
            (9, 0.040),
            -- tocino
            (18, 0.030),
            -- queso
            (12, 0.060) -- palta
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'WRAP-EST';
-- Combo Wrap Copalitos (WRAP-COP)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (28, 1.000),
            (29, 0.200),
            -- filetes pechuga
            (2, 0.100),
            (3, 0.060)
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'WRAP-COP';
-- Combo Ensalada Primavera de Pollo (ENSA-PRI)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (29, 0.150),
            -- filete pechuga ahumada
            (18, 0.030),
            -- queso
            (7, 0.080),
            -- mezcla lechugas
            (8, 0.050),
            -- tomate
            (13, 0.040),
            -- maíz dulce
            (14, 0.030) -- zanahoria
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'ENSA-PRI';
-- Combo Ensalada de Quinua (ENSA-QUI)
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (17, 0.150),
            -- quinua
            (29, 0.100),
            -- copalitos
            (14, 0.030),
            -- zanahoria
            (15, 0.040),
            -- repollo
            (12, 0.050),
            -- palta
            (13, 0.030),
            -- maíz dulce
            (16, 0.040),
            -- durazno conserva
            (8, 0.040) -- tomate
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'ENSA-QUI';
-- ── Postres ──
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (20, 0.100) -- mezcla donut
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'POST-DON';
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (21, 0.100) -- mezcla mousse
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'POST-MOU';
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (22, 1.000) -- base pie
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'POST-PIE';
-- ── Extras / Acompañamientos clave ──
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (19, 0.100) -- plátano chips
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'EXTR-PLA';
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (10, 1.000) -- salsa copacabana sachet
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'EXTR-SAL';
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (27, 1.000) -- salsa acevichada sachet
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'EXTR-SAC';
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (29, 0.360) -- 6 filetes
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'EXTR-COP-MD';
INSERT INTO receta (id_producto, id_ingrediente, cantidad)
SELECT p.id_producto,
    i.id_insumo,
    v.cantidad
FROM producto p,
    (
        VALUES (29, 0.720) -- 12 filetes
    ) AS v(ing_id, cantidad)
    JOIN Ingredientes i ON i.id_insumo = v.ing_id
WHERE p.codigo = 'EXTR-COP-DC';
-- Verificación de recetas
SELECT p.codigo,
    p.nombre AS producto,
    i.nombre AS ingrediente,
    r.cantidad
FROM receta r
    JOIN producto p ON r.id_producto = p.id_producto
    JOIN Ingredientes i ON r.id_ingrediente = i.id_insumo
ORDER BY p.id_categoria_producto,
    p.codigo,
    r.id_receta;
-- CONSULTAS
-- ORDEN DEL MENÚ
SELECT id_categoria_producto,
    nombre
FROM categoria_producto
ORDER BY id_categoria_producto;
-- Categoria ingrediente (por si acaso) no lo veo necesario si no hay el apartado
SELECT id_categoria_ingrediente,
    nombre
FROM categoria_ingrediente
ORDER BY id_categoria_ingrediente;
-- productos agregados
SELECT p.codigo,
    p.nombre,
    cp.nombre AS categoria,
    p.precio_combo,
    p.precio_con_papa,
    p.precio_solo
FROM producto p
    JOIN categoria_producto cp ON p.id_categoria_producto = cp.id_categoria_producto
ORDER BY cp.id_categoria_producto,
    p.codigo;
-- CONSULTAS pocas
SELECT 'categoria_producto' AS tabla,
    COUNT(*) AS total
FROM categoria_producto
UNION ALL
SELECT 'categoria_ingrediente',
    COUNT(*)
FROM categoria_ingrediente
UNION ALL
SELECT 'producto',
    COUNT(*)
FROM producto
UNION ALL
SELECT 'Ingredientes',
    COUNT(*)
FROM Ingredientes
UNION ALL
SELECT 'receta',
    COUNT(*)
FROM receta
ORDER BY tabla;
-- CONSULTAS COMPLETAS
SELECT 'metodo_pago' AS tabla,
    COUNT(*) AS registros
FROM metodo_pago
UNION ALL
SELECT 'turno_caja',
    COUNT(*)
FROM turno_caja
UNION ALL
SELECT 'proveedor',
    COUNT(*)
FROM proveedor
UNION ALL
SELECT 'tipo_movimiento',
    COUNT(*)
FROM tipo_movimiento
UNION ALL
SELECT 'categoria_ingrediente',
    COUNT(*)
FROM categoria_ingrediente
UNION ALL
SELECT 'categoria_producto',
    COUNT(*)
FROM categoria_producto
UNION ALL
SELECT 'estado_pedido',
    COUNT(*)
FROM estado_pedido
UNION ALL
SELECT 'producto',
    COUNT(*)
FROM producto
UNION ALL
SELECT 'Ingredientes',
    COUNT(*)
FROM Ingredientes
UNION ALL
SELECT 'receta',
    COUNT(*)
FROM receta
UNION ALL
SELECT 'pedido',
    COUNT(*)
FROM pedido
UNION ALL
SELECT 'detalle_pedido',
    COUNT(*)
FROM detalle_pedido
UNION ALL
SELECT 'historial_estado_pedido',
    COUNT(*)
FROM historial_estado_pedido
UNION ALL
SELECT 'pago',
    COUNT(*)
FROM pago
UNION ALL
SELECT 'movimiento_inventario',
    COUNT(*)
FROM movimiento_inventario
ORDER BY tabla;