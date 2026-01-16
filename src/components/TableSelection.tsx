'use client';

import { useState, useEffect } from 'react';
import { Table } from '@/types';

interface TableSelectionProps {
  onTableSelect: (table: Table) => void;
  onOccupiedTableSelect?: (table: Table) => void;
  onBack?: () => void;
  onTakeawaySelect?: () => void;
}

const TableSelection = ({ onTableSelect, onOccupiedTableSelect, onBack, onTakeawaySelect }: TableSelectionProps) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTables();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchTables, 60000);

    return () => clearInterval(interval);
  }, []);

  const fetchTables = async () => {
    try {
      const response = await fetch('/api/tables');
      if (!response.ok) throw new Error('Failed to fetch tables');
      const data = await response.json();

      // Sort tables by numeric table_code, handling formats like 'T01', '1', 'Table 1'
      const sortedTables = data.sort((a: Table, b: Table) => {
        // Extract numeric part from table_code
        const getNumericCode = (code: string) => {
          // Handle formats like 'T01', 'Table 1', '1'
          const match = code.match(/(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        };

        const aNum = getNumericCode(a.table_code);
        const bNum = getNumericCode(b.table_code);
        return aNum - bNum;
      });

      setTables(sortedTables);
    } catch (err) {
      setError('Failed to load tables');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 max-w-md mx-auto flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading tables...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 max-w-md mx-auto flex items-center justify-center">
        <div className="text-center text-red-600">
          <div className="text-xl font-bold mb-2">Error</div>
          <div>{error}</div>
          <button
            onClick={fetchTables}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded w-full sm:w-auto"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 rounded-2xl shadow-xl p-6 mb-6 text-center relative">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute left-4 top-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-2 rounded-full transition-colors"
            title="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="absolute inset-0 bg-black/10 rounded-2xl"></div>
        <div className="relative z-10">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 mx-auto mb-4" />
          {/* <h1 className="text-2xl font-bold text-white mb-2">Adda Cafe</h1> */}
          {/* <p className="text-red-100">Select your table</p> */}
        </div>
      </div>



      {/* Table Selection */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Available Tables</h2>
          {onTakeawaySelect && (
            <button
              onClick={onTakeawaySelect}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200"
            >
              TAKEAWAY
            </button>
          )}
        </div>

        {tables.filter(table => table.is_active).length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-md">
            <div className="text-4xl mb-4">🍽️</div>
            <div className="text-lg">No tables available</div>
            <div className="text-sm mt-2">Please try again later</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {tables.filter(table => table.is_active).map((table) => (
              <div
                key={table.id}
                className={`relative p-6 rounded-2xl shadow-lg transition-all duration-300 border-2 ${
                  table.is_occupied
                    ? 'bg-gray-100 text-gray-500 border-gray-300 opacity-60 cursor-not-allowed'
                    : 'bg-white hover:bg-gray-50 text-gray-900 hover:shadow-xl border-gray-200 hover:border-red-300 cursor-pointer'
                }`}
              >
                <div className="text-center">
                  <div className={`text-3xl mb-2 ${table.is_occupied ? 'text-red-500' : ''}`}>
                    {table.is_occupied ? '🚫' : '🍽️'}
                  </div>
                  <div className="text-lg font-bold mb-1">Table {table.table_code}</div>
                  <div className="text-sm text-gray-600">Capacity: {table.capacity}</div>
                  <div className={`text-xs mt-2 ${table.is_occupied ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                    {table.is_occupied ? 'Occupied' : 'Tap to select'}
                  </div>
                </div>
                {!table.is_occupied && (
                  <button
                    type="button"
                    onClick={() => {
                      console.log('🔍 Selecting table:', table);
                      onTableSelect(table);
                    }}
                    className="absolute inset-0 w-full h-full rounded-2xl"
                    title="Select table"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>Pure Veg • Fresh • Tasty</p>
      </div>
    </div>
  );
};

export default TableSelection;
