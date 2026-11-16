/** Small, hand-picked dataset so e2e assertions are exact and independent of the 1M-row CSV. */
export interface StudentFixture {
  sbd: string;
  toan?: number;
  ngu_van?: number;
  ngoai_ngu?: number;
  vat_li?: number;
  hoa_hoc?: number;
  sinh_hoc?: number;
  lich_su?: number;
  dia_li?: number;
  gdcd?: number;
  ma_ngoai_ngu?: string;
}

export const STUDENTS: StudentFixture[] = [
  // Natural-science student: A00 = 8.4 + 6 + 5.25 = 19.65
  { sbd: '01000001', toan: 8.4, ngu_van: 6.75, ngoai_ngu: 8, vat_li: 6, hoa_hoc: 5.25, ma_ngoai_ngu: 'N1' },
  // Social-science student: no A00 / A01 / B00
  { sbd: '01000002', toan: 8.6, ngu_van: 8.5, ngoai_ngu: 7.2, lich_su: 7.25, dia_li: 6, gdcd: 8, ma_ngoai_ngu: 'N1' },
  // Top two A00 students
  { sbd: '01000003', toan: 9.6, vat_li: 10, hoa_hoc: 10 },
  { sbd: '01000004', toan: 9.8, vat_li: 9.75, hoa_hoc: 10 },
  // Weak A00 student (total 8.5)
  { sbd: '01000005', toan: 3, vat_li: 3.5, hoa_hoc: 2 },
  // Toán-only rows covering every level boundary
  { sbd: '01000006', toan: 6 },
  { sbd: '01000007', toan: 4 },
  { sbd: '01000008', toan: 8 },
  { sbd: '01000009', toan: 7.99 },
];
