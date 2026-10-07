# N-STEP — Smart Saving Planner

Website N-STEP untuk perencanaan target tabungan berbasis pola dan barisan aritmetika.

## Struktur

- `index.html` — halaman utama
- `style.css` — tampilan website laptop/desktop
- `script.js` — logika aplikasi dan penyimpanan lokal
- `assets/nami/` — aset maskot Nemi

## Fitur utama

- Login pengguna lokal
- Target tabungan
- Rencana menabung
- Steady Saver, Growing Saver, dan Step-Up Schedule
- Jadwal menabung dan pencatatan tabungan aktual
- Progress dan riwayat
- Laporan
- Kalkulator pola aritmetika
- Pembuktian induksi sederhana
- Ahli Waris sebagai catatan perencanaan pribadi
- Dark Web sebagai simulasi Security Center
- Pencarian halaman/target
- Format nominal Rupiah otomatis

## Rumus inti

Jumlah langkah:

`n = floor((tanggal akhir - tanggal mulai) / interval) + 1`

Barisan aritmetika:

`a_n = a + (n - 1)d`

Jumlah n langkah:

`S_n = n/2 [2a + (n - 1)d]`

Progress:

`progress = min((tabungan aktual / target) × 100, 100)`

Sisa target:

`remaining = max(target - tabungan aktual, 0)`

## GitHub Pages

1. Buat repository GitHub baru.
2. Upload **isi folder `N-STEP-v2-plus`**, bukan folder ZIP-nya.
3. Pastikan `index.html` berada di folder utama repository.
4. Buka **Settings → Pages**.
5. Pada **Build and deployment**, pilih **Deploy from a branch**.
6. Pilih branch `main` dan folder `/ (root)`.
7. Simpan dan tunggu GitHub Pages menerbitkan website.

Website ini tidak membutuhkan server/backend. Data pengguna disimpan di `localStorage` browser masing-masing.
