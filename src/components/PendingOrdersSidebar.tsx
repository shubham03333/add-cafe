import React from 'react';
import { Clock, ChefHat, Edit2, Trash2, X } from 'lucide-react';
import { Order, Table } from '@/types';

interface PendingOrdersSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  selectedTableFilter: string | null;
  setSelectedTableFilter: (filter: string | null) => void;
  tables: Table[];
  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
  onOrderClick: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onServeOrder: (order: Order) => void;
  onDeleteOrder: (orderId: string) => void;
  onRemoveItem: (orderId: string, itemId: number) => void;
}

const PendingOrdersSidebar: React.FC<PendingOrdersSidebarProps> = ({
  isOpen,
  onClose,
  orders,
  selectedTableFilter,
  setSelectedTableFilter,
  tables,
  isDropdownOpen,
  setIsDropdownOpen,
  onOrderClick,
  onEditOrder,
  onServeOrder,
  onDeleteOrder,
  onRemoveItem,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Dark overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className={`fixed right-0 top-0 h-full w-80 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Sidebar Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-white font-semibold text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Orders ({orders.length})
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table Filter */}
        <div className="bg-gray-50 p-4 border-b border-gray-200 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="px-3 py-2 border border-gray-400 rounded-lg text-sm bg-white text-black focus:ring-2 focus:ring-red-500 focus:border-transparent w-full text-left flex items-center justify-between min-h-[40px] shadow-sm hover:border-gray-500 transition-colors"
            >
              <span className="truncate">
                {selectedTableFilter ? (
                  (() => {
                    const tableDetails = tables.find(table => table.table_code === selectedTableFilter);
                    return (
                      <>
                        <span className="sm:hidden">T{selectedTableFilter}</span>
                        <span className="hidden sm:inline">
                          {tableDetails ? `Table ${selectedTableFilter} - ${tableDetails.table_name}` : `Table ${selectedTableFilter}`}
                        </span>
                      </>
                    );
                  })()
                ) : (
                  'All Tables'
                )}
              </span>
              <svg
                className={`w-4 h-4 text-gray-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Custom dropdown options */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-300 rounded-b-lg shadow-lg max-h-48 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedTableFilter(null);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-black hover:bg-gray-100 transition-colors border-b border-gray-100"
                >
                  All Tables
                </button>
                <button
                  onClick={() => {
                    setSelectedTableFilter('takeaway');
                    setIsDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-black hover:bg-gray-100 transition-colors border-b border-gray-100"
                >
                  Takeaway Orders
                </button>
                {tables.filter(table => orders.some(order => order.table_code === table.table_code && order.status !== 'served')).map(table => (
                  <button
                    key={table.table_code}
                    onClick={() => {
                      setSelectedTableFilter(table.table_code);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-black hover:bg-gray-100 transition-colors"
                  >
                    <span className="sm:hidden">T{table.table_code}</span>
                    <span className="hidden sm:inline">
                      Table {table.table_code} - {table.table_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Click outside to close */}
          {isDropdownOpen && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsDropdownOpen(false)}
            />
          )}
        </div>

        {/* Order Queue Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
              <ChefHat className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <div className="text-lg">No orders in queue</div>
              <div className="text-sm mt-2">Start building orders from the menu!</div>
            </div>
          ) : (
            <div className="space-y-3 pr-1">
              {orders
                .filter(order => {
                  if (!selectedTableFilter) return true; // All tables
                  if (selectedTableFilter === 'takeaway') return order.order_type === 'TAKEAWAY';
                  return order.table_code === selectedTableFilter;
                })
                .map(order => (
                <div
                  key={order.id}
                  className="p-3 sm:p-4 md:p-5 rounded-lg border-l-4 border-red-500 bg-gradient-to-r from-red-50 to-white shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => onOrderClick(order)}
                >
                  <div className="flex flex-row justify-between items-center gap-2 mb-2">
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-red-700 flex-shrink-0" />
                      <span className="font-bold text-sm sm:text-base md:text-lg text-red-900">#{order.order_number.toString().padStart(3, '0')}</span>
                      {order.order_type === 'DINE_IN' && order.table_code && (
                        <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-blue-200 text-blue-900 rounded-full text-xs font-semibold flex-shrink-0">
                          Table {order.table_code}
                        </span>
                      )}
                      {order.order_type === 'TAKEAWAY' && (
                        <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-green-200 text-green-900 rounded-full text-xs font-semibold flex-shrink-0">
                          Takeaway
                        </span>
                      )}
                      {order.order_type === 'DELIVERY' && (
                        <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-purple-200 text-purple-900 rounded-full text-xs font-semibold flex-shrink-0">
                          Delivery
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                        order.status === 'preparing'
                          ? 'bg-yellow-200 text-yellow-900'
                          : order.status === 'ready'
                          ? 'bg-green-200 text-green-900'
                          : order.status === 'served'
                          ? 'bg-red-200 text-red-900'
                          : 'bg-orange-200 text-orange-900'
                      }`}>
                        {order.status}
                      </span>
                      {/* Payment Status Indicator - Compact */}
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                        order.payment_status === 'paid'
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : order.payment_status === 'failed'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}>
                        <span className="text-xs">
                          {order.payment_status === 'paid' ? '✓' : order.payment_status === 'failed' ? '✗' : '~'}
                        </span>
                        <span className="hidden sm:inline text-xs">
                          {order.payment_status === 'paid' ? 'Paid' : order.payment_status === 'failed' ? 'Failed' : 'Pending'}
                        </span>
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-sm sm:text-base md:text-lg text-red-900 whitespace-nowrap">₹{order.total}</div>
                    </div>
                  </div>

                  <div className="mb-2 sm:mb-3 md:mb-4">
                    {order.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs sm:text-sm text-gray-900 py-1 sm:py-2 border-b border-red-100 last:border-b-0">
                        <span className="font-medium">{item.quantity}x {item.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveItem(order.id, item.id);
                          }}
                          className="p-1 sm:p-1.5 md:p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-row gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditOrder(order);
                      }}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-xs"
                      title="Edit order"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onServeOrder(order);
                      }}
                      className="flex-1 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-xs"
                    >
                      Serve

                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteOrder(order.id);
                      }}
                      className="px-1 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-0.5 text-xs"
                      title="Delete order"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PendingOrdersSidebar;
