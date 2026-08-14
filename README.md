<div align="center">

<br />

<img src="https://img.shields.io/badge/Status-Live-22c55e?style=for-the-badge&logoColor=white" alt="status" />
<img src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black" alt="react" />
<img src="https://img.shields.io/badge/TypeScript-5.8-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript" />
<img src="https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="tailwind" />
<img src="https://img.shields.io/badge/Three.js-WebGL-000000?style=for-the-badge&logo=three.js&logoColor=white" alt="threejs" />
<img src="https://img.shields.io/badge/Astronomy-Engine-f59e0b?style=for-the-badge&logo=nasa&logoColor=white" alt="astronomy" />

<br /><br />

```
███████╗ ██████╗ ██╗      █████╗ ██████╗     ███████╗ ██████╗██╗     ██╗██████╗ ███████╗███████╗
██╔════╝██╔═══██╗██║     ██╔══██╗██╔══██╗    ██╔════╝██╔════╝██║     ██║██╔══██╗██╔════╝██╔════╝
███████╗██║   ██║██║     ███████║██████╔╝    █████╗  ██║     ██║     ██║██████╔╝███████╗█████╗  
╚════██║██║   ██║██║     ██╔══██║██╔══██╗    ██╔══╝  ██║     ██║     ██║██╔═══╝ ╚════██║██╔══╝  
███████║╚██████╔╝███████╗██║  ██║██║  ██║    ███████╗╚██████╗███████╗██║██║     ███████║███████╗
╚══════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝    ╚══════╝ ╚═════╝╚══════╝╚═╝╚═╝     ╚══════╝╚══════╝
                                 2026 · TOTALITY
```

### **Solar Eclipse 2026** — 12 Ağustos 2026 Tam Güneş Tutulması 3D Simülatörü

**Bilimsel Besselian Yörüngesi** · 3D WebGL Küre · Gerçek Zamanlı Telemetri · Derin Yıldız Kataloğu · Gökyüzü & Korona Simülasyonu.

