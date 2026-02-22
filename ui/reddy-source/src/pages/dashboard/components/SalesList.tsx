import { useState } from 'react';
import { recentSales } from '../../../mocks/salesData';

const SalesList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredSales = recentSales.filter(sale => {
    const matchesSearch = sale.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">売上一覧</h2>
        <button className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium whitespace-nowrap">
          <i className="ri-add-line mr-2"></i>
          新規追加
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 flex items-center justify-center"></i>
            <input
              type="text"
              placeholder="顧客名または注文IDで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          >
            <option value="all">すべてのステータス</option>
            <option value="完了">完了</option>
            <option value="処理中">処理中</option>
            <option value="保留">保留</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">注文ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">顧客名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">商品</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">金額</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">日付</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{sale.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{sale.customer}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{sale.product}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">¥{sale.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sale.date}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                      sale.status === '完了' ? 'bg-green-100 text-green-700' :
                      sale.status === '処理中' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                        <i className="ri-eye-line w-5 h-5 flex items-center justify-center"></i>
                      </button>
                      <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <i className="ri-edit-line w-5 h-5 flex items-center justify-center"></i>
                      </button>
                      <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <i className="ri-delete-bin-line w-5 h-5 flex items-center justify-center"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {filteredSales.length}件中 1-{Math.min(10, filteredSales.length)}件を表示
          </p>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap">
              前へ
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap">
              次へ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesList;
