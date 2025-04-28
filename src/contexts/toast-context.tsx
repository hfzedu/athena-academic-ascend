
import * as React from "react";
import { ToastContextType } from "@/types/toast";

export const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const useToastContext = () => {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToastContext must be used within a ToastProvider");
  }
  return context;
};
