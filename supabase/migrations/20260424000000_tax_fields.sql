-- Agregar campos tributarios a la tabla financial_records
ALTER TABLE public.financial_records
ADD COLUMN transaction_type VARCHAR(50) DEFAULT 'Ventas Contribuyente', -- 'Ventas Contribuyente', 'Ventas Consumidor', 'Compras', 'Retenciones/Percepciones'
ADD COLUMN document_type VARCHAR(50) DEFAULT '03', -- Ej. '03' CCF, '01' Factura, etc.
ADD COLUMN clase_de_documento VARCHAR(10) DEFAULT '4', -- '4' DTE, '1' Físico, etc.
ADD COLUMN nit_dui VARCHAR(20),
ADD COLUMN codigo_generacion UUID,
ADD COLUMN sello_recepcion VARCHAR(255),
ADD COLUMN iva_amount NUMERIC(15, 2) DEFAULT 0.00,
ADD COLUMN retention_amount NUMERIC(15, 2) DEFAULT 0.00,
ADD COLUMN retention_percentage NUMERIC(5, 2) DEFAULT 0.00, -- Ej. 1.00, 2.00, 13.00
ADD COLUMN status VARCHAR(20) DEFAULT 'Valido'; -- 'Valido', 'Anulado', 'Extraviado', 'Invalidado'
