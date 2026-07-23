-- ============================================================
-- SEED FULL BUSINESS 2.5 TAHUN — Semua lini fitur
-- ============================================================
-- Periode: 2024-01-01 s/d hari ini (WIB) — agar KPI Hari/Bulan terisi untuk QA
-- Isi: gudang, kategori, produk, pelanggan, stok/mutasi,
--      transaksi+items+HPP+payments, invoice sample, biaya ops.
--
-- PRASYARAT: jalankan wipe_business_data.sql dulu.
-- CARA: Run di Supabase SQL Editor.
-- Owner: otomatis ambil user role OWNER. Opsional: isi UUID di v_owner_text.
-- ============================================================

DO $seed$
DECLARE
  v_owner_text TEXT := 'OWNER_UUID_HERE';  -- opsional: isi UUID, atau biarkan auto
  v_owner_id UUID;
  v_owner_count INT;
  v_start_date DATE := '2024-01-01';
  -- Sampai hari ini (WIB) agar filter Hari/Minggu/Bulan punya data QA
  v_end_date DATE := (timezone('Asia/Jakarta', now()))::date;
  v_detail_from DATE := '2025-07-01'; -- SALE mutasi detail dari sini
  v_cur_date DATE;
  -- UUID RFC v4-ish (version nibble 4, variant 8) — aman untuk Zod & Postgres
  v_wh_utama UUID := '20000000-0000-4000-8000-000000000001';
  v_wh_toko UUID := '20000000-0000-4000-8000-000000000002';
  v_cat_ids UUID[] := ARRAY[
    '30000000-0000-4000-8000-000000000001'::UUID,
    '30000000-0000-4000-8000-000000000002'::UUID,
    '30000000-0000-4000-8000-000000000003'::UUID,
    '30000000-0000-4000-8000-000000000004'::UUID
  ];
  v_cat_names TEXT[] := ARRAY['Sofa', 'Meja', 'Lemari', 'Lainnya'];
  v_cust_ids UUID[] := ARRAY[
    '00000000-0000-4000-8000-000000000001'::UUID,
    '00000000-0000-4000-8000-000000000002'::UUID,
    '00000000-0000-4000-8000-000000000003'::UUID,
    '00000000-0000-4000-8000-000000000004'::UUID,
    '00000000-0000-4000-8000-000000000005'::UUID,
    '00000000-0000-4000-8000-000000000006'::UUID,
    '00000000-0000-4000-8000-000000000007'::UUID,
    '00000000-0000-4000-8000-000000000008'::UUID,
    '00000000-0000-4000-8000-000000000009'::UUID,
    '00000000-0000-4000-8000-000000000010'::UUID
  ];
  v_cust_names TEXT[] := ARRAY[
    'Budi Setiawan', 'Siti Nurhaliza', 'Ahmad Fauzi',
    'Dewi Sartika', 'Rudi Hermawan', 'Linda Kusuma',
    'Bambang Prasetyo', 'Ratna Sari', 'Hendra Gunawan',
    'Mega Wati'
  ];
  v_prod_ids UUID[] := ARRAY[
    '10000000-0000-4000-8000-000000000001'::UUID,
    '10000000-0000-4000-8000-000000000002'::UUID,
    '10000000-0000-4000-8000-000000000003'::UUID,
    '10000000-0000-4000-8000-000000000004'::UUID,
    '10000000-0000-4000-8000-000000000005'::UUID,
    '10000000-0000-4000-8000-000000000006'::UUID,
    '10000000-0000-4000-8000-000000000007'::UUID
  ];
  v_prod_names TEXT[] := ARRAY[
    'Sofa L-Shape Minimalis', 'Kursi Tamu Jepara',
    'Meja Makan Minimalis', 'Meja Kerja Industrial',
    'Lemari Jati 3 Pintu', 'Bufet TV Classic',
    'Rak Buku Kayu Pinus'
  ];
  v_prod_prices BIGINT[] := ARRAY[8500000, 6200000, 2800000, 1950000, 4500000, 3400000, 1200000];
  v_prod_cats INT[] := ARRAY[1, 1, 2, 2, 3, 3, 4];
  v_prod_min INT[] := ARRAY[2, 2, 3, 3, 2, 2, 5];
  v_tx_per_day INT;
  v_tx_idx INT;
  v_tx_id UUID;
  v_cust_idx INT;
  v_prod_idx INT;
  v_prod2_idx INT;
  v_base_price BIGINT;
  v_price_multiplier NUMERIC(4,3);
  v_final_price BIGINT;
  v_line2_price BIGINT;
  v_payment_type TEXT;
  v_dp_amount BIGINT;
  v_status TEXT;
  v_is_void BOOLEAN;
  v_fulfillment TEXT;
  v_hpp_count INT;
  v_hpp_item_idx INT;
  v_hpp_name TEXT;
  v_hpp_amount BIGINT;
  v_remaining BIGINT;
  v_pay_amount BIGINT;
  v_pay_count INT;
  v_pay_idx INT;
  v_trx_num TEXT;
  v_day_seq INT;
  v_day_of_week INT;
  v_op_amount BIGINT;
  v_month_start DATE;
  v_month_end DATE;
  v_is_ramadan BOOLEAN;
  v_seasonal_mult NUMERIC(3,2);
  v_cust_phone TEXT;
  v_cust_addr TEXT;
  v_created_at TIMESTAMPTZ;
  v_open_qty INT := 3000;
  v_transfer_qty INT := 80;
  v_inv_id UUID;
  v_inv_total BIGINT;
  v_inv_paid BIGINT;
  v_tx_ids UUID[];
  i INT;
