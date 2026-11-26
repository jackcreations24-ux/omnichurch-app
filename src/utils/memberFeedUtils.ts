import { Announcement, Church, Language, Member, ServiceSession } from '../types';
import { isLegacyDemoService } from '../services/firestoreService';
import { isServiceCurrentlyActive } from './permissions';
import { isServiceEnded, isServiceMarkedDeleted } from './storage';

export function getServiceFeedTargetId(serviceId: string): string {
  const clean = (serviceId || '').trim();
  return clean.startsWith('srv-feed-') ? clean : `srv-feed-${clean}`;
}

export function stripServiceFeedPrefix(targetId: string): string {
  const clean = (targetId || '').trim();
  return clean.startsWith('srv-feed-') ? clean.slice('srv-feed-'.length) : clean;
}

export function isValidDisplayImageUrl(url?: string | null): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length < 4) return false;
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('blob:')
  );
}

/**
 * Resolves the service thumbnail / poster / cover URL from all web & mobile schema keys.
 */
export function resolveServiceThumbnailUrl(
  service?: Partial<ServiceSession> | Record<string, any> | null
): string | null {
  if (!service) return null;
  const candidates = [
    service.thumbnailUrl,
    service.posterUrl,
    service.imageUrl,
    service.coverUrl,
    service.bannerUrl,
    service.photoUrl,
  ];
  for (const candidate of candidates) {
    if (isValidDisplayImageUrl(candidate)) {
      return candidate.trim();
    }
  }
  return null;
}

/**
 * Resolves the profile avatar image URL of a church member across unified web/mobile fields.
 */
export function resolveMemberProfilePhoto(
  member?: Partial<Member> | Record<string, any> | null
): string | null {
  if (!member) return null;
  const candidates = [
    member.avatarUrl,
    member.photoUrl,
    member.googlePhoto,
    (member as any).avatar,
    (member as any).photo,
  ];
  for (const candidate of candidates) {
    if (isValidDisplayImageUrl(candidate)) {
      return candidate.trim();
    }
  }
  return null;
}

const HONORIFIC_PREFIX_REGEX =
  /^(?:past[eè]u?r?|pastor|past\.?|pstr\.?|fr[eè]r?e?|fr\.?|hno\.?|hermano|bro\.?|brother|s[eè]u?r?|s[oœ]u?r|sr\.?|hna\.?|hermana|sis\.?|sister|ev\.?|evan\.?|[eé]vang[eé]liste|evanjelis|r[eé]v\.?|reverend|reveran|dyak|diacre|di[aá]cono|deacon|ap[oô]tre|aposto?l|proph[eè]te?|pwof[eè]t|m\.?|mr\.?|mme\.?|mrs\.?|ms\.?|dr\.?)\s+/i;

export function stripHonorificPrefixes(rawName?: string | null): string {
  let clean = (rawName || '').trim().replace(/\s+/g, ' ');
  let guard = 0;
  while (guard < 3 && HONORIFIC_PREFIX_REGEX.test(clean)) {
    clean = clean.replace(HONORIFIC_PREFIX_REGEX, '').trim();
    guard += 1;
  }
  return clean;
}

export function normalizePersonNameForMatch(rawName?: string | null): string {
  const stripped = stripHonorificPrefixes(rawName);
  return stripped
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getPersonInitials(rawName?: string | null): string {
  const stripped = stripHonorificPrefixes(rawName) || (rawName || '').trim();
  if (!stripped) return 'OM';
  const words = stripped.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }
  return stripped.slice(0, 2).toUpperCase();
}

export interface ResolvedRoleAvatar {
  name: string;
  avatarUrl: string | null;
  initials: string;
  matchedMemberId?: string;
}

