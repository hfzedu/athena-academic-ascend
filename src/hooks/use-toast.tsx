
import * as React from "react";
import { ToastContext } from "@/contexts/toast-context";
import { reducer } from "@/reducers/toast-reducer";
import { genId, addToRemoveQueue } from "@/utils/toast-utils";
import type { ToasterToast } from "@/types/toast";

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [state, dispatch] = React.useReducer(reducer, {
    toasts: [],
  });

  const toast = React.useCallback((props: Omit<ToasterToast, "id">) => {
    const id = genId();

    const update = (props: ToasterToast) =>
      dispatch({
        type: "UPDATE_TOAST",
        toast: { ...props, id },
      });
    
    const dismiss = () => {
      dispatch({ type: "DISMISS_TOAST", toastId: id });
      addToRemoveQueue(id, dispatch);
    };

    dispatch({
      type: "ADD_TOAST",
      toast: {
        ...props,
        id,
        open: true,
        onOpenChange: (open) => {
          if (!open) dismiss();
        },
      },
    });

    return {
      id,
      dismiss,
      update,
    };
  }, []);

  const dismiss = React.useCallback((toastId?: string) => {
    dispatch({ type: "DISMISS_TOAST", toastId });
    if (toastId) {
      addToRemoveQueue(toastId, dispatch);
    } else {
      state.toasts.forEach((toast) => {
        addToRemoveQueue(toast.id, dispatch);
      });
    }
  }, [state.toasts]);

  return (
    <ToastContext.Provider
      value={{
        toasts: state.toasts,
        toast,
        dismiss,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const toast = (props: Omit<ToasterToast, "id">) => {
  if (typeof window === "undefined") {
    return {
      id: "server-toast",
      dismiss: () => {},
      update: () => {},
    };
  }
  
  try {
    const context = React.useContext(ToastContext);
    if (!context) {
      console.warn("Toast used outside of ToastProvider. Toast was not displayed.");
      return {
        id: "no-provider",
        dismiss: () => {},
        update: () => {},
      };
    }
    return context.toast(props);
  } catch (e) {
    console.warn("Toast used outside proper React context. Toast was not displayed.");
    return {
      id: "error-toast",
      dismiss: () => {},
      update: () => {},
    };
  }
};
