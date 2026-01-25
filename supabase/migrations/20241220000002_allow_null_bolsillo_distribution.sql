-- Permitir valores nulos en campos de distribución de bolsillos
ALTER TABLE bolsillos 
ALTER COLUMN tipo_descuento DROP NOT NULL,
ALTER COLUMN valor_descuento DROP NOT NULL;

-- Actualizar comentarios para clarificar el uso
COMMENT ON COLUMN bolsillos.tipo_descuento IS 'Tipo de descuento para distribución automática. NULL si no usa distribución.';
COMMENT ON COLUMN bolsillos.valor_descuento IS 'Valor del descuento para distribución automática. NULL si no usa distribución.';