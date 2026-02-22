
import { useState, useMemo } from 'react';
import { dailySalesEntries, DailySalesEntry, OutsourceCost } from '../../../mocks/dailySalesData';

const DailySalesInput = () => {
  const [entries, setEntries] = useState<DailySalesEntry[]>(dailySalesEntries);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [revenue, setRevenue] = useState('');
  const [customers, setCustomers] = useState('');
  const [memo, setMemo] = useState('');
  const [outsourceCosts, setOutsourceCosts] = useState<OutsourceCost[]>([]);
  const [newOcAmount, setNewOcAmount] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState('2025-01');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => entry.date.startsWith(filterMonth))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, filterMonth]);

  const monthlySummary = useMemo(() => {
    const totalRevenue = filteredEntries.reduce((sum, e) => sum + e.revenue, 0);
    const totalCustomers = filteredEntries.reduce((sum, e) => sum + e.customers, 0);
    const avgRevenue = filteredEntries.length > 0 ? Math.round(totalRevenue / filteredEntries.length) : 0;
    const avgCustomers = filteredEntries.length > 0 ? Math.round(totalCustomers / filteredEntries.length) : 0;
    const avgPerCustomer = totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0;
    const totalOutsource = filteredEntries.reduce(
      (sum, e) => sum + e.outsourceCosts.reduce((s, oc) => s + oc.amount, 0),
      0,
    );
    const totalPoint = filteredEntries.reduce((sum, e) => sum + (e.pointUsage || 0), 0);
    const totalCredit = filteredEntries.reduce((sum, e) => sum + (e.creditCardPayment || 0), 0);
    const totalQr = filteredEntries.reduce((sum, e) => sum + (e.qrPayment || 0), 0);
    return { totalRevenue, totalCustomers, avgRevenue, avgCustomers, avgPerCustomer, totalOutsource, totalPoint, totalCredit, totalQr, days: filteredEntries.length };
  }, [filteredEntries]);

  const outsourceTotal = useMemo(() => {
    return outsourceCosts.reduce((sum, oc) => sum + oc.amount, 0);
  }, [outsourceCosts]);

  const showNotification = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setRevenue('');
    setCustomers('');
    setMemo('');
    setOutsourceCosts([]);
    setNewOcAmount('');
    setEditingId(null);
  };

  const handleAddOutsourceCost = () => {
    if (!newOcAmount) return;
    const amount = parseInt(newOcAmount, 10);
    if (Number.isNaN(amount) || amount <= 0) return;
    const newOc: OutsourceCost = {
      id: `OC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: `外注費${outsourceCosts.length + 1}`,
      amount,
    };
    setOutsourceCosts((prev) => [...prev, newOc]);
    setNewOcAmount('');
  };

  const handleRemoveOutsourceCost = (id: string) => {
    setOutsourceCosts((prev) => prev.filter((oc) => oc.id !== id));
  };

  const handleSubmit = () => {
    if (!date || !revenue || !customers) return;

    const revenueNum = parseInt(revenue, 10);
    const customersNum = parseInt(customers, 10);

    if (Number.isNaN(revenueNum) || Number.isNaN(customersNum) || revenueNum < 0 || customersNum < 0) return;

    if (editingId) {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === editingId
            ? { ...entry, date, revenue: revenueNum, customers: customersNum, memo, outsourceCosts }
            : entry,
        ),
      );
      showNotification('売上データを更新しました');
    } else {
      const newEntry: DailySalesEntry = {
        id: `DS-${String(entries.length + 1).padStart(3, '0')}`,
        date,
        revenue: revenueNum,
        customers: customersNum,
        memo,
        outsourceCosts: [...outsourceCosts],
        pointUsage: 0,
        creditCardPayment: 0,
        qrPayment: 0,
        createdAt: new Date().toLocaleString('ja-JP'),
      };
      setEntries((prev) => [newEntry, ...prev]);
      showNotification('売上データを登録しました');
    }

    resetForm();
  };

  const handleEdit = (entry: DailySalesEntry) => {
    setEditingId(entry.id);
    setDate(entry.date);
    setRevenue(entry.revenue.toString());
    setCustomers(entry.customers.toString());
    setMemo(entry.memo);
    setOutsourceCosts([...entry.outsourceCosts]);
    setNewOcAmount('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    setShowDeleteConfirm(null);
    showNotification('売上データを削除しました');
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`;
  };

  const getEntryOutsourceTotal = (entry: DailySalesEntry) => {
    return entry.outsourceCosts.reduce((sum, oc) => sum + oc.amount, 0);
  };

  return (
    <div className="space-y-6">
      {/* 通知 */}
      {showSuccess && (
        <div className="fixed top-6 right-6 z-50 bg-teal-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
          <i className="ri-check-line text-xl w-5 h-5 flex items-center justify-center"></i>
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">売上入力</h2>
        {editingId && (
          <button
            onClick={resetForm}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-close-line mr-1"></i>
            編集をキャンセル
          </button>
        )}
      </div>

      {/* 入力フォーム */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
            <i className="ri-edit-2-line text-xl text-white w-5 h-5 flex items-center justify-center"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {editingId ? 'データを編集' : '日次売上を入力'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 日付 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              日付 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const d = new Date(date);
                  d.setDate(d.getDate() - 1);
                  setDate(d.toISOString().split('T')[0]);
                }}
                className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer shrink-0"
                title="前日"
              >
                <i className="ri-arrow-left-s-line text-lg w-5 h-5 flex items-center justify-center"></i>
              </button>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm cursor-pointer"
              />
              <button
                onClick={() => {
                  const d = new Date(date);
                  d.setDate(d.getDate() + 1);
                  setDate(d.toISOString().split('T')[0]);
                }}
                className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer shrink-0"
                title="翌日"
              >
                <i className="ri-arrow-right-s-line text-lg w-5 h-5 flex items-center justify-center"></i>
              </button>
            </div>
          </div>

          {/* 売上 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              売上（円） <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">&yen;</span>
              <input
                type="text"
                inputMode="numeric"
                value={revenue}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setRevenue(val);
                }}
                placeholder="例: 350000"
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
            {revenue && (
              <p className="mt-1 text-xs text-gray-500">
                &yen;{parseInt(revenue, 10).toLocaleString()}
              </p>
            )}
          </div>

          {/* 客数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              客数（人） <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <i className="ri-user-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 flex items-center justify-center"></i>
              <input
                type="text"
                inputMode="numeric"
                value={customers}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setCustomers(val);
                }}
                placeholder="例: 42"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* 客単価（自動算出） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              客単価（自動算出）
            </label>
            <div className={`w-full px-4 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 ${
              revenue && customers && parseInt(customers, 10) > 0
                ? 'bg-teal-50 border border-teal-200 text-teal-700'
                : 'bg-gray-100 border border-gray-200 text-gray-400'
            }`}>
              <i className="ri-calculator-line w-4 h-4 flex items-center justify-center"></i>
              {revenue && customers && parseInt(customers, 10) > 0
                ? `¥${Math.round(parseInt(revenue, 10) / parseInt(customers, 10)).toLocaleString()}`
                : '売上と客数を入力'}
            </div>
            {revenue && customers && parseInt(customers, 10) > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                &yen;{parseInt(revenue, 10).toLocaleString()} &divide; {parseInt(customers, 10)}人
              </p>
            )}
          </div>
        </div>

        {/* 外注費入力エリア */}
        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <i className="ri-money-yen-circle-line text-lg text-orange-600 w-4 h-4 flex items-center justify-center"></i>
            </div>
            <h4 className="text-sm font-semibold text-gray-900">外注費</h4>
            <span className="text-xs text-gray-500">（複数入力可）</span>
          </div>

          {/* 外注費追加フォーム */}
          <div className="flex items-end gap-3 mb-4">
            <div className="flex-1 max-w-[240px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">金額（円）</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">&yen;</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={newOcAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setNewOcAmount(val);
                  }}
                  placeholder="例: 15000"
                  className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddOutsourceCost();
                    }
                  }}
                />
              </div>
              {newOcAmount && (
                <p className="mt-1 text-xs text-gray-500">
                  &yen;{parseInt(newOcAmount, 10).toLocaleString()}
                </p>
              )}
            </div>
            <button
              onClick={handleAddOutsourceCost}
              disabled={!newOcAmount}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                !newOcAmount
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              <i className="ri-add-line w-4 h-4 flex items-center justify-center"></i>
              追加
            </button>
          </div>

          {/* 外注費リスト */}
          {outsourceCosts.length > 0 && (
            <div className="bg-orange-50/60 border border-orange-200 rounded-lg p-4">
              <div className="space-y-2">
                {outsourceCosts.map((oc, index) => (
                  <div key={oc.id} className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-orange-100">
                    <div className="flex items-center gap-3">
                      <i className="ri-file-list-3-line text-orange-500 w-4 h-4 flex items-center justify-center"></i>
                      <span className="text-sm text-gray-500">{index + 1}件目</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-900">&yen;{oc.amount.toLocaleString()}</span>
                      <button
                        onClick={() => handleRemoveOutsourceCost(oc.id)}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        title="削除"
                      >
                        <i className="ri-close-line w-4 h-4 flex items-center justify-center"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {/* 外注費合計 */}
              <div className="mt-3 pt-3 border-t border-orange-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-orange-700">外注費（合計）</span>
                <span className="text-lg font-bold text-orange-700">&yen;{outsourceTotal.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* ポイント・カード・QR情報（CSV取込で反映） */}
        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <i className="ri-file-upload-line text-lg text-gray-500 w-4 h-4 flex items-center justify-center"></i>
            </div>
            <h4 className="text-sm font-semibold text-gray-900">ポイント・カード・QR払い</h4>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">CSV取込で反映</span>
          </div>
          <p className="text-xs text-gray-500">ポイント利用・クレジットカード払い・QRコード払いは、サイドメニューの「CSV取込」からCSVファイルで取り込めます。</p>
        </div>

        {/* メモ */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            メモ（任意）
          </label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="例: 天気良好、セール実施"
            maxLength={100}
            className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          />
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleSubmit}
            disabled={!date || !revenue || !customers}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              !date || !revenue || !customers
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : editingId
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-teal-500 text-white hover:bg-teal-600'
            }`}
          >
            <i className={`${editingId ? 'ri-save-line' : 'ri-add-circle-line'} w-5 h-5 flex items-center justify-center`}></i>
            {editingId ? '更新する' : '登録する'}
          </button>
          {(revenue || customers || memo || outsourceCosts.length > 0) && !editingId && (
            <button
              onClick={resetForm}
              className="px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              クリア
            </button>
          )}
        </div>
      </div>

      {/* 月間サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">月間売上合計</p>
          <p className="text-lg font-bold text-gray-900">&yen;{monthlySummary.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">月間客数合計</p>
          <p className="text-lg font-bold text-gray-900">{monthlySummary.totalCustomers.toLocaleString()}人</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">平均客単価</p>
          <p className="text-lg font-bold text-gray-900">&yen;{monthlySummary.avgPerCustomer.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-orange-200 p-4">
          <p className="text-xs text-orange-600 mb-1">月間外注費合計</p>
          <p className="text-lg font-bold text-orange-700">&yen;{monthlySummary.totalOutsource.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-rose-200 p-4">
          <p className="text-xs text-rose-600 mb-1">月間ポイント利用</p>
          <p className="text-lg font-bold text-rose-700">&yen;{monthlySummary.totalPoint.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-indigo-200 p-4">
          <p className="text-xs text-indigo-600 mb-1">月間カード払い</p>
          <p className="text-lg font-bold text-indigo-700">&yen;{monthlySummary.totalCredit.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-emerald-200 p-4">
          <p className="text-xs text-emerald-600 mb-1">月間QR払い</p>
          <p className="text-lg font-bold text-emerald-700">&yen;{monthlySummary.totalQr.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">日平均売上</p>
          <p className="text-lg font-bold text-gray-900">&yen;{monthlySummary.avgRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">日平均客数</p>
          <p className="text-lg font-bold text-gray-900">{monthlySummary.avgCustomers}人</p>
        </div>
      </div>

      {/* 入力履歴 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">入力履歴</h3>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">表示月:</label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm cursor-pointer"
            />
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center">
            <i className="ri-inbox-line text-4xl text-gray-300 w-10 h-10 flex items-center justify-center mx-auto mb-3"></i>
            <p className="text-sm text-gray-500">この月のデータはありません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">日付</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">売上</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">客数</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">客単価</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">外注費</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-rose-500 uppercase">ポイント</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-indigo-500 uppercase">カード</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-emerald-500 uppercase">QR</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">メモ</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEntries.map((entry) => {
                  const ocTotal = getEntryOutsourceTotal(entry);
                  const isExpanded = expandedRows.has(entry.id);
                  return (
                    <>
                      <tr key={entry.id} className="group hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {formatDate(entry.date)}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900 text-right">
                          &yen;{entry.revenue.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 text-right">
                          {entry.customers}人
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 text-right">
                          &yen;{entry.customers > 0 ? Math.round(entry.revenue / entry.customers).toLocaleString() : 0}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {ocTotal > 0 ? (
                            <button
                              onClick={() => toggleRowExpand(entry.id)}
                              className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700 cursor-pointer transition-colors"
                            >
                              &yen;{ocTotal.toLocaleString()}
                              <span className="text-xs text-orange-400">({entry.outsourceCosts.length}件)</span>
                              <i className={`ri-arrow-${isExpanded ? 'up' : 'down'}-s-line w-4 h-4 flex items-center justify-center text-orange-400`}></i>
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400">&mdash;</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-right">
                          {(entry.pointUsage || 0) > 0 ? (
                            <span className="font-semibold text-rose-600">&yen;{(entry.pointUsage || 0).toLocaleString()}</span>
                          ) : (
                            <span className="text-gray-400">&mdash;</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-right">
                          {(entry.creditCardPayment || 0) > 0 ? (
                            <span className="font-semibold text-indigo-600">&yen;{(entry.creditCardPayment || 0).toLocaleString()}</span>
                          ) : (
                            <span className="text-gray-400">&mdash;</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-right">
                          {(entry.qrPayment || 0) > 0 ? (
                            <span className="font-semibold text-emerald-600">&yen;{(entry.qrPayment || 0).toLocaleString()}</span>
                          ) : (
                            <span className="text-gray-400">&mdash;</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500 max-w-[120px] truncate">
                          {entry.memo || '\u2014'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(entry)}
                              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                              title="編集"
                            >
                              <i className="ri-edit-line w-5 h-5 flex items-center justify-center"></i>
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(entry.id)}
                              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="削除"
                            >
                              <i className="ri-delete-bin-line w-5 h-5 flex items-center justify-center"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* 展開された外注費の詳細 */}
                      {isExpanded && entry.outsourceCosts.length > 0 && (
                        <tr key={`oc-${entry.id}`}>
                          <td colSpan={10} className="px-4 py-0">
                            <div className="pb-4">
                              <div className="bg-orange-50/60 border border-orange-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <i className="ri-money-yen-circle-line text-orange-500 w-4 h-4 flex items-center justify-center"></i>
                                  <span className="text-xs font-semibold text-orange-700">{formatDate(entry.date)} の外注費内訳</span>
                                </div>
                                <div className="space-y-1">
                                  {entry.outsourceCosts.map((oc, index) => (
                                    <div key={oc.id} className="flex items-center justify-between px-3 py-1.5 bg-white rounded-md">
                                      <span className="text-xs text-gray-500">{index + 1}件目</span>
                                      <span className="text-xs font-semibold text-gray-900">&yen;{oc.amount.toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <i className="ri-error-warning-line text-xl text-red-600 w-5 h-5 flex items-center justify-center"></i>
              </div>
              <h4 className="text-lg font-semibold text-gray-900">削除の確認</h4>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              この売上データを削除しますか？この操作は取り消せません。
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors whitespace-nowrap cursor-pointer"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailySalesInput;
