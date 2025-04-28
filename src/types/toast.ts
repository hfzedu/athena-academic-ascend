
import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

export type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

export interface ToastContextType {
  toasts: ToasterToast[];
  toast: (props: Omit<ToasterToast, "id">) => { 
    id: string; 
    dismiss: () => void; 
    update: (props: ToasterToast) => void 
  };
  dismiss: (toastId?: string) => void;
}

export const TOAST_LIMIT = 1;
export const TOAST_REMOVE_DELAY = 1000000;

export const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

export type ActionType = typeof actionTypes;

export type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: ToasterToast["id"];
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: ToasterToast["id"];
    };

export interface State {
  toasts: ToasterToast[];
}