[🪐 Canlı Uygulama](https://ais-pre-2dfro2cy6argmvsnjb4fzi-124706156411.europe-west1.run.app) · [🛰️ NASA Eclipse Verileri](https://eclipse.gsfc.nasa.gov/) · [🔭 Astronomy Engine](https://github.com/cosinekitty/astronomy)

</div>

---

## ✦ Genel Bakış

**Solar Eclipse 2026**, 12 Ağustos 2026 tarihinde Kuzey Kutbu, Grönland, İzlanda ve İspanya üzerinden geçecek olan **Avrupa'nın son 27 yıldaki ilk tam güneş tutulmasını** yüksek hassasiyetli astrofiziksel hesaplamalar ve 3D WebGL görselleştirmesiyle sunan interaktif bir gözlem ve telemetri platformudur.

Kullanıcılar Dünya üzerindeki ay gölgesinin (umbra ve penumbra) saniyeler içindeki ilerleyişini izleyebilir, istedikleri gözlem istasyonunu seçerek anlık sıcaklık düşüşü, solar irtifa, örtünme yüzdesi, korona parlaması ve süpersonik gölge hızını gerçek zamanlı takip edebilir.

> **Tüm yörünge ve zamanlamalar bilimseldir.** Besselian elemanları, NASA/JPL DE440 efemeris verileri ve topomerkezî ufuk koordinat dönüşümleriyle çalışır.

---

## ⚡ Öne Çıkan Özellikler

| Özellik | Açıklama |
|--------|----------|
| 🌍 **3D Etkileşimli Dünya (WebGL)** | Özel GLSL shader ile modellenmiş atmosferik Rayleigh saçılması, gündüz/gece çizgisi ve ay umbra projeksiyonu. |
| 🌘 **Gerçek Zamanlı Gökyüzü Görünümü** | Seçilen istasyonun ufuk açısına göre Güneş-Ay çakışması, Elmas Yüzük (*Diamond Ring*) ve Baily Boncukları. |
| ✨ **Solar Korona & Bloom Efekti** | Umbra örtünmesi %95'i aştığında ve totality anında otomatik devreye giren çok katmanlı solar korona plazma ışıması. |
| 🌌 **Derinlik Eşlemeli Yıldız Kataloğu** | Totality anında gökyüzünde beliren Summer Triangle (Vega, Altair, Deneb), Venüs, Jüpiter, Mars ve Samanyolu galaktik diski. |
| ⚡ **Gölge Dinamikleri (Shadow Dynamics)** | Ay gölgesinin anlık yeryüzü süpersonik hızı (km/h & km/s) ve seçili noktanın kesin totality süresi. |
| 📉 **Mikro-İklim & Sıcaklık Düşüşü** | Tutulma süresince istasyon irtifası, nemi ve güneş radyasyon kaybına göre hesaplanan termal değişim grafiği. |
| ⏱️ **Zaman Makinesi & Scrubber** | 1 saniyelik çözünürlükten 60x hızlandırmaya kadar zaman kontrolü, C1-C4 temas anları ve otomatik oynatma. |
| 🧭 **Çoklu Kamera Modları** | Serbest Yörünge, Kuzey Kutbu Görünümü, Tepe Görünümü (Top-Down) ve İzlanda/İspanya odaklı takip. |
| 📊 **NASA Formatında Telemetri Dışa Aktarma** | Seçili istasyonun tüm temas zamanlarını, GPS koordinatlarını ve sürelerini JSON olarak indirme. |

---

## 🗂️ Veri ve Bilimsel Hesaplama Mimarisi

Tüm gök mekaniği ve yörünge modelleri NASA GSFC ve IAU standartlarına uygun astronomik algoritmalarla çalışır:

| Bileşen | Hesaplama Yöntemi | Kaynak / Standart |
|---------|-------------------|:---:|
| **Umbra & Penumbra Yolu** | Besselian Elements interpolasyonu & Geodezik küresel izdüşüm | NASA Eclipse Bulletins / Espenak & Meeus |
| **Güneş & Ay Konumları** | Toposentrik RA/Dec & Azimut/Yükseklik (Alt/Az) dönüşümü | IAU SOFA / Astronomy Engine |
| **Gölge Hızı (km/h)** | Diferansiyel küresel yay uzunluğu türevi ($\Delta s / \Delta t$) | Besselian Path Kinematics |
| **Atmosferik İndigo Filtresi** | Chappuis ozon emilimi & Rayleigh ışık kırılması shader'ı | Custom GLSL Fragment Shader |
| **Yıldız Kataloğu & Gezegenler** | J2000 koordinatları, V-mag parlaklık akısı ve spektral sınıf renkleri | Hipparcos & Yale Bright Star Catalog |

---

## 📊 Gözlem İstasyonları & Tutulma Süreleri

> İzlanda'dan Akdeniz'e uzanan kritik merkez hattı gözlem noktaları:

| İstasyon | Konum | Totality Başlangıcı (UTC) | Süre | Güneş Yüksekliği |
|----------|-------|:------------------------:|:----:|:----------------:|
| 🇮🇸 **Reykjavik** | 64.1466° N, 21.9426° W | 17:48:14 | **1 dk 46 sn** | 24.3° |
| 🇮🇸 **Snæfellsnes** | 64.8711° N, 23.8167° W | 17:46:58 | **2 dk 10 sn** | 24.0° |
| 🇪🇸 **A Coruña** | 43.3623° N, 8.4115° W | 18:27:36 | **1 dk 14 sn** | 10.6° |
| 🇪🇸 **Oviedo** | 43.3619° N, 5.8494° W | 18:28:12 | **1 dk 48 sn** | 10.2° |
| 🇪🇸 **Valladolid** | 41.6523° N, 4.7245° W | 18:29:45 | **1 dk 34 sn** | 8.1° |
| 🇪🇸 **Zaragoza** | 41.6488° N, 0.8891° W | 18:31:02 | **1 dk 25 sn** | 5.8° |
| 🇪🇸 **Palma de Mallorca** | 39.5696° N, 2.6502° E | 18:31:40 | **1 dk 36 sn** (Gün Batımı) | 1.8° |

---

## 🛠️ Teknoloji Yığını

```
Çatı         →  React 19 · Vite 6 · TypeScript 5.8
3D Grafik    →  Three.js (WebGL, Custom GLSL Shaders, BufferGeometry)
Astrofizik   →  Astronomy Engine · Geodesic Math · Besselian Polynomials
Stil         →  Tailwind CSS v4 · Lucide Icons · Motion
Grafikler    →  Recharts (Mikro-iklim termal eğrisi)
```

---

## 🔄 Nasıl Çalışıyor (Simülasyon Akışı)

```
                       ┌─ Besselian Track (Lat/Lon/Radius Interpolasyonu)
  Zaman Scrubber'ı ──▶ ├─ Toposentrik Güneş & Ay Koordinatları (Alt/Az)
  (17:00 - 19:30 UTC)  ├─ Yeryüzü Gölge Hızı (km/h) & İstasyon Mesafesi
                       └─ Güneş Işıması & Sıcaklık Düşüş Modeli
                                      │
                                      ▼
               ┌──────────────────────────────────────────────┐
               │              3D RENDER MOTORU                │
               │  • WebGL Dünya Küresi + İndigo Totality      │
               │  • Çok Katmanlı Yıldız & Gezegen Kataloğu    │
               │  • SkyViewPanel: Korona & Bloom Efekti       │
               │  • TelemetryPanel: Gölge Dinamikleri         │
               └──────────────────────────────────────────────┘
```

---

## 📐 Proje Yapısı

```
SolarEclipse2026/
├── src/
│   ├── components/
│   │   ├── Earth3D.tsx              # 3D WebGL Dünya, Gölge Shader'ı & Kamera Kontrolleri
│   │   ├── SkyViewPanel.tsx          # Toposentrik Gökyüzü, Korona & Elmas Yüzük Görünümü
│   │   ├── TelemetryPanel.tsx        # Canlı Telemetri, Gölge Dinamikleri & NASA JSON Export
│   │   ├── TemperatureDropChart.tsx  # Tutulma Termal Düşüş & Radyasyon Grafiği
│   │   ├── TimelineScrubber.tsx      # Hassas Zaman Kontrolü & C1-C4 Aşama Seçici
│   │   ├── HeaderClocks.tsx          # UTC / Yerel Zaman Saatleri & Durum Başlığı
│   │   ├── PathTimelinePanel.tsx     # Tutulma Yolu Durakları & İstasyon Seçici
│   │   └── AttributionModal.tsx      # Bilimsel Kaynaklar & Katkı Bilgisi
│   ├── data/
│   │   ├── eclipseData.ts            # Besselian Yörünge Noktaları & İstasyon Parametreleri
│   │   └── starCatalog.ts            # J2000 Yıldız Kataloğu, Gezegenler & Samanyolu Modeli
│   ├── utils/
│   │   └── astronomy.ts              # Gök Mekaniği, Hız Türevleri, Termal Modeller & Koordinat Dönüşümleri
│   ├── types.ts                      # Global TypeScript Tip Tanımları
│   ├── App.tsx                       # Ana Dashboard Düzeni & Durum Yönetimi
│   └── main.tsx                      # React Giriş Noktası
├── package.json
├── metadata.json
└── README.md
```

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- Node.js `>= 18`
- npm veya pnpm / yarn

```bash
# Projeyi klonlayın
git clone https://github.com/kutluhangil/SolarEclipse2026.git
cd SolarEclipse2026

# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev        # http://localhost:3000

# Tip kontrolü / Lint
npm run lint

# Üretim için derleyin
npm run build
```

---

## 🌌 Bilimsel Doğruluk & Kaynaklar

- **NASA Goddard Space Flight Center**: Eclipse Bulletins & Besselian Elements (Fred Espenak & Jean Meeus).
- **IAU SOFA (Standards of Fundamental Astronomy)**: Gök koordinat sistemleri ve presesyon-nütasyon modelleri.
- **Astronomy Engine**: Yüksek hassasiyetli analitik efemeris motoru.

---

<div align="center">

Gökbilim meraklıları ve araştırmacılar için ❤️ ile tasarlandı · **[kutluhangil](https://github.com/kutluhangil)**

<br />

*Faydalı bulduysan bir ⭐ bırakmayı unutma.*

</div>