BEGIN
  -- Resolve OWNER: pakai UUID manual, atau auto dari public.users
  IF v_owner_text IS NOT NULL
     AND v_owner_text <> 'OWNER_UUID_HERE'
     AND v_owner_text ~ '^[0-9a-fA-F-]{36}$' THEN
    v_owner_id := v_owner_text::UUID;
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_owner_id) THEN
      RAISE EXCEPTION 'UUID % tidak ada di public.users', v_owner_id;
    END IF;
  ELSE
    SELECT COUNT(*) INTO v_owner_count FROM public.users WHERE role = 'OWNER';
    IF v_owner_count = 0 THEN
      RAISE EXCEPTION 'Tidak ada user role OWNER di public.users. Buat akun OWNER dulu.';
    END IF;
    IF v_owner_count > 1 THEN
      RAISE EXCEPTION
        'Ada % user OWNER. Isi v_owner_text dengan salah satu UUID: SELECT id, email FROM public.users WHERE role = ''OWNER'';',
        v_owner_count;
    END IF;
    SELECT id INTO v_owner_id FROM public.users WHERE role = 'OWNER' LIMIT 1;
  END IF;

  RAISE NOTICE 'Owner OK: %. Mulai seed full business...', v_owner_id;

  -- ------------------------------------------------------------
  -- 1. Gudang (Toko = sales, Gudang Utama)
  -- ------------------------------------------------------------
  INSERT INTO public.warehouses (id, name, address, is_active, is_sales_warehouse)
  VALUES
    (v_wh_toko, 'Toko / Showroom', 'Jl. Showroom No. 1', true, true),
    (v_wh_utama, 'Gudang Utama', 'Jl. Industri No. 88', true, false);

  RAISE NOTICE '2 gudang inserted';

  -- ------------------------------------------------------------
  -- 2. Kategori
  -- ------------------------------------------------------------
  FOR i IN 1..4 LOOP
    INSERT INTO public.product_categories (id, name)
    VALUES (v_cat_ids[i], v_cat_names[i]);
  END LOOP;
  RAISE NOTICE '4 kategori inserted';

  -- ------------------------------------------------------------
  -- 3. Produk (7 barang)
  -- ------------------------------------------------------------
  FOR i IN 1..7 LOOP
    INSERT INTO public.products (
      id, name, category, category_id, description, base_price,
      unit, min_stock, created_by
    ) VALUES (
      v_prod_ids[i],
      v_prod_names[i],
      upper(v_cat_names[v_prod_cats[i]]),
      v_cat_ids[v_prod_cats[i]],
      CASE i
        WHEN 1 THEN 'Sofa sudut L-shape, kain linen, rangka kayu jati'
        WHEN 2 THEN 'Set kursi tamu ukiran Jepara, busa dacron'
        WHEN 3 THEN 'Meja makan set 6 kursi, kayu mahoni'
        WHEN 4 THEN 'Meja kerja industrial top kayu, kaki besi'
        WHEN 5 THEN 'Lemari 3 pintu jati asli, finishing natural'
        WHEN 6 THEN 'Bufet TV 180cm, laci + pintu kaca'
        ELSE 'Rak buku 5 tingkat kayu pinus'
      END,
      v_prod_prices[i],
      'pcs',
      v_prod_min[i],
      v_owner_id
    );
  END LOOP;
  RAISE NOTICE '7 products inserted';

  -- ------------------------------------------------------------
  -- 4. Pelanggan
  -- ------------------------------------------------------------
  FOR i IN 1..10 LOOP
    v_cust_phone := '0812' || LPAD((10000000 + i * 1234567)::TEXT, 8, '0');
    v_cust_addr := CASE (i % 5)
      WHEN 0 THEN 'Jl. Merdeka No. ' || i
      WHEN 1 THEN 'Jl. Sudirman No. ' || (i * 10)
      WHEN 2 THEN 'Komplek Griya Indah Blok ' || CHR(64 + i)
      WHEN 3 THEN 'Perumahan Permata Asri No. ' || (i * 3 + 1)
      ELSE 'Jl. Veteran No. ' || (i * 7)
    END;
    INSERT INTO public.customers (id, name, phone, address, created_by)
    VALUES (v_cust_ids[i], v_cust_names[i], v_cust_phone, v_cust_addr, v_owner_id);
  END LOOP;
  RAISE NOTICE '10 customers inserted';

  -- ------------------------------------------------------------
  -- 5. Opening stock IN ke Gudang Utama + TRANSFER bulanan ke Toko
  -- ------------------------------------------------------------
  FOR i IN 1..7 LOOP
    INSERT INTO public.warehouse_stocks (warehouse_id, product_id, qty)
    VALUES (v_wh_utama, v_prod_ids[i], v_open_qty);

    INSERT INTO public.stock_movements (
      type, product_id, to_warehouse_id, qty, note,
      reference_type, created_by, created_at
    ) VALUES (
      'IN', v_prod_ids[i], v_wh_utama, v_open_qty,
      'Opening stock seed', 'SEED', v_owner_id, v_start_date::timestamptz
    );

    INSERT INTO public.warehouse_stocks (warehouse_id, product_id, qty)
    VALUES (v_wh_toko, v_prod_ids[i], 0);
  END LOOP;

  v_cur_date := v_start_date;
  WHILE v_cur_date <= v_end_date LOOP
    v_month_start := DATE_TRUNC('month', v_cur_date)::DATE;
    FOR i IN 1..7 LOOP
      UPDATE public.warehouse_stocks
      SET qty = qty - v_transfer_qty
      WHERE warehouse_id = v_wh_utama AND product_id = v_prod_ids[i]
        AND qty >= v_transfer_qty;

      UPDATE public.warehouse_stocks
      SET qty = qty + v_transfer_qty
      WHERE warehouse_id = v_wh_toko AND product_id = v_prod_ids[i];

      INSERT INTO public.stock_movements (
        type, product_id, from_warehouse_id, to_warehouse_id, qty, note,
        reference_type, created_by, created_at
      ) VALUES (
        'TRANSFER', v_prod_ids[i], v_wh_utama, v_wh_toko, v_transfer_qty,
        'Transfer bulanan ke toko', 'SEED', v_owner_id,
        (v_month_start + INTERVAL '2 days')::timestamptz
      );
    END LOOP;
    v_cur_date := (DATE_TRUNC('month', v_cur_date) + INTERVAL '1 month')::DATE;
  END LOOP;
  RAISE NOTICE 'Opening + transfer bulanan selesai';

  -- ------------------------------------------------------------
  -- 6. Transaksi harian + items + HPP + payments (+ SALE 12 bln)
  -- ------------------------------------------------------------
  v_cur_date := v_start_date;

  WHILE v_cur_date <= v_end_date LOOP
    v_day_of_week := EXTRACT(DOW FROM v_cur_date)::INT;
    v_day_seq := 0;

    v_tx_per_day := CASE
      WHEN v_day_of_week = 0 THEN 1 + (EXTRACT(DAY FROM v_cur_date)::INT % 3)
      WHEN v_day_of_week = 6 THEN 2 + (EXTRACT(DAY FROM v_cur_date)::INT % 3)
      WHEN v_day_of_week = 5 THEN 2 + (EXTRACT(DAY FROM v_cur_date)::INT % 2)
      ELSE 3 + (EXTRACT(DAY FROM v_cur_date)::INT % 3)
    END;

    v_is_ramadan := (v_cur_date >= '2024-03-10' AND v_cur_date <= '2024-04-08')
                 OR (v_cur_date >= '2025-03-01' AND v_cur_date <= '2025-03-29')
                 OR (v_cur_date >= '2026-02-17' AND v_cur_date <= '2026-03-18');

    v_seasonal_mult := CASE
      WHEN v_is_ramadan THEN 1.25
      WHEN EXTRACT(MONTH FROM v_cur_date)::INT IN (11, 12) THEN 1.15
      ELSE 1.0
    END;

    FOR v_tx_idx IN 1..v_tx_per_day LOOP
      v_day_seq := v_day_seq + 1;
      v_cust_idx := ((EXTRACT(DOY FROM v_cur_date)::INT + v_tx_idx * 31) % 10) + 1;
      v_prod_idx := ((EXTRACT(DAY FROM v_cur_date)::INT + v_tx_idx * 7) % 7) + 1;
      v_base_price := v_prod_prices[v_prod_idx];
      v_price_multiplier := 0.88 + ((EXTRACT(DAY FROM v_cur_date)::INT * 3 + v_tx_idx * 7) % 25) / 100.0;
      v_final_price := ROUND(v_base_price * v_price_multiplier * v_seasonal_mult);

      IF ((EXTRACT(DAY FROM v_cur_date)::INT + v_tx_idx) % 7) = 0 THEN
        v_prod2_idx := ((v_prod_idx) % 7) + 1;
        v_line2_price := ROUND(v_prod_prices[v_prod2_idx] * 0.9 * v_seasonal_mult);
        v_final_price := v_final_price + v_line2_price;
      ELSE
        v_prod2_idx := 0;
        v_line2_price := 0;
      END IF;

      v_payment_type := CASE
        WHEN ((EXTRACT(DAY FROM v_cur_date)::INT * 7 + v_tx_idx * 13) % 10) < 6 THEN 'CASH'
        ELSE 'DP'
      END;

      v_is_void := ((EXTRACT(DAY FROM v_cur_date)::INT * 11 + v_tx_idx * 17) % 100) < 5;

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

      v_fulfillment := CASE
        WHEN v_is_void THEN 'MENUNGGU'
        WHEN ((EXTRACT(DAY FROM v_cur_date)::INT + v_tx_idx) % 4) = 0 THEN 'SELESAI'
        WHEN ((EXTRACT(DAY FROM v_cur_date)::INT + v_tx_idx) % 4) = 1 THEN 'SIAP_KIRIM'
        WHEN ((EXTRACT(DAY FROM v_cur_date)::INT + v_tx_idx) % 4) = 2 THEN 'PRODUKSI'
        ELSE 'MENUNGGU'
      END;

      v_trx_num := 'TRX-' || TO_CHAR(v_cur_date, 'YYYYMMDD') || '-' || LPAD(v_day_seq::TEXT, 3, '0');
      v_created_at := v_cur_date + (v_tx_idx * INTERVAL '47 minutes' + INTERVAL '8 hours');

      INSERT INTO public.transactions (
        id, transaction_number, customer_id, customer_name, product_id,
        description, final_price, payment_type, dp_amount, status,
        fulfillment_status, void_reason, void_by, void_at,
        created_by, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        v_trx_num,
        v_cust_ids[v_cust_idx],
        v_cust_names[v_cust_idx],
        v_prod_ids[v_prod_idx],
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
        v_fulfillment,
        CASE WHEN v_is_void THEN
          CASE ((EXTRACT(DAY FROM v_cur_date)::INT) % 4)
            WHEN 0 THEN 'Customer membatalkan pesanan'
            WHEN 1 THEN 'Stok bahan tidak tersedia'
            WHEN 2 THEN 'Double order'
            ELSE 'Customer pindah ke produk lain'
          END
        ELSE NULL END,
        CASE WHEN v_is_void THEN v_owner_id ELSE NULL END,
        CASE WHEN v_is_void THEN v_created_at + INTERVAL '2 hours' ELSE NULL END,
        v_owner_id,
        v_created_at,
        v_created_at
      )
      RETURNING id INTO v_tx_id;

      INSERT INTO public.transaction_items (
        transaction_id, product_id, product_name, quantity, unit_price,
        line_total, sort_order, warehouse_id
      ) VALUES (
        v_tx_id, v_prod_ids[v_prod_idx], v_prod_names[v_prod_idx], 1,
        CASE WHEN v_prod2_idx > 0 THEN v_final_price - v_line2_price ELSE v_final_price END,
        CASE WHEN v_prod2_idx > 0 THEN v_final_price - v_line2_price ELSE v_final_price END,
        0, v_wh_toko
      );

      IF v_prod2_idx > 0 THEN
        INSERT INTO public.transaction_items (
          transaction_id, product_id, product_name, quantity, unit_price,
          line_total, sort_order, warehouse_id
        ) VALUES (
          v_tx_id, v_prod_ids[v_prod2_idx], v_prod_names[v_prod2_idx], 1,
          v_line2_price, v_line2_price, 1, v_wh_toko
        );
      END IF;

      IF NOT v_is_void AND v_cur_date >= v_detail_from THEN
        UPDATE public.warehouse_stocks
        SET qty = qty - 1
        WHERE warehouse_id = v_wh_toko AND product_id = v_prod_ids[v_prod_idx] AND qty >= 1;

        INSERT INTO public.stock_movements (
          type, product_id, from_warehouse_id, qty, note,
          reference_type, reference_id, created_by, created_at
        ) VALUES (
          'SALE', v_prod_ids[v_prod_idx], v_wh_toko, 1,
          'Penjualan ' || v_trx_num, 'TRANSACTION', v_tx_id,
          v_owner_id, v_created_at
        );

        IF v_prod2_idx > 0 THEN
          UPDATE public.warehouse_stocks
          SET qty = qty - 1
          WHERE warehouse_id = v_wh_toko AND product_id = v_prod_ids[v_prod2_idx] AND qty >= 1;

          INSERT INTO public.stock_movements (
            type, product_id, from_warehouse_id, qty, note,
            reference_type, reference_id, created_by, created_at
          ) VALUES (
            'SALE', v_prod_ids[v_prod2_idx], v_wh_toko, 1,
            'Penjualan ' || v_trx_num, 'TRANSACTION', v_tx_id,
            v_owner_id, v_created_at
          );
        END IF;
      END IF;

      IF NOT v_is_void THEN
        v_hpp_count := 2 + ((EXTRACT(DAY FROM v_cur_date)::INT + v_tx_idx) % 3);
        FOR v_hpp_item_idx IN 1..v_hpp_count LOOP
          v_hpp_name := CASE ((v_hpp_item_idx + EXTRACT(DAY FROM v_cur_date)::INT) % 5)
            WHEN 0 THEN 'Kayu ' || CASE (v_prod_idx % 3) WHEN 0 THEN 'Jati' WHEN 1 THEN 'Mahoni' ELSE 'Pinus' END
            WHEN 1 THEN 'Bahan finishing (cat/pernis/plitur)'
            WHEN 2 THEN 'Ongkos tukang ' || v_hpp_item_idx || ' orang'
            WHEN 3 THEN 'Aksesoris (handle, engsel, kaca)'
            ELSE 'Transport pengiriman bahan'
          END;
          v_hpp_amount := ROUND(v_final_price * (0.08 + ((EXTRACT(DAY FROM v_cur_date)::INT + v_hpp_item_idx * 7) % 20) + 5) / 100.0);
          INSERT INTO public.hpp_items (transaction_id, name, amount, note, created_by, created_at)
          VALUES (
            v_tx_id, v_hpp_name, v_hpp_amount,
            CASE WHEN ((EXTRACT(DAY FROM v_cur_date)::INT + v_hpp_item_idx) % 3) = 0
              THEN 'Pembelian dari supplier langganan' ELSE NULL END,
            v_owner_id,
            v_created_at + (v_hpp_item_idx * INTERVAL '5 minutes')
          );
        END LOOP;
      END IF;

      IF v_payment_type = 'CASH' AND NOT v_is_void THEN
        -- payment_date WAJIB historis (dashboard omzet pakai payment_date, bukan created_at)
        INSERT INTO public.transaction_payments (
          transaction_id, amount, method, note, created_by, created_at, payment_date
        ) VALUES (
          v_tx_id, v_final_price, 'TUNAI', 'Pembayaran Lunas',
          v_owner_id, v_created_at, v_created_at
        );
      ELSIF v_payment_type = 'DP' AND NOT v_is_void THEN
        INSERT INTO public.transaction_payments (
          transaction_id, amount, method, note, created_by, created_at, payment_date
        ) VALUES (
          v_tx_id, v_dp_amount,
          CASE WHEN ((EXTRACT(DAY FROM v_cur_date)::INT) % 2) = 0 THEN 'TUNAI' ELSE 'TRANSFER' END,
          'Uang Muka (DP)', v_owner_id, v_created_at, v_created_at
        );

        IF ((EXTRACT(DAY FROM v_cur_date)::INT * 7 + v_tx_idx * 13) % 10) < 6 THEN
          v_remaining := v_final_price - v_dp_amount;
          v_pay_count := 1 + ((EXTRACT(DAY FROM v_cur_date)::INT + v_tx_idx) % 2);
          FOR v_pay_idx IN 1..v_pay_count LOOP
            IF v_pay_idx = v_pay_count THEN
              v_pay_amount := v_remaining;
            ELSE
              v_pay_amount := ROUND(v_remaining * (0.4 + ((EXTRACT(DAY FROM v_cur_date)::INT) % 20) / 100.0));
            END IF;
            v_remaining := v_remaining - v_pay_amount;
            INSERT INTO public.transaction_payments (
              transaction_id, amount, method, note, created_by, created_at, payment_date
            ) VALUES (
              v_tx_id, v_pay_amount,
              CASE WHEN ((EXTRACT(DAY FROM v_cur_date)::INT + v_pay_idx) % 2) = 0 THEN 'TUNAI' ELSE 'TRANSFER' END,
              CASE WHEN v_pay_idx = v_pay_count THEN 'Pelunasan' ELSE 'Angsuran ke-' || v_pay_idx END,
              v_owner_id,
              v_created_at + (v_pay_idx * INTERVAL '3 days'),
              v_created_at + (v_pay_idx * INTERVAL '3 days')
            );
          END LOOP;
          UPDATE public.transactions SET status = 'LUNAS', updated_at = v_created_at + INTERVAL '14 days'
          WHERE id = v_tx_id;
        ELSIF ((EXTRACT(DAY FROM v_cur_date)::INT) % 3) = 0 THEN
          UPDATE public.transactions SET status = 'MENUNGGU_PELUNASAN', updated_at = v_created_at
          WHERE id = v_tx_id AND status = 'DP';
        END IF;
      END IF;
    END LOOP;

    v_cur_date := v_cur_date + 1;
  END LOOP;
  RAISE NOTICE 'Transactions + items + HPP + payments + SALE selesai';

  -- ------------------------------------------------------------
  -- 7. Sample invoices (DP / MENUNGGU_PELUNASAN — sesuai aturan app)
  -- ------------------------------------------------------------
  SELECT ARRAY_AGG(id ORDER BY created_at DESC)
  INTO v_tx_ids
  FROM (
    SELECT id, created_at
    FROM public.transactions
    WHERE status IN ('DP', 'MENUNGGU_PELUNASAN')
      AND created_at >= '2026-01-01'
    ORDER BY created_at DESC
    LIMIT 6
  ) s;

  IF v_tx_ids IS NOT NULL AND array_length(v_tx_ids, 1) >= 2 THEN
    SELECT COALESCE(SUM(final_price), 0) INTO v_inv_total
    FROM public.transactions WHERE id = ANY (v_tx_ids[1:2]);
    SELECT COALESCE(SUM(p.amount), 0) INTO v_inv_paid
    FROM public.transaction_payments p WHERE p.transaction_id = ANY (v_tx_ids[1:2]);

    INSERT INTO public.invoices (
      customer_name, status, total_amount, total_paid, remaining_amount,
      notes, created_by, created_at
    ) VALUES (
      'Invoice gabungan seed #1', 'SENT', v_inv_total, v_inv_paid,
      GREATEST(v_inv_total - v_inv_paid, 0),
      'Sample invoice multi-transaksi (seed)', v_owner_id, '2026-06-15'::timestamptz
    )
    RETURNING id INTO v_inv_id;

    INSERT INTO public.invoice_items (invoice_id, transaction_id)
    VALUES (v_inv_id, v_tx_ids[1]), (v_inv_id, v_tx_ids[2]);

    IF array_length(v_tx_ids, 1) >= 4 THEN
      SELECT COALESCE(SUM(final_price), 0) INTO v_inv_total
      FROM public.transactions WHERE id = ANY (v_tx_ids[3:4]);
      SELECT COALESCE(SUM(p.amount), 0) INTO v_inv_paid
      FROM public.transaction_payments p WHERE p.transaction_id = ANY (v_tx_ids[3:4]);

      INSERT INTO public.invoices (
        customer_name, status, total_amount, total_paid, remaining_amount,
        notes, created_by, created_at
      ) VALUES (
        'Invoice gabungan seed #2', 'DRAFT', v_inv_total, v_inv_paid,
        GREATEST(v_inv_total - v_inv_paid, 0),
        'Sample invoice draft (seed)', v_owner_id, '2026-06-20'::timestamptz
      )
      RETURNING id INTO v_inv_id;

      INSERT INTO public.invoice_items (invoice_id, transaction_id)
      VALUES (v_inv_id, v_tx_ids[3]), (v_inv_id, v_tx_ids[4]);
    END IF;
    RAISE NOTICE 'Sample invoices inserted';
  ELSE
    RAISE NOTICE 'Skip invoices: kurang transaksi DP/MENUNGGU';
  END IF;

  -- ------------------------------------------------------------
  -- 8. Biaya operasional per bulan
  -- ------------------------------------------------------------
  v_cur_date := v_start_date;
  WHILE v_cur_date <= v_end_date LOOP
    v_month_start := DATE_TRUNC('month', v_cur_date)::DATE;
    v_month_end := (DATE_TRUNC('month', v_cur_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    v_op_amount := 5000000 + (EXTRACT(YEAR FROM v_cur_date)::INT - 2024) * 250000;
    INSERT INTO public.operational_costs (name, amount, category, period_start, period_end, created_by, created_at)
    VALUES ('Gaji Karyawan Bulanan', v_op_amount, 'GAJI', v_month_start, v_month_end, v_owner_id, v_month_start);

    v_op_amount := 1500000 + (EXTRACT(YEAR FROM v_cur_date)::INT - 2024) * 45000;
    INSERT INTO public.operational_costs (name, amount, category, period_start, period_end, created_by, created_at)
    VALUES ('Listrik & Air', v_op_amount, 'LISTRIK', v_month_start, v_month_end, v_owner_id, v_month_start);

    INSERT INTO public.operational_costs (name, amount, category, period_start, period_end, created_by, created_at)
    VALUES ('Sewa Tempat Usaha', 1500000, 'SEWA', v_month_start, v_month_end, v_owner_id, v_month_start);

    IF EXTRACT(MONTH FROM v_cur_date)::INT % 3 = 0 THEN
      INSERT INTO public.operational_costs (name, amount, category, period_start, period_end, created_by, created_at)
      VALUES ('Restock Bahan Baku Tambahan', 2500000, 'BAHAN_BAKU', v_month_start, v_month_end, v_owner_id, v_month_start);
    END IF;

    INSERT INTO public.operational_costs (name, amount, category, period_start, period_end, created_by, created_at)
    VALUES ('Biaya Lain-lain (kebersihan, ATK, dll)', 500000, 'LAINNYA', v_month_start, v_month_end, v_owner_id, v_month_start);

    v_cur_date := (DATE_TRUNC('month', v_cur_date) + INTERVAL '1 month')::DATE;
  END LOOP;

  RAISE NOTICE 'Operational costs inserted';
  RAISE NOTICE 'SEED FULL BUSINESS SELESAI. Lihat docs/qa-checklist.md';
END
$seed$;
