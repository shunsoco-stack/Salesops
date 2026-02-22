import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardOverview from './components/DashboardOverview';
import SalesList from './components/SalesList';
import Reports from './components/Reports';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import Export from './components/Export';
import DailySalesInput from './components/DailySalesInput';
import CsvImport from './components/CsvImport';

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'daily-input':
        return <DailySalesInput />;
      case 'csv-import':
        return <CsvImport />;
      case 'sales':
        return <SalesList />;
      case 'reports':
        return <Reports />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      case 'export':
        return <Export />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
