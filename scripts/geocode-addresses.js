import admin from 'firebase-admin';
import axios from 'axios';

// Firebase Admin 설정
const serviceAccount = {
  type: "service_account",
  project_id: "jejudatabuilder",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CERT_URL
};

// Google Geocoding API 키
const GOOGLE_MAPS_API_KEY = 'AIzaSyBpD54PnWIgH-tBsR2PQm6lqI4sScBQTQY';

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://jejudatabuilder.firebaseio.com"
});

const db = admin.firestore();
// databuilder 데이터베이스 사용
db.settings({ databaseId: 'databuilder' });

// 주소를 GPS 좌표로 변환하는 함수
async function geocodeAddress(address) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}&language=ko&region=kr`;

    const response = await axios.get(url);

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
        formatted_address: response.data.results[0].formatted_address
      };
    } else {
      console.error(`Geocoding failed for address: ${address}, Status: ${response.data.status}`);
      return null;
    }
  } catch (error) {
    console.error(`Error geocoding address ${address}:`, error.message);
    return null;
  }
}

// 메인 실행 함수
async function geocodeAllSpots() {
  console.log('🚀 주소 → GPS 변환 시작...\n');

  try {
    // Firestore에서 모든 spots 가져오기
    const spotsCollection = db.collection('spots');
    const snapshot = await spotsCollection.get();

    console.log(`📊 전체 스팟 개수: ${snapshot.size}개\n`);

    // GPS 좌표가 없는 스팟 필터링
    const spotsWithoutGPS = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const hasGPS = data.location?.latitude && data.location?.longitude;

      if (!hasGPS && data.address) {
        spotsWithoutGPS.push({
          id: docSnap.id,
          place_name: data.place_name,
          address: data.address,
          location: data.location || {}
        });
      }
    });

    console.log(`📍 GPS 좌표가 없는 스팟: ${spotsWithoutGPS.length}개`);
    console.log(`✅ GPS 좌표가 있는 스팟: ${snapshot.size - spotsWithoutGPS.length}개\n`);

    if (spotsWithoutGPS.length === 0) {
      console.log('✨ 모든 스팟에 이미 GPS 좌표가 있습니다!');
      return;
    }

    // 변환 시작
    console.log('🔄 주소 → GPS 변환 중...\n');
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < spotsWithoutGPS.length; i++) {
      const spot = spotsWithoutGPS[i];

      console.log(`[${i + 1}/${spotsWithoutGPS.length}] ${spot.place_name}`);
      console.log(`   주소: ${spot.address}`);

      // Geocoding API 호출
      const result = await geocodeAddress(spot.address);

      if (result) {
        // Firestore 업데이트
        try {
          const spotRef = db.collection('spots').doc(spot.id);
          await spotRef.update({
            'location.latitude': result.latitude,
            'location.longitude': result.longitude,
            'location.formatted_address': result.formatted_address
          });

          console.log(`   ✅ 성공: ${result.latitude}, ${result.longitude}`);
          successCount++;
        } catch (updateError) {
          console.error(`   ❌ Firestore 업데이트 실패:`, updateError.message);
          failCount++;
        }
      } else {
        console.log(`   ❌ 변환 실패`);
        failCount++;
      }

      // API 요청 제한 방지 (초당 50회 제한)
      // 안전하게 100ms 대기
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log(''); // 빈 줄 추가
    }

    // 최종 결과
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 변환 결과 요약');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${failCount}개`);
    console.log(`📈 성공률: ${((successCount / spotsWithoutGPS.length) * 100).toFixed(1)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✨ 변환 완료!');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 스크립트 실행
geocodeAllSpots()
  .then(() => {
    console.log('\n프로세스 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('치명적 오류:', error);
    process.exit(1);
  });
