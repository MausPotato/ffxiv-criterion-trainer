import { ref, watch } from 'vue';

const STORAGE_KEY = 'ffxiv-criterion-trainer:show-arena-markers';

function storedPreference(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

const showArenaMarkers = ref(storedPreference());

watch(showArenaMarkers, value => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // The preference remains usable for this session if storage is unavailable.
  }
});

export function useArenaMarkers() {
  function setShowArenaMarkers(value: boolean): void {
    showArenaMarkers.value = value;
  }

  return { showArenaMarkers, setShowArenaMarkers };
}
