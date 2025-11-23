import json
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# Firebase 초기화
cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred)

# databuilder 데이터베이스 사용
db = firestore.client(database_id='databuilder')

# 카테고리 한글 → 영문 매핑 (확장)
CATEGORY_MAPPING = {
    # 기본 카테고리
    '관광지': 'Attraction',
    '음식점': 'Restaurant',
    '카페': 'Cafe',
    '맛집': 'Restaurant',
    '숙박': 'Accommodation',
    '쇼핑': 'Shopping',
    '축제': 'Festival',
    '행사': 'Festival',
    '레저': 'Activity',
    '체험': 'Activity',
    
    # 자연/경관
    '해변': 'Beach',
    '바다': 'Beach',
    '오름': 'Oroom',
    '산': 'Mountain',
    '폭포': 'Waterfall',
    '숲': 'Forest',
    '공원': 'Park',
    '정원': 'Garden',
    
    # 문화/예술
    '박물관': 'Museum',
    '미술관': 'Museum',
    '갤러리': 'Gallery',
    '전시': 'Exhibition',
    '공연': 'Performance',
    '문화': 'Culture',
    '역사': 'History',
    '전통': 'Traditional',
    
    # 액티비티
    '다이빙': 'Activity',
    '서핑': 'Activity',
    '스포츠': 'Activity',
    '낚시': 'Activity',
    '승마': 'Activity',
    '골프': 'Activity',
    
    # 쇼핑/시장
    '전통시장': 'Market',
    '시장': 'Market',
    '면세점': 'Shopping',
    '아울렛': 'Shopping',
    
    # 숙박
    '호텔': 'Accommodation',
    '펜션': 'Accommodation',
    '게스트하우스': 'Accommodation',
    '리조트': 'Accommodation',
    '모텔': 'Accommodation',
    
    # 기타
    '포토존': 'PhotoSpot',
    '일몰': 'Sunset',
    '야경': 'NightView',
    '드라이브': 'Drive',
}

def map_categories(alltag):
    """alltag에서 카테고리 추출 및 영문/한글 변환"""
    if not alltag:
        return {'categories': ['Attraction'], 'categories_kr': ['관광지']}
    
    categories_en = []
    categories_kr = []
    tags = alltag.split(',') if isinstance(alltag, str) else []
    
    for tag in tags:
        tag = tag.strip()
        for kr, en in CATEGORY_MAPPING.items():
            if kr in tag:
                # 영문 카테고리 추가
                if en not in categories_en:
                    categories_en.append(en)
                # 한글 카테고리 추가
                if kr not in categories_kr:
                    categories_kr.append(kr)
    
    return {
        'categories': categories_en if categories_en else ['Attraction'],
        'categories_kr': categories_kr if categories_kr else ['관광지']
    }

def extract_kids_friendly(alltag, introduction):
    """키즈 프렌들리 자동 판단"""
    keywords = ['아이', '가족', '유모차', '어린이', '키즈']
    text = f"{alltag or ''} {introduction or ''}"
    
    for keyword in keywords:
        if keyword in text:
            return True
    return False

def truncate_expert_tip(introduction):
    """전문가 팁 200자 또는 3문장으로 자르기"""
    if not introduction:
        return None, None
    
    tip = introduction[:200]
    sentences = introduction.split('.')
    if len(sentences) > 3:
        tip = '.'.join(sentences[:3]) + '.'
    
    return tip.strip(), introduction.strip()

def extract_region(address):
    """주소에서 제주 지역 추출 (기존 constants.ts 형식에 맞춤)"""
    if not address:
        return None
    
    # 제주 지역 매핑 (기존 constants.ts 형식)
    region_map = {
        '애월읍': '애월읍',
        '애월': '애월읍',
        '한림읍': '한림읍',
        '한림': '한림읍',
        '한경면': '한경면',
        '한경': '한경면',
        '대정읍': '대정읍',
        '대정': '대정읍',
        '조천읍': '조천읍',
        '조천': '조천읍',
        '구좌읍': '구좌읍',
        '구좌': '구좌읍',
        '성산읍': '성산읍',
        '성산': '성산읍',
        '우도면': '우도면',
        '우도': '우도면',
        '안덕면': '안덕면',
        '안덕': '안덕면',
        '남원읍': '남원읍',
        '남원': '남원읍',
        '표선면': '표선면',
        '표선': '표선면',
        '서귀포시': '서귀포시 동(洞) 지역',
        '중문': '서귀포시 동(洞) 지역',
        '제주시': '제주시 동(洞) 지역',
    }
    
    for keyword, region in region_map.items():
        if keyword in address:
            return region
    
    return None

