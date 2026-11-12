<div align="center">

<img src="docs/media/hero.svg" alt="Solar Eclipse 2026 — a 3D simulator of the 12 August 2026 total solar eclipse" width="100%">

<p>
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-GLSL%20globe-ffcc66?style=for-the-badge&labelColor=060407">
  <img alt="astronomy-engine" src="https://img.shields.io/badge/astronomy--engine-ephemeris-ff7b39?style=for-the-badge&labelColor=060407">
  <img alt="Besselian" src="https://img.shields.io/badge/Besselian-elements-e8e6ff?style=for-the-badge&labelColor=060407">
  <img alt="React" src="https://img.shields.io/badge/React-Vite-ffcc66?style=for-the-badge&labelColor=060407">
</p>

<p><em>Europe's first total solar eclipse in 27 years, simulated with real orbital mechanics.<br>
Watch the Moon's shadow cross the Arctic, Greenland, Iceland and Spain on 12 August 2026.</em></p>

</div>

<img src="docs/media/divider.svg" width="100%" alt="">

## What it is

Solar Eclipse 2026 follows the umbra and penumbra across the Earth second by second. Pick an observing station and you get its live solar altitude, obscuration, temperature drop and the exact length of totality, with the corona, the diamond ring and Baily's beads in a horizon view.

> **Every orbit and timing is computed.** The simulator uses Besselian elements, NASA/JPL DE440-based ephemeris and topocentric horizon transforms.

<img src="docs/media/divider.svg" width="100%" alt="">

## Features

| | |
|---|---|
| **3D Earth (WebGL)** | A custom GLSL shader with Rayleigh scattering, the day–night line and the projected umbra. |
| **Live sky view** | The Sun–Moon overlap at the station's horizon angle, with the diamond ring and Baily's beads. |
| **Corona and bloom** | A layered plasma corona that switches on above 95 % obscuration and at totality. |
| **Star catalogue** | The Summer Triangle, Venus, Jupiter, Mars and the Milky Way appear during totality. |
| **Shadow dynamics** | The shadow's ground speed in km/h and km/s, and the precise totality duration at your point. |
| **Micro-climate** | A temperature-drop chart from altitude, humidity and lost solar radiation. |
| **Time machine** | One-second resolution up to 60× speed, C1–C4 contact times and autoplay. |
| **Camera modes** | Free orbit, North Pole, top-down, and Iceland / Spain tracking. |
| **Telemetry export** | Download a station's contact times, GPS coordinates and durations as JSON. |

<img src="docs/media/divider.svg" width="100%" alt="">

## How it works

```mermaid
flowchart LR
  AE[astronomy-engine<br/>Sun · Moon positions] --> BE[Besselian elements]
  BE --> SH[Shadow path<br/>umbra · penumbra]
  SH --> G[Three.js globe · GLSL]
  ST[Selected station] --> TOPO[Topocentric transform]
  BE --> TOPO --> SKY[Sky view · corona · stars]
  TOPO --> TEL[Telemetry · charts · JSON export]
```

<img src="docs/media/divider.svg" width="100%" alt="">

## Türkçe özet

**Solar Eclipse 2026**, 12 Ağustos 2026'daki tam Güneş tutulmasının 3B simülatörü. Ay gölgesinin Kuzey Kutbu, Grönland, İzlanda ve İspanya üzerinden geçişini saniye saniye izleyebiliyorsun. Bir gözlem noktası seçince Güneş yüksekliği, örtünme yüzdesi, sıcaklık düşüşü ve tam tutulma süresi anlık hesaplanıyor; korona, elmas yüzük ve Baily boncukları gökyüzü görünümünde beliriyor. Hesaplar Besselian elemanları ve efemeris verisiyle yapılıyor.

<img src="docs/media/divider.svg" width="100%" alt="">

## Development

```sh
npm install
cp .env.example .env.local   # optional Gemini key for the AI guide
npm run dev                  # http://localhost:3000
npm run build
npm run lint                 # tsc --noEmit
```

```
src/components/   globe, sky view, panels, charts, timeline
src/utils/        Besselian maths, shadow path, topocentric transforms
src/data/         stations and eclipse elements
```

<div align="center">
<br>
<a href="https://github.com/kutluhangil"><img src="docs/media/signature.svg" width="100%" alt="Built by kutluhangil"></a>
<sub>Eclipse data after NASA GSFC · ephemeris by astronomy-engine. Never look at the Sun without proper eye protection.</sub>
</div>
