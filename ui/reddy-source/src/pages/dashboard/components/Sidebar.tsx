interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar = ({ activeSection, setActiveSection, isOpen }: SidebarProps) => {
  const menuItems = [
    { id: 'dashboard', label: 'ダッシュボード', icon: 'ri-dashboard-line' },
    { id: 'daily-input', label: '売上入力', icon: 'ri-pencil-line' },
    { id: 'csv-import', label: 'CSV取込', icon: 'ri-file-upload-line' },
    { id: 'sales', label: '売上一覧', icon: 'ri-file-list-3-line' },
    { id: 'reports', label: 'レポート', icon: 'ri-file-chart-line' },
    { id: 'analytics', label: '分析', icon: 'ri-bar-chart-box-line' },
    { id: 'settings', label: '設定', icon: 'ri-settings-3-line' },
    { id: 'export', label: 'エクスポート', icon: 'ri-download-2-line' },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40 ${isOpen ? 'w-64' : 'w-20'}`}>
      <div className="flex items-center justify-center h-20 border-b border-gray-200 px-4">
        <img 
          src="https://public.readdy.ai/ai/img_res/bf751867-192b-4808-8e59-abd45b396067.png" 
          alt="Logo" 
          className={`transition-all duration-300 ${isOpen ? 'h-12' : 'h-10'}`}
        />
      </div>
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 whitespace-nowrap ${
                  activeSection === item.id
                    ? 'bg-teal-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <i className={`${item.icon} text-xl w-6 h-6 flex items-center justify-center`}></i>
                {isOpen && <span className="ml-3 text-sm font-medium">{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
