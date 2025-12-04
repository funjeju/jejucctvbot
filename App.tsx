
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Place, InitialFormData, Suggestion, EditLog, WeatherSource, OroomData, NewsItem } from './types';
import CategoryForm from './components/CategoryForm';
import InitialForm from './components/InitialForm';
import EventForm, { type EventFormData } from './components/EventForm';
import NewsForm from './components/NewsForm';
import ReviewDashboard from './components/ReviewDashboard';
import ContentLibrary from './components/ContentLibrary';
import SpotDetailView from './components/SpotDetailView';
import Chatbot from './components/Chatbot';
import WeatherChatModal from './components/WeatherChatModal';
import TripPlannerModal from './components/TripPlannerModal';
import OroomDBModal from './components/OroomDBModal';
import NewsFeedModal from './components/NewsFeedModal';
import VideoViewer from './components/VideoViewer';
import Spinner from './components/common/Spinner';
import Modal from './components/common/Modal';
import Button from './components/common/Button';
import { generateDraft } from './services/geminiService';
import { KLokalLogo, WITH_KIDS_OPTIONS, WITH_PETS_OPTIONS, PARKING_DIFFICULTY_OPTIONS, ADMISSION_FEE_OPTIONS } from './constants';
import { collection, query, onSnapshot, setDoc, doc, deleteDoc, getDocs, updateDoc } from "firebase/firestore";
import { db } from './services/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { sanitizePlaceForFirestore, parsePlaceFromFirestore } from './services/placeFirestore';
import { subscribeToNews, saveNewsItem, deleteNewsItem } from './services/newsFirestore';
import { testWeatherAPI, getCurrentWeather, JEJU_WEATHER_STATIONS } from './services/weatherService';
import { testCapture, captureWeatherScene } from './services/youtubeCapture';
import { AuthProvider } from './contexts/AuthContext';
import DebugPanel from './components/DebugPanel';

type AppStep = 'library' | 'category' | 'initial' | 'event' | 'news' | 'loading' | 'review' | 'view';

