import { useState, useEffect } from 'react';

/**
 * Custom hook that tracks the state of a media query.
 * @param {string} query - The media query to match.
 * @returns {boolean} - Whether the media query matches.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, [query]);

  return matches;
}
