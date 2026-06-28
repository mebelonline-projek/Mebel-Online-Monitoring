-- ============================================================
-- 🚨 FIX: get_user_role + generate function untuk transaction_number & invoice_number
-- ============================================================

-- 1. get_user_role — Jantung RLS
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public, auth'
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- 2. generate_transaction_number — untuk tabel transactions (TRX-YYYYMMDD-XXX)
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  today_date TEXT;
  seq_num INT;
  new_txn TEXT;
BEGIN
  today_date := to_char(now(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SPLIT_PART(transaction_number, '-', 3) AS INT)), 0) + 1
  INTO seq_num
  FROM public.transactions
  WHERE transaction_number LIKE 'TRX-' || today_date || '-%';
  
  new_txn := 'TRX-' || today_date || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN new_txn;
END;
$$;

-- 3. set_transaction_number — trigger auto transaction_number
CREATE OR REPLACE FUNCTION set_transaction_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.transaction_number IS NULL THEN
    NEW.transaction_number := public.generate_transaction_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_transaction_number ON transactions;
CREATE TRIGGER trg_set_transaction_number
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_transaction_number();

-- 4. generate_invoice_number — untuk tabel invoices (INV-YYYYMMDD-XXX)
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  today_date TEXT;
  seq_num INT;
  new_inv TEXT;
BEGIN
  today_date := to_char(now(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '-', 3) AS INT)), 0) + 1
  INTO seq_num
  FROM public.invoices
  WHERE invoice_number LIKE 'INV-' || today_date || '-%';
  
  new_inv := 'INV-' || today_date || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN new_inv;
END;
$$;

-- 5. set_invoice_number — trigger auto invoice_number (di tabel invoices)
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := public.generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_invoice_number ON invoices;
CREATE TRIGGER trg_set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();