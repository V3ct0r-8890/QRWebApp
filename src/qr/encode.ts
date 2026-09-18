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
