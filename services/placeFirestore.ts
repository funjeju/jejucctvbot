import type { DocumentData } from 'firebase/firestore';
import type { Place, Suggestion } from '../types';

const safeDecodeURIComponent = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const encodeSuggestionsMap = (suggestions?: Record<string, Suggestion[]> | null) => {
  if (!suggestions) return undefined;

  const encodedEntries = Object.entries(suggestions).map(([fieldPath, entries]) => [
    encodeURIComponent(fieldPath),
    entries,
  ] as const);

  if (encodedEntries.length === 0) return {};

  return Object.fromEntries(encodedEntries) as Record<string, Suggestion[]>;
};

const decodeSuggestionsMap = (stored?: Record<string, Suggestion[]> | null) => {
  if (!stored) return undefined;

  const decodedEntries = Object.entries(stored).map(([encodedKey, entries]) => [
    safeDecodeURIComponent(encodedKey),
    entries,
  ] as const);

  if (decodedEntries.length === 0) return {};

  return Object.fromEntries(decodedEntries) as Record<string, Suggestion[]>;
};

const deepCloneWithoutUndefined = (input: any): any => {
  if (input === undefined) {
    return undefined;
  }

  if (Array.isArray(input)) {
    const mapped = input
      .map((item) => deepCloneWithoutUndefined(item))
      .filter((item) => item !== undefined);
    return mapped;
  }

  if (input && typeof input === 'object') {
    const output: Record<string, any> = {};

    Object.entries(input).forEach(([key, value]) => {
      if (value === undefined) return;
      if (key === 'file') return;

      const clonedValue = deepCloneWithoutUndefined(value);
      if (clonedValue !== undefined) {
        output[key] = clonedValue;
      }
    });

    return output;
  }

  return input;
};

const deepConvertFirestoreData = (input: any): any => {
  if (Array.isArray(input)) {
    return input.map((item) => deepConvertFirestoreData(item));
  }

  if (input && typeof input === 'object') {
    if ('seconds' in input && 'nanoseconds' in input && typeof input.seconds === 'number' && typeof input.nanoseconds === 'number') {
      return { seconds: input.seconds, nanoseconds: input.nanoseconds };
    }

    const output: Record<string, any> = {};
    Object.entries(input).forEach(([key, value]) => {
      output[key] = deepConvertFirestoreData(value);
    });
    return output;
  }

  return input;
};

export const sanitizePlaceForFirestore = (place: Place): DocumentData => {
  const cloned = deepCloneWithoutUndefined(place) as Record<string, any>;

  if (!cloned.place_id) {
    throw new Error('Cannot save place without place_id.');
  }

  if (cloned.suggestions) {
    cloned.suggestions = encodeSuggestionsMap(cloned.suggestions);
  }

  return cloned;
};

export const parsePlaceFromFirestore = (data: DocumentData, docId: string): Place => {
  const converted = deepConvertFirestoreData(data) as Record<string, any>;
  const suggestions = decodeSuggestionsMap(converted.suggestions);

  return {
    ...converted,
    place_id: converted.place_id ?? docId,
    suggestions,
  } as Place;
};

