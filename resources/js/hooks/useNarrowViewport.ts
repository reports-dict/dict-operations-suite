import { useEffect, useState } from 'react';

const NARROW_VIEWPORT_QUERY = '(max-width: 1023px)';

export function useNarrowViewport() {
    const [isNarrow, setIsNarrow] = useState(() => window.matchMedia(NARROW_VIEWPORT_QUERY).matches);

    useEffect(() => {
        const mediaQuery = window.matchMedia(NARROW_VIEWPORT_QUERY);
        const handleChange = (event: MediaQueryListEvent) => setIsNarrow(event.matches);

        mediaQuery.addEventListener('change', handleChange);

        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return isNarrow;
}
