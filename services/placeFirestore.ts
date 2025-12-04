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

// ===========================
// 🔥 GeoPoint 자동 변환 버전
// ===========================
function deepConvertFirestoreData(value: any): any {
  if (value === null || value === undefined) return value;

  // 1) Firestore GeoPoint 처리
  if (
    typeof value === "object" &&
    (
      (typeof value.latitude === "number" && typeof value.longitude === "number") ||
      (typeof value._lat === "number" && typeof value._long === "number") ||
      (typeof value.lat === "function" && typeof value.lng === "function")
    )
  ) {
    const lat =
      value.latitude ??
      value._lat ??
      (typeof value.lat === "function" ? value.lat() : undefined);

    const lng =
      value.longitude ??
      value._long ??
      (typeof value.lng === "function" ? value.lng() : undefined);

    return { latitude: lat, longitude: lng };
  }

  // 2) Timestamp → Date 변환
  if (value?.toDate && typeof value.toDate === "function") {
    return value.toDate();
  }

  // 3) 배열 처리
  if (Array.isArray(value)) {
    return value.map(v => deepConvertFirestoreData(v));
  }

  // 4) 일반 객체 처리
  if (typeof value === "object") {
    const result: any = {};
    for (const key in value) {
      result[key] = deepConvertFirestoreData(value[key]);
    }
    return result;
  }

  // 5) 원시값 그대로 반환
  return value;
}

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

// =========================
// 🔥 Place 변환 함수 (핵심)
// =========================
export function parsePlaceFromFirestore(data: any, docId: string): Place {
  const d = deepConvertFirestoreData(data);

  return {
    place_id: docId,
    place_name: d.place_name,
    categories: d.categories || [],
    images: d.images || [],
    location: d.location || null,     // ← 🔥 드디어 latitude/longitude 형태로 들어옴
    ...d,                             // 다른 필드 그대로
  } as Place;
}

