
import { useState, useRef, useCallback } from 'react';

interface CsvRow {
  date: string;
  amount: number;
}

interface ImportResult {
  type: 'point' | 'credit' | 'qr';
  fileName: string;
  rows: CsvRow[];
  totalAmount: number;
  importedAt: string;
}

type ImportType = 'point' | 'credit' | 'qr';

const typeConfig: Record<ImportType, { label: string; icon: string; color: string; bgColor: string; borderColor: string; lightBg: string }> = {
  point: {
    label: 'ポイント利用',
    icon: 'ri-coupon-3-line',
    color: 'text-rose-600',
    bgColor: 'bg-rose-500',
    borderColor: 'border-rose-200',
    lightBg: 'bg-rose-50',
  },
  credit: {
    label: 'クレジットカード払い',
    icon: 'ri-bank-card-line',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-500',
    borderColor: 'border-indigo-200',
    lightBg: 'bg-indigo-50',
  },
  qr: {
    label: 'QRコード払い',
    icon: 'ri-qr-code-line',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500',
    borderColor: 'border-emerald-200',
    lightBg: 'bg-emerald-50',
  },
};

const CsvImport = () => {
  const [activeType, setActiveType] = useState<ImportType>('point');
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [previewData, setPreviewData] = useState<CsvRow[] | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const parseCsv = useCallback((text: string): CsvRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('データが不足しています。ヘッダー行とデータ行が必要です。');

    const rows: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));

      if (cols.length < 2) continue;

      const dateStr = cols[0];
      const amountStr = cols[1].replace(/[¥￥,、]/g, '');
      const amount = parseInt(amountStr, 10);

      if (!dateStr || Number.isNaN(amount)) continue;

      const dateMatch = dateStr.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
      if (!dateMatch) continue;

      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10);
      const day = parseInt(dateMatch[3], 10);
      const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      rows.push({ date: formattedDate, amount });
    }

    if (rows.length === 0) throw new Error('有効なデータが見つかりませんでした。CSV形式を確認してください。');

    return rows;
  }, []);

  const handleFile = useCallback((file: File) => {
    setErrorMessage('');
    setPreviewData(null);

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.CSV')) {
      setErrorMessage('CSVファイルのみ対応しています。');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('ファイルサイズが大きすぎます（上限5MB）。');
      return;
    }

    setParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseCsv(text);
        setPreviewData(rows);
        setPreviewFileName(file.name);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'ファイルの読み込みに失敗しました。');
      } finally {
        setParsing(false);
      }
    };
    reader.onerror = () => {
      setErrorMessage('ファイルの読み込みに失敗しました。');
      setParsing(false);
    };
    reader.readAsText(file, 'UTF-8');
  }, [parseCsv]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleFile]);

  const handleImport = () => {
    if (!previewData) return;

    const totalAmount = previewData.reduce((sum, r) => sum + r.amount, 0);
    const result: ImportResult = {
      type: activeType,
      fileName: previewFileName,
      rows: previewData,
      totalAmount,
      importedAt: new Date().toLocaleString('ja-JP'),
    };

    setImportResults((prev) => [result, ...prev]);
    setPreviewData(null);
    setPreviewFileName('');
    showNotification(`${typeConfig[activeType].label}のCSVデータを取り込みました（${previewData.length}件）`);
  };

  const handleCancelPreview = () => {
    setPreviewData(null);
    setPreviewFileName('');
    setErrorMessage('');
  };

  const handleDeleteResult = (index: number) => {
    setImportResults((prev) => prev.filter((_, i) => i !== index));
    showNotification('取込データを削除しました');
  };

  const config = typeConfig[activeType];

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="fixed top-6 right-6 z-50 bg-teal-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
          <i className="ri-check-line text-xl w-5 h-5 flex items-center justify-center"></i>
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">CSV取込</h2>
      </div>

      {/* 取込タイプ選択 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
            <i className="ri-file-upload-line text-xl text-white w-5 h-5 flex items-center justify-center"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">取込データの種類を選択</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {(Object.keys(typeConfig) as ImportType[]).map((type) => {
            const tc = typeConfig[type];
            const isActive = activeType === type;
            return (
              <button
                key={type}
                onClick={() => {
                  setActiveType(type);
                  setPreviewData(null);
                  setPreviewFileName('');
                  setErrorMessage('');
                }}
                className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer text-left ${
                  isActive
                    ? `${tc.borderColor} ${tc.lightBg}`
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? tc.bgColor : 'bg-gray-200'}`}>
                    <i className={`${tc.icon} text-xl ${isActive ? 'text-white' : 'text-gray-500'} w-5 h-5 flex items-center justify-center`}></i>
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isActive ? tc.color : 'text-gray-700'}`}>{tc.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">CSVファイルで取込</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* CSV形式の説明 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <i className="ri-information-line text-gray-500 w-4 h-4 flex items-center justify-center"></i>
            <span className="text-xs font-semibold text-gray-700">CSVファイルの形式</span>
          </div>
          <p className="text-xs text-gray-600 mb-2">1行目はヘッダー行、2行目以降がデータ行です。</p>
          <div className="bg-white rounded-md border border-gray-200 p-3 font-mono text-xs text-gray-700">
            <p className="text-gray-400">日付,金額</p>
            <p>2025-01-15,12500</p>
            <p>2025-01-14,8200</p>
            <p>2025-01-13,5600</p>
          </div>
        </div>

        {/* ドラッグ＆ドロップエリア */}
        {!previewData && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-all duration-200 ${
              dragOver
                ? `${config.borderColor} ${config.lightBg}`
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }`}
          >
            {parsing ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-gray-300 border-t-teal-500 rounded-full animate-spin"></div>
                <p className="text-sm text-gray-600">読み込み中...</p>
              </div>
            ) : (
              <>
                <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4 ${config.lightBg}`}>
                  <i className={`ri-upload-cloud-2-line text-3xl ${config.color} w-8 h-8 flex items-center justify-center`}></i>
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  CSVファイルをドラッグ＆ドロップ
                </p>
                <p className="text-xs text-gray-500 mb-4">または</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-5 py-2.5 ${config.bgColor} text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer`}
                >
                  <i className="ri-folder-open-line mr-1.5"></i>
                  ファイルを選択
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </>
            )}
          </div>
        )}

        {/* エラーメッセージ */}
        {errorMessage && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <i className="ri-error-warning-line text-red-500 text-xl w-5 h-5 flex items-center justify-center"></i>
            <p className="text-sm text-red-700">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage('')}
              className="ml-auto text-red-400 hover:text-red-600 cursor-pointer"
            >
              <i className="ri-close-line w-5 h-5 flex items-center justify-center"></i>
            </button>
          </div>
        )}

        {/* プレビュー */}
        {previewData && (
          <div className={`mt-4 border ${config.borderColor} rounded-lg overflow-hidden`}>
            <div className={`${config.lightBg} px-5 py-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 ${config.bgColor} rounded-lg flex items-center justify-center`}>
                  <i className={`${config.icon} text-white w-4 h-4 flex items-center justify-center`}></i>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${config.color}`}>
                    {config.label} — プレビュー
                  </p>
                  <p className="text-xs text-gray-500">{previewFileName} — {previewData.length}件</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${config.color}`}>
                  合計: &yen;{previewData.reduce((s, r) => s + r.amount, 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-600">#</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-600">日付</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-600">金額</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewData.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-5 py-2.5 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-5 py-2.5 text-sm text-gray-900">{row.date}</td>
                      <td className="px-5 py-2.5 text-sm font-semibold text-gray-900 text-right">
                        &yen;{row.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={handleCancelPreview}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                キャンセル
              </button>
              <button
                onClick={handleImport}
                className={`px-5 py-2.5 ${config.bgColor} text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer flex items-center gap-2`}
              >
                <i className="ri-download-2-line w-4 h-4 flex items-center justify-center"></i>
                取り込む（{previewData.length}件）
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 取込履歴 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">取込履歴</h3>
        </div>

        {importResults.length === 0 ? (
          <div className="p-12 text-center">
            <i className="ri-inbox-line text-4xl text-gray-300 w-10 h-10 flex items-center justify-center mx-auto mb-3"></i>
            <p className="text-sm text-gray-500">まだ取込データはありません</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {importResults.map((result, index) => {
              const tc = typeConfig[result.type];
              return (
                <div key={index} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 ${tc.bgColor} rounded-lg flex items-center justify-center`}>
                      <i className={`${tc.icon} text-xl text-white w-5 h-5 flex items-center justify-center`}></i>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${tc.color}`}>{tc.label}</span>
                        <span className="text-xs text-gray-400">|</span>
                        <span className="text-xs text-gray-500">{result.fileName}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">{result.rows.length}件</span>
                        <span className="text-xs text-gray-400">|</span>
                        <span className="text-xs text-gray-500">{result.importedAt}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-gray-900">
                      &yen;{result.totalAmount.toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleDeleteResult(index)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="削除"
                    >
                      <i className="ri-delete-bin-line w-5 h-5 flex items-center justify-center"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CsvImport;
