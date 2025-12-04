import axios from 'axios';

// Google Geocoding API 키
const GOOGLE_MAPS_API_KEY = 'AIzaSyBpD54PnWIgH-tBsR2PQm6lqI4sScBQTQY';

// Firebase REST API 설정
const PROJECT_ID = 'jejudatabuilder';
const DATABASE_ID = 'databuilder';
const FIRESTORE_API_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

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

// Firestore에서 spots 가져오기 (REST API 사용)
async function getAllSpots() {
  try {
    const url = `${FIRESTORE_API_BASE}/spots`;
    const response = await axios.get(url);

    if (!response.data.documents) {
      return [];
    }

    return response.data.documents.map(doc => {
      const fields = doc.fields || {};
      const docId = doc.name.split('/').pop();

      return {
        id: docId,
        place_name: fields.place_name?.stringValue || '',
        address: fields.address?.stringValue || '',
        location: {
          latitude: fields.location?.mapValue?.fields?.latitude?.doubleValue,
          longitude: fields.location?.mapValue?.fields?.longitude?.doubleValue
        }
      };
    });
  } catch (error) {
    console.error('Error fetching spots:', error.message);
    return [];
  }
}

// Firestore 업데이트 (REST API 사용)
async function updateSpotLocation(spotId, latitude, longitude, formattedAddress) {
  try {
    const url = `${FIRESTORE_API_BASE}/spots/${spotId}?updateMask.fieldPaths=location.latitude&updateMask.fieldPaths=location.longitude&updateMask.fieldPaths=location.formatted_address`;

    const data = {
      fields: {
        location: {
          mapValue: {
            fields: {
              latitude: { doubleValue: latitude },
              longitude: { doubleValue: longitude },
              formatted_address: { stringValue: formattedAddress }
            }
          }
        }
      }
    };

    await axios.patch(url, data);
    return true;
  } catch (error) {
    console.error(`Error updating spot ${spotId}:`, error.message);
    return false;
  }
}

// 메인 실행 함수
async function geocodeAllSpots() {
  console.log('🚀 주소 → GPS 변환 시작...\n');

  try {
    // Firestore에서 모든 spots 가져오기
    console.log('📥 Firestore에서 데이터 가져오는 중...');
    const spots = await getAllSpots();

    console.log(`📊 전체 스팟 개수: ${spots.length}개\n`);

    // GPS 좌표가 없는 스팟 필터링
    const spotsWithoutGPS = spots.filter(spot => {
      const hasGPS = spot.location?.latitude && spot.location?.longitude;
      return !hasGPS && spot.address;
    });

    console.log(`📍 GPS 좌표가 없는 스팟: ${spotsWithoutGPS.length}개`);
    console.log(`✅ GPS 좌표가 있는 스팟: ${spots.length - spotsWithoutGPS.length}개\n`);

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
        const updated = await updateSpotLocation(
          spot.id,
          result.latitude,
          result.longitude,
          result.formatted_address
        );

        if (updated) {
          console.log(`   ✅ 성공: ${result.latitude}, ${result.longitude}`);
          successCount++;
        } else {
          console.log(`   ❌ Firestore 업데이트 실패`);
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
