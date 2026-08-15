/**
 * Solar Eclipse 2026 — ICS Calendar Export Utility
 * Generates a .ics file for importing eclipse contact times into any calendar app.
 */

import { ObservationStation } from '../types';

function toICSDateTime(secondsSinceMidnight: number): string {
  const base = new Date('2026-08-12T00:00:00Z');
  base.setUTCSeconds(Math.round(secondsSinceMidnight));
  const Y = base.getUTCFullYear();
  const M = String(base.getUTCMonth() + 1).padStart(2, '0');
  const D = String(base.getUTCDate()).padStart(2, '0');
  const h = String(base.getUTCHours()).padStart(2, '0');
  const m = String(base.getUTCMinutes()).padStart(2, '0');
  const s = String(base.getUTCSeconds()).padStart(2, '0');
  return `${Y}${M}${D}T${h}${m}${s}Z`;
}

function parseTimeString(hms: string): number {
  const parts = hms.split(':').map(Number);
  return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
}

function icsEscape(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function generateUID(stationId: string, suffix: string): string {
  return `eclipse2026-${stationId}-${suffix}@solareclipse.app`;
}

interface ICSEvent {
  uid: string;
  summary: string;
  description: string;
  dtstart: string;
  dtend: string;
  location: string;
  reminder: number;
}

function buildEvent(event: ICSEvent): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${event.dtstart}`,
    `DTEND:${event.dtend}`,
    `SUMMARY:${icsEscape(event.summary)}`,
    `DESCRIPTION:${icsEscape(event.description)}`,
    `LOCATION:${icsEscape(event.location)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${icsEscape(event.summary)}`,
    `TRIGGER:-PT${event.reminder}M`,
    'END:VALARM',
    'END:VEVENT'
  ].join('\r\n');
}

export function downloadEclipseCalendar(station: ObservationStation): void {
  const et = station.eclipseTimes;
  const loc = `${station.name}, ${station.country} (${station.coords.lat.toFixed(4)}, ${station.coords.lon.toFixed(4)})`;

  const c1s = parseTimeString(et.startPartial);
  const c2s = parseTimeString(et.startTotality);
  const maxs = parseTimeString(et.peakTotality);
  const c3s = parseTimeString(et.endTotality);
  const c4s = parseTimeString(et.endPartial);
  const durationMin = Math.round(et.durationSeconds / 60);

  const events: ICSEvent[] = [
    {
      uid: generateUID(station.id, 'c1'),
      summary: `☀️ C1 — Eclipse Begins (Partial) at ${station.name}`,
      description: `First contact: the Moon begins crossing the Sun. Get solar filters ready!\\n\\nStation: ${station.name}\\nCoords: ${station.coords.lat.toFixed(4)}, ${station.coords.lon.toFixed(4)}`,
      dtstart: toICSDateTime(c1s),
      dtend: toICSDateTime(c1s + 300),
      location: loc,
      reminder: 60,
    },
    {
      uid: generateUID(station.id, 'c2'),
      summary: `💍 C2 — TOTALITY BEGINS — Diamond Ring at ${station.name}`,
      description: `Second contact: totality begins! Remove solar filters NOW.\\n\\nTotality duration: ${durationMin}m ${et.durationSeconds % 60}s`,
      dtstart: toICSDateTime(c2s),
      dtend: toICSDateTime(c2s + 60),
      location: loc,
      reminder: 30,
    },
    {
      uid: generateUID(station.id, 'max'),
      summary: `🌑 MAXIMUM TOTALITY at ${station.name}`,
      description: `Peak of total eclipse. Corona fully visible. Look for stars and planets!\\n\\nSun altitude: ${station.maxSunAltitude.toFixed(1)}°`,
      dtstart: toICSDateTime(maxs),
      dtend: toICSDateTime(maxs + 60),
      location: loc,
      reminder: 0,
    },
    {
      uid: generateUID(station.id, 'c3'),
      summary: `💍 C3 — Totality Ends at ${station.name}`,
      description: `Third contact: totality ends. REPLACE solar filters immediately!`,
      dtstart: toICSDateTime(c3s),
      dtend: toICSDateTime(c3s + 60),
      location: loc,
      reminder: 0,
    },
    {
      uid: generateUID(station.id, 'c4'),
      summary: `☀️ C4 — Eclipse Ends at ${station.name}`,
      description: `Fourth contact: eclipse complete. Total duration: ${Math.round((c4s - c1s) / 60)} minutes.`,
      dtstart: toICSDateTime(c4s),
      dtend: toICSDateTime(c4s + 300),
      location: loc,
      reminder: 0,
    },
  ];

  const calendarLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SolarEclipse 2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Solar Eclipse 2026 — ${station.name}`,
    'X-WR-CALDESC:Total Solar Eclipse August 12 2026 contact times',
    'X-WR-TIMEZONE:UTC',
    ...events.map(buildEvent),
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([calendarLines], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eclipse2026-${station.id.replace(/[^a-z0-9]/gi, '-')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
