/**
 * i18n Localization Engine for Solar Eclipse 2026 Tracker
 * Supported Languages: TR (Türkçe), EN (English), ES (Español), IS (Íslenska)
 */

export type SupportedLanguage = 'TR' | 'EN' | 'ES' | 'IS';

export interface Translations {
  appName: string;
  appSubtitle: string;
  solarOracle: string;
  sound: string;
  soundOn: string;
  screenshot: string;
  saved: string;
  viewfinder: string;
  travelPlanner: string;
  photoGuide: string;
  certificate: string;
  language: string;
  station: string;
  telemetry: string;
  skyView: string;
  timeline: string;
  obscuration: string;
  sunAltitude: string;
  phase: string;
  totalityDuration: string;
  distanceToUmbra: string;
  timeToNextPhase: string;
  play: string;
  pause: string;
  resetCamera: string;
  autoTracking: string;
  manualTracking: string;
  spainFixed: string;
  clearSkyProb: string;
  cloudCover: string;
  tempDrop: string;
  cloudRisk: string;
  cumulusDissipation: string;
  microclimate: string;
  downloadData: string;
  settings: string;
  layers: string;
  starCatalog: string;
  moon3D: string;
  shadowCones: string;
  clouds3D: string;
  sun3D: string;
  indigoFilter: string;
  pathOfTotality: string;
  milestones: string;
  selectStation: string;
}