// Utility to set a value in a nested object using a string path
// This is a simplified version and might not cover all edge cases like lodash.set
const setValueByPath = (obj: any, path: string, value: any) => {
  const keys = path.replace(/\[(\w+)\]/g, '.$1').split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (typeof current[key] === 'undefined' || current[key] === null) {
      // Check if next key is a number, to create an array or object
      current[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
  return obj;
};

const ChatbotIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9.4 12.4h-2v-2h2v2zm3.2 0h-2v-2h2v2zm3.2 0h-2v-2h2v2z" />
  </svg>
);

const App: React.FC = () => {
  // 수정: 정의되지 않은 initialDummyData 대신 빈 배열로 초기 상태를 변경합니다.
  // 이제 데이터는 Firebase에서 직접 불러오게 됩니다.
  const [spots, setSpots] = useState<Place[]>([]);
  const [step, setStep] = useState<AppStep>('library');
  const [dataToEdit, setDataToEdit] = useState<Place | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<{ spotName: string, categories: string[] } | null>(null);
  const [spotToView, setSpotToView] = useState<Place | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDataSaved, setIsDataSaved] = useState(false);
  const [finalData, setFinalData] = useState<Place | null>(null);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isWeatherChatOpen, setIsWeatherChatOpen] = useState(false);
  const [isTripPlannerOpen, setIsTripPlannerOpen] = useState(false);
  const [isOroomDBOpen, setIsOroomDBOpen] = useState(false);
  const [weatherSources, setWeatherSources] = useState<WeatherSource[]>([]);
  const [orooms, setOrooms] = useState<OroomData[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoadingSpots, setIsLoadingSpots] = useState(true);
  const [isLoadingOrooms, setIsLoadingOrooms] = useState(true);
  const [isNewsFeedOpen, setIsNewsFeedOpen] = useState(false);
  const [newsToEdit, setNewsToEdit] = useState<NewsItem | null>(null);
  // 스팟 데이터 실시간 리스너
  useEffect(() => {
    console.log('Firestore 실시간 리스너 설정 중...');
    const q = query(collection(db, "spots"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const spotsArray: Place[] = querySnapshot.docs.map((docSnap) =>
        parsePlaceFromFirestore(docSnap.data(), docSnap.id)
      );
      setSpots(spotsArray);
      setIsLoadingSpots(false);
      console.log(`Firestore에서 실시간으로 ${spotsArray.length}개의 스팟을 불러왔습니다.`);
    }, (error) => {
      console.error('Error in spots listener:', error);
      setSpots([]);
      setIsLoadingSpots(false);
    });

    return () => unsubscribe();
  }, []);

  // 오름 데이터 실시간 리스너
  useEffect(() => {
    console.log('Orooms Firestore 실시간 리스너 설정 중...');
    const q = query(collection(db, "orooms"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const oroomsArray: OroomData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Firestore Timestamp를 Date로 변환
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          data.createdAt = data.createdAt.toDate();
        }
        if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
          data.updatedAt = data.updatedAt.toDate();
        }
        oroomsArray.push({ id: doc.id, ...data } as OroomData);
      });
      setOrooms(oroomsArray);
      setIsLoadingOrooms(false);
      console.log(`Firestore에서 실시간으로 ${oroomsArray.length}개의 오름을 불러왔습니다.`);
    }, (error) => {
      console.error('Error in orooms listener:', error);
      setOrooms([]);
      setIsLoadingOrooms(false);
    });

    return () => unsubscribe();
  }, []);

  // 날씨 소스 데이터 실시간 리스너
  useEffect(() => {
    console.log('WeatherSources Firestore 실시간 리스너 설정 중...');
    const q = query(collection(db, "weatherSources"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const sourcesArray: WeatherSource[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as WeatherSource;
        console.log(`Firestore에서 로드된 데이터 (${data.title}):`, data);
        console.log(`GPS 좌표 - lat: ${data.latitude}, lng: ${data.longitude}`);
        sourcesArray.push(data);
      });
      setWeatherSources(sourcesArray);
      console.log(`Firestore에서 실시간으로 날씨 소스 ${sourcesArray.length}개를 불러왔습니다.`);
    }, (error) => {
      console.error('Error in weatherSources listener:', error);
      // Firestore 실패 시 localStorage에서 백업 읽기
      console.log('Firestore 실패 - localStorage에서 날씨 소스 백업 읽기 시도...');
      const localData = localStorage.getItem('jejuWeatherSources');
      if (localData) {
        try {
          const sourcesArray: WeatherSource[] = JSON.parse(localData);
          setWeatherSources(sourcesArray);
          console.log(`localStorage에서 날씨 소스 ${sourcesArray.length}개를 불러왔습니다.`);
        } catch (parseError) {
          console.error('localStorage 파싱 오류:', parseError);
          setWeatherSources([]);
        }
      } else {
        setWeatherSources([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // 뉴스 데이터 실시간 리스너
  useEffect(() => {
    console.log('News Firestore 실시간 리스너 설정 중...');
    const unsubscribe = subscribeToNews((newsArray) => {
      setNews(newsArray);
      console.log(`Firestore에서 실시간으로 뉴스 ${newsArray.length}개를 불러왔습니다.`);
    });

    return () => unsubscribe();
  }, []);


  const handleGenerateDraft = useCallback(async (formData: InitialFormData) => {

    setStep('loading');
    setError(null);
    try {
      const generatedData = await generateDraft(formData);
      const now = Date.now() / 1000;
      const timestamp = { seconds: now, nanoseconds: 0 };

      const defaultAttributes = {
        targetAudience: [],
        recommendedSeasons: [],
        withKids: WITH_KIDS_OPTIONS[1], // "가능"
        withPets: WITH_PETS_OPTIONS[2], // "불가"
        parkingDifficulty: PARKING_DIFFICULTY_OPTIONS[1], // "보통"
        admissionFee: ADMISSION_FEE_OPTIONS[2], // "정보없음"
      };

      const completeData: Place = {
        // App-generated data
        place_id: dataToEdit?.place_id || `P_${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}_${Math.random().toString(36).substring(2, 4).toUpperCase()}`,
        creator_id: 'expert_001',
        status: 'draft',
        created_at: dataToEdit?.created_at || timestamp,
        updated_at: timestamp,

        // Defaults for arrays and nullable fields
        images: [],
        linked_spots: [],
        average_duration_minutes: null,

        // Data from AI, with fallbacks
        ...generatedData,

        // Overwrite with user's direct input as source of truth
        place_name: formData.spotName,
        categories: formData.categories,
        expert_tip_raw: formData.spotDescription,
        import_url: formData.importUrl,

        // Carefully merge nested objects
        attributes: { ...defaultAttributes, ...(generatedData.attributes || {}) },
        public_info: { ...(generatedData.public_info || {}) },
        comments: generatedData.comments || [],
        tags: generatedData.tags || [],
      };

      setDataToEdit(completeData);
      setStep('review');
    } catch (err) {
      console.error('Error generating draft:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setStep('initial');
    }
  }, [dataToEdit]);


  const handleOpenReview = (finalData: Place) => {
    setFinalData(finalData);
    setIsDataSaved(false);
    setIsModalOpen(true);
  };

  const handleGoBack = useCallback(() => {
    if (step === 'review') {
      // Check if this is an event, return to event form
      if (dataToEdit?.categories?.includes('축제 및 행사')) {
        setStep('event');
      } else {
        setStep('initial');
      }
    } else if (step === 'initial') {
      setStep('category');
    } else if (step === 'category' || step === 'event' || step === 'news') {
      setDataToEdit(null);
      setCategoryFormData(null);
      setNewsToEdit(null);
      setStep('library');
    } else if (step === 'view') {
      setSpotToView(null);
      setStep('library');
    }
  }, [step, dataToEdit]);

  const handleStartNews = () => {
    setNewsToEdit(null);
    setStep('news');
  };

  const handleNewsSubmit = async (newsItem: NewsItem, thumbnailFile?: File) => {
    try {
      let finalNewsItem = { ...newsItem };

      // 이미지 파일이 있으면 Firebase Storage에 업로드
      if (thumbnailFile) {
        const storage = getStorage();
        const imageRef = ref(storage, `news/${newsItem.id}/${thumbnailFile.name}`);
        await uploadBytes(imageRef, thumbnailFile);
        const downloadURL = await getDownloadURL(imageRef);
        finalNewsItem.thumbnail_url = downloadURL;
        console.log('이미지 업로드 완료:', downloadURL);
      }

      await saveNewsItem(finalNewsItem);
      console.log('뉴스 저장 완료:', finalNewsItem.title);
      setNewsToEdit(null);
      setStep('library');
      // 뉴스 피드 모달 자동 열기
      setIsNewsFeedOpen(true);
    } catch (error) {
      console.error('뉴스 저장 실패:', error);
      alert('뉴스 저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleEditNews = (newsItem: NewsItem) => {
    setNewsToEdit(newsItem);
    setStep('news');
    setIsNewsFeedOpen(false);
  };

  const handleDeleteNews = async (newsId: string) => {
    try {
      await deleteNewsItem(newsId);
      console.log('뉴스 삭제 완료:', newsId);
    } catch (error) {
      console.error('뉴스 삭제 실패:', error);
      alert('뉴스 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 데이터 저장 함수 (로컬 스토리지 + Firestore 백업)
  const handleSaveToFirebase = async (data: Place) => {
    try {
      // 로컬 상태 업데이트
      setSpots(prevSpots => {
        const updatedSpots = prevSpots.filter(spot => spot.place_id !== data.place_id);
        const newSpots = [...updatedSpots, data];

        // 로컬 스토리지에 저장
        localStorage.setItem('jejuSpots', JSON.stringify(newSpots));

        return newSpots;
      });

      // Firestore에도 백업 저장 시도
      try {
        const docId = data.place_id;
        const sanitized = sanitizePlaceForFirestore(data);
        await setDoc(doc(db, "spots", docId), sanitized);
        console.log('Firestore에 백업 저장 완료');
      } catch (firestoreError) {
        console.warn('Firestore 백업 저장 실패:', firestoreError);
      }

      console.log('데이터 저장 완료');
    } catch (error) {
      console.error('데이터 저장 오류:', error);
    }
  };

  // 스팟 목록 새로고침 함수
  const refreshSpots = async () => {
    const localData = localStorage.getItem('jejuSpots');
    if (localData) {
      const spotsArray: Place[] = JSON.parse(localData);
      setSpots(spotsArray);
      console.log(`로컬 데이터 새로고침: ${spotsArray.length}개`);
    }
  };

  // 날씨 소스 데이터 저장 함수 (로컬 스토리지 + Firestore 백업)
  const handleSaveWeatherSourceToFirebase = async (data: Omit<WeatherSource, 'id'> & { id?: string }) => {
    try {
      const id = data.id || `ws_${Date.now()}`;
      const weatherSourceData = { ...data, id };

      // 로컬 상태 업데이트
      setWeatherSources(prevSources => {
        const updatedSources = prevSources.filter(source => source.id !== id);
        const newSources = [...updatedSources, weatherSourceData as WeatherSource];

        // 로컬 스토리지에 저장
        localStorage.setItem('jejuWeatherSources', JSON.stringify(newSources));

        return newSources;
      });

      // Firestore에도 백업 저장 시도 (undefined 제거 후)
      try {
        console.log('Firestore에 저장할 데이터:', weatherSourceData);
        console.log('저장할 GPS 좌표:', { lat: weatherSourceData.latitude, lng: weatherSourceData.longitude });

        // undefined 제거를 위해 sanitizePlaceForFirestore의 deepCloneWithoutUndefined 함수 재활용
        const sanitizedData = JSON.parse(JSON.stringify(weatherSourceData, (key, value) => {
          return value === undefined ? null : value;
        }));

        await setDoc(doc(db, "weatherSources", id), sanitizedData);
        console.log('날씨 소스 Firestore에 백업 저장 완료');
      } catch (firestoreError) {
        console.warn('날씨 소스 Firestore 백업 저장 실패:', firestoreError);
        console.error('Firestore 오류 상세:', firestoreError);
      }

      console.log('날씨 소스 저장 완료');
    } catch (error) {
      console.error('날씨 소스 저장 오류:', error);
    }
  };

  // 날씨 소스 데이터 삭제 함수 (로컬 스토리지 + Firestore)
  const handleDeleteWeatherSourceFromFirebase = async (id: string) => {
    try {
      // 로컬 상태 업데이트
      setWeatherSources(prevSources => {
        const updatedSources = prevSources.filter(source => source.id !== id);

        // 로컬 스토리지에 저장
        localStorage.setItem('jejuWeatherSources', JSON.stringify(updatedSources));

        return updatedSources;
      });

      // Firestore에서도 삭제 시도
      try {
        await deleteDoc(doc(db, "weatherSources", id));
        console.log('날씨 소스 Firestore에서 삭제 완료');
      } catch (firestoreError) {
        console.warn('날씨 소스 Firestore 삭제 실패:', firestoreError);
      }

      console.log('날씨 소스 삭제 완료');
    } catch (error) {
      console.error('날씨 소스 삭제 오류:', error);
    }
  };

  // 수정: 이미지 업로드를 처리하기 위해 함수를 async 비동기 방식으로 변경합니다.
  const handleConfirmSave = async () => {
    if (finalData) {
      try {
        const storage = getStorage();
        const now = { seconds: Date.now() / 1000, nanoseconds: 0 };
        const dataToSave = { ...finalData, updated_at: now, status: finalData.status === 'stub' ? 'draft' : finalData.status };

        // 이미지 업로드 로직 추가
        if (dataToSave.images && dataToSave.images.length > 0) {
          const uploadPromises = dataToSave.images.map(async (imageInfo) => {
            // 'file' 객체가 있는 경우에만 (즉, 새로 추가되거나 수정된 이미지일 때만) 업로드합니다.
            if (imageInfo.file) {
              // 파일 이름으로 Storage 내 저장 경로를 만듭니다. 예: images/스팟ID/파일명
              const imageRef = ref(storage, `images/${dataToSave.place_id}/${imageInfo.file.name}`);
              // 파일을 Storage에 업로드합니다.
              await uploadBytes(imageRef, imageInfo.file);
              // 업로드된 파일의 다운로드 URL을 받아옵니다.
              const downloadURL = await getDownloadURL(imageRef);
              // 기존 imageInfo 객체에서 file 객체는 제거하고, url을 최종 URL로 업데이트합니다.
              return { url: downloadURL, caption: imageInfo.caption };
            }
            // 이미 URL만 있는 기존 이미지는 그대로 반환합니다.
            return imageInfo;
          });
          // 모든 이미지의 업로드 및 URL 변환 작업이 끝날 때까지 기다립니다.
          const uploadedImages = await Promise.all(uploadPromises);
          dataToSave.images = uploadedImages.map(({ file, ...rest }) => rest); // 최종적으로 file 속성 제거
        }

        await handleSaveToFirebase(dataToSave);
        console.log('Final data saved:', JSON.stringify(dataToSave, null, 2));
        setIsDataSaved(true);
      } catch (error) {
        console.error("Error saving data or uploading files: ", error);
        setError("데이터 저장 또는 파일 업로드 중 오류가 발생했습니다.");
      }
    }
  };

  const handleAddStubSpot = (spotName: string): Place => {
    const newPlaceId = `P_${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}_${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
    const now = Date.now() / 1000;
    const timestamp = { seconds: now, nanoseconds: 0 };
    const newStub: Place = {
      place_id: newPlaceId,
      place_name: spotName,
      status: 'stub',
      created_at: timestamp,
      updated_at: timestamp,
      categories: [],
      images: [],
      linked_spots: [],
      comments: []
    };
    // 로컬 상태 업데이트 로직 대신 Firebase 저장 함수 호출
    handleSaveToFirebase(newStub);
    return newStub;
  };

  const handleAddSuggestion = (placeId: string, fieldPath: string, content: string) => {
    let spotForFirebase: Place | null = null;
    setSpots(prevSpots => {
      return prevSpots.map(spot => {
        if (spot.place_id === placeId) {
          const now = { seconds: Date.now() / 1000, nanoseconds: 0 };
          const newSuggestion: Suggestion = {
            id: `sugg_${Date.now()}`,
            author: 'Collaborator', // Hardcoded for demo
            content,
            createdAt: now,
            status: 'pending',
          };

          const updatedSuggestions = { ...(spot.suggestions || {}) };
          if (!updatedSuggestions[fieldPath]) {
            updatedSuggestions[fieldPath] = [];
          }
          updatedSuggestions[fieldPath].push(newSuggestion);

          const updatedSpot = { ...spot, suggestions: updatedSuggestions };
          spotForFirebase = updatedSpot;
          return updatedSpot;
        }
        return spot;
      });
    });

    // spotToView도 업데이트 (UI 즉시 갱신을 위해)
    if (spotForFirebase && spotToView && spotToView.place_id === placeId) {
      setSpotToView(spotForFirebase);
    }

    if (spotForFirebase) {
      handleSaveToFirebase(spotForFirebase).catch(error => {
        console.error('Error saving suggestion to Firestore:', error);
      });
    }
  };

  const handleResolveSuggestion = (placeId: string, fieldPath: string, suggestionId: string, resolution: 'accepted' | 'rejected') => {
    let spotForFirebase: Place | null = null;
    setSpots(prevSpots => {
      return prevSpots.map(spot => {
        if (spot.place_id === placeId) {
          const suggestionsForField = spot.suggestions?.[fieldPath] || [];
          let suggestionToResolve: Suggestion | undefined;

          const updatedSuggestionsForField = suggestionsForField.map(s => {
            if (s.id === suggestionId) {
              suggestionToResolve = s;
              return { ...s, status: resolution };
            }
            return s;
          });

          if (!suggestionToResolve) return spot;

          const updatedSpot = { ...spot };
          updatedSpot.suggestions = { ...(spot.suggestions), [fieldPath]: updatedSuggestionsForField };

          if (resolution === 'accepted') {
            const now = { seconds: Date.now() / 1000, nanoseconds: 0 };

            // Get previous value (for history log)
            const previousValue = JSON.parse(JSON.stringify(spot)); // deep copy to get value
            const pathKeys = fieldPath.replace(/\[(\w+)\]/g, '.$1').split('.');
            let prevValRef = previousValue;
            for (const key of pathKeys) {
              if (prevValRef) prevValRef = prevValRef[key];
            }

            let newValue: any = suggestionToResolve.content;

            if (fieldPath === 'tags') {
              if (typeof newValue === 'string') {
                newValue = newValue.split(',').map(tag => tag.trim()).filter(Boolean);
              } else if (!Array.isArray(newValue)) {
                newValue = [];
              }
            } else if (fieldPath === 'expert_tip_final') {
              const existingTip = spot.expert_tip_final || '';
              const today = new Date();
              const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
              const appendix = `[${dateString} 추가된 내용]\n${suggestionToResolve.content}`;
              newValue = existingTip ? `${existingTip}\n\n${appendix}` : appendix;
            }

            setValueByPath(updatedSpot, fieldPath, newValue);

            const newLogEntry: EditLog = {
              fieldPath,
              previousValue: prevValRef,
              newValue: newValue,
              acceptedBy: 'Admin', // Hardcoded for demo
              acceptedAt: now,
              suggestionId,
            };
            updatedSpot.edit_history = [...(spot.edit_history || []), newLogEntry];
            updatedSpot.updated_at = now;
          }

          if (spotToView?.place_id === placeId) {
            setSpotToView(updatedSpot);
          }

          spotForFirebase = updatedSpot;
          return updatedSpot;
        }
        return spot;
      });
    });

    // spotToView도 업데이트 (UI 즉시 갱신을 위해)
    if (spotForFirebase && spotToView && spotToView.place_id === placeId) {
      setSpotToView(spotForFirebase);
    }

    if (spotForFirebase) {
      handleSaveToFirebase(spotForFirebase).catch(error => {
        console.error('Error updating suggestion in Firestore:', error);
      });
    }
  };

  const handleExitToLibrary = () => {
    setIsModalOpen(false);
    setIsDataSaved(false);
    setStep('library');
    setDataToEdit(null);
    setFinalData(null);
    setError(null);
    setSpotToView(null);
  };

  const handleStartNew = () => {
    setDataToEdit(null);
    setCategoryFormData(null);
    setStep('category');
  };

  const handleStartEvent = () => {
    setDataToEdit(null);
    setCategoryFormData(null);
    setStep('event');
  };

  const handleCategorySubmit = (data: { spotName: string, categories: string[] }) => {
    setCategoryFormData(data);
    setStep('initial');
  };

  const handleEventSubmit = (eventData: EventFormData) => {
    const now = Date.now() / 1000;
    const timestamp = { seconds: now, nanoseconds: 0 };

    const eventPlace: Place = {
      place_id: `P_${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}_${Math.random().toString(36).substring(2, 4).toUpperCase()}`,
      place_name: eventData.eventName,
      creator_id: 'expert_001',
      status: 'draft',
      categories: ['축제 및 행사'],
      region: eventData.region || null,
      address: eventData.address || null,
      expert_tip_raw: eventData.eventDescription,
      import_url: eventData.importUrl,
      event_info: eventData.eventInfo,
      created_at: timestamp,
      updated_at: timestamp,
      images: [],
      linked_spots: [],
      comments: [],
      average_duration_minutes: null,
      attributes: {
        targetAudience: eventData.eventInfo.target_audience || [],
        recommendedSeasons: eventData.eventInfo.seasons || [],
        withKids: WITH_KIDS_OPTIONS[1],
        withPets: WITH_PETS_OPTIONS[2],
        parkingDifficulty: PARKING_DIFFICULTY_OPTIONS[1],
        admissionFee: eventData.eventInfo.admission_fee || ADMISSION_FEE_OPTIONS[2],
      },
    };

    setDataToEdit(eventPlace);
    setStep('review');
  };

  const handleEditSpot = (spot: Place) => {
    setSpotToView(null);
    setDataToEdit(spot);
    if (spot.status === 'stub') {
      setCategoryFormData({
        spotName: spot.place_name,
        categories: spot.categories || []
      });
      setStep('initial');
    } else {
      setStep('review');
    }
  };

  const handleViewSpot = (spot: Place) => {
    setSpotToView(spot);
    setStep('view');
  };

  const handleDeleteSpot = async (spot: Place) => {
    try {
      // Firestore에서 삭제
      await deleteDoc(doc(db, "spots", spot.place_id));
      console.log('스팟 삭제 완료:', spot.place_name);

      // 로컬 state에서도 제거
      setSpots(prevSpots => prevSpots.filter(s => s.place_id !== spot.place_id));

      // 현재 보고 있던 스팟이 삭제된 경우 라이브러리로 돌아가기
      if (spotToView && spotToView.place_id === spot.place_id) {
        setSpotToView(null);
        setStep('library');
      }
    } catch (error) {
      console.error('스팟 삭제 실패:', error);
      alert('스팟 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleNavigateFromChatbot = (placeId: string) => {
    const spot = spots.find(s => s.place_id === placeId);
    if (spot) {
      setSpotToView(spot);
      setStep('view');
      setIsChatbotOpen(false); // Close chatbot on navigation
    }
  };

  const handleSaveWeatherSource = (data: Omit<WeatherSource, 'id'> & { id?: string }) => {
    console.log('handleSaveWeatherSource 호출됨:', data);
    console.log('전달된 GPS 좌표:', { lat: data.latitude, lng: data.longitude });
    handleSaveWeatherSourceToFirebase(data);
  };

  const handleDeleteWeatherSource = (id: string) => {
    handleDeleteWeatherSourceFromFirebase(id);
  };

  const handleToggleCamChat = async (id: string, showInCamChat: boolean) => {
    try {
      // Firestore 업데이트
      const sourceRef = doc(db, "weatherSources", id);
      await updateDoc(sourceRef, { showInCamChat });
      console.log(`Cam & Chat 표시 설정 업데이트: ${id} -> ${showInCamChat}`);
    } catch (error) {
      console.error('Cam & Chat 설정 업데이트 실패:', error);
    }
  };

  // 개발 모드에서 전역 함수로 기상청 API 테스트 추가
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).testWeatherAPI = testWeatherAPI;
      (window as any).getCurrentWeather = getCurrentWeather;
      (window as any).JEJU_WEATHER_STATIONS = JEJU_WEATHER_STATIONS;
      (window as any).testCapture = testCapture;
      (window as any).captureWeatherScene = captureWeatherScene;
      console.log('🌤️ 날씨 시스템 테스트 함수가 전역으로 등록되었습니다:');
      console.log('📊 기상청 API:');
      console.log('  - window.testWeatherAPI(): 제주 날씨 테스트');
      console.log('  - window.getCurrentWeather("제주"): 특정 지역 날씨');
      console.log('  - window.JEJU_WEATHER_STATIONS: 사용 가능한 관측소 목록');
      console.log('🎥 YouTube 캡처 & 오버레이:');
      console.log('  - window.testCapture(): YouTube 캡처 테스트');
      console.log('  - window.captureWeatherScene(url, title): 실제 캡처 실행');
    }
  }, []);
  // URL 기반 라우팅 확인 (VideoViewer만 처리)
  const checkRoute = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('url');
  };

  // VideoViewer 페이지인지 확인
  if (checkRoute()) {
    return <VideoViewer />;
  }

  const renderContent = () => {
    switch (step) {
      case 'library':
        if (isLoadingSpots) {
          return (
            <div className="text-center p-10">
              <Spinner />
              <p className="text-lg text-gray-600 mt-4">Firestore에서 데이터를 불러오는 중입니다...</p>
            </div>
          );
        }
        if (error) {
          return (
            <div className="text-center p-10">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <p className="text-red-600 font-semibold mb-2">오류가 발생했습니다</p>
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()} variant="default">
                  새로고침
                </Button>
              </div>
            </div>
          );
        }
        return <ContentLibrary
          spots={spots}
          news={news}
          onAddNew={handleStartNew}
          onAddEvent={handleStartEvent}
          onAddNews={handleStartNews}
          onEdit={handleEditSpot}
          onView={handleViewSpot}
          onDelete={handleDeleteSpot}
          onOpenWeatherChat={() => setIsWeatherChatOpen(true)}
          onOpenTripPlanner={() => setIsTripPlannerOpen(true)}
          onOpenOroomDB={() => setIsOroomDBOpen(true)}
          onOpenNewsFeed={() => setIsNewsFeedOpen(true)}
        />;
      case 'view':
        if (spotToView) {
          // 이 스팟 관련 뉴스 필터링
          const spotNews = news.filter(n =>
            n.auto_apply_to_spot && n.related_spot_ids.includes(spotToView.place_id)
          );
          return <SpotDetailView
            spot={spotToView}
            relatedNews={spotNews}
            onBack={handleGoBack}
            onEdit={handleEditSpot}
            onAddSuggestion={handleAddSuggestion}
            onResolveSuggestion={handleResolveSuggestion}
          />;
        }
        setStep('library');
        return null;
      case 'event':
        return <EventForm onSubmit={handleEventSubmit} onBack={handleGoBack} />;
      case 'news':
        return <NewsForm onSubmit={handleNewsSubmit} onBack={handleGoBack} spots={spots} initialValues={newsToEdit || undefined} />;
      case 'category': {
        const categoryInitialValues = dataToEdit ? {
          spotName: dataToEdit.place_name,
          categories: dataToEdit.categories || []
        } : undefined;
        return <CategoryForm onSubmit={handleCategorySubmit} error={error} onBack={handleGoBack} initialValues={categoryInitialValues} />;
      }
      case 'initial': {
        const initialValues = dataToEdit ? {
          spotDescription: dataToEdit.expert_tip_raw || '',
          importUrl: dataToEdit.import_url || '',
        } : undefined;
        return <InitialForm
          categoryData={categoryFormData!}
          onGenerateDraft={handleGenerateDraft}
          error={error}
          onBack={handleGoBack}
          initialValues={initialValues}
        />;
      }
      case 'loading':
        return (
          <div className="text-center p-10">
            <Spinner />
            <div className="space-y-3 mt-4">
              <p className="text-lg text-gray-600">🔍 AI가 해당 스팟에 대한 웹 검색을 진행 중입니다...</p>
              <p className="text-md text-gray-500">📝 검색 결과와 전문가 설명을 통합하여 초안을 생성하고 있어요.</p>
              <p className="text-sm text-gray-400">잠시만 기다려주세요.</p>
            </div>
          </div>
        );
      case 'review':
        if (dataToEdit) {
          return <ReviewDashboard initialData={dataToEdit} onSave={handleOpenReview} allSpots={spots} onAddStubSpot={handleAddStubSpot} onBack={handleGoBack} />;
        }
        // Fallback to library if no data to edit
        setStep('library');
        return null;
      default:
        return null;
    }
  };

  const HeaderButton = useMemo(() => {
    if (step === 'library') return null;

    return (
      <button
        onClick={handleExitToLibrary}
        className="text-sm font-medium text-gray-900 hover:text-gray-700 transition-colors"
      >
        라이브러리로 돌아가기
      </button>
    );
  }, [step]);


  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <KLokalLogo />
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
              Jeju DB: AI 데이터빌더
            </h1>
          </div>
          {HeaderButton}
        </header>
        <main>
          {renderContent()}
        </main>
        <footer className="text-center mt-12 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Jeju DB Project. All Rights Reserved.</p>
        </footer>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="생성된 JSON 데이터 미리보기"
      >
        <div className="space-y-6">
          <div>
              <p className="text-gray-600">
              아래는 최종 생성된 JSON 데이터입니다. 내용을 확인 후 저장하거나, 다시 돌아가 수정할 수 있습니다.
            </p>
            {isDataSaved &&
              <p className="mt-2 text-sm font-semibold text-green-600 bg-green-50 p-3 rounded-md border border-green-200">
                ✓ 저장 완료! (브라우저 콘솔을 확인하세요)
              </p>
            }
          </div>
          <div className="bg-gray-50 p-4 rounded-md max-h-96 overflow-y-auto border border-gray-200">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
              {JSON.stringify(finalData, null, 2)}
            </pre>
          </div>
          <div className="flex justify-end items-center gap-3 pt-5 border-t border-gray-200 mt-2">
            <Button onClick={handleCloseModal} variant="outline" disabled={isDataSaved}>
              수정하기
            </Button>
            <Button onClick={handleConfirmSave} variant="default" disabled={isDataSaved}>
              {isDataSaved ? '저장됨' : '저장하기'}
            </Button>
            <Button onClick={handleExitToLibrary} variant="default">
              라이브러리로 이동
            </Button>
          </div>
        </div>
      </Modal>

      <button
        onClick={() => setIsChatbotOpen(true)}
        className="fixed bottom-6 right-6 bg-gray-900 text-white p-4 rounded-full shadow-lg hover:bg-gray-800 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 z-50"
        onDeleteSource={handleDeleteWeatherSource}
        onToggleCamChat={handleToggleCamChat}
      />

      <TripPlannerModal
        isOpen={isTripPlannerOpen}
        onClose={() => setIsTripPlannerOpen(false)}
        spots={spots}
        orooms={orooms}
      />

      <OroomDBModal
        isOpen={isOroomDBOpen}
        onClose={() => setIsOroomDBOpen(false)}
      />

      <NewsFeedModal
        isOpen={isNewsFeedOpen}
        onClose={() => setIsNewsFeedOpen(false)}
        news={news}
        spots={spots}
        onAddNews={handleStartNews}
        onEditNews={handleEditNews}
        onDeleteNews={handleDeleteNews}
      />
    </div>
  );
};

const AppWithAuth: React.FC = () => {
  return (
    <AuthProvider>
      <App />
      <DebugPanel />
    </AuthProvider>
  );
};

export default AppWithAuth;
