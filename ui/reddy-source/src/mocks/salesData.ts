export const salesData = [
  { month: '1月', revenue: 4200000, orders: 156, growth: 12.5 },
  { month: '2月', revenue: 3800000, orders: 142, growth: -9.5 },
  { month: '3月', revenue: 5100000, orders: 189, growth: 34.2 },
  { month: '4月', revenue: 4800000, orders: 178, growth: -5.9 },
  { month: '5月', revenue: 5600000, orders: 203, growth: 16.7 },
  { month: '6月', revenue: 6200000, orders: 225, growth: 10.7 },
];

export const recentSales = [
  { id: 'ORD-2024-001', customer: '株式会社山田商事', amount: 285000, date: '2024-01-15', status: '完了', product: 'プレミアムプラン' },
  { id: 'ORD-2024-002', customer: '田中工業株式会社', amount: 156000, date: '2024-01-14', status: '処理中', product: 'スタンダードプラン' },
  { id: 'ORD-2024-003', customer: '佐藤物産', amount: 420000, date: '2024-01-14', status: '完了', product: 'エンタープライズプラン' },
  { id: 'ORD-2024-004', customer: '鈴木商店', amount: 98000, date: '2024-01-13', status: '完了', product: 'ベーシックプラン' },
  { id: 'ORD-2024-005', customer: '高橋製作所', amount: 315000, date: '2024-01-13', status: '保留', product: 'プレミアムプラン' },
  { id: 'ORD-2024-006', customer: '伊藤電機', amount: 189000, date: '2024-01-12', status: '完了', product: 'スタンダードプラン' },
  { id: 'ORD-2024-007', customer: '渡辺建設', amount: 267000, date: '2024-01-12', status: '完了', product: 'プレミアムプラン' },
  { id: 'ORD-2024-008', customer: '中村運輸', amount: 142000, date: '2024-01-11', status: '処理中', product: 'スタンダードプラン' },
];

export const topProducts = [
  { name: 'プレミアムプラン', sales: 1850000, units: 42, percentage: 32 },
  { name: 'エンタープライズプラン', sales: 1620000, units: 28, percentage: 28 },
  { name: 'スタンダードプラン', sales: 1340000, units: 67, percentage: 23 },
  { name: 'ベーシックプラン', sales: 980000, units: 89, percentage: 17 },
];

export const dashboardStats = {
  totalRevenue: 6200000,
  totalOrders: 225,
  averageOrder: 27556,
  growthRate: 10.7,
  pendingOrders: 12,
  completedOrders: 208,
  cancelledOrders: 5,
};

export const categoryData = [
  { name: 'ソフトウェア', value: 2480000, percentage: 40 },
  { name: 'コンサルティング', value: 1860000, percentage: 30 },
  { name: 'サポート', value: 1240000, percentage: 20 },
  { name: 'その他', value: 620000, percentage: 10 },
];

export const customerSegments = [
  { segment: '大企業', count: 45, revenue: 2790000, avgOrder: 62000 },
  { segment: '中小企業', count: 128, revenue: 2480000, avgOrder: 19375 },
  { segment: 'スタートアップ', count: 52, revenue: 930000, avgOrder: 17885 },
];
