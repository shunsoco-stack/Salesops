import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { salesData, customerSegments } from '../../../mocks/salesData';

const Analytics = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">分析</h2>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">成長率トレンド</h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={salesData}>
            <defs>
              <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip />
            <Area type="monotone" dataKey="growth" stroke="#14b8a6" fillOpacity={1} fill="url(#colorGrowth)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">顧客セグメント分析</h3>
          <div className="space-y-4">
            {customerSegments.map((segment, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">{segment.segment}</span>
                  <span className="text-xs text-gray-600">{segment.count}社</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-600">総売上</p>
                    <p className="text-sm font-bold text-gray-900">¥{segment.revenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">平均注文額</p>
                    <p className="text-sm font-bold text-gray-900">¥{segment.avgOrder.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">主要指標</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-teal-100 rounded-lg">
              <div>
                <p className="text-sm text-teal-700 font-medium">コンバージョン率</p>
                <p className="text-2xl font-bold text-teal-900 mt-1">24.8%</p>
              </div>
              <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center">
                <i className="ri-arrow-up-line text-2xl text-white w-8 h-8 flex items-center justify-center"></i>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
              <div>
                <p className="text-sm text-orange-700 font-medium">顧客維持率</p>
                <p className="text-2xl font-bold text-orange-900 mt-1">87.3%</p>
              </div>
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
                <i className="ri-user-heart-line text-2xl text-white w-8 h-8 flex items-center justify-center"></i>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
              <div>
                <p className="text-sm text-purple-700 font-medium">平均購入頻度</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">3.2回/月</p>
              </div>
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center">
                <i className="ri-repeat-line text-2xl text-white w-8 h-8 flex items-center justify-center"></i>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg">
              <div>
                <p className="text-sm text-amber-700 font-medium">顧客生涯価値</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">¥428,000</p>
              </div>
              <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center">
                <i className="ri-vip-crown-line text-2xl text-white w-8 h-8 flex items-center justify-center"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">予測分析</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg">
            <i className="ri-line-chart-line text-4xl text-teal-600 mb-3 w-10 h-10 flex items-center justify-center mx-auto"></i>
            <p className="text-sm text-teal-700 font-medium mb-2">来月予測売上</p>
            <p className="text-3xl font-bold text-teal-900">¥6,820,000</p>
            <p className="text-xs text-teal-600 mt-2">+10% 成長予測</p>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
            <i className="ri-shopping-bag-line text-4xl text-orange-600 mb-3 w-10 h-10 flex items-center justify-center mx-auto"></i>
            <p className="text-sm text-orange-700 font-medium mb-2">予測注文数</p>
            <p className="text-3xl font-bold text-orange-900">248件</p>
            <p className="text-xs text-orange-600 mt-2">+10.2% 増加予測</p>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
            <i className="ri-user-add-line text-4xl text-purple-600 mb-3 w-10 h-10 flex items-center justify-center mx-auto"></i>
            <p className="text-sm text-purple-700 font-medium mb-2">新規顧客予測</p>
            <p className="text-3xl font-bold text-purple-900">42社</p>
            <p className="text-xs text-purple-600 mt-2">+15% 増加予測</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
