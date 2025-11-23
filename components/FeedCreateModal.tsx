import React, { useState, useRef } from 'react';
import type { Place, FeedMedia, FeedMediaExif } from '../types';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import exifr from 'exifr';
import {
  POINT_CONFIG,
  checkLocationDuplicate,
  grantPoints,
  isWithin24Hours
} from '../services/pointService';

interface FeedCreateModalProps {
  spots: Place[];
  language: 'KOR' | 'ENG' | 'CHN';
  onClose: () => void;
}

const translations = {
  KOR: {
    title: '피드 작성',
    content: '내용 (최대 300자)',
    contentPlaceholder: '제주에서의 순간을 공유해주세요...',
    addMedia: '사진/영상 추가',
    exifRequired: 'EXIF 정보 필수',
    exifRequiredDesc: 'GPS 정보가 포함된 사진/영상만 업로드 가능합니다.',
    imageLimit: '이미지는 최대 5장까지 업로드 가능합니다.',
    videoLimit: '영상은 1개만 업로드 가능합니다.',
    noExifError: 'EXIF 정보가 없습니다',
    noExifErrorDesc: 'GPS 위치 정보가 포함된 사진/영상만 업로드할 수 있습니다. 카메라 설정에서 위치 정보 저장을 활성화해주세요.',
    uploading: '업로드 중...',
    posting: '게시 중...',
    post: '게시하기',
    cancel: '취소',
    compressing: '압축 중...',
    pointsEarned: '포인트 획득!',
    pointsDuplicate: '이 위치(100m 이내)에서 이미 포인트를 받으셨습니다.',
    photoPoints: '사진 피드',
    videoPoints: '동영상 피드',
    bonusPoints: '24시간 촬영 보너스',
    cctvPoints: 'CCTV 인증',
  },
  ENG: {
    title: 'Create Post',
    content: 'Content (Max 300 characters)',
    contentPlaceholder: 'Share your Jeju moments...',
    addMedia: 'Add Photo/Video',
    exifRequired: 'EXIF Required',
    exifRequiredDesc: 'Only photos/videos with GPS information can be uploaded.',
    imageLimit: 'Maximum 5 images allowed.',
    videoLimit: 'Only 1 video allowed.',
    noExifError: 'No EXIF Information',
    noExifErrorDesc: 'Only photos/videos with GPS location data can be uploaded. Please enable location saving in your camera settings.',
    uploading: 'Uploading...',
    posting: 'Posting...',
    post: 'Post',
    cancel: 'Cancel',
    compressing: 'Compressing...',
    pointsEarned: 'Points Earned!',
    pointsDuplicate: 'You already earned points at this location (within 100m).',
    photoPoints: 'Photo Feed',
    videoPoints: 'Video Feed',
    bonusPoints: '24h Fresh Bonus',
    cctvPoints: 'CCTV Capture',
  },
  CHN: {
    title: '创建帖子',
    content: '内容（最多300字）',
    contentPlaceholder: '分享您的济州时光...',
    addMedia: '添加照片/视频',
    exifRequired: '需要EXIF信息',
    exifRequiredDesc: '只能上传包含GPS信息的照片/视频。',
    imageLimit: '最多可上传5张图片。',
    videoLimit: '只能上传1个视频。',
    noExifError: '无EXIF信息',
    noExifErrorDesc: '只能上传包含GPS位置数据的照片/视频。请在相机设置中启用位置保存。',
    uploading: '上传中...',
    posting: '发布中...',
    post: '发布',
    cancel: '取消',
    compressing: '压缩中...',
    pointsEarned: '获得积分!',
    pointsDuplicate: '您已在此位置（100米范围内）获得积分。',
    photoPoints: '照片动态',
    videoPoints: '视频动态',
    bonusPoints: '24小时新鲜奖励',
    cctvPoints: 'CCTV截图',
  },
};

