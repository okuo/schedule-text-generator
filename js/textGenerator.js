// テキスト生成機能を管理するクラス
class TextGenerator {
    constructor() {
        this.weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        this.formats = {
            standard: 'YYYY年M月D日（曜） HH:MM〜HH:MM',
            simple: 'M/D（曜） HH:MM〜HH:MM',
            detailed: 'YYYY年MM月DD日（曜日） HH:MM〜HH:MM'
        };
        this.currentFormat = 'standard';
    }
    
    // フォーマットを設定
    setFormat(format) {
        if (this.formats[format]) {
            this.currentFormat = format;
        }
        return this;
    }
    
    // 候補データから文字列を生成
    formatCandidate(candidate, format = this.currentFormat) {
        if (!candidate || !candidate.date) {
            return '';
        }
        
        switch (format) {
            case 'standard':
                return this.formatStandard(candidate);
            case 'simple':
                return this.formatSimple(candidate);
            case 'detailed':
                return this.formatDetailed(candidate);
            default:
                return this.formatStandard(candidate);
        }
    }
    
    // 標準フォーマット: 2025年3月4日（火） 9:00〜12:00
    formatStandard(candidate) {
        const date = candidate.date;
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekday = this.weekdays[date.getDay()];
        
        const startTime = this.formatTime(candidate.startHour, candidate.startMinute);
        const endTime = this.formatTime(candidate.endHour, candidate.endMinute);
        
        return `${year}年${month}月${day}日（${weekday}） ${startTime}〜${endTime}`;
    }
    
    // シンプルフォーマット: 3/4（火） 9:00〜12:00
    formatSimple(candidate) {
        const date = candidate.date;
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekday = this.weekdays[date.getDay()];
        
        const startTime = this.formatTime(candidate.startHour, candidate.startMinute);
        const endTime = this.formatTime(candidate.endHour, candidate.endMinute);
        
        return `${month}/${day}（${weekday}） ${startTime}〜${endTime}`;
    }
    
    // 詳細フォーマット: 2025年03月04日（火曜日） 09:00〜12:00
    formatDetailed(candidate) {
        const date = candidate.date;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const weekday = this.weekdays[date.getDay()] + '曜日';
        
        const startTime = this.formatTime(candidate.startHour, candidate.startMinute, true);
        const endTime = this.formatTime(candidate.endHour, candidate.endMinute, true);
        
        return `${year}年${month}月${day}日（${weekday}） ${startTime}〜${endTime}`;
    }
    
    // 時間をフォーマット
    formatTime(hour, minute, padHour = false) {
        const hourStr = padHour ? String(hour).padStart(2, '0') : String(hour);
        const minuteStr = String(minute).padStart(2, '0');
        return `${hourStr}:${minuteStr}`;
    }
    
    // 複数の候補を一括でフォーマット
    formatCandidates(candidates, format = this.currentFormat, separator = '\n') {
        if (!Array.isArray(candidates) || candidates.length === 0) {
            return '';
        }
        
        return candidates.map(candidate => this.formatCandidate(candidate, format))
                        .filter(text => text.length > 0)
                        .join(separator);
    }
    
    // 候補を時系列でソート
    sortCandidates(candidates) {
        return [...candidates].sort((a, b) => {
            // 日付でソート
            const dateCompare = a.date.getTime() - b.date.getTime();
            if (dateCompare !== 0) return dateCompare;
            
            // 同じ日の場合は開始時間でソート
            const aStartMinutes = a.startHour * 60 + a.startMinute;
            const bStartMinutes = b.startHour * 60 + b.startMinute;
            return aStartMinutes - bStartMinutes;
        });
    }
    
    // 日付でグループ化
    groupByDate(candidates) {
        const groups = new Map();
        
        candidates.forEach(candidate => {
            const dateKey = this.getDateKey(candidate.date);
            if (!groups.has(dateKey)) {
                groups.set(dateKey, []);
            }
            groups.get(dateKey).push(candidate);
        });
        
        return groups;
    }
    
    // 日付キーを生成（YYYY-MM-DD形式）
    getDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // 日付別にフォーマット
    formatByDate(candidates, format = this.currentFormat) {
        if (!Array.isArray(candidates) || candidates.length === 0) {
            return '';
        }
        
        const groups = this.groupByDate(candidates);
        const result = [];
        
        // 日付順にソート
        const sortedKeys = Array.from(groups.keys()).sort();
        
        sortedKeys.forEach(dateKey => {
            const dateCandidates = this.sortCandidates(groups.get(dateKey));
            const dateText = dateCandidates.map(candidate => 
                this.formatCandidate(candidate, format)
            ).join('\n');
            
            result.push(dateText);
        });
        
        return result.join('\n\n');
    }
    
