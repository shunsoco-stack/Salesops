import { useState } from 'react';

const Export = () => {
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">エクスポート</h2>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">データエクスポート</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">エクスポート形式</label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['csv', 'excel', 'pdf', 'json'].map((format) => (
                <button
                  key={format}
                  onClick={() => setSelectedFormat(format)}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    selectedFormat === format
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <i className={`${
                    format === 'csv' ? 'ri-file-text-line' :
                    format === 'excel' ? 'ri-file-excel-2-line' :
                    format === 'pdf' ? 'ri-file-pdf-line' :
                    'ri-file-code-line'
                  } text-3xl mb-2 w-8 h-8 flex items-center justify-center mx-auto ${
                    selectedFormat === format ? 'text-teal-600' : 'text-gray-600'
                  }`}></i>
                  <p className={`text-sm font-medium ${
                    selectedFormat === format ? 'text-teal-900' : 'text-gray-700'
                  }`}>
                    {format.toUpperCase()}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">期間選択</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'week', label: '今週' },
                { value: 'month', label: '今月' },
                { value: 'quarter', label: '今四半期' },
                { value: 'year', label: '今年' },
              ].map((period) => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedPeriod === period.value
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">開始日</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">終了日</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">エクスポートするデータ</label>
            <div className="space-y-2">
              {[
                { id: 'sales', label: '売上データ', icon: 'ri-money-dollar-circle-line' },
                { id: 'orders', label: '注文データ', icon: 'ri-shopping-cart-line' },
                { id: 'customers', label: '顧客データ', icon: 'ri-user-line' },
                { id: 'products', label: '商品データ', icon: 'ri-product-hunt-line' },
                { id: 'analytics', label: '分析データ', icon: 'ri-bar-chart-line' },
              ].map((item) => (
                <label key={item.id} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-teal-500 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <i className={`${item.icon} ml-3 text-gray-600 w-5 h-5 flex items-center justify-center`}></i>
                  <span className="ml-2 text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button className="w-full md:w-auto px-8 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium whitespace-nowrap">
              <i className="ri-download-2-line mr-2"></i>
              データをエクスポート
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">エクスポート履歴</h3>
        <div className="space-y-3">
          {[
            { name: '売上レポート_2024年1月.csv', date: '2024-01-15 14:30', size: '2.4 MB', status: '完了' },
            { name: '顧客データ_2024年1月.xlsx', date: '2024-01-14 10:15', size: '1.8 MB', status: '完了' },
            { name: '分析レポート_Q4.pdf', date: '2024-01-10 16:45', size: '5.2 MB', status: '完了' },
            { name: '注文データ_2023年12月.csv', date: '2024-01-05 09:20', size: '3.1 MB', status: '完了' },
          ].map((file, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <i className="ri-file-line text-teal-600 w-5 h-5 flex items-center justify-center"></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{file.date} · {file.size}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full whitespace-nowrap">
                  {file.status}
                </span>
                <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                  <i className="ri-download-2-line w-5 h-5 flex items-center justify-center"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-teal-50 to-teal-100 rounded-lg p-6 border border-teal-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <i className="ri-information-line text-2xl text-white w-6 h-6 flex items-center justify-center"></i>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-teal-900 mb-2">エクスポートに関する注意事項</h4>
            <ul className="text-xs text-teal-800 space-y-1">
              <li>• 大量のデータをエクスポートする場合、処理に時間がかかることがあります</li>
              <li>• エクスポートしたファイルは30日間保存されます</li>
              <li>• 個人情報を含むデータの取り扱いには十分ご注意ください</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Export;
