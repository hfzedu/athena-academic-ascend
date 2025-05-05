
import * as React from "react";
import { useToastContext } from "@/contexts/toast-context";
import { ToastProvider } from "@/contexts/toast-context";
import { genId } from "@/utils/toast-utils";
import type { ToasterToast } from "@/types/toast";

export { ToastProvider };

// Create a standalone toast function that doesn't require hooks
export const toast = (props: Omit<ToasterToast, "id">) => {
  const id = genId();
  const dispatch = globalToastDispatch;
  
  if (!dispatch) {
    console.error("Toast was called outside of ToastProvider context!");
    return { id, dismiss: () => {}, update: () => {} };
  }
  
  dispatch({
    type: "ADD_TOAST",
    toast: { id, ...props },
  });

  return {
    id,
    dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: id }),
    update: (props: ToasterToast) => 
      dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } }),
  };
};

// Global reference for the toast dispatch function
let globalToastDispatch: React.Dispatch<any> | null = null;

// Export the setGlobalToastDispatch function to be used in the ToastProvider
export const setGlobalToastDispatch = (dispatch: React.Dispatch<any>) => {
  globalToastDispatch = dispatch;
};

// Hook for component access to toast functionality
export const useToast = () => {
  const { toast: contextToast, dismiss, toasts } = useToastContext();
  return { toast: contextToast, dismiss, toasts };
};
