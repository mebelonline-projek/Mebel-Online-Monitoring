-- Hapus batas ukuran upload foto produk (jalankan sekali di SQL Editor)
UPDATE storage.buckets
SET file_size_limit = NULL
WHERE id = 'product-photos';
