import React, { useState, useEffect } from 'react';
import type { OroomData, OroomInitialFormData } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import OroomInitialForm from './OroomInitialForm';
import OroomDetailForm from './OroomDetailForm';
import OroomDetailView from './OroomDetailView';
import { analyzeOroomDescription } from '../services/geminiService';
import { saveOroom, updateOroom, deleteOroom, subscribeToOrooms } from '../services/oroomFirestore';

interface OroomDBModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type OroomStep = 'library' | 'initial' | 'loading' | 'detail' | 'view';

const OroomDBModal: React.FC<OroomDBModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<OroomStep>('library');
  const [orooms, setOrooms] = useState<OroomData[]>([]);
  const [currentOroom, setCurrentOroom] = useState<OroomData | null>(null);
  const [viewingOroom, setViewingOroom] = useState<OroomData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // 수정 모드 상태

  // Firebase에서 오름 데이터 실시간 구독
  useEffect(() => {
    if (isOpen) {
      const unsubscribe = subscribeToOrooms((oroomList) => {
        setOrooms(oroomList);
      });

      return () => unsubscribe();
    }
  }, [isOpen]);

  const handleAddOroom = () => {
    setIsEditing(false);
    setCurrentOroom(null);
    setStep('initial');
  };

  const handleInitialSubmit = async (data: OroomInitialFormData) => {
    setIsLoading(true);
    setStep('loading');

    try {
      // 실제 AI 분석 수행
      const analysisResult = await analyzeOroomDescription(data);

      // AI 분석 결과를 OroomData 형태로 변환
      const newOroom: OroomData = {
        id: analysisResult.id || Date.now().toString(),
        name: analysisResult.name || '',
        address: analysisResult.address || '',
        difficulty: analysisResult.difficulty || '보통',
        mainSeasons: analysisResult.mainSeasons || [],
        mainMonths: analysisResult.mainMonths || [],
        roundTripTime: analysisResult.roundTripTime || '',
        summitView: analysisResult.summitView || '중',
        expertTip: analysisResult.expertTip || '',
        nearbyAttractions: analysisResult.nearbyAttractions || [],
        nameOrigin: analysisResult.nameOrigin || '',
        parkingImages: analysisResult.parkingImages || [],
        entranceImages: analysisResult.entranceImages || [],
        trailImages: analysisResult.trailImages || [],
        summitImages: analysisResult.summitImages || [],
        createdAt: analysisResult.createdAt || new Date(),
        updatedAt: analysisResult.updatedAt || new Date(),
        status: analysisResult.status || 'draft'
      };

      setCurrentOroom(newOroom);
      setStep('detail');
    } catch (error) {
      console.error('AI 분석 오류:', error);
      alert('AI 분석 중 오류가 발생했습니다: ' + (error as Error).message);
      setStep('initial'); // 오류 시 초기 폼으로 돌아가기
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOroom = async (oroomData: OroomData) => {
    try {
      if (isEditing && oroomData.id) {
        // 수정 모드: 기존 오름 업데이트
        await updateOroom(oroomData.id, oroomData);
        console.log('오름 수정 완료:', oroomData.id);
      } else {
        // 새 생성 모드: 새 오름 저장
        await saveOroom(oroomData);
        console.log('새 오름 생성 완료');
      }

      setStep('library');
      setCurrentOroom(null);
      setIsEditing(false);
      // Firebase 실시간 구독으로 자동으로 목록이 업데이트됨
    } catch (error) {
      console.error('오름 저장 오류:', error);
      alert('오름 저장 중 오류가 발생했습니다: ' + (error as Error).message);
    }
  };

  const handleViewOroom = (oroom: OroomData) => {
    setViewingOroom(oroom);
    setStep('view');
  };

  const handleBack = () => {
    setStep('library');
    setCurrentOroom(null);
    setViewingOroom(null);
    setIsEditing(false);
  };

  const handleDeleteOroom = async (oroomId: string, oroomName: string) => {
    if (confirm(`"${oroomName}" 오름을 삭제하시겠습니까?`)) {
      try {
        await deleteOroom(oroomId);
        console.log('오름 삭제 완료:', oroomId);
      } catch (error) {
        console.error('오름 삭제 오류:', error);
        alert('오름 삭제 중 오류가 발생했습니다: ' + (error as Error).message);
      }
    }
  };

  const handleClose = () => {
    setStep('library');
    setCurrentOroom(null);
    setViewingOroom(null);
    setIsEditing(false);
    onClose();
  };

  const renderContent = () => {
    switch (step) {
      case 'library':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">🏔️ 오름 데이터베이스</h2>
              <div className="flex items-center gap-3">
                <Button onClick={handleAddOroom} className="bg-green-600 hover:bg-green-700">
                  + 오름 추가하기
                </Button>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors bg-white rounded-full p-2 shadow-md"
                  title="닫기"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 오름 목록 - 2열 그리드 (카드 형태) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {orooms.map((oroom) => (
                <div key={oroom.id} className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow h-80">
                  <div className="flex h-full">
                    {/* 좌측: 오름게임카드 (카드의 절반 비율) */}
                    <div className="w-1/2 h-full flex-shrink-0 bg-gray-100">
                      {oroom.cardImage ? (
                        <button
                          onClick={() => handleViewOroom(oroom)}
                          className="w-full h-full block"
                        >
                          <img
                            src={oroom.cardImage.url}
                            alt={`${oroom.name} 오름게임카드`}
                            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                          />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleViewOroom(oroom)}
                          className="w-full h-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <div className="text-center">
                            <span className="text-xl">🏔️</span>
                            <p className="text-xs mt-1">게임카드</p>
                          </div>
                        </button>
                      )}
                    </div>

                    {/* 우측: 내용 영역 */}
                    <div className="flex-1 p-3 flex flex-col">
                      {/* 상단: 제목과 아이콘, 삭제버튼 */}
                      <div className="flex items-start justify-between mb-2">
                        <button
                          onClick={() => handleViewOroom(oroom)}
                          className="text-left hover:text-green-600 transition-colors flex-1"
                        >
                          <div className="flex items-center gap-1">
                            <h3 className="font-bold text-base text-gray-900 hover:underline truncate">{oroom.name}</h3>
                            <div className="flex items-center gap-0.5">
                              {/* 난이도 이모티콘 */}
                              <span title={`난이도: ${oroom.difficulty}`} className="text-sm">
                                {oroom.difficulty === '쉬움' ? '🟢' :
                                 oroom.difficulty === '보통' ? '🟡' :
                                 oroom.difficulty === '어려움' ? '🟠' : '🔴'}
                              </span>
                              {/* 정상뷰 이모티콘 */}
                              <span title={`정상뷰: ${oroom.summitView}`} className="text-sm">
                                {oroom.summitView === '상' ? '🌟' :
                                 oroom.summitView === '중' ? '⭐' : '✨'}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">{oroom.roundTripTime}</p>
                        </button>
                        <button
                          onClick={() => handleDeleteOroom(oroom.id, oroom.name)}
                          className="ml-2 text-red-500 hover:text-red-700 transition-colors p-1 hover:bg-red-50 rounded"
                          title="삭제"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v1H4V5zM3 8a1 1 0 011-1h12a1 1 0 110 2l-.867 10.142A2 2 0 0113.138 21H6.862a2 2 0 01-1.995-1.858L4 8z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>

                      {/* 하단: 정상뷰와 탐방로 사진 (세로 배치) */}
                      <div className="flex-1 space-y-2">
                        {/* 정상뷰 사진 */}
                        <div className="h-20 bg-gray-200 rounded-md flex items-center justify-center relative overflow-hidden">
                          {oroom.summitImages.length > 0 ? (
                            <>
                              <img
                                src={oroom.summitImages[0].url}
                                alt={`${oroom.name} 정상뷰`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-0.5 left-0.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs px-1 py-0.5 rounded font-medium">
                                🌅 정상뷰
                              </div>
                            </>
                          ) : (
                            <div className="text-center">
                              <span className="text-gray-400 text-sm">🌅</span>
                              <p className="text-gray-400 text-xs">정상뷰</p>
                            </div>
                          )}
                        </div>

                        {/* 탐방로 사진 */}
                        <div className="h-20 bg-gray-200 rounded-md flex items-center justify-center relative overflow-hidden">
                          {oroom.trailImages.length > 0 ? (
                            <>
                              <img
                                src={oroom.trailImages[0].url}
                                alt={`${oroom.name} 탐방로`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-0.5 left-0.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-1 py-0.5 rounded font-medium">
                                🥾 탐방로
                              </div>
                            </>
                          ) : (
                            <div className="text-center">
                              <span className="text-gray-400 text-sm">🥾</span>
                              <p className="text-gray-400 text-xs">탐방로</p>
                            </div>
                          )}
                        </div>

                        {/* 전문가 팁 */}
                        {oroom.expertTip && (
                          <div className="mt-2">
                            <div className="flex items-start gap-1">
                              <span className="text-amber-600 text-xs">💡</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">
                                  {oroom.expertTip}
                                </p>
                                {oroom.expertTip.length > 80 && (
                                  <button
                                    onClick={() => handleViewOroom(oroom)}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-0.5"
                                  >
                                    more
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {orooms.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">등록된 오름이 없습니다</p>
                <Button onClick={handleAddOroom} className="bg-green-600 hover:bg-green-700">
                  첫 번째 오름 추가하기
                </Button>
              </div>
            )}
          </div>
        );

      case 'initial':
        return (
          <OroomInitialForm
            onSubmit={handleInitialSubmit}
            onBack={handleBack}
          />
        );

      case 'loading':
        return (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">AI가 오름 정보를 분석 중입니다</h3>
            <p className="text-gray-600">오름 설명을 바탕으로 상세 정보를 추출하고 있어요...</p>
          </div>
        );

      case 'detail':
        return currentOroom ? (
          <OroomDetailForm
            oroomData={currentOroom}
            onSave={handleSaveOroom}
            onBack={handleBack}
          />
        ) : null;

      case 'view':
        return viewingOroom ? (
          <OroomDetailView
            oroom={viewingOroom}
            onBack={handleBack}
            onEdit={() => {
              setCurrentOroom(viewingOroom);
              setIsEditing(true);
              setStep('detail');
            }}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <div className="min-h-[600px]">
        {renderContent()}
      </div>
    </Modal>
  );
};

export default OroomDBModal;