import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCDXe9s5bpcCkJQEsIXhGFbqw0yUJTmk4I",
  authDomain: "jejudatabuilder.firebaseapp.com",
  projectId: "jejudatabuilder",
  storageBucket: "jejudatabuilder.firebasestorage.app",
  messagingSenderId: "927942693421",
  appId: "1:927942693421:web:87a8abb1dddb8d6bfd7b50",
  measurementId: "G-S9H31HB4GW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'databuilder');

async function checkCategories() {
  console.log('🔍 Firestore 스팟 카테고리 확인 중...\n');

  const spotsQuery = query(collection(db, 'spots'), limit(20));
  const snapshot = await getDocs(spotsQuery);

  console.log(`📊 총 ${snapshot.size}개 샘플 확인\n`);

  snapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`\n장소: ${data.place_name}`);
    console.log(`  - categories:`, data.categories);
    console.log(`  - categories_kr:`, data.categories_kr);
    console.log(`  - location:`, data.location ? `${data.location.latitude}, ${data.location.longitude}` : 'GPS 없음');
    console.log(`  - tags:`, data.tags ? data.tags.slice(0, 5) : '없음');
  });

  // 음식점/카페 카테고리 통계
  const allDocs = await getDocs(collection(db, 'spots'));
  let restaurantCount = 0;
  let cafeCount = 0;
  let withGPS = 0;

  allDocs.forEach((doc) => {
    const data = doc.data();
    const categories = data.categories || [];

    if (categories.some(cat =>
      cat.includes('Restaurant') ||
      cat.includes('음식점') ||
      cat.includes('식당') ||
      cat.includes('맛집')
    )) {
      restaurantCount++;
      if (data.location?.latitude && data.location?.longitude) {
        withGPS++;
      }
    }

    if (categories.some(cat =>
      cat.includes('Cafe') ||
      cat.includes('카페')
    )) {
      cafeCount++;
    }
  });

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 음식점/카페 통계');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🍽️ 음식점: ${restaurantCount}개`);
  console.log(`  └─ GPS 있음: ${withGPS}개`);
  console.log(`☕ 카페: ${cafeCount}개`);
  console.log(`📍 전체 스팟: ${allDocs.size}개`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

checkCategories()
  .then(() => {
    console.log('✅ 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });
