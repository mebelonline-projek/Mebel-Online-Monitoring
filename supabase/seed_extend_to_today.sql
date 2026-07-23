-- ============================================================
-- SEED EXTEND — Lanjutkan data sampai hari ini (WIB)
-- ============================================================
-- Untuk DB yang sudah di-seed sampai 2026-06-30.
-- Aman diulang: skip hari yang sudah punya transaksi.
-- Jalankan di Supabase SQL Editor (bisa beberapa detik).
-- ============================================================

DO $ext$
DECLARE
  v_owner_id UUID;
  v_start_date DATE;
  v_end_date DATE := (timezone('Asia/Jakarta', now()))::date;
  v_cur_date DATE;
  v_wh_utama UUID := '20000000-0000-0000-0000-000000000001';
  v_wh_toko UUID := '20000000-0000-0000-0000-000000000002';
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
    '10000000-0000-0000-0000-000000000005'::UUID,
    '10000000-0000-0000-0000-000000000006'::UUID,
    '10000000-0000-0000-0000-000000000007'::UUID
  ];
  v_prod_names TEXT[] := ARRAY[
    'Sofa L-Shape Minimalis', 'Kursi Tamu Jepara',
    'Meja Makan Minimalis', 'Meja Kerja Industrial',
    'Lemari Jati 3 Pintu', 'Bufet TV Classic',
    'Rak Buku Kayu Pinus'
  ];
  v_prod_prices BIGINT[] := ARRAY[8500000, 6200000, 2800000, 1950000, 4500000, 3400000, 1200000];
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
  v_seasonal_mult NUMERIC(3,2);
  v_created_at TIMESTAMPTZ;
  v_transfer_qty INT := 80;
  v_days_done INT := 0;
  i INT;
  v_max_existing DATE;
BEGIN
  SELECT id INTO v_owner_id FROM public.users WHERE role = 'OWNER' LIMIT 1;
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Tidak ada user OWNER';
  END IF;

  SELECT MAX((created_at AT TIME ZONE 'Asia/Jakarta')::date)
  INTO v_max_existing
  FROM public.transactions;

  v_start_date := COALESCE(v_max_existing + 1, '2026-07-01'::date);

  IF v_start_date > v_end_date THEN
    RAISE NOTICE 'Sudah up-to-date sampai %. Tidak ada yang ditambah.', v_end_date;
    RETURN;
  END IF;

  RAISE NOTICE 'Extend seed % s/d % (owner %)', v_start_date, v_end_date, v_owner_id;

  -- Transfer bulanan untuk bulan yang belum ada (awal bulan dalam range)
  v_cur_date := date_trunc('month', v_start_date)::date;
  WHILE v_cur_date <= v_end_date LOOP
    v_month_start := v_cur_date;
    IF NOT EXISTS (
      SELECT 1 FROM public.stock_movements
      WHERE type = 'TRANSFER'
        AND note = 'Transfer bulanan ke toko'
        AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = (v_month_start + 2)
    ) THEN
      FOR i IN 1..7 LOOP
        UPDATE public.warehouse_stocks
        SET qty = qty - v_transfer_qty
        WHERE warehouse_id = v_wh_utama AND product_id = v_prod_ids[i] AND qty >= v_transfer_qty;

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
    END IF;
    v_cur_date := (v_cur_date + INTERVAL '1 month')::date;
  END LOOP;

  -- Transaksi harian
  v_cur_date := v_start_date;
  WHILE v_cur_date <= v_end_date LOOP
    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transaction_number LIKE 'TRX-' || to_char(v_cur_date, 'YYYYMMDD') || '-%'
      LIMIT 1
    ) THEN
      v_cur_date := v_cur_date + 1;
      CONTINUE;
    END IF;

    v_day_of_week := EXTRACT(DOW FROM v_cur_date)::INT;
    v_day_seq := 0;
    v_tx_per_day := CASE
      WHEN v_day_of_week = 0 THEN 1 + (EXTRACT(DAY FROM v_cur_date)::INT % 3)
      WHEN v_day_of_week = 6 THEN 2 + (EXTRACT(DAY FROM v_cur_date)::INT % 3)
      WHEN v_day_of_week = 5 THEN 2 + (EXTRACT(DAY FROM v_cur_date)::INT % 2)
      ELSE 3 + (EXTRACT(DAY FROM v_cur_date)::INT % 3)
    END;
    v_seasonal_mult := 1.0;

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
        v_dp_amount := ROUND(v_final_price * 0.5);
        v_status := 'DP';
      END IF;
      IF v_is_void THEN v_status := 'BATAL'; END IF;

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
        gen_random_uuid(), v_trx_num, v_cust_ids[v_cust_idx], v_cust_names[v_cust_idx],
        v_prod_ids[v_prod_idx], 'Seed extend QA', v_final_price, v_payment_type, v_dp_amount,
        v_status, v_fulfillment,
        CASE WHEN v_is_void THEN 'Customer membatalkan pesanan' ELSE NULL END,
        CASE WHEN v_is_void THEN v_owner_id ELSE NULL END,
        CASE WHEN v_is_void THEN v_created_at + INTERVAL '1 hour' ELSE NULL END,
        v_owner_id, v_created_at, v_created_at
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

      IF NOT v_is_void THEN
        UPDATE public.warehouse_stocks
        SET qty = qty - 1
        WHERE warehouse_id = v_wh_toko AND product_id = v_prod_ids[v_prod_idx] AND qty >= 1;

        INSERT INTO public.stock_movements (
          type, product_id, from_warehouse_id, qty, note,
          reference_type, reference_id, created_by, created_at
        ) VALUES (
          'SALE', v_prod_ids[v_prod_idx], v_wh_toko, 1,
          'Penjualan ' || v_trx_num, 'TRANSACTION', v_tx_id, v_owner_id, v_created_at
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
            'Penjualan ' || v_trx_num, 'TRANSACTION', v_tx_id, v_owner_id, v_created_at
          );
        END IF;

        v_hpp_count := 2 + ((EXTRACT(DAY FROM v_cur_date)::INT + v_tx_idx) % 3);
        FOR v_hpp_item_idx IN 1..v_hpp_count LOOP
          v_hpp_name := CASE (v_hpp_item_idx % 3)
            WHEN 0 THEN 'Kayu Jati'
            WHEN 1 THEN 'Bahan finishing'
            ELSE 'Ongkos tukang'
          END;
          v_hpp_amount := ROUND(v_final_price * (0.1 + v_hpp_item_idx * 0.03));
          INSERT INTO public.hpp_items (transaction_id, name, amount, created_by, created_at)
          VALUES (v_tx_id, v_hpp_name, v_hpp_amount, v_owner_id, v_created_at);
        END LOOP;

        IF v_payment_type = 'CASH' THEN
          INSERT INTO public.transaction_payments (
            transaction_id, amount, method, note, created_by, created_at, payment_date
          ) VALUES (
            v_tx_id, v_final_price, 'TUNAI', 'Pembayaran Lunas',
            v_owner_id, v_created_at, v_created_at
          );
        ELSE
          INSERT INTO public.transaction_payments (
            transaction_id, amount, method, note, created_by, created_at, payment_date
          ) VALUES (
            v_tx_id, v_dp_amount, 'TRANSFER', 'Uang Muka (DP)',
            v_owner_id, v_created_at, v_created_at
          );
          -- ~60% lunas di hari yang sama + sedikit delay
          IF ((EXTRACT(DAY FROM v_cur_date)::INT * 7 + v_tx_idx) % 10) < 6 THEN
            v_remaining := v_final_price - v_dp_amount;
            INSERT INTO public.transaction_payments (
              transaction_id, amount, method, note, created_by, created_at, payment_date
            ) VALUES (
              v_tx_id, v_remaining, 'TUNAI', 'Pelunasan',
              v_owner_id, v_created_at + INTERVAL '2 days', v_created_at + INTERVAL '2 days'
            );
            UPDATE public.transactions SET status = 'LUNAS' WHERE id = v_tx_id;
          END IF;
        END IF;
      END IF;
    END LOOP;

    v_days_done := v_days_done + 1;
    v_cur_date := v_cur_date + 1;
  END LOOP;

  -- Biaya operasional Juli+ jika belum ada
  v_cur_date := date_trunc('month', v_start_date)::date;
  WHILE v_cur_date <= v_end_date LOOP
    v_month_start := v_cur_date;
    v_month_end := (date_trunc('month', v_cur_date) + INTERVAL '1 month' - INTERVAL '1 day')::date;
    IF NOT EXISTS (
      SELECT 1 FROM public.operational_costs
      WHERE period_start = v_month_start AND name = 'Gaji Karyawan Bulanan'
    ) THEN
      v_op_amount := 5000000 + (EXTRACT(YEAR FROM v_cur_date)::INT - 2024) * 250000;
      INSERT INTO public.operational_costs (name, amount, category, period_start, period_end, created_by, created_at)
      VALUES ('Gaji Karyawan Bulanan', v_op_amount, 'GAJI', v_month_start, v_month_end, v_owner_id, v_month_start);
      INSERT INTO public.operational_costs (name, amount, category, period_start, period_end, created_by, created_at)
      VALUES ('Listrik & Air', 1500000 + (EXTRACT(YEAR FROM v_cur_date)::INT - 2024) * 45000, 'LISTRIK', v_month_start, v_month_end, v_owner_id, v_month_start);
      INSERT INTO public.operational_costs (name, amount, category, period_start, period_end, created_by, created_at)
      VALUES ('Sewa Tempat Usaha', 1500000, 'SEWA', v_month_start, v_month_end, v_owner_id, v_month_start);
      INSERT INTO public.operational_costs (name, amount, category, period_start, period_end, created_by, created_at)
      VALUES ('Biaya Lain-lain (kebersihan, ATK, dll)', 500000, 'LAINNYA', v_month_start, v_month_end, v_owner_id, v_month_start);
    END IF;
    v_cur_date := (v_cur_date + INTERVAL '1 month')::date;
  END LOOP;

  RAISE NOTICE 'Extend selesai: % hari ditambah sampai %', v_days_done, v_end_date;
END
$ext$;
