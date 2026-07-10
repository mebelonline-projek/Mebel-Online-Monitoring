// ============================================================
// ✅ VALIDATION SCHEMAS
// ============================================================
// Reusable Zod schemas. Semua validasi form pake ini.
// ============================================================

import { z } from "zod";

// --- Common fields ---
export const idSchema = z.string().min(1, "ID wajib diisi");
export const slugSchema = z
  .string()
  .min(1, "Slug wajib diisi")
  .regex(/^[a-z0-9-]+$/, "Slug hanya boleh huruf kecil, angka, dan strip");
export const emailSchema = z.string().email("Format email tidak valid");
export const urlSchema = z.string().url("Format URL tidak valid").optional().or(z.literal(""));

// --- Common forms ---
export const searchSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// --- File validation ---
export const imageFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= 5 * 1024 * 1024, "Maksimal 5MB")
  .refine(
    (file) => ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type),
    "Format harus JPEG, PNG, WebP, atau AVIF",
  )
  .nullable()
  .optional();

// --- Contact form ---
export const contactFormSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  email: emailSchema,
  subject: z.string().min(3, "Subjek minimal 3 karakter").max(200),
  message: z.string().min(10, "Pesan minimal 10 karakter").max(5000),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

// --- Transaction ---
export const transactionSchema = z.object({
  customer_id: z.string().uuid().optional().or(z.literal("")),
  product_id: z.string().uuid().optional().or(z.literal("")),
  customer_name: z
    .string()
    .max(100, "Nama pelanggan maksimal 100 karakter")
    .optional()
    .or(z.literal(""))
    .nullable(),
  description: z
    .string()
    .max(1000, "Deskripsi maksimal 1000 karakter")
    .optional()
    .or(z.literal(""))
    .nullable(),
  final_price: z.coerce.number().min(1, "Harga harus lebih dari 0").max(999_999_999, "Harga terlalu besar"),
  payment_type: z.enum(["CASH", "DP"], { error: "Pilih tipe pembayaran" }),
  payment_method: z.enum(["TUNAI", "TRANSFER"]).default("TUNAI"),
  client_id: z.string().uuid().optional(),
  dp_amount: z.coerce.number().min(0, "DP tidak boleh negatif").default(0),
}).refine(
  (data) => {
    if (data.payment_type === "DP") {
      return data.dp_amount > 0 && data.dp_amount < data.final_price;
    }
    return true;
  },
  {
    message: "DP harus lebih dari 0 dan kurang dari harga final",
    path: ["dp_amount"],
  }
);

export type TransactionFormValues = z.infer<typeof transactionSchema>;

// --- Transaction line item (multi-produk) ---
export const transactionItemSchema = z.object({
  product_id: z.string().uuid().optional().or(z.literal("")),
  product_name: z.string().min(1, "Nama produk wajib").max(200),
  quantity: z.coerce.number().min(1, "Min 1").max(999),
  unit_price: z.coerce.number().min(1, "Harga item harus lebih dari 0").max(999_999_999),
  note: z.string().max(300).optional().or(z.literal("")),
});

export type TransactionItemFormValues = z.infer<typeof transactionItemSchema>;

export const transactionCreateSchema = transactionSchema.extend({
  items: z.array(transactionItemSchema).optional(),
});

export const fulfillmentUpdateSchema = z.object({
  id: z.string().uuid(),
  fulfillment_status: z.enum(["MENUNGGU", "PRODUKSI", "SIAP_KIRIM", "SELESAI"]),
});

export type FulfillmentUpdateValues = z.infer<typeof fulfillmentUpdateSchema>;

// --- HPP Item ---
export const hppItemSchema = z.object({
  transaction_id: z.string().min(1, "ID transaksi wajib"),
  name: z.string().min(2, "Nama item minimal 2 karakter").max(200, "Nama item maksimal 200 karakter"),
  amount: z.coerce.number().min(1, "Jumlah harus lebih dari 0").max(999_999_999, "Jumlah terlalu besar"),
  note: z.string().max(500, "Catatan maksimal 500 karakter").optional().or(z.literal("")),
});

export type HppItemFormValues = z.infer<typeof hppItemSchema>;

// --- Payment (Pelunasan) ---
export const paymentSchema = z.object({
  transaction_id: z.string().min(1, "ID transaksi wajib"),
  amount: z.coerce.number().min(1, "Jumlah harus lebih dari 0").max(999_999_999, "Jumlah terlalu besar"),
  method: z.enum(["TUNAI", "TRANSFER"], { error: "Pilih metode pembayaran" }),
  note: z.string().max(500, "Catatan maksimal 500 karakter").optional().or(z.literal("")),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

// --- Operational Cost (nama + jumlah + kategori bebas) ---
export const operationalCostSchema = z.object({
  name: z.string().min(2, "Nama biaya minimal 2 karakter").max(200, "Nama biaya maksimal 200 karakter"),
  amount: z.coerce.number().min(1, "Jumlah harus lebih dari 0").max(999_999_999, "Jumlah terlalu besar"),
  category: z.string().max(100, "Kategori maksimal 100 karakter").optional().default("LAINNYA"),
});

export type OperationalCostFormValues = z.infer<typeof operationalCostSchema>;

// --- Customer ---
export const customerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  phone: z.string().max(20, "Telepon maksimal 20 karakter").optional().or(z.literal("")),
  address: z.string().max(300, "Alamat maksimal 300 karakter").optional().or(z.literal("")),
  note: z.string().max(500, "Catatan maksimal 500 karakter").optional().or(z.literal("")),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

// --- Product ---
export const productSchema = z.object({
  name: z.string().min(2, "Nama produk minimal 2 karakter").max(200, "Nama maksimal 200 karakter"),
  category: z.string().max(100, "Kategori maksimal 100 karakter").optional().default("LAINNYA"),
  description: z.string().max(500, "Deskripsi maksimal 500 karakter").optional().or(z.literal("")),
  base_price: z.coerce.number().min(0, "Harga tidak boleh negatif").max(999_999_999, "Harga terlalu besar"),
});

export type ProductFormValues = z.infer<typeof productSchema>;
