import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { OroomImage } from '../types';

// 이미지 압축 설정
interface CompressionOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0.1 ~ 1.0
}

// 카테고리별 압축 설정
const compressionSettings: Record<string, CompressionOptions> = {
  parking: { maxWidth: 800, maxHeight: 600, quality: 0.8 },
  entrance: { maxWidth: 800, maxHeight: 600, quality: 0.8 },
  trail: { maxWidth: 1200, maxHeight: 900, quality: 0.85 },
  summit: { maxWidth: 1200, maxHeight: 900, quality: 0.85 }
};

// 이미지 압축 함수
const compressImage = async (file: File, options: CompressionOptions): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 원본 크기
      const { width: originalWidth, height: originalHeight } = img;

      // 비율 유지하면서 리사이즈 계산
      let { width, height } = calculateResizedDimensions(
        originalWidth,
        originalHeight,
        options.maxWidth,
        options.maxHeight
      );

      // Canvas 크기 설정
      canvas.width = width;
      canvas.height = height;

      // 이미지 그리기
      ctx?.drawImage(img, 0, 0, width, height);

      // 압축된 이미지를 Blob으로 변환
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }
        },
        'image/jpeg',
        options.quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};

// 리사이즈 크기 계산 (비율 유지)
const calculateResizedDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  const widthRatio = maxWidth / originalWidth;
  const heightRatio = maxHeight / originalHeight;
  const ratio = Math.min(widthRatio, heightRatio, 1); // 1을 넘지 않도록 (확대 방지)

  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio)
  };
};

// 오름 이미지 업로드 (압축 포함)
export const uploadOroomImage = async (
  file: File,
  oroomId: string,
  category: 'parking' | 'entrance' | 'trail' | 'summit'
): Promise<string> => {
  try {
    // 원본 파일 크기 로깅
    const originalSizeKB = Math.round(file.size / 1024);
    console.log(`📸 원본 이미지: ${file.name} (${originalSizeKB}KB)`);

    // 이미지 압축
    const compressionOptions = compressionSettings[category];
    const compressedFile = await compressImage(file, compressionOptions);

    // 압축 후 크기 로깅
    const compressedSizeKB = Math.round(compressedFile.size / 1024);
    const compressionRatio = Math.round((1 - compressedFile.size / file.size) * 100);
    console.log(`🗜️ 압축 완료: ${compressedSizeKB}KB (${compressionRatio}% 압축)`);

    // 파일 이름 생성 (중복 방지를 위해 timestamp 추가)
    const timestamp = Date.now();
    const fileName = `${file.name.split('.')[0]}_${timestamp}.jpg`; // 압축시 JPEG로 변환

    // Storage 경로 설정
    const storageRef = ref(storage, `orooms/${oroomId}/${category}/${fileName}`);

    // 압축된 파일 업로드
    const snapshot = await uploadBytes(storageRef, compressedFile);

    // 다운로드 URL 얻기
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log('🚀 이미지 업로드 완료:', downloadURL);
    return downloadURL;

  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    throw new Error('이미지 업로드에 실패했습니다.');
  }
};

// 파일 검증 함수
const validateImageFile = (file: File): void => {
  // 파일 타입 검증
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`지원하지 않는 파일 형식입니다. (지원: JPG, PNG, WebP)`);
  }

  // 파일 크기 검증 (20MB 제한)
  const maxSizeBytes = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSizeBytes) {
    const sizeMB = Math.round(file.size / (1024 * 1024));
    throw new Error(`파일 크기가 너무 큽니다. (${sizeMB}MB) 최대 20MB까지 업로드 가능합니다.`);
  }
};

// 여러 이미지 동시 업로드 (압축 포함)
export const uploadMultipleImages = async (
  files: File[],
  oroomId: string,
  category: 'parking' | 'entrance' | 'trail' | 'summit'
): Promise<OroomImage[]> => {
  try {
    // 모든 파일 검증
    files.forEach(validateImageFile);

    const totalOriginalSize = files.reduce((sum, file) => sum + file.size, 0);
    console.log(`🗂️ 총 ${files.length}개 파일 업로드 시작 (${Math.round(totalOriginalSize / 1024)}KB)`);

    const uploadPromises = files.map(async (file, index) => {
      const url = await uploadOroomImage(file, oroomId, category);
      return {
        id: `${Date.now()}-${index}`,
        url,
        description: ''
      };
    });

    const results = await Promise.all(uploadPromises);
    console.log('✅ 모든 이미지 업로드 완료');
    return results;
  } catch (error) {
    console.error('다중 이미지 업로드 오류:', error);
    throw error; // 원본 에러 메시지 전달
  }
};