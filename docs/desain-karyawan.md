# 🎨 Referensi Desain — Dashboard Karyawan

> **Sumber:** `kode/karyawan` — Luxe Furnishings
> **Tema:** Corporate Dark Elegan
> **Target:** Karyawan (input transaksi & operasional sehari-hari)

---

## 🎯 Palet Warna

| Token | Warna | Hex | Penggunaan |
|-------|-------|-----|------------|
| Background | Hitam | `#09090b` | Latar belakang utama |
| Surface | Hitam lebih terang | `#121214` | Sidebar |
| Surface-container-lowest | Hitam abu | `#18181b` | Card panels |
| Surface-container-low | Abu gelap | `#27272a` | Hover, border subtle |
| Surface-container | Abu gelap | `#27272a` | Container |
| Surface-container-high | Abu sedang | `#3f3f46` | Hover state |
| Surface-container-highest | Abu terang | `#52525b` | Active state |
| **Primary** | **Maroon** | **`#800000`** | **Aksen utama, tombol** |
| Primary-container | Maroon gelap | `#4d0000` | Background active |
| **Secondary** | **Ungu** | **`#a855f7`** | **Status warning, aksen kedua** |
| Secondary-container | Ungu gelap | `#581c87` | Background warning |
| Error | Merah | `#ef4444` | Error, status batal |
| On-surface | Putih | `#f4f4f5` | Teks utama |
| On-surface-variant | Abu terang | `#a1a1aa` | Teks sekunder |
| Outline | Abu sedang | `#3f3f46` | Border |
| Outline-variant | Abu gelap | `#27272a` | Border subtle |

---

## 🔤 Tipografi

| Style | Font | Penggunaan |
|-------|------|------------|
| **Semua** | **Sora** (400-700) | Heading, body, label — konsisten |

---

## 🧩 Komponen Kunci

### 1. Sidebar
- Fixed kiri, width 64, background `surface` (`#121214`)
- Border kanan `outline-variant`, rounded khas (DEFAULT: `1rem` / 16px)
- Logo: "Luxe Furnishings" (headline-md, maroon) + subtitle "Financial Hub"
- **Tombol "New Transaction"** di sidebar: full-width, rounded-full, bg maroon, white text, icon `add`
- Nav items: icon Material Symbols + label
  - Item **aktif**: bg `primary-container/20` + text `primary` + border-left `2px solid primary`
  - Item **non-aktif**: text `on-surface-variant` → hover text `primary` + bg `surface-container`
- Profile bawah: border-top, avatar circular + name + role label

### 2. Topbar (Header)
- Fixed top, sticky, bg `surface/80` + `backdrop-filter blur`
- **Search bar**: rounded-xl, border outline-variant, bg `surface-container-low`, icon search kiri
- Right side: icon notifications + help + divider + "Owner" label

### 3. Dashboard Header
- Judul: "Operational Dashboard" (headline-lg-mobile/md → headline-lg desktop)
- Subtitle: "Thursday, October 26"
- Tombol: "Quick Search" (outline) + "New Transaction" (filled maroon)

### 4. KPI Cards (3 cards)
- Background: `surface-container-lowest` (`#18181b`)
- Border: `outline-variant`
- **Rounded**: 24px (`rounded-[24px]`)
- **Shadow**: tonal shadow (`0 4px 16px rgba(0,0,0,0.4)`)
- Layout: flex column, justify-between, h-full
- Icon box: p-3, bg `primary-container/20`, border `primary/20`, rounded-xl, text primary
- Hover: border change color (card 1 & 3 → primary/30, card 2 → secondary/30)
- Value: display-lg (48px, bold)
- Label: text `on-surface-variant`, 14px

### 5. Pending Actions List (left panel)
- Container: lg:col-span-1, bg `surface-container-lowest`, rounded-3xl (24px), height 500px
- Judul: "Pending Actions"
- Action items: rounded-16px, border outline-variant, bg `surface`
- **Badge status**: "Awaiting Payment" (bg `secondary-container/20`, text secondary)
  - "HPP Input Needed" (bg `primary-container/20`, text primary)
- **Hover effect**: slight bg tint overlay (secondary/5 atau primary/5) + cursor pointer

### 6. Recent Transactions Table (right panel)
- Container: lg:col-span-2, bg `surface-container-lowest`, rounded-3xl (24px), height 500px
- Header: judul + link "View All" (maroon, hover glow)
- Table: full width, border-collapse
  - Header row: border-bottom `outline-variant`, text `on-surface-variant`
  - Body rows: border-bottom `surface-container`
  - Hover: bg `surface-container-low`, transition
- **Status badges**:
  - "Completed": bg `primary-container/20`, text primary, border primary/20
  - "Processing": bg `secondary-container/20`, text secondary, border secondary/20
  - "Awaiting Pay": bg `secondary-container/20`, text secondary, border secondary/20
- **Action**: chevron_right icon, opacity 0 → 100 on row hover

### 7. Efek Khas
- **Button press**: `scale(0.98)` on active, shadow hilang
- **Maroon glow hover**: `drop-shadow(0 0 8px rgba(128,0,0,0.6))` pada tombol primary
- **Tonal shadow 1**: `0 4px 16px rgba(0,0,0,0.4)` untuk card depth
- **Tonal shadow 2**: `0 8px 24px rgba(128,0,0,0.15)` untuk maroon hint shadow

---

## 📐 Spacing & Layout
- Sidebar width: `16rem` (64)
- Main content: `flex-1`, `md:ml-64`, `w-full md:w-[calc(100%-16rem)]`
- Container padding mobile: `16px` (p-4)
- Container padding desktop: `40px` (p-10)
- Section gap: `48px` (gap-12)
- Gutter: `24px` (gap-6)
- Card padding: `p-6` (24px)
- **Border radius**: DEFAULT `1rem` (16px), lg `1.5rem` (24px), xl `2rem` (32px), full `9999px`
- Container max-width: `1200px`, centered (mx-auto)