def convert_visitjeju_to_place(item):
    """Visit Jeju 데이터 → Place 타입 변환"""
    
    images = []
    if item.get('repPhoto') and item['repPhoto'].get('photoid'):
        img_path = item['repPhoto']['photoid'].get('imgpath')
        if img_path:
            # Visit Jeju API URL 오타 수정 (visitjejeju → visitjeju)
            img_path = img_path.replace('visitjejeju.net', 'visitjeju.net')
            
            images.append({
                'url': img_path,
                'caption': item.get('title', '')
            })
    
    # 카테고리 매핑 (영문 + 한글)
    category_result = map_categories(item.get('alltag'))
    categories = category_result['categories']
    categories_kr = category_result['categories_kr']
    
    kids_friendly = extract_kids_friendly(item.get('alltag'), item.get('introduction'))
    expert_tip, description = truncate_expert_tip(item.get('introduction'))
    
    address = item.get('roadaddress') or item.get('address')
    region = extract_region(address)
    
    place = {
        'place_id': item.get('contentsid', ''),
        'place_name': item.get('title', ''),
        'status': 'draft',
        'categories': categories,
        'categories_kr': categories_kr,  # 한글 카테고리 추가
        'data_completeness': 'basic',  # 비짓제주 데이터는 기본 정보만
        'address': address,
        'region': region,
        'location': None,
        'images': images,
        'attributes': {
            'targetAudience': [],
            'recommendedSeasons': [],
            'withKids': '가능' if kids_friendly else '불가',
            'withPets': '불가',
            'parkingDifficulty': '보통',
            'admissionFee': '무료'
        },
        'public_info': {
            'phone_number': item.get('phoneno'),
            'operating_hours': None,
            'website_url': None,
        },
        'expert_tip_raw': expert_tip,
        'description': description,
        'tags': item.get('alltag', '').split(',') if item.get('alltag') else [],
        'created_at': firestore.SERVER_TIMESTAMP,
        'updated_at': firestore.SERVER_TIMESTAMP,
    }
    
    if item.get('latitude') and item.get('longitude'):
        place['location'] = firestore.GeoPoint(
            float(item['latitude']),
            float(item['longitude'])
        )
    
    return place

def upload_to_firestore(json_file='visitjeju_data_all.json', batch_size=500):
    """Firestore에 일괄 업로드"""
    
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    items = data.get('items', [])
    total = len(items)
    
    print(f"총 {total}개 항목 업로드 시작...")
    
    success_count = 0
    error_count = 0
    
    for i in range(0, total, batch_size):
        batch_items = items[i:i+batch_size]
        batch = db.batch()
        
        for item in batch_items:
            try:
                place = convert_visitjeju_to_place(item)
                doc_id = place['place_id']
                
                if not doc_id:
                    print(f"⚠️ contentsid 없음: {item.get('title')}")
                    error_count += 1
                    continue
                
                doc_ref = db.collection('spots').document(doc_id)
                batch.set(doc_ref, place, merge=True)
                success_count += 1
                
            except Exception as e:
                print(f"❌ 오류: {item.get('title')} - {e}")
                error_count += 1
        
        try:
            batch.commit()
            print(f"✅ {i+1}~{min(i+batch_size, total)} 업로드 완료 ({success_count}/{total})")
        except Exception as e:
            print(f"❌ 배치 커밋 실패: {e}")
            error_count += len(batch_items)
    
    print("\n" + "="*50)
    print(f"업로드 완료!")
    print(f"성공: {success_count}개")
    print(f"실패: {error_count}개")
    print("="*50)

if __name__ == '__main__':
    upload_to_firestore()
