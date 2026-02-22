import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { salesData, dashboardStats, recentSales } from '../../../mocks/salesData';

const DashboardOverview = () => {
  const stats = [
    {
      title: '総売上',
      value: `¥${dashboardStats.totalRevenue.toLocaleString()}`,
      change: `+${dashboardStats.growthRate}%`,
      icon: 'ri-money-dollar-circle-line',
      color: 'bg-teal-500',
    },
    {
      title: '注文数',
      value: dashboardStats.totalOrders.toString(),
      change: '+15件',
      icon: 'ri-shopping-cart-line',
      color: 'bg-orange-500',
    },
    {
      title: '平均注文額',
      value: `¥${dashboardStats.averageOrder.toLocaleString()}`,
      change: '+8.2%',
      icon: 'ri-line-chart-line',
      color: 'bg-purple-500',
    },
    {
      title: '保留中',
      value: dashboardStats.pendingOrders.toString(),
      change: '-3件',
      icon: 'ri-time-line',
      color: 'bg-amber-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                <i className={`${stat.icon} text-2xl text-white w-6 h-6 flex items-center justify-center`}></i>
              </div>
              <span className="text-sm font-medium text-green-600">{stat.change}</span>
            </div>
            <h3 className="text-sm text-gray-600 mb-1">{stat.title}</h3>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">売上推移</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#14b8a6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">月別注文数</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip />
              <Bar dataKey="orders" fill="#f97316" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">最近の売上</h2>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentSales.slice(0, 5).map((sale) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
