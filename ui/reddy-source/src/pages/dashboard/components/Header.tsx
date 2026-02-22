interface HeaderProps {
  toggleSidebar: () => void;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
  return (
    <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
        >
          <i className="ri-menu-line text-xl w-6 h-6 flex items-center justify-center"></i>
        </button>
        <h1 className="text-xl font-semibold text-gray-800">売上管理システム</h1>
      </div>
      <div className="flex items-center gap-4">
        <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
          <i className="ri-notification-3-line text-xl w-6 h-6 flex items-center justify-center"></i>
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
          <i className="ri-user-line text-xl w-6 h-6 flex items-center justify-center"></i>
        </button>
      </div>
    </header>
  );
};

export default Header;
