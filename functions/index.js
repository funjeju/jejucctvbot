const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const cors = require('cors')({ origin: true });
const fetch = require('node-fetch');
const admin = require('firebase-admin');

admin.initializeApp();

// -----------------------------------------------------------------
// [수정완료] 'databuilder' 데이터베이스 연결 설정
// -----------------------------------------------------------------
// 1. 기본 Firestore 인스턴스를 가져옵니다.
const db = admin.firestore();

// 2. 내부 설정을 변경하여 강제로 'databuilder' DB를 바라보게 합니다.
// (참고: 중복 선언 방지를 위해 const db는 한 번만 씁니다)
if (db._settings) {
  db._settings.databaseId = 'databuilder';
}
console.log("Database initialized targeting: databuilder");
// -----------------------------------------------------------------


// HLS 프록시 함수
exports.proxyHls = onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const targetUrl = req.query.url;

      if (!targetUrl) {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      // HLS 스트림 요청
      const response = await fetch(targetUrl);

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch HLS stream' });
      }

      const contentType = response.headers.get('content-type') || 'application/vnd.apple.mpegurl';

      // 응답 헤더 설정
      res.set({
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      });

      // 스트림 데이터 반환
      let data = await response.text();

      // 상대 경로 URL을 프록시 URL로 변환
      if (contentType.includes('mpegurl') || contentType.includes('m3u8')) {
        data = data.replace(
          /^(http:\/\/[^\s]+)$/gm,
          (match, url) => `https://jejudb.web.app/api/proxy/hls?url=${encodeURIComponent(url)}`
        );
      }

      res.send(data);

    } catch (error) {
      console.error('HLS Proxy Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// 30분마다 오래된 메시지를 Storage로 아카이브 (트래픽 최적화)
exports.archiveOldMessages = onSchedule({
  schedule: '*/30 * * * *',
  timeZone: 'Asia/Seoul',
  region: 'us-central1',
}, async (event) => {
  console.log('30분 주기 메시지 아카이브 작업 시작...');

  try {
    const storage = admin.storage();
    const bucket = storage.bucket();

    const now = admin.firestore.Timestamp.now();
    const thirtyMinutesAgo = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - (30 * 60 * 1000)
    );

    const messagesSnapshot = await db.collection('global_chat_messages')
      .where('timestamp', '<', thirtyMinutesAgo)
      .orderBy('timestamp', 'asc')
      .limit(500)
      .get();

    if (messagesSnapshot.empty) {
      console.log('아카이브할 메시지가 없습니다.');
      return null;
    }

    console.log(`${messagesSnapshot.size}개의 메시지를 아카이브합니다.`);

    const messagesByTimeSlot = {};

    messagesSnapshot.forEach((doc) => {
      const data = doc.data();
      const timestamp = data.timestamp.toDate();

      const year = timestamp.getFullYear();
      const month = String(timestamp.getMonth() + 1).padStart(2, '0');
      const day = String(timestamp.getDate()).padStart(2, '0');
      const hour = String(timestamp.getHours()).padStart(2, '0');
      const minute = timestamp.getMinutes() < 30 ? '00' : '30';

      const timeSlot = `${year}-${month}-${day}_${hour}-${minute}`;

      if (!messagesByTimeSlot[timeSlot]) {
        messagesByTimeSlot[timeSlot] = [];
      }

      messagesByTimeSlot[timeSlot].push({
        id: doc.id,
        ...data
      });
    });

    for (const [timeSlot, messages] of Object.entries(messagesByTimeSlot)) {
      let txtContent = `제주 라이브 채팅 아카이브 (30분 단위)\n`;
      txtContent += `시간대: ${timeSlot}\n`;
      txtContent += `메시지 수: ${messages.length}\n`;
      txtContent += `${'='.repeat(80)}\n\n`;

      messages.forEach((msg) => {
        const time = msg.timestamp.toDate().toLocaleTimeString('ko-KR');
        const userType = msg.type === 'ai' ? '[AI]' : msg.type === 'pointbox' ? '[포인트박스]' : '';
        txtContent += `[${time}] ${userType}${msg.username}: ${msg.message}\n`;
      });

      const fileName = `chat_archives/30min/chat_${timeSlot}.txt`;
      const file = bucket.file(fileName);

      await file.save(txtContent, {
        contentType: 'text/plain; charset=utf-8',
        metadata: {
          cacheControl: 'public, max-age=86400',
        },
      });

      await file.makePublic();

      // Storage URL 생성
      const bucketName = bucket.name;
      const txtFileUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

      // Firestore chat_archives 컬렉션에 메타데이터 저장
      const [datePart, timePart] = timeSlot.split('_');
      const [year, month, day] = datePart.split('-');
      const [hour, minute] = timePart.split('-');

      const startTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

      await db.collection('chat_archives').doc(timeSlot).set({
        startTime: admin.firestore.Timestamp.fromDate(startTime),
        endTime: admin.firestore.Timestamp.fromDate(endTime),
        messageCount: messages.length,
        txtFileUrl: txtFileUrl,
        summary: `${messages.length}개의 채팅 메시지가 기록되었습니다.`,
        createdAt: admin.firestore.Timestamp.now(),
      });

      console.log(`아카이브 파일 생성: ${fileName} (${messages.length}개 메시지)`);
    }

    const batch = db.batch();
    messagesSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    console.log(`${messagesSnapshot.size}개의 메시지를 Firestore에서 삭제 완료`);

    // 만료된 포인트 박스 환불 처리
    const expiredBoxesSnapshot = await db.collection('pointBoxes')
      .where('expiredAt', '<', now)
      .get();

    if (!expiredBoxesSnapshot.empty) {
      console.log(`${expiredBoxesSnapshot.size}개의 만료된 포인트 박스 처리 중...`);

      for (const boxDoc of expiredBoxesSnapshot.docs) {
        const boxData = boxDoc.data();
        const remainingPoints = boxData.remainingPoints || 0;

        if (remainingPoints > 0) {
          try {
            const creatorRef = db.collection('users').doc(boxData.creatorId);
            const creatorDoc = await creatorRef.get();

            if (creatorDoc.exists) {
              const creatorData = creatorDoc.data();
              const currentPoints = creatorData.points || 0;

              await db.runTransaction(async (transaction) => {
                transaction.update(creatorRef, {
                  points: currentPoints + remainingPoints,
                  totalEarnedPoints: admin.firestore.FieldValue.increment(remainingPoints),
                  updatedAt: admin.firestore.Timestamp.now(),
                });

                const logRef = db.collection('pointLogs').doc();
                transaction.set(logRef, {
                  userId: boxData.creatorId,
                  type: 'admin_grant',
                  amount: remainingPoints,
                  balance: currentPoints + remainingPoints,
                  description: `포인트 박스 만료로 인한 환불 (박스 ID: ${boxDoc.id})`,
                  relatedId: boxDoc.id,
                  createdAt: admin.firestore.Timestamp.now(),
                });

                transaction.delete(boxDoc.ref);
              });

              await db.collection('global_chat_messages').add({
                cctvId: 'system',
                userId: 'system',
                username: '시스템',
                message: `⏰ ${boxData.creatorName}님의 포인트 박스가 유효시간 만료되었습니다.\n남은 포인트 ${remainingPoints}P가 환불되었습니다.`,
                timestamp: admin.firestore.Timestamp.now(),
                type: 'ai',
              });

              console.log(`포인트 박스 ${boxDoc.id} 만료 처리 완료 (환불: ${remainingPoints}P)`);
            } else {
              await boxDoc.ref.delete();
              console.log(`포인트 박스 ${boxDoc.id} 삭제 (생성자 없음)`);
            }
          } catch (error) {
            console.error(`포인트 박스 ${boxDoc.id} 처리 실패:`, error);
          }
        } else {
          await boxDoc.ref.delete();
          console.log(`포인트 박스 ${boxDoc.id} 삭제 (남은 포인트 없음)`);
        }
      }

      console.log(`${expiredBoxesSnapshot.size}개의 만료된 포인트 박스 처리 완료`);
    }

    return null;
  } catch (error) {
    console.error('30분 주기 아카이브 실패:', error);
    throw error;
  }
});

// 24시간마다 AI 브리핑 생성 (매일 오전 3시)
exports.generateDailyBriefing = onSchedule({
  schedule: '0 3 * * *',
  timeZone: 'Asia/Seoul',
  region: 'us-central1',
}, async (event) => {
  console.log('24시간 AI 브리핑 생성 작업 시작...');

  try {
    const storage = admin.storage();
    const bucket = storage.bucket();

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    const [files] = await bucket.getFiles({
      prefix: 'chat_archives/30min/',
    });

    const recentFiles = files.filter(file => {
      const match = file.name.match(/chat_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2})\.txt$/);
      if (!match) return false;

      const [datePart, timePart] = match[1].split('_');
      const [year, month, day] = datePart.split('-');
      const [hour, minute] = timePart.split('-');

      const fileDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );

      return fileDate >= twentyFourHoursAgo && fileDate <= now;
    });

    if (recentFiles.length === 0) {
      console.log('브리핑할 아카이브 파일이 없습니다.');
      return null;
    }

    console.log(`${recentFiles.length}개의 아카이브 파일에서 브리핑 생성 중...`);

    const allMessages = [];
    for (const file of recentFiles.slice(0, 10)) {
      try {
        const [content] = await file.download();
        const lines = content.toString('utf-8').split('\n');

        const messageLines = lines.slice(4).filter(line => line.trim() && line.includes(':'));
        allMessages.push(...messageLines.slice(0, 20));
      } catch (error) {
        console.error(`파일 읽기 실패: ${file.name}`, error);
      }
    }

    if (allMessages.length === 0) {
      console.log('브리핑할 메시지가 없습니다.');
      return null;
    }

    const { defineString } = require('firebase-functions/params');
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    let briefing = '브리핑 생성 실패';

    if (GEMINI_API_KEY && allMessages.length > 0) {
      try {
        const sampleMessages = allMessages.slice(0, 100).join('\n');

        const briefingPrompt = `다음은 제주도 라이브 CCTV 채팅방의 최근 24시간 채팅 기록입니다.
이 채팅 내용을 5-7줄로 브리핑해주세요.
주요 화제, 관심사, 자주 언급된 장소나 정보, 날씨 관련 대화를 중심으로 요약하세요.

채팅 기록:
${sampleMessages}

브리핑 (한국어, 5-7줄, 뉴스 앵커 톤):`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: briefingPrompt }]
              }]
            })
          }
        );

        const data = await response.json();
        briefing = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '브리핑 생성 실패';
        console.log('AI 브리핑 생성 완료');
      } catch (error) {
        console.error('AI 브리핑 생성 실패:', error);
        briefing = `최근 24시간 동안 ${allMessages.length}개의 메시지가 기록되었습니다.`;
      }
    }

    await db.collection('daily_briefings').add({
      date: admin.firestore.Timestamp.now(),
      briefing: briefing,
      messageCount: allMessages.length,
      archiveFileCount: recentFiles.length,
      createdAt: admin.firestore.Timestamp.now(),
    });

    await db.collection('global_chat_messages').add({
      cctvId: 'system',
      userId: 'ai_briefing',
      username: 'AI 브리핑',
      message: `📰 오늘의 채팅 브리핑\n\n${briefing}`,
      timestamp: admin.firestore.Timestamp.now(),
      type: 'ai',
    });

    console.log('AI 브리핑 생성 및 채팅방 게시 완료');
    return null;
  } catch (error) {
    console.error('AI 브리핑 생성 실패:', error);
    throw error;
  }
});