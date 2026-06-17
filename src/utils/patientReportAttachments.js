import { supabase } from '../supabaseClient';

const BUCKET = 'patient-reports';

function guessKind(name) {
  const n = (name || '').toLowerCase();
  if (/\.(mp4|mov|mkv)$/.test(n)) return 'video';
  if (/\.(m4a|mp3|wav|aac|ogg)$/.test(n) || n.includes('voice')) return 'audio';
  if (/\.webm$/.test(n)) return n.includes('voice') ? 'audio' : 'video';
  if (/\.(jpg|jpeg|png|gif|webp|heic)$/.test(n)) return 'image';
  return 'file';
}

/** Human-readable label — storage paths use UUIDs / scaled_* names from mobile uploads. */
export function formatAttachmentLabel(name, kind, indexWithinKind = 0) {
  const n = indexWithinKind + 1;
  const suffix = n > 1 ? ` ${n}` : '';
  switch (kind) {
    case 'audio':
      return `Voice note${suffix}`;
    case 'video':
      return `Video${suffix}`;
    case 'image':
      return `Photo${suffix}`;
    default:
      return truncateFilename(name) || `Attachment${suffix}`;
  }
}

function truncateFilename(name, maxLen = 36) {
  if (!name) return 'File';
  if (name.length <= maxLen) return name;
  const dot = name.lastIndexOf('.');
  if (dot > 0 && dot < name.length - 1) {
    const ext = name.slice(dot);
    const head = name.slice(0, dot);
    const keep = maxLen - ext.length - 1;
    if (keep > 4) return `${head.slice(0, keep)}…${ext}`;
  }
  return `${name.slice(0, maxLen - 1)}…`;
}

/**
 * List signed URLs for all files under {reporterUserId}/{reportId}/…
 * @returns {Promise<Array<{ name: string, path: string, url: string, kind: string }>>}
 */
export async function loadPatientReportAttachments(reporterUserId, reportId) {
  if (!reporterUserId || !reportId) return [];

  const bucket = supabase.storage.from(BUCKET);
  const prefix = `${reporterUserId}/${reportId}`;
  const out = [];

  const { data: level1, error: e1 } = await bucket.list(prefix, { limit: 100 });
  if (e1) throw e1;

  for (const entry of level1 || []) {
    if (!entry?.name) continue;
    const subPath = `${prefix}/${entry.name}`;
    const isFolder = entry.id == null;
    if (isFolder) {
      const { data: level2, error: e2 } = await bucket.list(subPath, { limit: 50 });
      if (e2) continue;
      for (const file of level2 || []) {
        if (!file?.name || file.id == null) continue;
        const path = `${subPath}/${file.name}`;
        const { data: signed, error: e3 } = await bucket.createSignedUrl(path, 3600);
        if (e3 || !signed?.signedUrl) continue;
        out.push({
          name: file.name,
          path,
          url: signed.signedUrl,
          kind: guessKind(file.name),
        });
      }
    } else {
      const path = subPath;
      const { data: signed, error: e3 } = await bucket.createSignedUrl(path, 3600);
      if (e3 || !signed?.signedUrl) continue;
      out.push({
        name: entry.name,
        path,
        url: signed.signedUrl,
        kind: guessKind(entry.name),
      });
    }
  }

  return out;
}

export async function fetchReporterUserId(patientReportId) {
  const { data, error } = await supabase
    .from('patient_reports')
    .select('reporter_user_id')
    .eq('id', patientReportId)
    .maybeSingle();
  if (error) throw error;
  return data?.reporter_user_id ?? null;
}
