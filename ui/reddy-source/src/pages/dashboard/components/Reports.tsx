import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { categoryData, topProducts } from '../../../mocks/salesData';

const Reports = () => {
  const COLORS = ['#14b8a6', '#f97316', '#a855f7', '#eab308'];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">レポート</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">カテゴリー別売上</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">トップ商品</h3>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{product.name}</span>
                  <span className="text-sm font-semibold text-gray-900">¥{product.sales.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${product.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600 w-12 text-right">{product.units}個</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">期間別レポート</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-teal-700 font-medium">今月</span>
              <i className="ri-calendar-line text-teal-600 w-5 h-5 flex items-center justify-center"></i>
            </div>
            <p className="text-2xl font-bold text-teal-900">¥6,200,000</p>
            <p className="text-xs text-teal-600 mt-1">225件の注文</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-orange-700 font-medium">今四半期</span>
              <i className="ri-calendar-2-line text-orange-600 w-5 h-5 flex items-center justify-center"></i>
            </div>
            <p className="text-2xl font-bold text-orange-900">¥16,100,000</p>
            <p className="text-xs text-orange-600 mt-1">592件の注文</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-purple-700 font-medium">今年</span>
              <i className="ri-calendar-check-line text-purple-600 w-5 h-5 flex items-center justify-center"></i>
            </div>
            <p className="text-2xl font-bold text-purple-900">¥28,700,000</p>
            <p className="text-xs text-purple-600 mt-1">1,047件の注文</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">カスタムレポート生成</h3>
          <button className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium whitespace-nowrap">
            <i className="ri-file-add-line mr-2"></i>
            レポート作成
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">期間選択</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm">
              <option>今月</option>
              <option>先月</option>
              <option>今四半期</option>
              <option>今年</option>
              <option>カスタム期間</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">レポートタイプ</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm">
              <option>売上サマリー</option>
              <option>商品別分析</option>
              <option>顧客別分析</option>
              <option>地域別分析</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
