'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, User, Shield, Eye, EyeOff, Users, Phone } from 'lucide-react';
import { Customer } from '@/types';

interface User {
  id: number;
  username: string;
  role_id: number;
  role_name: string;
  created_at: string;
  updated_at: string;
}

interface Role {
  id: number;
  role_name: string;
  permissions: any;
}

interface UserFormData {
  username: string;
  password: string;
  role_id: number;
}

interface CustomerFormData {
  name: string;
  mobile: string;
  password: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newUser, setNewUser] = useState<UserFormData>({
    username: '',
    password: '',
    role_id: 1 // Default to first role
  });
  const [newCustomer, setNewCustomer] = useState<CustomerFormData>({
    name: '',
    mobile: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'customers'>('users');

  // Fetch users and roles
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersResponse, rolesResponse, customersResponse] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/user-roles'),
        fetch('/api/customers')
      ]);

      if (!usersResponse.ok) throw new Error('Failed to fetch users');
      if (!rolesResponse.ok) throw new Error('Failed to fetch roles');
      if (!customersResponse.ok) throw new Error('Failed to fetch customers');

      const usersData = await usersResponse.json();
      const rolesData = await rolesResponse.json();
      const customersData = await customersResponse.json();

      setUsers(usersData);
      setRoles(rolesData);
      setCustomers(customersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.role_id) {
      setError('Please fill all fields');
      return;
    }

    setError(null);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      await fetchData();
      setNewUser({ username: '', password: '', role_id: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !newUser.username || !newUser.role_id) {
      setError('Please fill all required fields');
      return;
    }

    setError(null);
    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password || undefined,
          role_id: newUser.role_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      await fetchData();
      setEditingUser(null);
      setNewUser({ username: '', password: '', role_id: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    setError(null);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setNewUser({
      username: user.username,
      password: '',
      role_id: user.role_id
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setNewUser({ username: '', password: '', role_id: 1 });
  };

  // Customer CRUD functions
  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.mobile || !newCustomer.password) {
      setError('Please fill all fields');
      return;
    }

    setError(null);
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create customer');
      }

      await fetchData();
      setNewCustomer({ name: '', mobile: '', password: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer || !newCustomer.name || !newCustomer.mobile) {
      setError('Please fill all required fields');
      return;
    }

    setError(null);
    try {
      const response = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustomer.name,
          mobile: newCustomer.mobile,
          password: newCustomer.password || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update customer');
      }

      await fetchData();
      setEditingCustomer(null);
      setNewCustomer({ name: '', mobile: '', password: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer');
    }
  };

  const handleDeleteCustomer = async (customerId: number) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    setError(null);
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete customer');
      }

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
    }
  };

  const startEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setNewCustomer({
      name: customer.name,
      mobile: customer.mobile,
      password: ''
    });
  };

  const cancelEditCustomer = () => {
    setEditingCustomer(null);
    setNewCustomer({ name: '', mobile: '', password: '' });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-800 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'users'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Shield className="w-4 h-4" />
            Staff Users
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'customers'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Customers
          </button>
        </div>

        {activeTab === 'users' ? (
          <>
            {/* Add/Edit User Form */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Username</label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-gray-900"
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded text-gray-900 pr-10"
                      placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Role</label>
                  <select
                    value={newUser.role_id}
                    onChange={(e) => setNewUser({ ...newUser, role_id: parseInt(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded text-gray-900"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.role_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={editingUser ? handleUpdateUser : handleCreateUser}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingUser ? 'Update User' : 'Add User'}
                </button>

                {editingUser && (
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Users List */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Users ({users.length})</h3>
                <button
                  onClick={fetchData}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
                >
                  Refresh
                </button>
              </div>

              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                        <User className="w-5 h-5" />
                      </div>

                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-700 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          {user.role_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Created: {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditUser(user)}
                        className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {users.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <div className="text-lg">No users found</div>
                  <div className="text-sm">Add users using the form above</div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Add/Edit Customer Form */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Name</label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-gray-900"
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Mobile</label>
                  <input
                    type="text"
                    value={newCustomer.mobile}
                    onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-gray-900"
                    placeholder="Enter mobile number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newCustomer.password}
                      onChange={(e) => setNewCustomer({ ...newCustomer, password: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded text-gray-900 pr-10"
                      placeholder={editingCustomer ? "Leave blank to keep current" : "Enter password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={editingCustomer ? handleUpdateCustomer : handleCreateCustomer}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingCustomer ? 'Update Customer' : 'Add Customer'}
                </button>

                {editingCustomer && (
                  <button
                    onClick={cancelEditCustomer}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Customers List */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Customers ({customers.length})</h3>
                <button
                  onClick={fetchData}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
                >
                  Refresh
                </button>
              </div>

              <div className="space-y-3">
                {customers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <Users className="w-5 h-5" />
                      </div>

                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{customer.name}</div>
                        <div className="text-sm text-gray-700 flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {customer.mobile}
                        </div>
                        <div className="text-xs text-gray-500">
                          Created: {new Date(customer.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditCustomer(customer)}
                        className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteCustomer(customer.id)}
                        className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {customers.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <div className="text-lg">No customers found</div>
                  <div className="text-sm">Add customers using the form above</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
