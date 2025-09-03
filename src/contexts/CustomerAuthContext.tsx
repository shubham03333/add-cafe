"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Customer {
  id: number;
  name: string;
  mobile: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  customer: Customer | null;
  token: string | null;
  login: (token: string, customer: Customer) => void;
  logout: () => void;
  loading: boolean;
}

const CustomerAuthContext = createContext<AuthContextType | undefined>(undefined);

export const CustomerAuthProvider = ({ children }: { children: ReactNode }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load token and customer from localStorage on mount
    const storedToken = localStorage.getItem("customer_token");
    const storedCustomer = localStorage.getItem("customer_data");
    if (storedToken && storedCustomer) {
      setToken(storedToken);
      setCustomer(JSON.parse(storedCustomer));
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newCustomer: Customer) => {
    setToken(newToken);
    setCustomer(newCustomer);
    localStorage.setItem("customer_token", newToken);
    localStorage.setItem("customer_data", JSON.stringify(newCustomer));
  };

  const logout = () => {
    setToken(null);
    setCustomer(null);
    localStorage.removeItem("customer_token");
    localStorage.removeItem("customer_data");
  };

  return (
    <CustomerAuthContext.Provider value={{ customer, token, login, logout, loading }}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = (): AuthContextType => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error("useCustomerAuth must be used within a CustomerAuthProvider");
  }
  return context;
};
