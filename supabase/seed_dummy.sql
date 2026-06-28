-- ============================================================
-- 🌱 SEED DATA — Mebel Online Monitoring
-- ============================================================
-- Data dummy 2.5 tahun (Jan 2024 – Jun 2026)
-- DETERMINISTIK — nilai bisa diverifikasi manual
--
-- CARA PAKAI:
--   1. Buka Supabase SQL Editor
--   2. Ganti 'OWNER_UUID_HERE' dengan UUID user OWNER Anda
--      (dapatkan dari: SELECT id, email FROM auth.users;)
--   3. Jalankan seluruh script ini
--   4. Dashboard Anda akan terisi data 2.5 tahun
--
-- CLEANUP: Jalankan supabase/cleanup_seed.sql
-- ============================================================

-- ============================================================
-- KONFIGURASI — Ganti dengan UUID OWNER Anda
-- ============================================================
DO $$
DECLARE
  v_owner_id UUID := 'OWNER_UUID_HERE';  -- ⚠️ GANTI INI
  v_employee_id UUID;
  v_start_date DATE := '2024-01-01';
  v_end_date DATE := '2026-06-30';
  v_cur_date DATE;
  v_days_in_month INT;
  v_day INT;
  v_cust_ids UUID[] := ARRAY[
    '00000000-0000-0000-0000-000000000001'::UUID,
    '00000000-0000-0000-0000-000000000002'::UUID,
    '00000000-0000-0000-0000-000000000003'::UUID,
    '00000000-0000-0000-0000-000000000004'::UUID,
    '00000000-0000-0000-0000-000000000005'::UUID,
    '00000000-0000-0000-0000-000000000006'::UUID,
    '00000000-0000-0000-0000-000000000007'::UUID,
    '00000000-0000-0000-0000-000000000008'::UUID,
    '00000000-0000-0000-0000-000000000009'::UUID,
    '00000000-0000-0000-0000-000000000010'::UUID
  ];
  v_cust_names TEXT[] := ARRAY[
    'Budi Setiawan', 'Siti Nurhaliza', 'Ahmad Fauzi',
    'Dewi Sartika', 'Rudi Hermawan', 'Linda Kusuma',
    'Bambang Prasetyo', 'Ratna Sari', 'Hendra Gunawan',
    'Mega Wati'
  ];
  v_prod_ids UUID[] := ARRAY[
    '10000000-0000-0000-0000-000000000001'::UUID,
    '10000000-0000-0000-0000-000000000002'::UUID,
    '10000000-0000-0000-0000-000000000003'::UUID,
    '10000000-0000-0000-0000-000000000004'::UUID,
    '10000000-0000-0000-0000-000000000005'::UUID
  ];
  v_prod_names TEXT[] := ARRAY[
    'Lemari Jati 3 Pintu', 'Meja Makan Minimalis', 'Kursi Tamu Jepara',
    'Dipan Ukir Kayu', 'Bufet TV Classic'
  ];
  v_prod_prices BIGINT[] := ARRAY[4500000, 2800000, 6200000, 3900000, 3400000];
  v_tx_per_day INT;
  v_today_tx INT;
  v_tx_idx INT;
  v_tx_id UUID;
  v_cust_idx INT;
  v_prod_idx INT;
  v_base_price BIGINT;
  v_price_multiplier NUMERIC(3,2);
  v_final_price BIGINT;
  v_payment_type TEXT;
  v_dp_amount BIGINT;
  v_status TEXT;
  v_is_void BOOLEAN;
  v_hpp_count INT;
  v_hpp_item_idx INT;
  v_hpp_name TEXT;
  v_hpp_amount BIGINT;
  v_hpp_total BIGINT;
  v_remaining BIGINT;
  v_pay_amount BIGINT;
  v_pay_count INT;
  v_pay_idx INT;
  v_inv_num TEXT;
  v_month_str TEXT;
  v_day_str TEXT;
  v_seq INT;
  v_day_of_week INT;
  v_op_category TEXT;
  v_op_amount BIGINT;
  v_op_name TEXT;
  v_month_start DATE;
  v_month_end DATE;
  v_tx_count_month INT := 0;
  v_is_ramadan BOOLEAN;
  v_seasonal_mult NUMERIC(3,2);
  v_cust_phone TEXT;
  v_cust_addr TEXT;
