
import { TOAST_REMOVE_DELAY } from "@/types/toast";
import type { Action } from "@/types/toast";
import type { Dispatch } from "react";

let count = 0;

export function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

export const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

export const addToRemoveQueue = (toastId: string, dispatch: Dispatch<Action>) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};
