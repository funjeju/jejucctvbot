import React from 'react';
import type { OroomData } from '../types';
import Button from './common/Button';

// YouTube 비디오 ID 추출 함수
const getYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

interface OroomDetailViewProps {
  oroom: OroomData;
  onBack: () => void;
  onEdit: () => void;
}

const OroomDetailView: React.FC<OroomDetailViewProps> = ({ oroom, onBack, onEdit }) => {
  const [showGameCardModal, setShowGameCardModal] = React.useState(false);
  const [showImageModal, setShowImageModal] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<{ url: string; alt: string } | null>(null);
  const handleImageClick = (imageUrl: string, imageAlt: string) => {
    setSelectedImage({ url: imageUrl, alt: imageAlt });
    setShowImageModal(true);
  };

  const renderImageSection = (
    images: any[],
    title: string,
    emptyIcon: string,
    emptyText: string
  ) => {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        {images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {images.map((image, index) => (
              <div key={image.id || index} className="relative">
                <img
                  src={image.url}
                  alt={`${title} ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-75 transition-opacity"
                  onClick={() => handleImageClick(image.url, `${title} ${index + 1}`)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <span className="text-gray-400 text-2xl">{emptyIcon}</span>
            <p className="text-gray-400 text-sm mt-1">{emptyText}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">🏔️ {oroom.name}</h2>
        <div className="flex gap-2">
          <Button
            onClick={onEdit}
            className="bg-blue-600 hover:bg-blue-700"
          >
            수정하기
          </Button>
        </div>
      </div>

      {/* YouTube 플레이어 */}
      {oroom.summitVideoUrl && (
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🎥 정상뷰 영상</h3>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {(() => {
              const videoId = getYouTubeVideoId(oroom.summitVideoUrl);
              return videoId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title={`${oroom.name} 정상뷰 영상`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <div className="text-center">
                    <p className="text-lg">🚫 잘못된 유튜브 URL</p>
                    <p className="text-sm opacity-75 mt-1">유효한 YouTube 링크를 입력해주세요</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 카드 이미지 + 기본 정보 */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">기본 정보</h3>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 오름게임카드 */}
          {oroom.cardImage && (
            <div className="flex-shrink-0">
              <div
                className="w-48 h-64 bg-white rounded-lg shadow-md overflow-hidden border cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setShowGameCardModal(true)}
              >
                <img
                  src={oroom.cardImage.url}
                  alt={`${oroom.name} 오름게임카드`}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-gray-500 text-center mt-2">클릭하여 크게 보기</p>
            </div>
          )}

          {/* 기본 정보 그리드 */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
            <p className="text-gray-900">{oroom.address}</p>
          </div>

          {(oroom.latitude && oroom.longitude) && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">GPS 좌표</label>
              <div className="flex items-center gap-4">
                <p className="text-gray-900">
                  위도: <span className="font-mono text-blue-600">{oroom.latitude.toFixed(6)}</span>
                </p>
                <p className="text-gray-900">
                  경도: <span className="font-mono text-blue-600">{oroom.longitude.toFixed(6)}</span>
                </p>
                <a
                  href={`https://www.google.com/maps?q=${oroom.latitude},${oroom.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-800 text-sm underline"
                >
                  🗺️ 지도에서 보기
                </a>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">난이도</label>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              oroom.difficulty === '쉬움' ? 'bg-green-100 text-green-800' :
              oroom.difficulty === '보통' ? 'bg-yellow-100 text-yellow-800' :
              oroom.difficulty === '어려움' ? 'bg-orange-100 text-orange-800' :
              'bg-red-100 text-red-800'
            }`}>
              {oroom.difficulty}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">왕복 소요 시간</label>
            <p className="text-gray-900">{oroom.roundTripTime}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">정상뷰</label>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              oroom.summitView === '상' ? 'bg-blue-100 text-blue-800' :
              oroom.summitView === '중' ? 'bg-indigo-100 text-indigo-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {oroom.summitView}
            </span>
          </div>
        </div>

        {oroom.mainSeasons.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">주요 계절</label>
            <div className="flex flex-wrap gap-2">
              {oroom.mainSeasons.map(season => (
                <span key={season} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
                  {season}
                </span>
              ))}
            </div>
          </div>
        )}

        {oroom.mainMonths.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">주요 월</label>
            <div className="flex flex-wrap gap-2">
              {oroom.mainMonths.map(month => (
                <span key={month} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                  {month}
                </span>
              ))}
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* 전문가 팁 */}
      {oroom.expertTip && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-amber-900 mb-4">💡 전문가 팁</h3>
          <p className="text-amber-800 leading-relaxed whitespace-pre-line">{oroom.expertTip}</p>
        </div>
      )}

      {/* 추가 정보 */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">추가 정보</h3>

        {oroom.nearbyAttractions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">주변 가볼만한 곳</label>
            <div className="flex flex-wrap gap-2">
              {oroom.nearbyAttractions.map(attraction => (
                <span key={attraction} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-md">
                  {attraction}
                </span>
              ))}
            </div>
          </div>
        )}

        {oroom.nameOrigin && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">이름 유래</label>
            <p className="text-gray-900 bg-white p-3 rounded-md border">{oroom.nameOrigin}</p>
          </div>
        )}
      </div>

      {/* 사진 섹션 */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">사진</h3>

        {renderImageSection(oroom.parkingImages, '주차장 사진', '🅿️', '주차장 사진 없음')}
        {renderImageSection(oroom.entranceImages, '탐방로입구 사진', '🚪', '탐방로입구 사진 없음')}
        {renderImageSection(oroom.trailImages, '탐방로 사진', '🥾', '탐방로 사진 없음')}
        {renderImageSection(oroom.summitImages, '정상뷰 사진', '🌅', '정상뷰 사진 없음')}
      </div>

      {/* 메타데이터 */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">정보</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>생성일: {oroom.createdAt.toLocaleDateString()}</p>
          <p>수정일: {oroom.updatedAt.toLocaleDateString()}</p>
          <p>상태:
            <span className={`ml-2 px-2 py-1 text-xs rounded-md ${
              oroom.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {oroom.status === 'published' ? '발행됨' : '초안'}
            </span>
          </p>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3">
        <Button
          onClick={onBack}
          variant="secondary"
          className="flex-1"
        >
          목록으로 돌아가기
        </Button>
        <Button
          onClick={onEdit}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          오름 정보 수정하기
        </Button>
      </div>

      {/* 오름게임카드 큰 이미지 모달 */}
      {showGameCardModal && oroom.cardImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowGameCardModal(false)}
        >
          <div className="relative max-w-2xl max-h-full">
            <img
              src={oroom.cardImage.url}
              alt={`${oroom.name} 오름게임카드`}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setShowGameCardModal(false)}
              className="absolute top-4 right-4 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 일반 이미지 큰 이미지 모달 */}
      {showImageModal && selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedImage.url}
              alt={selectedImage.alt}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OroomDetailView;