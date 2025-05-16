# k6 recipes

Project ini menggunakan [k6](https://k6.io/) untuk melakukan load testing pada endpoint API dengan enam skenario: Shared Iteration & Per-VU Iteration, Ramping VUs & Constant VUs, Constant Arrival Rate & Ramping Arrival Rate

## 1. Install k6

```bash
# Mac (Homebrew)
brew install k6

# Debian/Ubuntu
sudo apt install k6

# Windows (via Chocolatey)
choco install k6
Atau download langsung dari: https://github.com/grafana/k6/releases
```

## 2. 📂 Struktur Proyek

```bash
├── load1.js     # 100 VUs - Shared Iteration & Per-VU Iteration
├── load2.js     # 100 VUs - Ramping VUs & Constant VUs
├── load3.js     # 100 VUs - Constant Arrival Rate & Ramping Arrival Rate
├── README.md    # Dokumentasi
```

## 3. Connect to Grafana
```bash
- visit https://grafana.com/
- k6 cloud login --token 7466066db477347523ccde1b3c407ab8cd3009f50fb478f29c6af210172xxxxx
- input project id
```

## 4. 🚀 Cara Menjalankan

Pastikan k6 sudah terinstal:
```bash
k6 cloud load1.js # run in cloud & see result in cloud
k6 run --out cloud load2.js # run in local & see result in cloud
k6 cloud load3.js # run in cloud & see result in cloud
```
