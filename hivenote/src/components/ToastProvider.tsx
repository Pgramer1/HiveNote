"use client";

import { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  showToast: (message: string, type: ToastType) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              px-6 py-4 rounded-lg shadow-lg border-2 flex items-center gap-3 min-w-[300px] animate-slide-in
              ${toast.type === "success" ? "bg-green-50 dark:bg-green-900 border-green-500 dark:border-green-400" : ""}
              ${toast.type === "error" ? "bg-red-50 dark:bg-red-900 border-red-500 dark:border-red-400" : ""}
              ${toast.type === "info" ? "bg-blue-50 dark:bg-blue-900 border-blue-500 dark:border-blue-400" : ""}
            `}
          >
            <span className="text-2xl">
              {toast.type === "success" && "✅"}
              {toast.type === "error" && "❌"}
              {toast.type === "info" && "ℹ️"}
            </span>
            <p className={`flex-1 font-medium ${
              toast.type === "success" ? "text-green-900 dark:text-green-100" : ""
            }${
              toast.type === "error" ? "text-red-900 dark:text-red-100" : ""
            }${
              toast.type === "info" ? "text-blue-900 dark:text-blue-100" : ""
            }`}>
              {toast.message}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
