import { useState } from 'react';

const Settings = () => {
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: true,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">設定</h2>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">アカウント設定</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">会社名</label>
              <input
                type="text"
                defaultValue="株式会社サンプル"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">担当者名</label>
              <input
                type="text"
                defaultValue="山田太郎"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">メールアドレス</label>
              <input
                type="email"
                defaultValue="yamada@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">電話番号</label>
              <input
                type="tel"
                defaultValue="03-1234-5678"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">通知設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">メール通知</p>
              <p className="text-xs text-gray-600 mt-1">新規注文や重要な更新をメールで受け取る</p>
            </div>
            <button
              onClick={() => setNotifications({...notifications, email: !notifications.email})}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notifications.email ? 'bg-teal-500' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                notifications.email ? 'translate-x-6' : 'translate-x-0'
              }`}></span>
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">プッシュ通知</p>
              <p className="text-xs text-gray-600 mt-1">ブラウザでリアルタイム通知を受け取る</p>
            </div>
            <button
              onClick={() => setNotifications({...notifications, push: !notifications.push})}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notifications.push ? 'bg-teal-500' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                notifications.push ? 'translate-x-6' : 'translate-x-0'
              }`}></span>
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">SMS通知</p>
              <p className="text-xs text-gray-600 mt-1">緊急の通知をSMSで受け取る</p>
            </div>
            <button
              onClick={() => setNotifications({...notifications, sms: !notifications.sms})}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notifications.sms ? 'bg-teal-500' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                notifications.sms ? 'translate-x-6' : 'translate-x-0'
              }`}></span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">表示設定</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">言語</label>
            <select className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm">
              <option>日本語</option>
              <option>English</option>
              <option>中文</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">タイムゾーン</label>
            <select className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm">
              <option>Asia/Tokyo (JST)</option>
              <option>America/New_York (EST)</option>
              <option>Europe/London (GMT)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">通貨</label>
            <select className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm">
              <option>日本円 (¥)</option>
              <option>米ドル ($)</option>
              <option>ユーロ (€)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">セキュリティ</h3>
        <div className="space-y-4">
          <button className="w-full md:w-auto px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium whitespace-nowrap">
            <i className="ri-lock-password-line mr-2"></i>
            パスワードを変更
          </button>
          <button className="w-full md:w-auto px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium whitespace-nowrap ml-0 md:ml-3">
            <i className="ri-shield-check-line mr-2"></i>
            二段階認証を設定
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium whitespace-nowrap">
          キャンセル
        </button>
        <button className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium whitespace-nowrap">
          変更を保存
        </button>
      </div>
    </div>
  );
};

export default Settings;
