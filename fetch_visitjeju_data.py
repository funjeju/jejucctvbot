import requests
import csv
import time
import json

# API 설정
API_KEY = 'bfadd3cade95484d9eab9b686ff761ef'
BASE_URL = 'https://api.visitjeju.net/vsjApi/contents/searchList'

# User-Agent 헤더 (서버 차단 방지)
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def fetch_data(locale='kr', page=1, max_retries=3):
    """Visit Jeju API에서 데이터 가져오기 (재시도 로직 포함)"""
    url = f"{BASE_URL}?apiKey={API_KEY}&locale={locale}&page={page}"
    
    for attempt in range(1, max_retries + 1):
        try:
            print(f"[시도 {attempt}/{max_retries}] API 호출 중... (페이지: {page})")
            response = requests.get(url, headers=HEADERS, verify=False, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            print(f"✅ 성공! 아이템 {len(data.get('items', []))}개 받음")
            return data
            
        except requests.exceptions.RequestException as e:
            print(f"❌ 시도 {attempt} 실패: {e}")
            if attempt < max_retries:
                print(f"⏳ 2초 후 재시도...")
                time.sleep(2)
            else:
                print(f"❌ 모든 재시도 실패")
                return None

def save_to_csv(data, filename='visitjeju_data.csv'):
    """데이터를 CSV 파일로 저장"""
    if not data or 'items' not in data:
        print("❌ 저장할 데이터가 없습니다.")
        return
    
    items = data['items']
    if not items:
        print("❌ items가 비어있습니다.")
        return
    
    # CSV 파일 생성
    with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
        # 필드명 정의
        fieldnames = [
            'contentsid', 'title', 'roadaddress', 'address', 
            'introduction', 'alltag', 'phoneno', 
            'latitude', 'longitude', 'imgpath', 'thumbnailpath'
        ]
        
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        # 데이터 쓰기
        for item in items:
            # 이미지 경로 추출 (중첩 구조)
            imgpath = ''
            thumbnailpath = ''
            if item.get('repPhoto') and item['repPhoto'].get('photoid'):
                imgpath = item['repPhoto']['photoid'].get('imgpath', '')
                thumbnailpath = item['repPhoto']['photoid'].get('thumbnailpath', '')
            
            row = {
                'contentsid': item.get('contentsid', ''),
                'title': item.get('title', ''),
                'roadaddress': item.get('roadaddress', ''),
                'address': item.get('address', ''),
                'introduction': item.get('introduction', ''),
                'alltag': item.get('alltag', ''),
                'phoneno': item.get('phoneno', ''),
                'latitude': item.get('latitude', ''),
                'longitude': item.get('longitude', ''),
                'imgpath': imgpath,
                'thumbnailpath': thumbnailpath
            }
            writer.writerow(row)
    
    print(f"✅ CSV 파일 저장 완료: {filename} ({len(items)}개 항목)")

def main():
    """메인 실행 함수"""
    print("=" * 50)
    print("Visit Jeju API 데이터 수집 시작")
    print("=" * 50)
    
    all_items = []
    page = 1
    
    while True:
        print(f"\n📄 페이지 {page} 수집 중...")
        data = fetch_data(locale='kr', page=page)
        
        if not data or 'items' not in data or not data['items']:
            print(f"✅ 페이지 {page-1}에서 종료 (더 이상 데이터 없음)")
            break
        
        items = data['items']
        all_items.extend(items)
        print(f"✅ 페이지 {page}: {len(items)}개 항목 추가 (총 {len(all_items)}개)")
        
        # 페이지 정보 확인
        if 'pageInfo' in data:
            page_info = data['pageInfo']
            total_count = page_info.get('totalCount', 0)
            print(f"   전체 항목 수: {total_count}")
            
            # 모든 데이터를 가져왔는지 확인
            if len(all_items) >= total_count:
                print(f"✅ 모든 데이터 수집 완료!")
                break
        
        page += 1
        time.sleep(1)  # API 부하 방지를 위해 1초 대기
    
    if all_items:
        # 전체 데이터를 하나의 객체로 만들기
        final_data = {
            'resultCode': 0,
            'resultMessage': 'Success',
            'items': all_items,
            'totalItems': len(all_items)
        }
        
        # JSON 파일로 저장
        with open('visitjeju_data_all.json', 'w', encoding='utf-8') as f:
            json.dump(final_data, f, ensure_ascii=False, indent=2)
        print(f"\n✅ JSON 파일 저장 완료: visitjeju_data_all.json ({len(all_items)}개 항목)")
        
        # CSV 파일로 저장
        save_to_csv(final_data, 'visitjeju_data_all.csv')
    else:
        print("❌ 데이터 수집 실패")
    
    print("\n" + "=" * 50)
    print(f"완료! 총 {len(all_items)}개 항목 수집")
    print("=" * 50)

if __name__ == '__main__':
    main()

