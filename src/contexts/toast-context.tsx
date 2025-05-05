
import * as React from "react";
import { ToastContextType, State, ToasterToast, Action } from "@/types/toast";
import { reducer } from "@/reducers/toast-reducer";
import { addToRemoveQueue } from "@/utils/toast-utils";
import { setGlobalToastDispatch } from "@/hooks/use-toast";

const initialState: State = { toasts: [] };

export const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  // Set the global dispatch reference for the standalone toast function
  React.useEffect(() => {
    setGlobalToastDispatch(dispatch);
    return () => setGlobalToastDispatch(null as any);
  }, [dispatch]);

  React.useEffect(() => {
    state.toasts.forEach((toast) => {
      if (toast.open === false) {
        addToRemoveQueue(toast.id, dispatch);
      }
    });
  }, [state.toasts]);

  const toast = React.useCallback(
    (props: Omit<ToasterToast, "id">) => {
      const id = crypto.randomUUID();
      const newToast = { id, ...props };
      
      dispatch({
        type: "ADD_TOAST",
        toast: newToast,
      });

      return {
        id,
        dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: id }),
        update: (props: ToasterToast) => 
          dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } }),
      };
    },
    [dispatch]
  );

  const dismiss = React.useCallback(
    (toastId?: string) => {
      dispatch({ type: "DISMISS_TOAST", toastId });
    },
    [dispatch]
  );

  const value = React.useMemo(
    () => ({
      toasts: state.toasts,
      toast,
      dismiss,
    }),
    [state.toasts, toast, dismiss]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToastContext = () => {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToastContext must be used within a ToastProvider");
  }
  return context;
};
