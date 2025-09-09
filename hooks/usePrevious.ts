import { useRef, useEffect } from 'react';

/**
 * A custom hook that returns the previous value of a variable.
 * @param value The current value to track.
 * @returns The value from the previous render.
 */
export const usePrevious = <T>(value: T): T | undefined => {
    // FIX: Provide an explicit initial value to useRef to address the error "Expected 1 arguments, but got 0".
    const ref = useRef<T | undefined>(undefined);
    useEffect(() => {
        ref.current = value;
    // FIX: Added a dependency array to useEffect to ensure it only runs when the value changes.
    }, [value]);
    return ref.current;
};
