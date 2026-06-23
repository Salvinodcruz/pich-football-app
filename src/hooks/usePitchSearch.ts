/**
 * usePitchSearch — Custom hook for the Pitch & Ground directory.
 *
 * Keeps screens thin: all async calls, filter state, and debouncing live here.
 *
 * Usage:
 *   const {
 *     pitches, loading, filters, setFilters,
 *     selectedPitch, selectPitch, clearSelection
 *   } = usePitchSearch();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Pitch, PitchSearchFilters } from '../types/pitch';
import { searchPitches, getPitchById } from '../services/pitchService';

interface UsePitchSearchResult {
  pitches: Pitch[];
  loading: boolean;
  /** Currently selected pitch for detail view. */
  selectedPitch: Pitch | null;
  loadingDetail: boolean;
  filters: PitchSearchFilters;
  setFilters: (f: PitchSearchFilters) => void;
  /** Load a pitch by ID into selectedPitch. */
  selectPitch: (pitchId: string) => Promise<void>;
  clearSelection: () => void;
  /** Re-run the current search. */
  refresh: () => Promise<void>;
}

export function usePitchSearch(): UsePitchSearchResult {
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPitch, setSelectedPitch] = useState<Pitch | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filters, setFiltersState] = useState<PitchSearchFilters>({});

  // Debounce keyword changes by 400ms to avoid firing on every keystroke
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (f: PitchSearchFilters) => {
    setLoading(true);
    try {
      const results = await searchPitches(f);
      setPitches(results);
    } catch (err) {
      console.error('[usePitchSearch] search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger search whenever filters change, with debounce on keyword
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      doSearch(filters);
    }, 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [filters, doSearch]);

  const setFilters = useCallback((f: PitchSearchFilters) => {
    setFiltersState(f);
  }, []);

  const selectPitch = useCallback(async (pitchId: string) => {
    setLoadingDetail(true);
    try {
      const pitch = await getPitchById(pitchId);
      setSelectedPitch(pitch);
    } catch (err) {
      console.error('[usePitchSearch] selectPitch error:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPitch(null);
  }, []);

  const refresh = useCallback(() => doSearch(filters), [filters, doSearch]);

  return {
    pitches,
    loading,
    selectedPitch,
    loadingDetail,
    filters,
    setFilters,
    selectPitch,
    clearSelection,
    refresh,
  };
}
