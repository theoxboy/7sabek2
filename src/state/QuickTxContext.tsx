"use client";

import React, { createContext, useContext, useState } from "react";

type QuickTxType = "income" | "expense";

interface QuickTxContextType {
  isOpen: boolean;
  type: QuickTxType;
  bootstrapOptions: any;
  openQuickTx: (type: QuickTxType, bootstrapOptions?: any) => void;
  closeQuickTx: () => void;
}

const QuickTxContext = createContext<QuickTxContextType | undefined>(undefined);

export const QuickTxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<QuickTxType>("expense");
  const [bootstrapOptions, setBootstrapOptions] = useState<any>(null);

  const openQuickTx = (newType: QuickTxType, options: any = null) => {
    setType(newType);
    setBootstrapOptions(options);
    setIsOpen(true);
  };

  const closeQuickTx = () => {
    setIsOpen(false);
    setBootstrapOptions(null);
  };

  return (
    <QuickTxContext.Provider value={{ isOpen, type, bootstrapOptions, openQuickTx, closeQuickTx }}>
      {children}
    </QuickTxContext.Provider>
  );
};

export const useQuickTx = () => {
  const context = useContext(QuickTxContext);
  if (!context) {
    throw new Error("useQuickTx must be used within a QuickTxProvider");
  }
  return context;
};
