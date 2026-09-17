import { useState } from "react";

/**
 * Closes a Sheet once its Server Action reports success. Deriving this
 * during render (the "adjusting state when a prop changes" pattern) is
 * what React recommends instead of a useEffect that calls setState --
 * this avoids the extra render pass a useEffect would cause.
 *
 * Compares the *state object itself*, not state.success: useActionState
 * returns a fresh object every time the action resolves, even when two
 * consecutive results have the same `success` value (e.g. submitting the
 * same form twice in a row, both succeeding) -- comparing the primitive
 * would miss the second change entirely since `true !== true` is false.
 */
export function useCloseOnSuccess<T extends { success?: boolean }>(
  state: T,
  setOpen: (open: boolean) => void,
) {
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setOpen(false);
  }
}