    // メール用のフォーマット
    formatForEmail(candidates, includeHeader = true) {
        if (!Array.isArray(candidates) || candidates.length === 0) {
            return '';
        }
        
        const sortedCandidates = this.sortCandidates(candidates);
        let result = '';
        
        if (includeHeader) {
            result += '候補日時：\n';
        }
        
        sortedCandidates.forEach((candidate, index) => {
            result += `${index + 1}. ${this.formatCandidate(candidate)}\n`;
        });
        
        return result.trim();
    }
    
    // チャット用のフォーマット
    formatForChat(candidates, bullet = '・') {
        if (!Array.isArray(candidates) || candidates.length === 0) {
            return '';
        }
        
        const sortedCandidates = this.sortCandidates(candidates);
        
        return sortedCandidates.map(candidate => 
            `${bullet}${this.formatCandidate(candidate)}`
        ).join('\n');
    }
    
    // 時間の重複チェック
    checkTimeConflicts(candidates) {
        const conflicts = [];
        
        for (let i = 0; i < candidates.length; i++) {
            for (let j = i + 1; j < candidates.length; j++) {
                const a = candidates[i];
                const b = candidates[j];
                
                // 同じ日付かチェック
                if (this.getDateKey(a.date) === this.getDateKey(b.date)) {
                    const aStart = a.startHour * 60 + a.startMinute;
                    const aEnd = a.endHour * 60 + a.endMinute;
                    const bStart = b.startHour * 60 + b.startMinute;
                    const bEnd = b.endHour * 60 + b.endMinute;
                    
                    // 時間が重複しているかチェック
                    if ((aStart < bEnd && aEnd > bStart)) {
                        conflicts.push({
                            candidate1: a,
                            candidate2: b,
                            type: 'time_overlap'
                        });
                    }
                }
            }
        }
        
        return conflicts;
    }
    
    // 統計情報を生成
    generateStats(candidates) {
        if (!Array.isArray(candidates) || candidates.length === 0) {
            return {
                total: 0,
                dates: 0,
                totalDuration: 0,
                averageDuration: 0,
                conflicts: 0
            };
        }
        
        const uniqueDates = new Set(candidates.map(c => this.getDateKey(c.date)));
        let totalDuration = 0;
        
        candidates.forEach(candidate => {
            const startMinutes = candidate.startHour * 60 + candidate.startMinute;
            const endMinutes = candidate.endHour * 60 + candidate.endMinute;
            totalDuration += (endMinutes - startMinutes);
        });
        
        const conflicts = this.checkTimeConflicts(candidates);
        
        return {
            total: candidates.length,
            dates: uniqueDates.size,
            totalDuration: totalDuration,
            averageDuration: Math.round(totalDuration / candidates.length),
            conflicts: conflicts.length
        };
    }
    
    // プレビューテキストを生成
    generatePreview(candidates, maxItems = 3) {
        if (!Array.isArray(candidates) || candidates.length === 0) {
            return '選択した日時がここに表示されます';
        }
        
        const sortedCandidates = this.sortCandidates(candidates);
        const previewItems = sortedCandidates.slice(0, maxItems);
        
        let preview = previewItems.map(candidate => 
            this.formatCandidate(candidate)
        ).join('\n');
        
        if (candidates.length > maxItems) {
            preview += `\n...他${candidates.length - maxItems}件`;
        }
        
        return preview;
    }
    
    // エクスポート用のJSONを生成
    exportToJson(candidates) {
        return JSON.stringify({
            exported_at: new Date().toISOString(),
            format_version: '1.0',
            total_candidates: candidates.length,
            candidates: candidates.map(candidate => ({
                id: candidate.id,
                date: candidate.date.toISOString(),
                start_time: this.formatTime(candidate.startHour, candidate.startMinute),
                end_time: this.formatTime(candidate.endHour, candidate.endMinute),
                formatted_text: this.formatCandidate(candidate),
                day_of_week: candidate.date.getDay(),
                duration_minutes: (candidate.endHour * 60 + candidate.endMinute) - 
                                 (candidate.startHour * 60 + candidate.startMinute)
            }))
        }, null, 2);
    }
    
    // デバッグ情報
    getDebugInfo(candidates = []) {
        return {
            currentFormat: this.currentFormat,
            availableFormats: Object.keys(this.formats),
            candidatesCount: candidates.length,
            stats: this.generateStats(candidates),
            conflicts: this.checkTimeConflicts(candidates)
        };
    }
}