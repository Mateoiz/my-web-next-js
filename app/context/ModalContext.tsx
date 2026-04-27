"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaCheckCircle, FaSignOutAlt, FaTrashAlt, FaExclamationTriangle, FaTimes } from "react-icons/fa";

interface ModalState {
  isOpen: boolean;
  title?: string;
  message?: string;
  type?: "alert" | "confirm";
  confirmText?: string;
  isDestructive?: boolean;
  onConfirm?: () => void;
}

interface ModalContextValue {
  showAlert: (title: string, message: string) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string,
    isDestructive?: boolean
  ) => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState>({ isOpen: false });

  const closeModal = useCallback(() => setModal({ isOpen: false }), []);

  const showAlert = useCallback((title: string, message: string) => {
    setModal({ isOpen: true, title, message, type: "alert", isDestructive: false });
  }, []);

  const showConfirm = useCallback(
    (title: string, message: string, onConfirm: () => void, confirmText = "Confirm", isDestructive = true) => {
      setModal({ isOpen: true, title, message, type: "confirm", onConfirm, confirmText, isDestructive });
    },
    []
  );

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      <AnimatePresence>
        {modal.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-[2rem] p-6 md:p-8 shadow-2xl z-10 text-center flex flex-col items-center"
            >
              {/* Icon */}
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${
                  modal.isDestructive
                    ? "bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400"
                    : "bg-[#06402B]/10 text-[#06402B] dark:bg-emerald-500/20 dark:text-emerald-400"
                }`}
              >
                {modal.isDestructive ? (
                  <FaTrashAlt size={24} />
                ) : modal.type === "confirm" ? (
                  <FaSignOutAlt size={24} />
                ) : (
                  <FaCheckCircle size={24} />
                )}
              </div>

              <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
                {modal.title}
              </h3>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-8">
                {modal.message}
              </p>

              <div className="flex gap-3 w-full">
                {modal.type === "confirm" && (
                  <button
                    onClick={closeModal}
                    className="flex-1 py-3.5 bg-zinc-100 dark:bg-[#18181b] text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => {
                    modal.onConfirm?.();
                    closeModal();
                  }}
                  className={`flex-1 py-3.5 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-md ${
                    modal.isDestructive
                      ? "bg-red-600 hover:bg-red-500"
                      : "bg-[#06402B] hover:bg-[#042d1f] dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  }`}
                >
                  {modal.confirmText || "Okay"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
}