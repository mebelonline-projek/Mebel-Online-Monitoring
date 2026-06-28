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
  customer_name: z.string().max(100, "Nama pelanggan maksimal 100 karakter").optional().or(z.literal("")),
  description: z.string().max(1000, "Deskripsi maksimal 1000 karakter").optional().or(z.literal("")),
  final_price: z.coerce.number().min(1, "Harga harus lebih dari 0").max(999_999_999, "Harga terlalu besar"),
  payment_type: z.enum(["CASH", "DP"], { error: "Pilih tipe pembayaran" }),
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

// --- Operational Cost (simpel: nama + jumlah doang) ---
export const operationalCostSchema = z.object({
  name: z.string().min(2, "Nama biaya minimal 2 karakter").max(200, "Nama biaya maksimal 200 karakter"),
  amount: z.coerce.number().min(1, "Jumlah harus lebih dari 0").max(999_999_999, "Jumlah terlalu besar"),
});

export type OperationalCostFormValues = z.infer<typeof operationalCostSchema>;