BEGIN
  -- ============================================================
  -- CEK owner_id sudah diganti
  -- ============================================================
  IF v_owner_id = '00000000-0000-0000-0000-000000000000' THEN
    RAISE EXCEPTION '⚠️  Ganti OWNER_UUID_HERE dengan UUID user OWNER Anda!';
  END IF;
  IF v_owner_id = 'OWNER_UUID_HERE'::UUID THEN
    RAISE EXCEPTION '⚠️  Ganti OWNER_UUID_HERE dengan UUID user OWNER Anda!';
  END IF;

  RAISE NOTICE '✅ Owner UUID valid. Mulai seeding...';

  -- ============================================================
  -- 1. INSERT CUSTOMERS (10 pelanggan dummy)
  -- ============================================================
  FOR i IN 1..10 LOOP
    v_cust_phone := '0812' || LPAD((10000000 + i * 1234567)::TEXT, 8, '0');
    v_cust_addr := CASE (i % 5)
      WHEN 0 THEN 'Jl. Merdeka No. ' || i
      WHEN 1 THEN 'Jl. Sudirman No. ' || (i * 10)
      WHEN 2 THEN 'Komplek Griya Indah Blok ' || CHR(64 + i)
      WHEN 3 THEN 'Perumahan Permata Asri No. ' || (i * 3 + 1)
      ELSE 'Jl. Veteran No. ' || (i * 7)
    END;
    
    INSERT INTO customers (id, name, phone, address, created_by)
    VALUES (v_cust_ids[i], v_cust_names[i], v_cust_phone, v_cust_addr, v_owner_id)
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE '✅ 10 customers inserted';

  -- ============================================================
  -- 2. INSERT PRODUCTS (5 produk dummy)
  -- ============================================================
  FOR i IN 1..5 LOOP
    INSERT INTO products (id, name, description, base_price, created_by)
    VALUES (
      v_prod_ids[i],
      v_prod_names[i],
      CASE i
        WHEN 1 THEN 'Lemari pakaian 3 pintu dari kayu jati asli Jepara, finishing natural melamin'
        WHEN 2 THEN 'Meja makan set 6 kursi desain minimalis, material kayu mahoni'
        WHEN 3 THEN 'Set kursi tamu ukiran Jepara, busa dacron empuk, finishing duco'
        WHEN 4 THEN 'Dipan tempat tidur ukuran 180x200, material kayu jati, tanpa kasur'
        ELSE 'Bufet TV panjang 180cm, material kayu jati, laci dan pintu kaca'
      END,
      v_prod_prices[i],
      v_owner_id
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE '✅ 5 products inserted';

  -- ============================================================
  -- 3. GENERATE TRANSACTIONS, HPP, PAYMENTS per hari
  -- ============================================================
  v_cur_date := v_start_date;
  v_seq := 0;
  
  WHILE v_cur_date <= v_end_date LOOP
    v_day_of_week := EXTRACT(DOW FROM v_cur_date);
    v_month_str := TO_CHAR(v_cur_date, 'YYYYMM');
    v_day_str := TO_CHAR(v_cur_date, 'YYMMDD');
    
    -- Variasi transaksi per hari (deterministik via modulo)
    -- Weekday: 3-4 transaksi, Weekend: 1-2, Jumat: 2-3
    v_tx_per_day := CASE
      WHEN v_day_of_week = 0 THEN 1 + (EXTRACT(DAY FROM v_cur_date)::INT % 3)  -- Minggu: 1-2
      WHEN v_day_of_week = 6 THEN 2 + (EXTRACT(DAY FROM v_cur_date)::INT % 3)  -- Sabtu: 2-3
      WHEN v_day_of_week = 5 THEN 2 + (EXTRACT(DAY FROM v_cur_date)::INT % 2)  -- Jumat: 2-3
      ELSE 3 + (EXTRACT(DAY FROM v_cur_date)::INT % 3)  -- Weekday: 3-5
    END;
    
    -- Seasonal multiplier (ramadan effect, year-end boost)
    v_is_ramadan := (v_cur_date >= '2024-03-10' AND v_cur_date <= '2024-04-08')
                 OR (v_cur_date >= '2025-03-01' AND v_cur_date <= '2025-03-29')
                 OR (v_cur_date >= '2026-02-17' AND v_cur_date <= '2026-03-18');
    
    v_seasonal_mult := CASE
      WHEN v_is_ramadan THEN 1.25  -- 25% boost saat ramadan
      WHEN EXTRACT(MONTH FROM v_cur_date) IN (11, 12) THEN 1.15  -- 15% boost akhir tahun
      ELSE 1.0
    END;
    
    FOR v_tx_idx IN 1..v_tx_per_day LOOP
      v_tx_count_month := v_tx_count_month + 1;
      
      -- Pilih customer (deterministik)
      v_cust_idx := ((EXTRACT(DOY FROM v_cur_date)::INT + v_tx_idx * 31) % 10) + 1;
      
      -- Pilih produk
      v_prod_idx := ((EXTRACT(DAY FROM v_cur_date)::INT + v_tx_idx * 7) % 5) + 1;
      v_base_price := v_prod_prices[v_prod_idx];
      
      -- Harga final (deterministik multipier: 0.88 - 1.12)
      v_price_multiplier := 0.88 + ((EXTRACT(DAY FROM v_cur_date)::INT * 3 + v_tx_idx * 7) % 25) / 100.0;
      v_final_price := ROUND(v_base_price * v_price_multiplier * v_seasonal_mult);
      
      -- Payment type: 60% CASH, 40% DP (deterministik)
      v_payment_type := CASE
        WHEN ((EXTRACT(DAY FROM v_cur_date)::INT * 7 + v_tx_idx * 13) % 10) < 6 THEN 'CASH'
        ELSE 'DP'
      END;
      
      -- Void: ~5% (deterministik)
      v_is_void := ((EXTRACT(DAY FROM v_cur_date)::INT * 11 + v_tx_idx * 17) % 100) < 5;
      
      -- DP amount
      IF v_payment_type = 'CASH' THEN
        v_dp_amount := v_final_price;
        v_status := 'LUNAS';
      ELSE
        v_dp_amount := ROUND(v_final_price * (CASE
          WHEN ((EXTRACT(DAY FROM v_cur_date)::INT + v_tx_idx) % 3) = 0 THEN 0.5
          WHEN ((EXTRACT(DAY FROM v_cur_date)::INT + v_tx_idx) % 3) = 1 THEN 0.4
          ELSE 0.6
        END));
        v_status := 'DP';
      END IF;
      
      IF v_is_void THEN
        v_status := 'BATAL';
      END IF;
      
      -- Invoice number (deterministik via sequence per bulan)
      v_seq := v_seq + 1;
      v_inv_num := 'INV-' || v_month_str || '-' || LPAD(v_seq::TEXT, 4, '0');
      
      -- Insert transaction
      INSERT INTO transactions (
        id, invoice_number, customer_id, product_id,
        custom_product_name, description, final_price,
        payment_type, dp_amount, status,
        void_reason,
        created_by, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_inv_num, v_cust_ids[v_cust_idx],
        v_prod_ids[v_prod_idx],
        NULL,
        CASE ((EXTRACT(DAY FROM v_cur_date)::INT + v_tx_idx) % 5)
          WHEN 0 THEN 'Warna custom request pelanggan'
          WHEN 1 THEN 'Pengiriman ke luar kota'
          WHEN 2 THEN 'Paket hemat promo'
          WHEN 3 THEN 'Bonus kain pelapis'
          ELSE NULL
        END,
        v_final_price,
        v_payment_type,
        v_dp_amount,
        v_status,
        CASE WHEN v_is_void THEN
          CASE ((EXTRACT(DAY FROM v_cur_date)::INT) % 4)
            WHEN 0 THEN 'Customer membatalkan pesanan'
            WHEN 1 THEN 'Stok bahan tidak tersedia'
            WHEN 2 THEN 'Double order'
            ELSE 'Customer pindah ke produk lain'
          END
        ELSE NULL END,
        v_owner_id,
        v_cur_date + (v_tx_idx * INTERVAL '47 minutes' + INTERVAL '8 hours'),
        v_cur_date + (v_tx_idx * INTERVAL '47 minutes' + INTERVAL '8 hours')
      )
      RETURNING id INTO v_tx_id;
      
      -- ============================================================
      -- 4. INSERT HPP ITEMS per transaksi (kecuali void)
      -- ============================================================
      IF NOT v_is_void THEN
        v_hpp_count := 2 + ((EXTRACT(DAY FROM v_cur_date)::INT + v_tx_idx) % 3); -- 2-4 item HPP
        v_hpp_total := 0;
        
        FOR v_hpp_item_idx IN 1..v_hpp_count LOOP
          v_hpp_name := CASE ((v_hpp_item_idx + EXTRACT(DAY FROM v_cur_date)::INT) % 5)
            WHEN 0 THEN 'Kayu ' || CASE (v_prod_idx % 3) WHEN 0 THEN 'Jati' WHEN 1 THEN 'Mahoni' ELSE 'Pinus' END
            WHEN 1 THEN 'Bahan finishing (cat/pernis/plitur)'
            WHEN 2 THEN 'Ongkos tukang ' || v_hpp_item_idx || ' orang'
            WHEN 3 THEN 'Aksesoris (handle, engsel, kaca)'
            ELSE 'Transport pengiriman bahan'
          END;
          
          v_hpp_amount := ROUND(v_final_price * (0.08 + ((EXTRACT(DAY FROM v_cur_date)::INT + v_hpp_item_idx * 7) % 20) + 5) / 100.0);
          v_hpp_total := v_hpp_total + v_hpp_amount;
          
          INSERT INTO hpp_items (transaction_id, name, amount, note, created_by, created_at)
          VALUES (
            v_tx_id, v_hpp_name, v_hpp_amount,
            CASE WHEN ((EXTRACT(DAY FROM v_cur_date)::INT + v_hpp_item_idx) % 3) = 0 THEN 'Pembelian dari supplier langganan' ELSE NULL END,
            v_owner_id,
            v_cur_date + (v_tx_idx * INTERVAL '47 minutes' + v_hpp_item_idx * INTERVAL '5 minutes' + INTERVAL '8 hours')
          );
        END LOOP;
      END IF;
      
      -- ============================================================
      -- 5. INSERT PAYMENTS
      -- ============================================================
      IF v_payment_type = 'CASH' AND NOT v_is_void THEN
        -- Cash: 1 payment lunas
        INSERT INTO transaction_payments (transaction_id, amount, method, note, created_by, created_at)
        VALUES (v_tx_id, v_final_price, 'TUNAI', 'Pembayaran Lunas', v_owner_id, v_cur_date + (v_tx_idx * INTERVAL '47 minutes' + INTERVAL '8 hours'));
        
      ELSIF v_payment_type = 'DP' AND NOT v_is_void THEN
        -- DP: first payment (uang muka)
        INSERT INTO transaction_payments (transaction_id, amount, method, note, created_by, created_at)
        VALUES (v_tx_id, v_dp_amount, CASE WHEN ((EXTRACT(DAY FROM v_cur_date)::INT) % 2) = 0 THEN 'TUNAI' ELSE 'TRANSFER' END, 'Uang Muka (DP)', v_owner_id, v_cur_date + (v_tx_idx * INTERVAL '47 minutes' + INTERVAL '8 hours'));
        
        -- Some DP transactions get paid off in same month (~60%)
        IF ((EXTRACT(DAY FROM v_cur_date)::INT * 7 + v_tx_idx * 13) % 10) < 6 THEN
          v_remaining := v_final_price - v_dp_amount;
          v_pay_count := 1 + ((EXTRACT(DAY FROM v_cur_date)::INT + v_tx_idx) % 2); -- 1-2 pelunasan
          
          FOR v_pay_idx IN 1..v_pay_count LOOP
            IF v_pay_idx = v_pay_count THEN
              v_pay_amount := v_remaining;
            ELSE
              v_pay_amount := ROUND(v_remaining * (0.4 + ((EXTRACT(DAY FROM v_cur_date)::INT) % 20) / 100.0));
            END IF;
            v_remaining := v_remaining - v_pay_amount;
            
            INSERT INTO transaction_payments (transaction_id, amount, method, note, created_by, created_at)
            VALUES (
              v_tx_id, v_pay_amount,
              CASE WHEN ((EXTRACT(DAY FROM v_cur_date)::INT + v_pay_idx) % 2) = 0 THEN 'TUNAI' ELSE 'TRANSFER' END,
              CASE WHEN v_pay_idx = v_pay_count THEN 'Pelunasan' ELSE 'Angsuran ke-' || v_pay_idx END,
              v_owner_id,
              v_cur_date + (v_tx_idx * INTERVAL '47 minutes' + v_pay_idx * INTERVAL '3 days' + INTERVAL '8 hours')
            );
          END LOOP;
          
          -- Update status ke LUNAS
          UPDATE transactions SET status = 'LUNAS', updated_at = v_cur_date + INTERVAL '14 days'
          WHERE id = v_tx_id;
          
        ELSIF ((EXTRACT(DAY FROM v_cur_date)::INT) % 3) = 0 THEN
          -- Some get partial payment (MENUNGGU_PELUNASAN)
          -- Already DP, so status stays as-is or changes
          UPDATE transactions SET status = 'MENUNGGU_PELUNASAN', updated_at = v_cur_date
          WHERE id = v_tx_id AND status = 'DP';
        END IF;
      END IF;
      
    END LOOP;
    
    -- Reset sequence per bulan
    IF v_cur_date = DATE_TRUNC('month', v_cur_date + INTERVAL '1 day')::DATE - 1 THEN
      v_seq := 0;
    END IF;
    
    v_cur_date := v_cur_date + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Transactions, HPP, Payments generated';
  
  -- ============================================================
  -- 6. INSERT OPERATIONAL COSTS per bulan
  -- ============================================================
  v_cur_date := v_start_date;
  WHILE v_cur_date <= v_end_date LOOP
    v_month_start := DATE_TRUNC('month', v_cur_date)::DATE;
    -- Handle end of range
    IF v_cur_date > v_end_date THEN EXIT; END IF;
    v_month_end := (DATE_TRUNC('month', v_cur_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    -- Gaji karyawan (tumbuh 5% per tahun)
    v_op_amount := 5000000 + (EXTRACT(YEAR FROM v_cur_date)::INT - 2024) * 250000;
    INSERT INTO operational_costs (name, amount, category, period_start, period_end, created_by, created_at)
    VALUES ('Gaji Karyawan Bulanan', v_op_amount, 'GAJI', v_month_start, v_month_end, v_owner_id, v_month_start)
    ON CONFLICT DO NOTHING;
    
    -- Listrik (naik 3% per tahun)
    v_op_amount := 1500000 + (EXTRACT(YEAR FROM v_cur_date)::INT - 2024) * 45000;
    INSERT INTO operational_costs (name, amount, category, period_start, period_end, created_by, created_at)
    VALUES ('Listrik & Air', v_op_amount, 'LISTRIK', v_month_start, v_month_end, v_owner_id, v_month_start)
    ON CONFLICT DO NOTHING;
    
    -- Sewa (flat)
    INSERT INTO operational_costs (name, amount, category, period_start, period_end, created_by, created_at)
    VALUES ('Sewa Tempat Usaha', 1500000, 'SEWA', v_month_start, v_month_end, v_owner_id, v_month_start)
    ON CONFLICT DO NOTHING;
    
    -- Bahan baku tambahan setiap 3 bulan
    IF EXTRACT(MONTH FROM v_cur_date)::INT % 3 = 0 THEN
      INSERT INTO operational_costs (name, amount, category, period_start, period_end, created_by, created_at)
      VALUES ('Restock Bahan Baku Tambahan', 2500000, 'BAHAN_BAKU', v_month_start, v_month_end, v_owner_id, v_month_start)
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Biaya lain-lain
    INSERT INTO operational_costs (name, amount, category, period_start, period_end, created_by, created_at)
    VALUES ('Biaya Lain-lain (kebersihan, ATK, dll)', 500000, 'LAINNYA', v_month_start, v_month_end, v_owner_id, v_month_start)
    ON CONFLICT DO NOTHING;
    
    v_cur_date := (DATE_TRUNC('month', v_cur_date) + INTERVAL '1 month')::DATE;
  END LOOP;
  
  RAISE NOTICE '✅ Operational costs inserted';
  RAISE NOTICE '🎉 SEEDING SELESAI! Dashboard siap diverifikasi.';
  RAISE NOTICE '📊 Lihat docs/verifikasi-seed.md untuk tabel expected values.';
  
END $$;