import { t } from '../i18n';

export type ScoreLevel = 'excellent' | 'good' | 'average' | 'poor';

export interface SubjectInfo {
  code: string;
  name: string;
  category: string;
}

export interface GroupInfo {
  code: string;
  name: string;
  subjects: string[];
}

export interface SubjectsCatalog {
  subjects: SubjectInfo[];
  groups: GroupInfo[];
}

export interface StudentResult {
  sbd: string;
  foreignLanguage: string | null;
  scores: { subject: SubjectInfo; score: number | null; level: ScoreLevel | null }[];
  groups: (GroupInfo & { total: number })[];
}

export interface ScoreLevelReport {
  levels: { level: ScoreLevel; label: string }[];
  subjects: (SubjectInfo & { counts: Record<ScoreLevel, number> })[];
}

export interface GroupRanking {
  group: GroupInfo;
  students: { rank: number; sbd: string; scores: Record<string, number>; total: number }[];
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, t('Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại kết nối.'));
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 429) {
      throw new ApiError(429, t('Bạn đang thao tác quá nhanh (giới hạn 60 yêu cầu/phút). Vui lòng thử lại sau ít giây.'));
    }
    // Server messages are Vietnamese, so map the known statuses to translated text.
    const known: Record<number, string> = {
      400: t('Số báo danh không hợp lệ'),
      404: t('Không tìm thấy dữ liệu bạn yêu cầu.'),
    };
    throw new ApiError(res.status, known[res.status] ?? t('Đã có lỗi xảy ra từ máy chủ'));
  }
  return body as T;
}

export const api = {
  subjects: (signal?: AbortSignal) => get<SubjectsCatalog>('/subjects', signal),
  student: (sbd: string, signal?: AbortSignal) => get<StudentResult>(`/students/${encodeURIComponent(sbd)}`, signal),
  scoreLevels: (signal?: AbortSignal) => get<ScoreLevelReport>('/reports/score-levels', signal),
  overview: (signal?: AbortSignal) => get<OverviewResponse>('/overview', signal),
  topGroup: (group = 'A00', limit = 10, signal?: AbortSignal) =>
    get<GroupRanking>(`/rankings/${encodeURIComponent(group)}?limit=${limit}`, signal),
};

export interface TopScorer {
  group: { code: string; name: string };
  sbd: string;
  total: number;
}

export interface OverviewResponse {
  totals: { candidates: number; papers: number; perfectScores: number };
  /** Best total across all groups. */
  topScorer: TopScorer | null;
  groupTopScorers: TopScorer[];
  subjects: (SubjectInfo & { taken: number; average: number | null; perfectScores: number })[];
}