const FeedCreateModal: React.FC<FeedCreateModalProps> = ({ spots, language, onClose }) => {
  const { user, userProfile } = useAuth();
  const [feedType, setFeedType] = useState<'live' | 'cctv' | null>(null); // 피드 타입 선택
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<{ url: string; type: 'image' | 'video'; exif?: FeedMediaExif }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language];

  // 로그인 체크
  if (!user || !userProfile) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">로그인 필요</h2>
          <p className="text-gray-600 mb-4">피드를 작성하려면 로그인이 필요합니다.</p>
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  // EXIF 데이터 추출
  const extractExifData = async (file: File): Promise<FeedMediaExif | null> => {
    try {
      console.log('EXIF 추출 시작:', file.name, 'size:', file.size, 'type:', file.type);

      // GPS 데이터 파싱
      const gpsData = await exifr.gps(file);
      console.log('GPS 데이터:', gpsData);

      // 전체 EXIF 데이터 파싱 (카메라 정보 + 촬영 정보)
      const exifData = await exifr.parse(file, [
        'DateTimeOriginal', 'DateTime',
        'Model', 'Make',
        'FNumber', 'ISO', 'ExposureTime', 'FocalLength'
      ]);
      console.log('EXIF 데이터:', exifData);

      if (!gpsData || !gpsData.latitude || !gpsData.longitude) {
        console.warn('GPS 좌표가 없습니다:', gpsData);
        return null;
      }

      // 날짜/시간 포맷팅
      let dateTime = '';
      let rawDateTime = ''; // 24시간 보너스 체크용 원본 날짜
      if (exifData?.DateTimeOriginal) {
        const originalDate = new Date(exifData.DateTimeOriginal);
        rawDateTime = originalDate.toISOString();
        dateTime = originalDate.toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (exifData?.DateTime) {
        const originalDate = new Date(exifData.DateTime);
        rawDateTime = originalDate.toISOString();
        dateTime = originalDate.toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else {
        dateTime = new Date().toLocaleString('ko-KR');
        rawDateTime = new Date().toISOString();
      }

      // 카메라 정보
      const camera = exifData?.Model || exifData?.Make || 'Unknown';

      // 조리개 (f/2.8 형식)
      const fNumber = exifData?.FNumber ? `f/${exifData.FNumber.toFixed(1)}` : undefined;

      // ISO
      const iso = exifData?.ISO;

      // 셔터스피드 (1/60 형식)
      let exposureTime: string | undefined;
      if (exifData?.ExposureTime) {
        if (exifData.ExposureTime >= 1) {
          exposureTime = `${exifData.ExposureTime.toFixed(1)}s`;
        } else {
          exposureTime = `1/${Math.round(1 / exifData.ExposureTime)}`;
        }
      }

      // 초점거리 (50mm 형식)
      const focalLength = exifData?.FocalLength ? `${Math.round(exifData.FocalLength)}mm` : undefined;

      const result = {
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        dateTime,
        rawDateTime,
        camera,
        fNumber,
        iso,
        exposureTime,
        focalLength,
      };

      console.log('EXIF 추출 성공:', result);
      return result;
    } catch (error) {
      console.error('EXIF 추출 실패:', error);
      return null;
    }
  };

  // 이미지 압축 (용량 절감을 위해 품질 50%, 최대 너비 1600px)
  const compressImage = (file: File, maxWidth: number = 1600, quality: number = 0.5): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Image compression failed'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // 파일 선택 핸들러
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 이미지/비디오 개수 체크
    const currentImages = mediaFiles.filter(f => f.type.startsWith('image/')).length;
    const currentVideos = mediaFiles.filter(f => f.type.startsWith('video/')).length;
    const newImages = files.filter(f => f.type.startsWith('image/'));
    const newVideos = files.filter(f => f.type.startsWith('video/'));

    if (currentImages + newImages.length > 5) {
      alert(t.imageLimit);
      return;
    }

    if (currentVideos + newVideos.length > 1) {
      alert(t.videoLimit);
      return;
    }

    setUploadProgress(t.compressing);

    // EXIF 검증 및 미리보기 생성
    for (const file of files) {
      console.log('파일 처리 시작:', file.name, file.type);
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        console.log('이미지/비디오가 아님, 건너뜀');
        continue;
      }

      // CCTV 인증샷인 경우 EXIF 검증 생략
      if (feedType === 'cctv') {
        const preview = URL.createObjectURL(file);
        setMediaPreviews(prev => [...prev, { url: preview, type: isImage ? 'image' : 'video' }]);
        setMediaFiles(prev => [...prev, file]);
        continue;
      }

      // 라이브피드인 경우 EXIF 검증 수행
      // EXIF 검증 (이미지만)
      if (isImage) {
        console.log('이미지 파일 - EXIF 검증 시작');
        const exif = await extractExifData(file);
        console.log('EXIF 검증 결과:', exif);

        if (!exif || !exif.latitude || !exif.longitude) {
          console.error('EXIF 검증 실패 - GPS 정보 없음');
          alert(`${t.noExifError}\n${t.noExifErrorDesc}`);
          continue;
        }

        // 역지오코딩 (위치 이름)
        const location = await reverseGeocode(exif.latitude, exif.longitude);
        exif.location = location;

        // 미리보기 추가
        const preview = URL.createObjectURL(file);
        setMediaPreviews(prev => [...prev, { url: preview, type: 'image', exif }]);
        setMediaFiles(prev => [...prev, file]);
      } else if (isVideo) {
        // 비디오도 EXIF 검증
        console.log('비디오 파일 - EXIF 검증 시작');
        const exif = await extractExifData(file);
        console.log('비디오 EXIF 검증 결과:', exif);

        if (!exif || !exif.latitude || !exif.longitude) {
          console.error('비디오 EXIF 검증 실패 - GPS 정보 없음');
          alert(`${t.noExifError}\n${t.noExifErrorDesc}`);
          continue;
        }

        // 역지오코딩 (위치 이름)
        const location = await reverseGeocode(exif.latitude, exif.longitude);
        exif.location = location;

        const preview = URL.createObjectURL(file);
        setMediaPreviews(prev => [...prev, { url: preview, type: 'video', exif }]);
        setMediaFiles(prev => [...prev, file]);
      }
    }

    setUploadProgress('');
  };

  // 역지오코딩 (GPS -> 위치 이름)
  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      // Nominatim API 사용 (무료)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=${language === 'KOR' ? 'ko' : language === 'ENG' ? 'en' : 'zh'}`
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    } catch (error) {
      console.error('역지오코딩 실패:', error);
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  };

  // 미디어 제거
  const handleRemoveMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 게시하기
  const handlePost = async () => {
    if (content.trim().length === 0 && mediaFiles.length === 0) {
      return;
    }

    if (content.length > 300) {
      alert(language === 'KOR' ? '내용은 최대 300자까지 입력 가능합니다.' : 'Content must be 300 characters or less.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(t.uploading);

    try {
      // 미디어 업로드
      const uploadedMedia: FeedMedia[] = [];

      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const preview = mediaPreviews[i];
        const isImage = file.type.startsWith('image/');

        // 파일 업로드
        let uploadFile: File | Blob = file;

        if (isImage) {
          // 이미지 압축
          setUploadProgress(`${t.compressing} (${i + 1}/${mediaFiles.length})`);
          uploadFile = await compressImage(file);
        }

        const timestamp = Date.now();
        const fileName = `feeds/${timestamp}_${i}_${file.name}`;
        const storageRef = ref(storage, fileName);

        setUploadProgress(`${t.uploading} (${i + 1}/${mediaFiles.length})`);
        await uploadBytes(storageRef, uploadFile);
        const url = await getDownloadURL(storageRef);

        uploadedMedia.push({
          id: `${timestamp}_${i}`,
          type: isImage ? 'image' : 'video',
          url,
          exif: preview.exif || {},
        });
      }

      // Firestore에 피드 저장
      setUploadProgress(t.posting);
      const now = Timestamp.now();

      // GPS 기반 주변 추천 장소 찾기
      let nearbySpots: any[] = [];
      if (uploadedMedia.length > 0 && uploadedMedia[0].exif.latitude && uploadedMedia[0].exif.longitude) {
        nearbySpots = findNearbySpots(
          uploadedMedia[0].exif.latitude,
          uploadedMedia[0].exif.longitude,
          spots
        );
      }

      // Firebase Auth 사용자 정보 사용
      const feedDoc = await addDoc(collection(db, 'feeds'), {
        userId: user.uid,
        username: userProfile.displayName || user.email || '사용자',
        userAvatar: userProfile.photoURL || user.photoURL,
        content: content.trim(),
        media: uploadedMedia,
        timestamp: now,
        createdAt: now,
        likes: 0,
        comments: 0,
        likedBy: [],
        commentList: [],
        feedType,
        nearbySpots,
      });

      // 포인트 지급 로직
      let totalPoints = 0;
      let pointMessages: string[] = [];

      if (uploadedMedia.length > 0) {
        const firstMedia = uploadedMedia[0];
        const hasVideo = uploadedMedia.some(m => m.type === 'video');
        const hasImage = uploadedMedia.some(m => m.type === 'image');

        // GPS 좌표가 있는 경우에만 포인트 지급 (CCTV는 예외)
        const lat = firstMedia.exif?.latitude;
        const lon = firstMedia.exif?.longitude;

        if (feedType === 'cctv') {
          // CCTV 인증샷은 무조건 포인트 지급 (GPS 없어도)
          totalPoints += POINT_CONFIG.CCTV_CAPTURE_BONUS;
          pointMessages.push(`${t.cctvPoints}: +${POINT_CONFIG.CCTV_CAPTURE_BONUS}P`);

          await grantPoints(
            user.uid,
            'cctv_capture_bonus',
            POINT_CONFIG.CCTV_CAPTURE_BONUS,
            'CCTV 인증샷 게시',
            { relatedId: feedDoc.id }
          );
        } else if (lat && lon) {
          // 라이브 피드 - GPS 기반 중복 체크
          const mediaType = hasVideo ? 'video' : 'photo';
          const isDuplicate = await checkLocationDuplicate(user.uid, mediaType, lat, lon);

          if (isDuplicate) {
            // 중복 위치이므로 포인트 미지급
            pointMessages.push(t.pointsDuplicate);
          } else {
            // 비디오 또는 사진 기본 포인트
            if (hasVideo) {
              totalPoints += POINT_CONFIG.FEED_VIDEO;
              pointMessages.push(`${t.videoPoints}: +${POINT_CONFIG.FEED_VIDEO}P`);

              await grantPoints(
                user.uid,
                'feed_video',
                POINT_CONFIG.FEED_VIDEO,
                '동영상 피드 게시',
                {
                  relatedId: feedDoc.id,
                  location: { latitude: lat, longitude: lon }
                }
              );
            } else if (hasImage) {
              totalPoints += POINT_CONFIG.FEED_PHOTO;
              pointMessages.push(`${t.photoPoints}: +${POINT_CONFIG.FEED_PHOTO}P`);

              await grantPoints(
                user.uid,
                'feed_photo',
                POINT_CONFIG.FEED_PHOTO,
                '사진 피드 게시',
                {
                  relatedId: feedDoc.id,
                  location: { latitude: lat, longitude: lon }
                }
              );
            }

            // 24시간 내 촬영 보너스 체크
            const rawExifDateTime = firstMedia.exif?.rawDateTime;
            if (rawExifDateTime && isWithin24Hours(rawExifDateTime)) {
              totalPoints += POINT_CONFIG.FEED_24H_BONUS;
              pointMessages.push(`${t.bonusPoints}: +${POINT_CONFIG.FEED_24H_BONUS}P`);

              await grantPoints(
                user.uid,
                'feed_24h_bonus',
                POINT_CONFIG.FEED_24H_BONUS,
                '24시간 내 촬영 보너스',
                { relatedId: feedDoc.id }
              );
            }
          }
        }
      }

      // 포인트 획득 알림
      if (totalPoints > 0) {
        setTimeout(() => {
          alert(`${t.pointsEarned}\n${pointMessages.join('\n')}\n\n총 ${totalPoints}P 획득!`);
        }, 500);
      } else if (pointMessages.length > 0 && pointMessages[0] === t.pointsDuplicate) {
        setTimeout(() => {
          alert(pointMessages[0]);
        }, 500);
      }

      onClose();
    } catch (error) {
      console.error('피드 게시 실패:', error);
      alert(language === 'KOR' ? '피드 게시에 실패했습니다.' : 'Failed to post feed.');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  // 주변 추천 장소 찾기
  const findNearbySpots = (lat: number, lon: number, spots: Place[]) => {
    const spotsWithDistance = spots
      .map(spot => {
        if (!spot.latitude || !spot.longitude) return null;
        const distance = calculateDistance(lat, lon, spot.latitude, spot.longitude);
        return {
          id: spot.id,
          title: spot.title,
          thumbnailUrl: spot.fileUrl || '',
          distance,
        };
      })
      .filter(spot => spot !== null && spot.distance <= 5000) // 5km 이내
      .sort((a, b) => a!.distance - b!.distance)
      .slice(0, 3);

    return spotsWithDistance;
  };

  // Haversine 거리 계산
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // 지구 반지름 (미터)
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // 피드 타입 선택 화면
  if (!feedType) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">피드 작성</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            {/* 라이브피드 */}
            <button
              onClick={() => setFeedType('live')}
              className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-200">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">라이브 피드</h3>
                  <p className="text-sm text-gray-600">GPS 정보가 포함된 사진/영상</p>
                </div>
              </div>
            </button>

            {/* CCTV 인증샷 */}
            <button
              onClick={() => setFeedType('cctv')}
              className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-200">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">CCTV 인증샷</h3>
                  <p className="text-sm text-gray-600">CCTV 화면 캡처 공유</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFeedType(null)}
              disabled={isUploading}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-gray-800">
              {feedType === 'live' ? '라이브 피드' : 'CCTV 인증샷'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 내용 */}
        <div className="p-4 space-y-4">
          {/* 텍스트 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.content}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={300}
              rows={4}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              placeholder={t.contentPlaceholder}
              disabled={isUploading}
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {content.length} / 300
            </p>
          </div>

          {/* EXIF 안내 - 라이브피드만 */}
          {feedType === 'live' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800">{t.exifRequired}</p>
                <p className="text-xs text-blue-600 mt-1">{t.exifRequiredDesc}</p>
              </div>
            </div>
          )}

          {/* CCTV 인증샷 안내 */}
          {feedType === 'cctv' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-3">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800">CCTV 인증샷</p>
                <p className="text-xs text-green-600 mt-1">CCTV 화면을 캡처한 이미지를 자유롭게 공유하세요. GPS 정보가 없어도 업로드 가능합니다.</p>
              </div>
            </div>
          )}

          {/* 미디어 추가 버튼 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-indigo-600 hover:bg-indigo-50 transition-colors flex flex-col items-center gap-2 disabled:opacity-50"
          >
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">{t.addMedia}</span>
            <span className="text-xs text-gray-500">{t.imageLimit} {t.videoLimit}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* 미디어 미리보기 */}
          {mediaPreviews.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {mediaPreviews.map((preview, index) => (
                <div key={index} className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100">
                  {preview.type === 'image' ? (
                    <img src={preview.url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                  ) : (
                    <video src={preview.url} className="w-full h-full object-cover" muted />
                  )}

                  {/* EXIF 오버레이 */}
                  {preview.exif && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 text-white text-xs space-y-1">
                      {/* 위치 */}
                      {preview.exif.location && (
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          <span className="line-clamp-1 font-medium">{preview.exif.location}</span>
                        </div>
                      )}
                      {/* 날짜/시간 */}
                      {preview.exif.dateTime && (
                        <div className="opacity-90">{preview.exif.dateTime}</div>
                      )}
                      {/* 카메라 정보 */}
                      {preview.exif.camera && preview.exif.camera !== 'Unknown' && (
                        <div className="opacity-80 text-[10px]">📷 {preview.exif.camera}</div>
                      )}
                      {/* 촬영 설정 */}
                      {(preview.exif.fNumber || preview.exif.iso || preview.exif.exposureTime || preview.exif.focalLength) && (
                        <div className="flex gap-2 text-[10px] opacity-80">
                          {preview.exif.fNumber && <span>{preview.exif.fNumber}</span>}
                          {preview.exif.exposureTime && <span>{preview.exif.exposureTime}</span>}
                          {preview.exif.iso && <span>ISO{preview.exif.iso}</span>}
                          {preview.exif.focalLength && <span>{preview.exif.focalLength}</span>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => handleRemoveMedia(index)}
                    disabled={isUploading}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 업로드 진행 상태 */}
          {isUploading && uploadProgress && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
              <span className="text-sm text-indigo-800">{uploadProgress}</span>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 pb-20 lg:pb-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
          >
            {t.cancel}
          </button>
          <button
            onClick={handlePost}
            disabled={isUploading || (content.trim().length === 0 && mediaFiles.length === 0)}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
          >
            {t.post}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedCreateModal;