const DICTIONARY: Record<SupportedLanguage, Translations> = {
  TR: {
    appName: "Solar Eclipse 2026",
    appSubtitle: "Tam Güneş Tutulması Simülatörü & Çevre Analizörü",
    solarOracle: "Solar Oracle",
    sound: "Ses",
    soundOn: "Ses Açık",
    screenshot: "Ekran Görüntüsü",
    saved: "Kaydedildi!",
    viewfinder: "Teleskop Görünümü",
    travelPlanner: "Seyahat Planlayıcı",
    photoGuide: "Fotoğraf Rehberi",
    certificate: "Gözlem Sertifikası",
    language: "Dil",
    station: "Gözlem İstasyonu",
    telemetry: "Telemetri",
    skyView: "Gökyüzü Görünümü",
    timeline: "Zaman Çizelgesi",
    obscuration: "Güneş Örtünmesi",
    sunAltitude: "Güneş Açısı",
    phase: "Tutulma Evresi",
    totalityDuration: "Tam Tutulma Süresi",
    distanceToUmbra: "Tam Gölge Merkezine Mesafe",
    timeToNextPhase: "Sonraki Evreye Kalan",
    play: "Oynat",
    pause: "Duraklat",
    resetCamera: "Kamerayı Sıfırla",
    autoTracking: "Otomatik Takip",
    manualTracking: "Manuel Kontrol",
    spainFixed: "İspanya Görünümü",
    clearSkyProb: "Açık Gökyüzü Olasılığı",
    cloudCover: "Tahmini Bulutluluk",
    tempDrop: "Sıcaklık Düşüşü",
    cloudRisk: "Bulut Riski",
    cumulusDissipation: "Kümülüs Dağılma Etkisi",
    microclimate: "Mikroklima Analizi",
    downloadData: "Verileri İndir (JSON)",
    settings: "Ayarlar",
    layers: "Katmanlar",
    starCatalog: "Gerçekçi Yıldız Kataloğu",
    moon3D: "3D Ay Modeli",
    shadowCones: "3D Gölge Konileri",
    clouds3D: "3D Atmosferik Bulutlar",
    sun3D: "3D Güneş & Korona",
    indigoFilter: "Derin İndigo Tutulma Filtresi",
    pathOfTotality: "Tam Tutulma Hattı",
    milestones: "Tutulma KİLOMETRE TAŞLARI",
    selectStation: "Gözlem İstasyonu Seçin",
  },
  EN: {
    appName: "Solar Eclipse 2026",
    appSubtitle: "Total Solar Eclipse Simulator & Environmental Visualizer",
    solarOracle: "Solar Oracle",
    sound: "Sound",
    soundOn: "Sound On",
    screenshot: "Screenshot",
    saved: "Saved!",
    viewfinder: "Telescope View",
    travelPlanner: "Travel Planner",
    photoGuide: "Photo Guide",
    certificate: "Pass Certificate",
    language: "Language",
    station: "Observation Station",
    telemetry: "Telemetry",
    skyView: "Sky View",
    timeline: "Timeline",
    obscuration: "Solar Obscuration",
    sunAltitude: "Sun Altitude",
    phase: "Eclipse Phase",
    totalityDuration: "Totality Duration",
    distanceToUmbra: "Distance to Umbra Centerline",
    timeToNextPhase: "Time to Next Phase",
    play: "Play",
    pause: "Pause",
    resetCamera: "Reset Camera",
    autoTracking: "Auto Tracking",
    manualTracking: "Manual Orbit",
    spainFixed: "Spain Fixed View",
    clearSkyProb: "Clear Sky Probability",
    cloudCover: "Estimated Cloud Cover",
    tempDrop: "Temperature Drop",
    cloudRisk: "Cloud Risk Profile",
    cumulusDissipation: "Cumulus Dissipation Effect",
    microclimate: "Microclimate Analysis",
    downloadData: "Download Telemetry (JSON)",
    settings: "Settings",
    layers: "Layers",
    starCatalog: "Realistic Star Catalog",
    moon3D: "3D Moon Object",
    shadowCones: "3D Shadow Cones",
    clouds3D: "3D Atmospheric Clouds",
    sun3D: "3D Sun & Corona",
    indigoFilter: "Deep Indigo Totality Filter",
    pathOfTotality: "Path of Totality",
    milestones: "ECLIPSE MILESTONES",
    selectStation: "Select Observation Station",
  },
  ES: {
    appName: "Eclipse Solar 2026",
    appSubtitle: "Simulador de Eclipse Total de Sol y Visualizador Ambiental",
    solarOracle: "Solar Oracle AI",
    sound: "Sonido",
    soundOn: "Sonido Activo",
    screenshot: "Captura",
    saved: "¡Guardado!",
    viewfinder: "Vista Telescópica",
    travelPlanner: "Planificador de Viaje",
    photoGuide: "Guía Fotográfica",
    certificate: "Certificado",
    language: "Idioma",
    station: "Estación de Observación",
    telemetry: "Telemetría",
    skyView: "Vista del Cielo",
    timeline: "Línea de Tiempo",
    obscuration: "Oscurecimiento Solar",
    sunAltitude: "Altitud del Sol",
    phase: "Fase del Eclipse",
    totalityDuration: "Duración de la Totalidad",
    distanceToUmbra: "Distancia al Centro de la Sombra",
    timeToNextPhase: "Tiempo hasta la Siguiente Fase",
    play: "Reproducir",
    pause: "Pausar",
    resetCamera: "Reiniciar Cámara",
    autoTracking: "Seguimiento Automático",
    manualTracking: "Control Manual",
    spainFixed: "Vista Fija de España",
    clearSkyProb: "Probabilidad de Cielos Despejados",
    cloudCover: "Cobertura de Nubes Estimada",
    tempDrop: "Caída de Temperatura",
    cloudRisk: "Perfil de Riesgo de Nubes",
    cumulusDissipation: "Efecto de Disipación de Cúmulos",
    microclimate: "Análisis Microclimático",
    downloadData: "Descargar Datos (JSON)",
    settings: "Ajustes",
    layers: "Capas",
    starCatalog: "Catálogo Estelar Realista",
    moon3D: "Objeto Luna 3D",
    shadowCones: "Conos de Sombra 3D",
    clouds3D: "Nubes Atmosféricas 3D",
    sun3D: "Sol y Corona 3D",
    indigoFilter: "Filtro Índigo de Totalidad",
    pathOfTotality: "Franja de Totalidad",
    milestones: "HITOS DEL ECLIPSE",
    selectStation: "Seleccionar Estación de Observación",
  },
  IS: {
    appName: "Sólmyrkvi 2026",
    appSubtitle: "Almyrkvi Á Sól Líkan & Umhverfisgreining",
    solarOracle: "Solar Oracle AI",
    sound: "Hljóð",
    soundOn: "Hljóð Á",
    screenshot: "Skjámynd",
    saved: "Vistað!",
    viewfinder: "Sjónauka Útsýni",
    travelPlanner: "Ferðaáætlun",
    photoGuide: "Ljósmyndaleðbeiningar",
    certificate: "Skoðunarskírteini",
    language: "Tungumál",
    station: "Athugunarstöð",
    telemetry: "Fjarmælingar",
    skyView: "Himinútsýni",
    timeline: "Tímalína",
    obscuration: "Sólarskygging",
    sunAltitude: "Hæð Sólar",
    phase: "Stig Myrkva",
    totalityDuration: "Lengd Almyrkva",
    distanceToUmbra: "Fjarlægð að Skuggamiðju",
    timeToNextPhase: "Tími til Næsta Stigs",
    play: "Spila",
    pause: "Gera Hlé",
    resetCamera: "Endurstilla Myndavél",
    autoTracking: "Sjálfvirk Rakning",
    manualTracking: "Handvirk Stjórn",
    spainFixed: "Spánn Föst Sýn",
    clearSkyProb: "Líkur á Heiðskíru",
    cloudCover: "Áætluð Skýjahula",
    tempDrop: "Hitastigsfall",
    cloudRisk: "Skýjaáhætta",
    cumulusDissipation: "Skýjaeyðingaráhrif",
    microclimate: "Lokahiti & Loftslag",
    downloadData: "Sækja Gögn (JSON)",
    settings: "Stillingar",
    layers: "Lög",
    starCatalog: "Stjörnuskrá",
    moon3D: "3D Túngl Líkan",
    shadowCones: "3D Skuggakeilur",
    clouds3D: "3D Skýjalag",
    sun3D: "3D Sól & Kóróna",
    indigoFilter: "Myrkva Sía",
    pathOfTotality: "Slóð Almyrkva",
    milestones: "VARÐA SÓLMYRKVA",
    selectStation: "Veldu Athugunarstöð",
  }
};

let currentLang: SupportedLanguage = 'TR';
const listeners: Set<(lang: SupportedLanguage) => void> = new Set();

export function getLanguage(): SupportedLanguage {
  return currentLang;
}

export function setLanguage(lang: SupportedLanguage): void {
  currentLang = lang;
  listeners.forEach(fn => fn(lang));
}

export function subscribeLanguage(fn: (lang: SupportedLanguage) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(key: keyof Translations): string {
  return DICTIONARY[currentLang][key] || DICTIONARY['EN'][key] || key;
}
