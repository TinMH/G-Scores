import { ScoreLevel } from './score-level';
import { SubjectRegistry } from './subject-registry';

describe('Subject domain', () => {
  const registry = new SubjectRegistry();

  it.each([
    [10, ScoreLevel.EXCELLENT],
    [8, ScoreLevel.EXCELLENT],
    [7.99, ScoreLevel.GOOD],
    [6, ScoreLevel.GOOD],
    [4, ScoreLevel.AVERAGE],
    [3.75, ScoreLevel.POOR],
    [0, ScoreLevel.POOR],
  ])('classifies %d as %s', (score, level) => {
    expect(registry.math.classify(score)).toBe(level);
  });

  it('sums group A00 and returns null when a subject is missing', () => {
    const a00 = registry.findGroup('a00')!;
    expect(a00.total({ toan: 8.4, vat_li: 6, hoa_hoc: 5.25 })).toBe(19.65);
    expect(a00.total({ toan: 8.4, vat_li: null, hoa_hoc: 5.25 })).toBeNull();
    expect(a00.sqlTotalExpression).toBe('(toan + vat_li + hoa_hoc)');
  });

  it('resolves foreign language name', () => {
    expect(registry.foreignLanguage.getLanguageName({ ma_ngoai_ngu: 'N1' })).toBe('Tiếng Anh');
  });
});
