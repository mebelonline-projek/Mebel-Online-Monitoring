-- ============================================================
-- 🔄 MIGRATION V2 — Untuk database yang SUDAH ada data
-- ============================================================
-- Jalankan di Supabase SQL Editor.
-- Script ini MENGUBAH struktur existing, bukan membuat dari awal.
-- Aman: tidak menghapus data transaksi yang sudah ada.
-- ============================================================

-- ============================================================
-- STEP 1: Hapus trigger & function INVOICE LAMA dari tabel transactions
-- ============================================================
DROP TRIGGER IF EXISTS trg_set_invoice_number ON transactions;
DROP FUNCTION IF EXISTS generate_invoice_number();
DROP FUNCTION IF EXISTS set_invoice_number();

-- ============================================================
-- STEP 2: Tambah ON DELETE CASCADE ke FK yang sudah ada
--    (supaya hapus transaksi permanen jalan)
-- ============================================================
ALTER TABLE transaction_payments
  DROP CONSTRAINT IF EXISTS transaction_payments_transaction_id_fkey;

  ALTER TABLE transaction_payments
    ADD CONSTRAINT transaction_payments_transaction_id_fkey
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;

        ALTER TABLE hpp_items
          DROP CONSTRAINT IF EXISTS hpp_items_transaction_id_fkey;

          ALTER TABLE hpp_items
            ADD CONSTRAINT hpp_items_transaction_id_fkey
                FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;

                -- ============================================================
                -- STEP 3: Rename kolom invoice_number → transaction_number
                --    ⚠️ Pastikan tidak ada constraint UNIQUE yang pakai nama lama
                --    Supabase auto-rename constraint juga saat rename kolom
                -- ============================================================
                DO $$
                BEGIN
                  -- Cek apakah kolom invoice_number masih ada
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                            WHERE table_name = 'transactions' AND column_name = 'invoice_number'
                              ) THEN
                                  ALTER TABLE transactions RENAME COLUMN invoice_number TO transaction_number;
                                    END IF;
                                    END $$;

                                    -- ============================================================
                                    -- STEP 4: Update nomor transaksi lama (INV- → TRX-)
                                    --    Opsional: comment out kalau tidak mau rename nomor lama
                                    -- ============================================================
                                    UPDATE transactions
                                    SET transaction_number = REPLACE(transaction_number, 'INV-', 'TRX-')
                                    WHERE transaction_number LIKE 'INV-%';

                                    -- ============================================================
                                    -- STEP 5: Buat function & trigger BARU untuk transaction_number
                                    -- ============================================================
                                    CREATE OR REPLACE FUNCTION generate_transaction_number()
                                    RETURNS TEXT
                                    LANGUAGE plpgsql
                                    AS $$
                                    DECLARE
                                      today_date TEXT;
                                        seq_num INT;
                                          new_txn TEXT;
                                          BEGIN
                                            today_date := to_char(now(), 'YYYYMMDD');
                                              
                                                SELECT COALESCE(MAX(CAST(SPLIT_PART(transaction_number, '-', 3) AS INT)), 0) + 1
                                                  INTO seq_num
                                                    FROM transactions
                                                      WHERE transaction_number LIKE 'TRX-' || today_date || '-%';
                                                        
                                                          new_txn := 'TRX-' || today_date || '-' || LPAD(seq_num::TEXT, 3, '0');
                                                            RETURN new_txn;
                                                            END;
                                                            $$;

                                                            CREATE OR REPLACE FUNCTION set_transaction_number()
                                                            RETURNS TRIGGER
                                                            LANGUAGE plpgsql
                                                            AS $$
                                                            BEGIN
                                                              IF NEW.transaction_number IS NULL THEN
                                                                  NEW.transaction_number := generate_transaction_number();
                                                                    END IF;
                                                                      RETURN NEW;
                                                                      END;
                                                                      $$;

                                                                      CREATE TRIGGER trg_set_transaction_number
                                                                        BEFORE INSERT ON transactions
                                                                          FOR EACH ROW
                                                                            EXECUTE FUNCTION set_transaction_number();

                                                                            -- ============================================================
                                                                            -- STEP 6: Buat tabel invoices (BARU — belum ada di DB lama)
                                                                            -- ============================================================
                                                                            CREATE TABLE IF NOT EXISTS invoices (
                                                                              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                                                                invoice_number TEXT UNIQUE NOT NULL,
                                                                                  customer_id UUID NOT NULL REFERENCES customers(id),
                                                                                    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PAID', 'CANCELLED')),
                                                                                      total_amount BIGINT NOT NULL DEFAULT 0,
                                                                                        total_paid BIGINT NOT NULL DEFAULT 0,
                                                                                          remaining_amount BIGINT NOT NULL DEFAULT 0,
                                                                                            notes TEXT,
                                                                                              created_by UUID REFERENCES auth.users(id),
                                                                                                created_at TIMESTAMPTZ DEFAULT now(),
                                                                                                  updated_at TIMESTAMPTZ DEFAULT now()
                                                                                                  );

                                                                                                  ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

                                                                                                  -- ============================================================
                                                                                                  -- STEP 7: Buat tabel invoice_items (BARU)
                                                                                                  -- ============================================================
                                                                                                  CREATE TABLE IF NOT EXISTS invoice_items (
                                                                                                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                                                                                      invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                                                                                                        transaction_id UUID NOT NULL REFERENCES transactions(id),
                                                                                                          created_at TIMESTAMPTZ DEFAULT now(),
                                                                                                            UNIQUE(invoice_id, transaction_id)
                                                                                                            );

                                                                                                            ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

                                                                                                            -- ============================================================
                                                                                                            -- STEP 8: Buat function & trigger untuk invoice_number
                                                                                                            -- ============================================================
                                                                                                            CREATE OR REPLACE FUNCTION generate_invoice_number()
                                                                                                            RETURNS TEXT
                                                                                                            LANGUAGE plpgsql
                                                                                                            AS $$
                                                                                                            DECLARE
                                                                                                              today_date TEXT;
                                                                                                                seq_num INT;
                                                                                                                  new_inv TEXT;
                                                                                                                  BEGIN
                                                                                                                    today_date := to_char(now(), 'YYYYMMDD');
                                                                                                                      
                                                                                                                        SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '-', 3) AS INT)), 0) + 1
                                                                                                                          INTO seq_num
                                                                                                                            FROM invoices
                                                                                                                              WHERE invoice_number LIKE 'INV-' || today_date || '-%';
                                                                                                                                
                                                                                                                                  new_inv := 'INV-' || today_date || '-' || LPAD(seq_num::TEXT, 3, '0');
                                                                                                                                    RETURN new_inv;
                                                                                                                                    END;
                                                                                                                                    $$;

                                                                                                                                    CREATE OR REPLACE FUNCTION set_invoice_number()
                                                                                                                                    RETURNS TRIGGER
                                                                                                                                    LANGUAGE plpgsql
                                                                                                                                    AS $$
                                                                                                                                    BEGIN
                                                                                                                                      IF NEW.invoice_number IS NULL THEN
                                                                                                                                          NEW.invoice_number := generate_invoice_number();
                                                                                                                                            END IF;
                                                                                                                                              RETURN NEW;
                                                                                                                                              END;
                                                                                                                                              $$;

                                                                                                                                              CREATE TRIGGER trg_set_invoice_number
                                                                                                                                                BEFORE INSERT ON invoices
                                                                                                                                                  FOR EACH ROW
                                                                                                                                                    EXECUTE FUNCTION set_invoice_number();

                                                                                                                                                    -- ============================================================
                                                                                                                                                    -- STEP 9: Tambah RLS policy untuk tabel baru
                                                                                                                                                    --    Pakai DO block untuk skip jika policy sudah ada
                                                                                                                                                    -- ============================================================
                                                                                                                                                    DO $$ BEGIN
                                                                                                                                                      CREATE POLICY "Owner full access on invoices" ON invoices
                                                                                                                                                          FOR ALL USING (get_user_role() = 'OWNER');
                                                                                                                                                          EXCEPTION WHEN duplicate_object THEN NULL;
                                                                                                                                                          END $$;

                                                                                                                                                          DO $$ BEGIN
                                                                                                                                                            CREATE POLICY "Karyawan select invoices" ON invoices
                                                                                                                                                                FOR SELECT USING (get_user_role() = 'KARYAWAN');
                                                                                                                                                                EXCEPTION WHEN duplicate_object THEN NULL;
                                                                                                                                                                END $$;

                                                                                                                                                                DO $$ BEGIN
                                                                                                                                                                  CREATE POLICY "Karyawan insert invoices" ON invoices
                                                                                                                                                                      FOR INSERT WITH CHECK (get_user_role() = 'KARYAWAN');
                                                                                                                                                                      EXCEPTION WHEN duplicate_object THEN NULL;
                                                                                                                                                                      END $$;

                                                                                                                                                                      DO $$ BEGIN
                                                                                                                                                                        CREATE POLICY "Karyawan update invoices" ON invoices
                                                                                                                                                                            FOR UPDATE USING (get_user_role() = 'KARYAWAN');
                                                                                                                                                                            EXCEPTION WHEN duplicate_object THEN NULL;
                                                                                                                                                                            END $$;

                                                                                                                                                                            DO $$ BEGIN
                                                                                                                                                                              CREATE POLICY "Owner full access on invoice_items" ON invoice_items
                                                                                                                                                                                  FOR ALL USING (get_user_role() = 'OWNER');
                                                                                                                                                                                  EXCEPTION WHEN duplicate_object THEN NULL;
                                                                                                                                                                                  END $$;

                                                                                                                                                                                  DO $$ BEGIN
                                                                                                                                                                                    CREATE POLICY "Karyawan all on invoice_items" ON invoice_items
                                                                                                                                                                                        FOR ALL USING (get_user_role() = 'KARYAWAN');
                                                                                                                                                                                        EXCEPTION WHEN duplicate_object THEN NULL;
                                                                                                                                                                                        END $$;

                                                                                                                                                                                        -- ============================================================
                                                                                                                                                                                        -- ✅ DONE — Verifikasi
                                                                                                                                                                                        -- ============================================================
                                                                                                                                                                                        -- Cek apakah kolom sudah berubah
                                                                                                                                                                                        SELECT column_name, data_type
                                                                                                                                                                                        FROM information_schema.columns
                                                                                                                                                                                        WHERE table_name = 'transactions'
                                                                                                                                                                                          AND column_name IN ('transaction_number', 'invoice_number');

                                                                                                                                                                                          -- Cek jumlah transaksi (pastikan tidak hilang)
                                                                                                                                                                                          SELECT count(*) AS total_transactions FROM transactions;

                                                                                                                                                                                          -- Cek tabel baru
                                                                                                                                                                                          SELECT table_name FROM information_schema.tables
                                                                                                                                                                                          WHERE table_name IN ('invoices', 'invoice_items')
                                                                                                                                                                                            AND table_schema = 'public';