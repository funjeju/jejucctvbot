import type { UserLocation } from '../types';

export interface LocationError {
  code: number;
  message: string;
}

export const LocationErrorCodes = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
  NOT_SUPPORTED: 4
} as const;

export const getLocationErrorMessage = (error: GeolocationPositionError | LocationError): string => {
  switch (error.code) {
    case LocationErrorCodes.PERMISSION_DENIED:
      return '위치 정보 접근 권한이 거부되었습니다. 브라우저 설정에서 위치 정보 접근을 허용해주세요.';
    case LocationErrorCodes.POSITION_UNAVAILABLE:
      return '위치 정보를 가져올 수 없습니다. GPS가 활성화되어 있는지 확인해주세요.';
    case LocationErrorCodes.TIMEOUT:
      return '위치 정보 요청 시간이 초과되었습니다. 다시 시도해주세요.';
    case LocationErrorCodes.NOT_SUPPORTED:
      return '이 브라우저에서는 위치 정보 기능을 지원하지 않습니다.';
    default:
      return '위치 정보를 가져오는 중 오류가 발생했습니다.';
  }
};

export const getCurrentLocation = (): Promise<UserLocation> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: LocationErrorCodes.NOT_SUPPORTED,
        message: getLocationErrorMessage({ code: LocationErrorCodes.NOT_SUPPORTED, message: '' })
      });
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000, // 15초 타임아웃
      maximumAge: 300000 // 5분간 캐시된 위치 사용 가능
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        };
        resolve(userLocation);
      },
      (error) => {
        reject({
          code: error.code,
          message: getLocationErrorMessage(error)
        });
      },
      options
    );
  });
};

export const isLocationPermissionGranted = async (): Promise<boolean> => {
  if (!navigator.permissions) {
    return false;
  }

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state === 'granted';
  } catch (error) {
    return false;
  }
};

export const formatLocationForDisplay = (location: UserLocation): string => {
  return `위도: ${location.latitude.toFixed(6)}, 경도: ${location.longitude.toFixed(6)}`;
};

export const calculateDistanceFromLocation = (
  userLocation: UserLocation,
  targetLat: number,
  targetLng: number
): number => {
  const R = 6371; // 지구 반지름 (km)
  const dLat = ((targetLat - userLocation.latitude) * Math.PI) / 180;
  const dLng = ((targetLng - userLocation.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((userLocation.latitude * Math.PI) / 180) *
      Math.cos((targetLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};