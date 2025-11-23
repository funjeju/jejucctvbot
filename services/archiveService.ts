import { storage } from './firebase';
import { ref, getDownloadURL, listAll } from 'firebase/storage';
import type { ChatMessage, Timestamp } from '../types';

/**
 * Storage에서 아카이브된 채팅 메시지를 가져옵니다
 * @param timeSlot 시간대 (예: "2025-11-22_11-00")
 * @returns 파싱된 채팅 메시지 배열
 */
export const fetchArchivedMessages = async (timeSlot: string): Promise<ChatMessage[]> => {
    try {
        const fileName = `chat_archives/30min/chat_${timeSlot}.txt`;
        const fileRef = ref(storage, fileName);

        // 파일 URL 가져오기
        const url = await getDownloadURL(fileRef);

        // 파일 내용 가져오기
        const response = await fetch(url);
        const txtContent = await response.text();

        // TXT 파일 파싱
        const messages = parseChatArchive(txtContent, timeSlot);

        return messages;
    } catch (error: any) {
        // 파일이 없는 경우는 정상 (아직 아카이브되지 않음)
        if (error?.code === 'storage/object-not-found') {
            // 조용히 처리 - 콘솔에 로그 출력 안 함
            return [];
        }
        // 다른 에러는 로그 출력
        console.error(`아카이브 파일 로드 실패 (${timeSlot}):`, error);
        return [];
    }
};


export const listArchivedTimeSlots = async (): Promise<string[]> => {
    try {
        const archiveRef = ref(storage, 'chat_archives/30min/');
        const result = await listAll(archiveRef);

        // 파일명에서 시간대 추출 (chat_2025-11-22_11-00.txt -> 2025-11-22_11-00)
        const timeSlots = result.items
            .map(item => {
                const match = item.name.match(/chat_(.+)\.txt$/);
                return match ? match[1] : null;
            })
            .filter(Boolean) as string[];

        // 최신순 정렬
        timeSlots.sort().reverse();

        return timeSlots;
    } catch (error) {
        console.error('아카이브 목록 가져오기 실패:', error);
        return [];
    }
};

/**
 * TXT 파일 내용을 ChatMessage 배열로 파싱합니다
 */
function parseChatArchive(txtContent: string, timeSlot: string): ChatMessage[] {
    const messages: ChatMessage[] = [];
    const lines = txtContent.split('\n');

    // 헤더 스킵 (첫 4줄)
    const messageLines = lines.slice(4);

    for (const line of messageLines) {
        if (!line.trim()) continue;

        // 형식: [11:30:45] [AI]username: message
        const match = line.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(\[AI\]|\[포인트박스\])?\s*(.+?):\s*(.+)$/);

        if (match) {
            const [, time, typeTag, username, message] = match;

            // 시간대에서 날짜 추출
            const [datePart, timePart] = timeSlot.split('_');
            const [year, month, day] = datePart.split('-');
            const [hour, minute] = timePart.split('-');
            const [h, m, s] = time.split(':');

            // Timestamp 생성
            const date = new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
                parseInt(h),
                parseInt(m),
                parseInt(s)
            );

            const timestamp: Timestamp = {
                seconds: Math.floor(date.getTime() / 1000),
                nanoseconds: 0,
            };

            messages.push({
                id: `archived_${timeSlot}_${messages.length}`,
                cctvId: 'archived',
                userId: 'archived',
                username: username.trim(),
                message: message.trim(),
                timestamp,
                type: typeTag?.includes('AI') ? 'ai' : typeTag?.includes('포인트박스') ? 'user' : 'user',
            });
        }
    }

    return messages;
}

/**
 * 주어진 Date 객체에 해당하는 30분 단위 시간대 문자열을 반환합니다
 * @param date Date 객체
 * @returns 시간대 문자열 (예: "2025-11-22_11-00")
 */
export const getTimeSlot = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = date.getMinutes() < 30 ? '00' : '30';

    return `${year}-${month}-${day}_${hour}-${minute}`;
};

/**
 * 이전 시간대를 계산합니다 (30분 단위)
 */
export const getPreviousTimeSlot = (currentSlot: string): string => {
    const [datePart, timePart] = currentSlot.split('_');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split('-').map(Number);

    const date = new Date(year, month - 1, day, hour, minute);
    date.setMinutes(date.getMinutes() - 30);

    return getTimeSlot(date);
};