function splitRoleParticipantNames(roleValue: string): string[] {
  return roleValue
    .split(/\s*(?:,|&|\+|\/|\s+(?:ak|et|y|and)\s+)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function findMatchingMemberForName(
  segmentName: string,
  members: Member[]
): Member | undefined {
  const normSegment = normalizePersonNameForMatch(segmentName);
  if (!normSegment) return undefined;
  const segTokens = normSegment.split(' ').filter((t) => t.length >= 2);

  let bestPartial: Member | undefined;
  let bestScore = 0;

  for (const m of members) {
    if (!m || !m.fullName) continue;
    const normFull = normalizePersonNameForMatch(m.fullName);
    const normPrefixed = normalizePersonNameForMatch(
      `${m.titlePrefix ? `${m.titlePrefix} ` : ''}${m.fullName}`
    );

    if (normSegment === normFull || normSegment === normPrefixed) {
      return m;
    }

    if (normFull.length >= 4 && (normSegment.includes(normFull) || normFull.includes(normSegment))) {
      const score = Math.min(normSegment.length, normFull.length) + 20;
      if (score > bestScore) {
        bestScore = score;
        bestPartial = m;
      }
      continue;
    }

    if (segTokens.length >= 2) {
      const memberTokens = normFull.split(' ').filter((t) => t.length >= 2);
      if (memberTokens.length >= 2) {
        const overlapCount = segTokens.filter((t) => memberTokens.includes(t)).length;
        if (overlapCount >= 2 && overlapCount > bestScore) {
          bestScore = overlapCount;
          bestPartial = m;
        }
      }
    }
  }

  return bestPartial;
}

/**
 * Resolves profile avatar URLs & clean initials for any service role label
 * (Dirijan, Predikatè, Lektè, Mizisyen/Adoratè, Akèy) against church members & pastor.
 */
export function resolveMemberAvatarsForRole(
  roleValue?: string | null,
  members: Member[] = [],
  church?: Church | null,
  maxAvatars: number = 3
): ResolvedRoleAvatar[] {
  const cleanRaw = (roleValue || '').trim();
  if (!cleanRaw) return [];

  const segments = splitRoleParticipantNames(cleanRaw);
  const resolved: ResolvedRoleAvatar[] = [];
  const seenKeys = new Set<string>();

  const normPastor = church?.pastor ? normalizePersonNameForMatch(church.pastor) : '';
  const pastorAdminPhoto = isValidDisplayImageUrl(church?.adminGooglePhoto)
    ? church!.adminGooglePhoto!.trim()
    : null;

  for (const seg of segments) {
    if (resolved.length >= maxAvatars) break;
    const normSeg = normalizePersonNameForMatch(seg);
    const dedupKey = normSeg || seg.toLowerCase();
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);

    const matchedMember = findMatchingMemberForName(seg, members);
    let avatarUrl = resolveMemberProfilePhoto(matchedMember);

    if (!avatarUrl && pastorAdminPhoto && normPastor && normSeg) {
      if (
        normSeg === normPastor ||
        (normPastor.length >= 4 && (normSeg.includes(normPastor) || normPastor.includes(normSeg)))
      ) {
        avatarUrl = pastorAdminPhoto;
      }
    }

    const displayBaseName = matchedMember?.fullName || seg;
    resolved.push({
      name: seg,
      avatarUrl,
      initials: getPersonInitials(displayBaseName),
      matchedMemberId: matchedMember?.id || matchedMember?.memberId,
    });
  }

  if (resolved.length === 0) {
    resolved.push({
      name: cleanRaw,
      avatarUrl: null,
      initials: getPersonInitials(cleanRaw),
    });
  }

  return resolved;
}

function resolveFeedTimestampMs(value: any, fallback?: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value.toMillis === 'function') {
    try {
      return value.toMillis();
    } catch {}
  }
  if (value && typeof value.seconds === 'number') {
    return value.seconds * 1000;
  }
  const str = typeof value === 'string' ? value.trim() : '';
  if (str) {
    const parsed = Date.parse(str);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (fallback) {
    const fb = Date.parse(fallback.length === 10 ? `${fallback}T00:00:00` : fallback);
    if (!Number.isNaN(fb)) return fb;
  }
  return 0;
}

function getServiceSortDateTimeMs(service: ServiceSession): number {
  const datePart = (service.date || '').trim();
  const timePart = (service.startTime || '00:00').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const normalizedTime = /^\d{1,2}:\d{2}$/.test(timePart)
      ? `${timePart.padStart(5, '0')}:00`
      : '00:00:00';
    const parsed = Date.parse(`${datePart}T${normalizedTime}`);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return resolveFeedTimestampMs(service.createdAt, datePart);
}

/**
 * Resolves the canonical list of services to display in the Member Home Feed.
 * Announcements are intentionally excluded from the feed (they live exclusively
 * in the Notifications section, matching the native mobile app).
 */
export function getMemberFeedServices(
  services: ServiceSession[] = [],
  churchId?: string,
  churchCode?: string,
  categoryFilter: string = 'all'
): ServiceSession[] {
  const targetIdUpper = (churchId || '').trim().toUpperCase();
  const targetCodeUpper = (churchCode || '').trim().toUpperCase();
  const cleanFilter = (categoryFilter || 'all').trim();
  const seenIds = new Set<string>();

  const filtered = (services || []).filter((s) => {
    if (!s || typeof s.id !== 'string' || !s.id.trim()) return false;
    if (isLegacyDemoService(s) || isServiceMarkedDeleted(s.id)) return false;
    if (seenIds.has(s.id)) return false;

    if (targetIdUpper) {
      const sChurchUpper = (s.churchId || '').trim().toUpperCase();
      if (!sChurchUpper) return false;
      const matchesChurch =
        sChurchUpper === targetIdUpper ||
        Boolean(targetCodeUpper && sChurchUpper === targetCodeUpper);
      if (!matchesChurch) return false;
    }

    if (cleanFilter !== 'all' && s.category !== cleanFilter) {
      return false;
    }

    seenIds.add(s.id);
    return true;
  });

  return filtered.sort((a, b) => {
    const aLive = isServiceCurrentlyActive(a, isServiceEnded) ? 1 : 0;
    const bLive = isServiceCurrentlyActive(b, isServiceEnded) ? 1 : 0;
    if (aLive !== bLive) return bLive - aLive;

    const aEnded = isServiceEnded(a) ? 1 : 0;
    const bEnded = isServiceEnded(b) ? 1 : 0;
    if (aEnded !== bEnded) return aEnded - bEnded;

    const aDt = getServiceSortDateTimeMs(a);
    const bDt = getServiceSortDateTimeMs(b);

    // Upcoming services: soonest first; Ended services: most recent first
    if (aEnded === 0) {
      if (aDt !== bDt) return aDt - bDt;
    } else {
      if (aDt !== bDt) return bDt - aDt;
    }

    return (
      resolveFeedTimestampMs(b.createdAt, b.date) -
      resolveFeedTimestampMs(a.createdAt, a.date)
    );
  });
}

export function formatServiceCalendarBadge(
  dateStr: string | undefined,
  language: Language = 'ht'
): { month: string; day: string } {
  const clean = (dateStr || '').trim();
  const monthsByLang: Record<Language, string[]> = {
    ht: ['JAN', 'FEV', 'MAS', 'AVR', 'ME', 'JEN', 'JIY', 'OUT', 'SEP', 'OKT', 'NOV', 'DES'],
    fr: ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'],
    en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
    es: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'],
  };
  const months = monthsByLang[language] || monthsByLang.ht;

  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const monthIdx = Math.max(0, Math.min(11, parseInt(isoMatch[2], 10) - 1));
    return {
      month: months[monthIdx] || 'KILT',
      day: isoMatch[3],
    };
  }

  return {
    month: 'KILT',
    day: '★',
  };
}

