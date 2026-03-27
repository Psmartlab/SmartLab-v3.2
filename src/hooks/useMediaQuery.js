import { useState, useEffect } from 'react';

/**
 * Custom hook that tracks the state of a media query.
 * @param {string} query - The media query to match.
 * @returns {boolean} - Whether the media query matches.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, [matches, query]);

  return matches;
}
