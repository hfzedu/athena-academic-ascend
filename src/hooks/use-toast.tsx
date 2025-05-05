
import * as React from "react";
import { useToastContext } from "@/contexts/toast-context";
import { ToastProvider } from "@/contexts/toast-context";

export { ToastProvider };

export const useToast = () => {
  const { toast, dismiss, toasts } = useToastContext();
  return { toast, dismiss, toasts };
};
