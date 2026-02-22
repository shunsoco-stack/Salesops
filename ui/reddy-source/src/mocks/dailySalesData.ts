
export interface OutsourceCost {
  id: string;
  label: string;
  amount: number;
}

export interface DailySalesEntry {
  id: string;
  date: string;
  revenue: number;
  customers: number;
  memo: string;
  outsourceCosts: OutsourceCost[];
  pointUsage: number;
  creditCardPayment: number;
  qrPayment: number;
  createdAt: string;
}

export const dailySalesEntries: DailySalesEntry[] = [
  { id: 'DS-001', date: '2025-01-15', revenue: 385000, customers: 42, memo: '天気良好、客足多め', outsourceCosts: [{ id: 'OC-001', label: '清掃業者', amount: 15000 }, { id: 'OC-002', label: '配送委託', amount: 8000 }], pointUsage: 12500, creditCardPayment: 185000, qrPayment: 45000, createdAt: '2025-01-15 18:30' },
  { id: 'DS-002', date: '2025-01-14', revenue: 312000, customers: 35, memo: '', outsourceCosts: [{ id: 'OC-003', label: '配送委託', amount: 12000 }], pointUsage: 8200, creditCardPayment: 142000, qrPayment: 38000, createdAt: '2025-01-14 19:00' },
  { id: 'DS-003', date: '2025-01-13', revenue: 298000, customers: 31, memo: '雨天のため客足少なめ', outsourceCosts: [], pointUsage: 5600, creditCardPayment: 120000, qrPayment: 28000, createdAt: '2025-01-13 18:45' },
  { id: 'DS-004', date: '2025-01-12', revenue: 425000, customers: 48, memo: '週末セール実施', outsourceCosts: [{ id: 'OC-004', label: 'イベントスタッフ', amount: 25000 }, { id: 'OC-005', label: '清掃業者', amount: 15000 }, { id: 'OC-006', label: 'チラシ配布', amount: 5000 }], pointUsage: 18900, creditCardPayment: 210000, qrPayment: 62000, createdAt: '2025-01-12 20:00' },
  { id: 'DS-005', date: '2025-01-11', revenue: 410000, customers: 45, memo: '週末セール初日', outsourceCosts: [{ id: 'OC-007', label: 'イベントスタッフ', amount: 25000 }], pointUsage: 15300, creditCardPayment: 198000, qrPayment: 55000, createdAt: '2025-01-11 19:30' },
  { id: 'DS-006', date: '2025-01-10', revenue: 275000, customers: 29, memo: '', outsourceCosts: [], pointUsage: 3200, creditCardPayment: 105000, qrPayment: 22000, createdAt: '2025-01-10 18:15' },
  { id: 'DS-007', date: '2025-01-09', revenue: 340000, customers: 38, memo: '新商品入荷', outsourceCosts: [{ id: 'OC-008', label: '配送委託', amount: 10000 }], pointUsage: 9800, creditCardPayment: 165000, qrPayment: 41000, createdAt: '2025-01-09 19:00' },
  { id: 'DS-008', date: '2025-01-08', revenue: 290000, customers: 33, memo: '', outsourceCosts: [], pointUsage: 4500, creditCardPayment: 132000, qrPayment: 30000, createdAt: '2025-01-08 18:30' },
  { id: 'DS-009', date: '2025-01-07', revenue: 265000, customers: 28, memo: '連休明け', outsourceCosts: [{ id: 'OC-009', label: '清掃業者', amount: 15000 }], pointUsage: 6100, creditCardPayment: 118000, qrPayment: 25000, createdAt: '2025-01-07 18:00' },
  { id: 'DS-010', date: '2025-01-06', revenue: 180000, customers: 20, memo: '連休最終日', outsourceCosts: [], pointUsage: 2800, creditCardPayment: 78000, qrPayment: 15000, createdAt: '2025-01-06 17:30' },
];