export function formatServiceFullDateLabel(
  dateStr: string | undefined,
  language: Language = 'ht'
): string {
  const clean = (dateStr || '').trim();
  if (!clean) return '';

  const weekdaysByLang: Record<Language, string[]> = {
    ht: ['dimanch', 'lendi', 'madi', 'mèkredi', 'jedi', 'vandredi', 'samdi'],
    fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  };

  const monthsByLang: Record<Language, string[]> = {
    ht: ['janvye', 'fevriye', 'mas', 'avril', 'me', 'jen', 'jiyè', 'out', 'septanm', 'oktòb', 'novanm', 'desanm'],
    fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  };

  const weekdays = weekdaysByLang[language] || weekdaysByLang.ht;
  const months = monthsByLang[language] || monthsByLang.ht;

  let localDate: Date | null = null;
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const monthIdx = parseInt(isoMatch[2], 10) - 1;
    const dayNum = parseInt(isoMatch[3], 10);
    if (monthIdx >= 0 && monthIdx <= 11 && dayNum >= 1 && dayNum <= 31) {
      const candidate = new Date(year, monthIdx, dayNum);
      if (
        candidate.getFullYear() === year &&
        candidate.getMonth() === monthIdx &&
        candidate.getDate() === dayNum
      ) {
        localDate = candidate;
      }
    }
  } else {
    const parsedMs = Date.parse(clean);
    if (!Number.isNaN(parsedMs)) {
      localDate = new Date(parsedMs);
    }
  }

  if (!localDate) return clean;

  const weekday = weekdays[localDate.getDay()];
  const day = localDate.getDate();
  const monthName = months[localDate.getMonth()];
  const year = localDate.getFullYear();

  if (language === 'en') {
    return `${weekday}, ${monthName} ${day}, ${year}`;
  }
  if (language === 'es') {
    return `${weekday} ${day} de ${monthName} ${year}`;
  }
  return `${weekday} ${day} ${monthName} ${year}`;
}

