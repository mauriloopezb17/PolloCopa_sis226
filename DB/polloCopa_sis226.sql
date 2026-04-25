-- Created by Redgate Data Modeler (https://datamodeler.redgate-platform.com)
-- Last modification date: 2026-04-21 16:27:31.821
-- Fixed: 2026-04-21
--   [FIX 1] detalle_pedido: added missing columns precio_unitario and subtotal
--   [FIX 2] tipo_movimiento: added missing column afecta_stock
--   [FIX 3] turno_caja: changed DEFAULT 'abierto' to DEFAULT 'ABIERTO' to match CHECK constraint
-- tables
-- Table: Ingredientes
CREATE TABLE Ingredientes (
    id_insumo serial NOT NULL,
    nombre varchar(150) NOT NULL,
    descripcion text NULL,
    unidad_medida varchar(5) NOT NULL,
    stock_actual numeric(12, 3) NOT NULL DEFAULT 0,
    stock_minimo numeric(12, 3) NOT NULL DEFAULT 0,
    costo_unitario_avg numeric(10, 2) NOT NULL DEFAULT 0,
    valor_inventario numeric(14, 2) NOT NULL DEFAULT 0,
    agotado boolean NOT NULL DEFAULT false,
    activo boolean NOT NULL DEFAULT true,
    id_categoria_ingrediente int NOT NULL,
    CONSTRAINT CHECK_3 CHECK ((stock_actual >= 0)) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT CHECK_4 CHECK ((stock_minimo >= 0)) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT CHECK_5 CHECK ((costo_unitario_avg >= 0)) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT insumo_pk PRIMARY KEY (id_insumo)
);
-- Table: Usuarios
CREATE TABLE Usuarios (
    id_usuario serial NOT NULL,
    nombre varchar(80) NULL,
    apellido varchar(80) NULL,
    telefono varchar(20) NULL,
    email varchar(120) NULL,
    password varchar(50) NOT NULL,
    CONSTRAINT AK_3 UNIQUE (email) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT cliente_pk PRIMARY KEY (id_usuario)
);
-- Table: categoria_ingrediente
CREATE TABLE categoria_ingrediente (
    id_categoria_ingrediente serial NOT NULL,
    nombre varchar(80) NOT NULL,
    CONSTRAINT categoria_insumo_pk PRIMARY KEY (id_categoria_ingrediente)
);
-- Table: categoria_producto
CREATE TABLE categoria_producto (
    id_categoria_producto serial NOT NULL,
    nombre varchar(80) NOT NULL,
    CONSTRAINT AK_6 UNIQUE (nombre) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT categoria_producto_pk PRIMARY KEY (id_categoria_producto)
);
-- Table: detalle_pedido
-- [FIX 1] Added precio_unitario and subtotal columns referenced by CHECK_16 and CHECK_17
CREATE TABLE detalle_pedido (
    id_detalle serial NOT NULL,
    id_pedido int NOT NULL,
    id_producto int NOT NULL,
    tipo_precio varchar(20) NOT NULL,
    cantidad int NOT NULL,
    precio_unitario numeric(10, 2) NOT NULL DEFAULT 0,
    subtotal numeric(10, 2) NOT NULL DEFAULT 0,
    CONSTRAINT CHECK_14 CHECK (
        (
            tipo_precio IN ('COMBO', 'CON_PAPA', 'SOLO')
        )
    ) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT CHECK_15 CHECK ((cantidad > 0)) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT CHECK_16 CHECK ((precio_unitario >= 0)) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT CHECK_17 CHECK ((subtotal >= 0)) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT detalle_pedido_pk PRIMARY KEY (id_detalle)
);
CREATE INDEX idx_detalle_pedido on detalle_pedido (id_pedido ASC);
CREATE INDEX idx_detalle_producto on detalle_pedido (id_producto ASC);
-- Table: estado_pedido
CREATE TABLE estado_pedido (
    id_estado serial NOT NULL,
    nombre varchar(50) NOT NULL,
    descripcion text NULL,
    CONSTRAINT AK_11 UNIQUE (nombre) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT estado_pedido_pk PRIMARY KEY (id_estado)
);
-- Table: historial_estado_pedido
CREATE TABLE historial_estado_pedido (
    id_historial serial NOT NULL,
    id_pedido int NOT NULL,
    id_estado int NOT NULL,
    fecha timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT historial_estado_pedido_pk PRIMARY KEY (id_historial)
);
-- Table: metodo_pago
CREATE TABLE metodo_pago (
    id_metodo serial NOT NULL,
    nombre varchar(50) NOT NULL,
    CONSTRAINT AK_13 UNIQUE (nombre) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT metodo_pago_pk PRIMARY KEY (id_metodo)
);
-- Table: movimiento_inventario
CREATE TABLE movimiento_inventario (
    id_movimiento serial NOT NULL,
    id_insumo int NOT NULL,
    id_tipo_movimiento int NOT NULL,
    id_proveedor int NULL,
    cantidad numeric(12, 3) NOT NULL,
    costo_unitario numeric(10, 2) NULL,
    lote varchar(50) NULL,
    motivo varchar(100) NULL,
    observacion text NULL,
    fecha timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT CHECK_8 CHECK ((cantidad > 0)) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT CHECK_9 CHECK ((costo_unitario >= 0)) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT movimiento_inventario_pk PRIMARY KEY (id_movimiento)
);
CREATE INDEX idx_movimiento_insumo on movimiento_inventario (id_insumo ASC);
CREATE INDEX idx_movimiento_fecha on movimiento_inventario (fecha ASC);
-- Table: pago
CREATE TABLE pago (
    id_pago serial NOT NULL,
    id_pedido int NOT NULL,
    id_turno_caja int NOT NULL,
    id_metodo int NOT NULL,
    monto_pagado numeric(10, 2) NOT NULL,
    monto_cambio numeric(10, 2) NOT NULL DEFAULT 0,
    hora_pago timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT CHECK_19 CHECK ((monto_pagado > 0)) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT CHECK_20 CHECK ((monto_cambio >= 0)) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT pago_pk PRIMARY KEY (id_pago)
);
CREATE INDEX idx_pago_pedido on pago (id_pedido ASC);
CREATE INDEX idx_pago_turno on pago (id_turno_caja ASC);
-- Table: pedido
CREATE TABLE pedido (
    id_pedido serial NOT NULL,
    id_usuario int NULL,
    id_estado int NOT NULL,
    numero_ticket varchar(20) NOT NULL,
    origen_web boolean NOT NULL DEFAULT false,
    subtotal numeric(10, 2) NOT NULL DEFAULT 0,
    descuento_pct numeric(5, 2) NOT NULL DEFAULT 0,
    descuento_monto numeric(10, 2) NOT NULL DEFAULT 0,
    total numeric(10, 2) NOT NULL DEFAULT 0,
    instrucciones text NULL,
    motivo_anulacion text NULL,
    hora_pedido timestamptz NOT NULL DEFAULT now(),
    NIT int NULL,
    razon_social varchar(100) NULL,
    CONSTRAINT AK_14 UNIQUE (numero_ticket) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT CHECK_10 CHECK ((subtotal >= 0)) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT CHECK_11 CHECK (
        (
            descuento_pct BETWEEN 0 AND 100
        )
    ) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT CHECK_12 CHECK ((descuento_monto >= 0)) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT CHECK_13 CHECK ((total >= 0)) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT pedido_pk PRIMARY KEY (id_pedido)
);
-- Table: producto
CREATE TABLE producto (
    id_producto serial NOT NULL,
    codigo varchar(20) NOT NULL,
    nombre varchar(150) NOT NULL,
    descripcion text NULL,
    id_categoria_producto int NOT NULL,
    precio_combo numeric(10, 2) NULL,
    precio_con_papa numeric(10, 2) NULL,
    precio_solo numeric(10, 2) NULL,
    disponible boolean NOT NULL DEFAULT true,
    imagen_url text NULL,
    CONSTRAINT AK_5 UNIQUE (codigo) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT CHECK_0 CHECK ((precio_combo >= 0)) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT CHECK_1 CHECK ((precio_con_papa >= 0)) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT CHECK_2 CHECK ((precio_solo >= 0)) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT producto_pk PRIMARY KEY (id_producto)
);
CREATE INDEX idx_producto_disponible on producto (disponible ASC)
WHERE disponible = TRUE;
-- Table: proveedor
CREATE TABLE proveedor (
    id_proveedor serial NOT NULL,
    nombre varchar(150) NOT NULL,
    contacto varchar(100) NULL,
    telefono varchar(20) NULL,
    email varchar(120) NULL,
    direccion text NULL,
    activo boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT proveedor_pk PRIMARY KEY (id_proveedor)
);
-- Table: receta
CREATE TABLE receta (
    id_receta serial NOT NULL,
    id_producto int NOT NULL,
    id_ingrediente int NOT NULL,
    cantidad numeric(10, 3) NOT NULL,
    CONSTRAINT AK_9 UNIQUE (id_producto, id_ingrediente) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT CHECK_6 CHECK ((cantidad > 0)) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT receta_pk PRIMARY KEY (id_receta)
);
CREATE INDEX idx_receta_insumo on receta (id_ingrediente ASC);
-- Table: tipo_movimiento
-- [FIX 2] Added missing column afecta_stock referenced by CHECK_7
CREATE TABLE tipo_movimiento (
    id_tipo_movimiento serial NOT NULL,
    nombre varchar(50) NOT NULL,
    afecta_stock smallint NOT NULL,
    CONSTRAINT AK_10 UNIQUE (nombre) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT CHECK_7 CHECK ((afecta_stock IN (-1, 1))) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT tipo_movimiento_pk PRIMARY KEY (id_tipo_movimiento)
);
-- Table: turno_caja (A CORREGIR)
-- [FIX 3] Changed DEFAULT 'abierto' to DEFAULT 'ABIERTO' to match CHECK constraint values
CREATE TABLE turno_caja (
    id_turno serial NOT NULL,
    apertura timestamptz NOT NULL DEFAULT now(),
    cierre timestamptz NULL,
    monto_apertura numeric(10, 2) NOT NULL DEFAULT 0,
    estado varchar(20) NOT NULL DEFAULT 'ABIERTO',
    CONSTRAINT CHECK_18 CHECK ((estado IN ('ABIERTO', 'CERRADO'))) NOT DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT turno_caja_pk PRIMARY KEY (id_turno)
);
-- foreign keys
-- Reference: FK_10 (table: movimiento_inventario)
ALTER TABLE movimiento_inventario
ADD CONSTRAINT FK_10 FOREIGN KEY (id_proveedor) REFERENCES proveedor (id_proveedor) NOT DEFERRABLE INITIALLY IMMEDIATE;
-- Reference: FK_12 (table: pedido)
ALTER TABLE pedido
ADD CONSTRAINT FK_12 FOREIGN KEY (id_usuario) REFERENCES Usuarios (id_usuario) NOT DEFERRABLE INITIALLY IMMEDIATE;
-- Reference: FK_14 (table: pedido)
ALTER TABLE pedido
ADD CONSTRAINT FK_14 FOREIGN KEY (id_estado) REFERENCES estado_pedido (id_estado) NOT DEFERRABLE INITIALLY IMMEDIATE;
-- Reference: FK_17 (table: detalle_pedido)
ALTER TABLE detalle_pedido
ADD CONSTRAINT FK_17 FOREIGN KEY (id_pedido) REFERENCES pedido (id_pedido) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
-- Reference: FK_18 (table: detalle_pedido)
ALTER TABLE detalle_pedido
ADD CONSTRAINT FK_18 FOREIGN KEY (id_producto) REFERENCES producto (id_producto) NOT DEFERRABLE INITIALLY IMMEDIATE;
-- Reference: FK_21 (table: pago)
ALTER TABLE pago
ADD CONSTRAINT FK_21 FOREIGN KEY (id_pedido) REFERENCES pedido (id_pedido) NOT DEFERRABLE INITIALLY IMMEDIATE;
-- Reference: FK_22 (table: pago)
ALTER TABLE pago
ADD CONSTRAINT FK_22 FOREIGN KEY (id_turno_caja) REFERENCES turno_caja (id_turno) NOT DEFERRABLE INITIALLY IMMEDIATE;
-- Reference: FK_23 (table: pago)
ALTER TABLE pago
ADD CONSTRAINT FK_23 FOREIGN KEY (id_metodo) REFERENCES metodo_pago (id_metodo) NOT DEFERRABLE INITIALLY IMMEDIATE;
-- Reference: FK_24 (table: historial_estado_pedido)
ALTER TABLE historial_estado_pedido
ADD CONSTRAINT FK_24 FOREIGN KEY (id_pedido) REFERENCES pedido (id_pedido) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
-- Reference: FK_25 (table: historial_estado_pedido)
ALTER TABLE historial_estado_pedido
ADD CONSTRAINT FK_25 FOREIGN KEY (id_estado) REFERENCES estado_pedido (id_estado) NOT DEFERRABLE INITIALLY IMMEDIATE;
-- Reference: FK_5 (table: receta)
ALTER TABLE receta
ADD CONSTRAINT FK_5 FOREIGN KEY (id_producto) REFERENCES producto (id_producto) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
-- Reference: FK_6 (table: receta)
ALTER TABLE receta
ADD CONSTRAINT FK_6 FOREIGN KEY (id_ingrediente) REFERENCES Ingredientes (id_insumo) NOT DEFERRABLE INITIALLY IMMEDIATE;
-- Reference: FK_7 (table: movimiento_inventario)
ALTER TABLE movimiento_inventario
ADD CONSTRAINT FK_7 FOREIGN KEY (id_insumo) REFERENCES Ingredientes (id_insumo) NOT DEFERRABLE INITIALLY IMMEDIATE;
-- Reference: FK_8 (table: movimiento_inventario)
ALTER TABLE movimiento_inventario
ADD CONSTRAINT FK_8 FOREIGN KEY (id_tipo_movimiento) REFERENCES tipo_movimiento (id_tipo_movimiento) NOT DEFERRABLE INITIALLY IMMEDIATE;
-- Reference: Ingredientes_categoria_ingrediente (table: Ingredientes)
ALTER TABLE Ingredientes
ADD CONSTRAINT Ingredientes_categoria_ingrediente FOREIGN KEY (id_categoria_ingrediente) REFERENCES categoria_ingrediente (id_categoria_ingrediente) NOT DEFERRABLE INITIALLY IMMEDIATE;
-- Reference: producto_categoria_producto (table: producto)
ALTER TABLE producto
ADD CONSTRAINT producto_categoria_producto FOREIGN KEY (id_categoria_producto) REFERENCES categoria_producto (id_categoria_producto) NOT DEFERRABLE INITIALLY IMMEDIATE;
-- End of file.
-- ============================================================
-- Migration: turno_caja — columnas de cierre desglosado
-- Fecha: 2026-04-24
-- ============================================================
ALTER TABLE turno_caja
ADD COLUMN total_calculado_teorico numeric(10, 2) NULL,
    ADD COLUMN total_calculado_en_caja numeric(10, 2) NULL,
    ADD COLUMN monto_cierre_transaccion numeric(10, 2) NULL,
    ADD COLUMN monto_cierre_efectivo numeric(10, 2) NULL;