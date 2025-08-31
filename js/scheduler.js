// スケジューラー機能を管理するクラス
class Scheduler {
    constructor() {
        this.currentWeek = new Date();
        this.timeRange = {
            startHour: 9,
            endHour: 18,
            minuteInterval: 15
        };
        this.weekdays = ['月', '火', '水', '木', '金', '土', '日'];
        this.weekdaysFull = ['日', '月', '火', '水', '木', '金', '土'];
    }
    
    // 現在の週を設定
    setCurrentWeek(date) {
        this.currentWeek = new Date(date);
        return this;
    }
    
    // その週の月曜日を取得
    getMonday(date = this.currentWeek) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }
    
    // 週の全ての日付を取得
    getWeekDates() {
        const monday = this.getMonday();
        const dates = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            dates.push(date);
        }
        
        return dates;
    }
    
    // 時間スロットを生成
    generateTimeSlots() {
        const slots = [];
        
        for (let hour = this.timeRange.startHour; hour <= this.timeRange.endHour; hour++) {
            for (let minute = 0; minute < 60; minute += this.timeRange.minuteInterval) {
                // 最後の時間は22:00まで
                if (hour === this.timeRange.endHour && minute > 0) break;
                
                slots.push({
                    hour: hour,
                    minute: minute,
                    timeString: `${hour}:${String(minute).padStart(2, '0')}`,
                    isHourMark: minute === 0
                });
            }
        }
        
        return slots;
    }
    
    // 指定した時間が有効な範囲内かチェック
    isValidTime(hour, minute) {
        return hour >= this.timeRange.startHour && 
               hour <= this.timeRange.endHour &&
               minute >= 0 && minute < 60 &&
               minute % this.timeRange.minuteInterval === 0;
    }
    
    // 時間を分に変換
    timeToMinutes(hour, minute) {
        return hour * 60 + minute;
    }
    
    // 分を時間に変換
    minutesToTime(totalMinutes) {
        return {
            hour: Math.floor(totalMinutes / 60),
            minute: totalMinutes % 60
        };
    }
    
    // 時間範囲が有効かチェック
    isValidTimeRange(startHour, startMinute, endHour, endMinute) {
        const startTime = this.timeToMinutes(startHour, startMinute);
        const endTime = this.timeToMinutes(endHour, endMinute);
        
        return this.isValidTime(startHour, startMinute) &&
               this.isValidTime(endHour, endMinute) &&
               endTime > startTime &&
               (endHour < this.timeRange.endHour || 
                (endHour === this.timeRange.endHour && endMinute === 0));
    }
    
    // 日付が今日かどうかチェック
    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }
    
    // 日付が過去かどうかチェック
    isPast(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);
        return compareDate < today;
    }
    
    // 日付が週末かどうかチェック
    isWeekend(date) {
        const day = date.getDay();
        return day === 0 || day === 6; // 日曜日または土曜日
    }
    
    // 土曜日かどうかチェック
    isSaturday(date) {
        return date.getDay() === 6;
    }
    
    // 日曜日かどうかチェック
    isSunday(date) {
        return date.getDay() === 0;
    }
    
    // 祝日かどうかチェック（HolidayServiceに委譲）
    isHoliday(date) {
        // HolidayServiceが利用可能かチェック
        if (window.holidayService && window.holidayService.isInitialized) {
            return window.holidayService.isHoliday(date);
        }
        
        // フォールバック: 基本的な固定祝日のみ（HolidayService初期化前）
        console.warn('⚠️ HolidayService が未初期化、基本祝日のみで判定');
        return this._fallbackHolidayCheck(date);
    }
    
    // フォールバック用の基本祝日チェック
    _fallbackHolidayCheck(date) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        // 最低限の固定祝日
        const basicHolidays = [
            '1-1',   // 元日
            '5-3',   // 憲法記念日
            '5-4',   // みどりの日
            '5-5',   // こどもの日
            '11-3',  // 文化の日
            '11-23', // 勤労感謝の日
        ];
        
        const dateKey = `${month}-${day}`;
        return basicHolidays.includes(dateKey);
    }
    
    // 指定月の第N曜日を取得
    getNthWeekdayOfMonth(year, month, weekday, n) {
        const firstDay = new Date(year, month - 1, 1);
        const firstWeekday = firstDay.getDay();
        const offset = (weekday - firstWeekday + 7) % 7;
        const targetDate = new Date(year, month - 1, 1 + offset + (n - 1) * 7);
        return targetDate;
    }
    
    // 曜日名を取得
    getDayName(date, short = true) {
        const dayIndex = date.getDay();
        return short ? this.weekdaysFull[dayIndex] : this.weekdaysFull[dayIndex];
    }
    
    // 月名を取得
    getMonthName(date) {
        return `${date.getFullYear()}年${date.getMonth() + 1}月`;
    }
    
    // 前の週に移動
    moveToPreviousWeek() {
        this.currentWeek.setDate(this.currentWeek.getDate() - 7);
        return this.getWeekDates();
    }
    
    // 次の週に移動
    moveToNextWeek() {
        this.currentWeek.setDate(this.currentWeek.getDate() + 7);
        return this.getWeekDates();
    }
    
    // 今週に移動
    moveToThisWeek() {
        this.currentWeek = new Date();
        return this.getWeekDates();
    }
    
    // 週の境界を取得
    getWeekBoundaries() {
        const monday = this.getMonday();
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        return {
            start: monday,
            end: sunday
        };
    }
    
    // 時間スロットのインデックスを取得
    getTimeSlotIndex(hour, minute) {
        if (!this.isValidTime(hour, minute)) return -1;
        
        const startMinutes = this.timeRange.startHour * 60;
        const targetMinutes = hour * 60 + minute;
        const relativeMinutes = targetMinutes - startMinutes;
        
        return Math.floor(relativeMinutes / this.timeRange.minuteInterval);
    }
    
    // インデックスから時間スロットを取得
    getTimeSlotFromIndex(index) {
        const totalMinutes = this.timeRange.startHour * 60 + (index * this.timeRange.minuteInterval);
        return this.minutesToTime(totalMinutes);
    }
    
    // 時間スロットの総数を取得
    getTotalTimeSlots() {
        const totalMinutes = (this.timeRange.endHour - this.timeRange.startHour) * 60;
        return Math.ceil(totalMinutes / this.timeRange.minuteInterval);
    }
    
    // 選択可能な時間範囲をチェック
    getSelectableRange(startTime, endTime) {
        const startMinutes = Math.min(startTime, endTime);
        const endMinutes = Math.max(startTime, endTime);
        
        const startSlot = this.minutesToTime(startMinutes);
        const endSlot = this.minutesToTime(endMinutes);
        
        if (this.isValidTimeRange(startSlot.hour, startSlot.minute, endSlot.hour, endSlot.minute)) {
            return {
                start: startSlot,
                end: endSlot,
                isValid: true
            };
        }
        
        return {
            start: null,
            end: null,
            isValid: false
        };
    }
    
    // デバッグ用：現在の設定を出力
    getDebugInfo() {
        return {
            currentWeek: this.currentWeek.toDateString(),
            weekDates: this.getWeekDates().map(d => d.toDateString()),
            timeRange: this.timeRange,
            totalSlots: this.getTotalTimeSlots(),
            weekBoundaries: {
                start: this.getWeekBoundaries().start.toDateString(),
                end: this.getWeekBoundaries().end.toDateString()
            }
        };
    }
}