export function formatServiceTimeAmPm(timeStr?: string): string {
  const clean = (timeStr || '').trim();
  if (!clean) return '';

  const already12h = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (already12h) {
    let h = parseInt(already12h[1], 10);
    const m = already12h[2];
    const period = already12h[3].toUpperCase();
    if (h === 0) h = 12;
    if (h > 12) h = h % 12 || 12;
    return `${h}:${m} ${period}`;
  }

  const match24 = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const hour24 = parseInt(match24[1], 10);
    const minute = match24[2];
    if (hour24 >= 0 && hour24 <= 23) {
      const period = hour24 >= 12 ? 'PM' : 'AM';
      const hour12 = hour24 % 12 || 12;
      return `${hour12}:${minute} ${period}`;
    }
  }

  return clean;
}

export function formatServiceTimeRangeAmPm(
  startTime?: string,
  endTime?: string,
  fallbackStart: string = ''
): string {
  const startFormatted = formatServiceTimeAmPm(startTime || fallbackStart);
  const endFormatted = formatServiceTimeAmPm(endTime);
  if (startFormatted && endFormatted) {
    return `${startFormatted} - ${endFormatted}`;
  }
  return startFormatted || endFormatted || '';
}

export function buildServiceShareText(
  service: ServiceSession,
  church: Church,
  language: Language = 'ht'
): string {
  const isEs = language === 'es';
  const isFr = language === 'fr';
  const isEn = language === 'en';

  const lines: string[] = [];
  if (service.theme) {
    lines.push(`${isEs ? 'Tema' : isFr ? 'Thème' : isEn ? 'Theme' : 'Tèm'}: ${service.theme}`);
  }
  if (service.passage) {
    lines.push(`${isEs ? 'Lectura' : isFr ? 'Lecture' : isEn ? 'Passage' : 'Pasaj'}: ${service.passage}`);
  }
  const leaderName = service.leader || service.preacherOrLeader;
  const preacherName = service.preacher || service.preacherOrLeader;
  if (leaderName) {
    lines.push(`${isEs ? 'Dirigente' : isFr ? 'Dirigeant' : isEn ? 'Leader' : 'Dirijan'}: ${leaderName}`);
  }
  if (preacherName && preacherName !== leaderName) {
    lines.push(`${isEs ? 'Predicador' : isFr ? 'Prédicateur' : isEn ? 'Preacher' : 'Predikatè'}: ${preacherName}`);
  }
  if (service.notes) {
    lines.push(service.notes);
  }
  if (lines.length === 0) {
    lines.push(
      isEs
        ? `Le invitamos a participar en el culto "${service.title}" en ${church.name}.`
        : isFr
        ? `Nous vous invitons à participer au culte « ${service.title} » à ${church.name}.`
        : isEn
        ? `Join us for "${service.title}" at ${church.name}.`
        : `Nou envite w patisipe nan sèvis "${service.title}" nan ${church.name}.`
    );
  }
  return lines.join('\n');
}

export function buildServiceShareAnnouncement(
  service: ServiceSession,
  church: Church,
  language: Language = 'ht'
): Announcement {
  const thumb = resolveServiceThumbnailUrl(service);
  return {
    id: getServiceFeedTargetId(service.id),
    churchId: church.id,
    title: service.title,
    content: buildServiceShareText(service, church, language),
    category: 'sevis',
    date: service.date,
    time: formatServiceTimeRangeAmPm(service.startTime, service.endTime, ''),
    author: service.preacherOrLeader || church.name,
    posterUrl: thumb,
    imageUrl: thumb,
    serviceId: service.id,
    leader: service.leader,
    preacher: service.preacher || service.preacherOrLeader,
    reader: service.reader,
    musicians: service.musicians,
    ushers: service.ushers,
    createdAt: service.createdAt,
  };
}
