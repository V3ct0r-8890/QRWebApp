/**
 * Payload builders for each QR type this app supports.
 *
 * These produce the exact string that gets encoded into the QR matrix.
 * Correctness here matters more than anywhere else in the app: a QR that
 * *renders* but decodes to the wrong string is a silent failure a user only
 * discovers when someone scans their business card and gets garbage.
 */

export type WifiEncryption = 'WPA' | 'WEP' | 'nopass';

export interface WifiFields {
  ssid: string;
  password: string;
  encryption: WifiEncryption;
  hidden: boolean;
}

export interface VCardFields {
  fullName: string;
  org?: string;
  title?: string;
  phone?: string;
  email?: string;
  url?: string;
  address?: string;
  note?: string;
}

/** Escapes a value for the WIFI: QR convention: backslash, semicolon, comma, colon. */
function escapeWifiValue(value: string): string {
  return value.replace(/([\\;,:])/g, '\\$1');
}

/** Escapes a value per RFC 6350 (vCard): backslash, comma, semicolon, newline. */
function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export interface EmailFields {
  to: string;
  subject?: string;
  body?: string;
}

export interface SmsFields {
  phone: string;
  message?: string;
}

export interface GeoFields {
  lat: string;
  lon: string;
}

export interface EventFields {
  title: string;
  /** `datetime-local` input value, e.g. "2026-01-01T10:00". */
  start: string;
  /** `datetime-local` input value, same format as `start`. */
  end: string;
  location?: string;
}

export interface WhatsAppFields {
  phone: string;
  message?: string;
}

export function buildUrlPayload(url: string): string {
  const trimmed = url.trim();
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    // No scheme given — assume https, since that's what every phone camera expects.
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function buildTextPayload(text: string): string {
  return text;
}

export function buildWifiPayload(fields: WifiFields): string {
  const t = fields.encryption === 'nopass' ? 'nopass' : fields.encryption;
  const s = escapeWifiValue(fields.ssid);
  const p = fields.encryption === 'nopass' ? '' : escapeWifiValue(fields.password);
  const h = fields.hidden ? 'true' : 'false';
  return `WIFI:T:${t};S:${s};P:${p};H:${h};;`;
}

export function buildVCardPayload(fields: VCardFields): string {
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];
  lines.push(`N:;${escapeVCardValue(fields.fullName)};;;`);
  lines.push(`FN:${escapeVCardValue(fields.fullName)}`);
  if (fields.org) lines.push(`ORG:${escapeVCardValue(fields.org)}`);
  if (fields.title) lines.push(`TITLE:${escapeVCardValue(fields.title)}`);
  if (fields.phone) lines.push(`TEL;TYPE=CELL:${escapeVCardValue(fields.phone)}`);
  if (fields.email) lines.push(`EMAIL:${escapeVCardValue(fields.email)}`);
  if (fields.url) lines.push(`URL:${escapeVCardValue(fields.url)}`);
  if (fields.address) lines.push(`ADR:;;${escapeVCardValue(fields.address)};;;;`);
  if (fields.note) lines.push(`NOTE:${escapeVCardValue(fields.note)}`);
  lines.push('END:VCARD');
  // RFC 6350 specifies CRLF line endings; most camera-app parsers tolerate
  // bare \n, but CRLF is what makes it spec-correct.
  return lines.join('\r\n');
}

export function buildEmailPayload(fields: EmailFields): string {
  const params = new URLSearchParams();
  if (fields.subject) params.set('subject', fields.subject);
  if (fields.body) params.set('body', fields.body);
  const query = params.toString();
  return `mailto:${fields.to.trim()}${query ? `?${query}` : ''}`;
}

/** Strips everything but a leading `+` and digits — the only characters valid in a `tel:`/`sms:` URI. */
function sanitizePhone(phone: string): string {
  return phone.trim().replace(/(?!^\+)[^\d]/g, '');
}

export function buildPhonePayload(phone: string): string {
  return `tel:${sanitizePhone(phone)}`;
}

export function buildSmsPayload(fields: SmsFields): string {
  // RFC 5724 form, understood by both iOS and Android camera apps.
  const query = fields.message ? `?body=${encodeURIComponent(fields.message)}` : '';
  return `sms:${sanitizePhone(fields.phone)}${query}`;
}

export function buildGeoPayload(fields: GeoFields): string {
  return `geo:${fields.lat.trim()},${fields.lon.trim()}`;
}

/** Converts a `datetime-local` input value ("2026-01-01T10:00") to iCalendar's `YYYYMMDDTHHMMSS` local-time form. */
function toIcsDateTime(value: string): string {
  return value.replace(/[-:]/g, '').replace(/^(\d{8})T(\d{4})$/, '$1T$200');
}

export function buildEventPayload(fields: EventFields): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `SUMMARY:${escapeVCardValue(fields.title)}`,
    `DTSTART:${toIcsDateTime(fields.start)}`,
    `DTEND:${toIcsDateTime(fields.end)}`,
  ];
  if (fields.location) lines.push(`LOCATION:${escapeVCardValue(fields.location)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export function buildWhatsAppPayload(fields: WhatsAppFields): string {
  const digits = sanitizePhone(fields.phone).replace(/^\+/, '');
  const query = fields.message ? `?text=${encodeURIComponent(fields.message)}` : '';
  return `https://wa.me/${digits}${query}`;
}
