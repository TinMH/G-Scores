import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { Highlights, TopScorersByGroup } from './dashboard/Highlights';
import { KpiStrip } from './dashboard/KpiStrip';
import { RankingSection } from './dashboard/RankingSection';
import { ScoreMix } from './dashboard/ScoreMix';

/**
 * Overview page: three summary panels, headline numbers, then top candidates by group.
 * Each data source loads (and can fail) independently so one slow call never blanks the whole page.
 */
export function Dashboard() {
  const overview = useApi(api.overview);
  const levels = useApi(api.scoreLevels);

  return (
    <>
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ScoreMix levels={levels.data} loading={levels.loading} error={levels.error} onRetry={levels.reload} />
        <Highlights overview={overview.data} loading={overview.loading} error={overview.error} onRetry={overview.reload} />
        <TopScorersByGroup
          overview={overview.data}
          loading={overview.loading}
          error={overview.error}
          onRetry={overview.reload}
        />
      </div>

      <KpiStrip
        overview={overview.data}
        levels={levels.data}
        loading={overview.loading || levels.loading}
        error={overview.error ?? levels.error}
        onRetry={() => {
          overview.reload();
          levels.reload();
        }}
      />

      <RankingSection />
    </>
  );
}
