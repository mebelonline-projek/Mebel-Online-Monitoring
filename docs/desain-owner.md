# 🎨 Referensi Desain — Dashboard Owner

> **Sumber:** `kode/owner` — Neon Tokyo Furniture | Financial Console
> **Tema:** Cyber/Neon Futuristic
> **Target:** Owner/Pemilik Toko (butuh big picture keuangan)

---

## 🎯 Palet Warna

| Token | Warna | Hex | Penggunaan |
|-------|-------|-----|------------|
| Background | Hitam kebiruan | `#0a0a12` | Latar belakang utama |
| Surface | Hitam lebih terang | `#0f0f1a` | Sidebar, container |
| Surface-container | Ungu gelap | `#141422` | Panel cards |
| Surface-container-high | Ungu sedang | `#1e1e30` | Hover state |
| Surface-container-highest | Ungu terang | `#28283e` | Active state |
| **Primary** | **Maroon** | **`#800000`** | **Aksen utama, neon glow** |
| Primary-container | Maroon gelap | `#690005` | Background tombol active |
| **Secondary** | **Cyan** | **`#00ffcc`** | **Tren positif, profit line** |
| **Tertiary** | **Kuning** | **`#ffe04a`** | **Status DP, warning** |
| **Error** | **Merah** | **`#ff4444`** | **Tren negatif, status batal** |
| On-surface | Putih keunguan | `#e8e0f0` | Teks utama |
| On-surface-variant | Ungu abu | `#a098b0` | Teks sekunder |
| Outline | Ungu medium | `#5a5068` | Border |
| Outline-variant | Ungu gelap | `#302840` | Border subtle |

---

## 🔤 Tipografi

| Style | Font | Penggunaan |
|-------|------|------------|
| **Display/Headline** | **Sora** (700-800) | Judul besar, KPI numbers |
| **Body** | **Inter** (400-500) | Teks isi, tabel |
| **Label** | **Space Grotesk** (500-700) | Tombol, badge, label kecil |

---

## 🧩 Komponen Kunci

### 1. Sidebar
- Fixed kiri, width 64, background `surface-container-low` (`#111118`)
- Border kanan `outline-variant/30`
- Logo: "Neon Tokyo Furniture" + subtitle "Financial Console" (font-headline, maroon)
- Nav items: icon Material Symbols + label, hover state → bg `surface-container-highest` + text `primary`
- Item aktif: bg `primary-container/20` + border-right `4px solid primary`
- Profile bawah: border-top subtle, avatar circular border maroon

### 2. KPI Cards (4 cards)
- **Glass panel**: background `rgba(20, 20, 34, 0.7)` + `backdrop-filter: blur(12px)`
- **Neon border**: `1px solid rgba(128,0,0,0.4)` + `hover: 0 0 16px rgba(128,0,0,0.3)`
- **Layout**: flex column, justify-between, height 160px (h-40)
- **Content**: label uppercase (10px, spacing wide), value (2xl, bold), icon box bg `primary/10`
- **Sparkline**: SVG path + trend % (cyan untuk naik `trending_up`, merah untuk turun `trending_down`)
- **Hover**: translateY(-4px), durasi 300ms

### 3. Chart Section
- Glass panel container dengan background decoration blur
- Filter tabs: DAILY | WEEKLY | **MONTHLY** | YEARLY (tab active: `bg-primary-container`)
- SVG chart dengan:
  - Grid lines horizontal (outline-variant/10)
  - **Revenue area**: maroon gradient fill + line glow (stroke-width 4, filter glow)
  - **Profit line**: cyan dashed (stroke-dasharray 8,4)
  - **Tooltip marker**: vertical line + dot glow (`shadow 0 0 12px #800000`)
  - **Tooltip box**: glass panel kecil, label "SEP 2024", Revenue (maroon), Profit (cyan)
- X-axis labels: Jan, Mar, May, Jul, Sep, Nov

### 4. Recent Transactions Table
- Header: flex row, judul "Recent Transactions" + link "VIEW ALL HISTORY"
- Table header: bg `surface-container-high/50`, uppercase, 10px, tracking-wide
- Table rows: hover `bg-primary/5`, divide border subtle
- **Customer cell**: avatar circle dengan inisial (bg `surface-container-highest`) + nama + ID
- **Status badges**:
  - **Lunas**: bg `secondary/10` + text `secondary` + dot cyan glowing
  - **DP**: bg `tertiary/10` + text `tertiary` + dot yellow glowing
  - **Batal**: bg `error/10` + text `error` + dot red glowing
- **Action**: tombol `more_vert` icon (rounded, bg `surface-container-high`)
- Footer: "Showing X of Y entries" + pagination numbers

### 5. Efek Khas
- **Neon glow primary**: `text-shadow: 0 0 10px rgba(128,0,0,0.8)` untuk judul "Financial Hub"
- **Scan line**: `linear-gradient` overlay dengan stripe transparan/maroon 50% 50%
- **Scrollbar custom**: thin (6px), thumb ungu gelap, hover jadi maroon
- **Selection color**: bg maroon, text white

---

## 📐 Spacing & Layout
- Sidebar width: `16rem` (64)
- Main padding: `pt-24 px-8 pb-12` (top 96px karena topbar fixed)
- Topbar height: `h-16` (64px), fixed top, `w-[calc(100%-16rem)]`
- Card gap: `gap-6`
- Container max-width: tidak dibatasi (full width)
- Border radius: default `0.125rem`, lg `0.25rem`, xl `0.5rem`, full `0.75rem`