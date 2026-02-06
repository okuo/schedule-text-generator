/**
 * 祝日判定サービス
 * JSONファイルから祝日データを読み込み、祝日判定を行う
 */
class HolidayService {
    constructor() {
        this.holidayData = null;
        this.fallbackHolidays = null;
        this.isInitialized = false;
        this.initPromise = null;
    }

    /**
     * サービスを初期化（非同期）
     */
    async initialize() {
        // 既に初期化済みまたは初期化中の場合
        if (this.isInitialized) {
            return;
        }
        
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._performInitialization();
        return this.initPromise;
    }

    /**
     * 実際の初期化処理
     */
    async _performInitialization() {
        try {
            console.log('🎌 祝日サービスを初期化中...');
            
            // JSONファイルから祝日データを読み込み
            await this._loadHolidayJSON();
            
            this.isInitialized = true;
            console.log('✅ 祝日サービスの初期化完了');
            
        } catch (error) {
            console.warn('⚠️ JSONファイルの読み込みに失敗、フォールバックモードで動作:', error.message);
            
            // フォールバック: ハードコードされた祝日データを使用
            this._initializeFallbackHolidays();
            this.isInitialized = true;
        }
    }

    /**
     * JSONファイルから祝日データを読み込み
     */
    async _loadHolidayJSON() {
        const response = await fetch('./assets/holidays.json');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.holidays) {
            throw new Error('Invalid JSON format: missing holidays property');
        }
        
        this.holidayData = data;
        
        // 統計情報をログ出力
        const years = Object.keys(data.holidays);
        const totalHolidays = years.reduce((sum, year) => sum + data.holidays[year].length, 0);
        console.log(`📊 祝日データ読み込み完了: ${years.length}年分、${totalHolidays}件の祝日`);
        console.log(`📅 最終更新: ${data.lastUpdated}`);
    }

    /**
     * フォールバック用のハードコード祝日データを初期化
     */
    _initializeFallbackHolidays() {
        const currentYear = new Date().getFullYear();
        
        this.fallbackHolidays = {
            // 基本的な固定祝日のみ
            fixedHolidays: [
                '1-1',   // 元日
                '2-11',  // 建国記念の日
                '4-29',  // 昭和の日
                '5-3',   // 憲法記念日
                '5-4',   // みどりの日
                '5-5',   // こどもの日
                '8-11',  // 山の日
                '11-3',  // 文化の日
                '11-23', // 勤労感謝の日
                '12-23'  // 天皇誕生日
            ]
        };
        
        console.log('🔄 フォールバックモード: 基本的な固定祝日のみ対応');
    }

    /**
     * 指定した日付が祝日かどうかを判定
     * @param {Date} date - 判定する日付
     * @returns {boolean} - 祝日の場合true
     */
    isHoliday(date) {
        if (!this.isInitialized) {
            console.warn('⚠️ HolidayService が初期化されていません');
            return false;
        }

        // JSONデータが利用可能な場合
        if (this.holidayData) {
            return this._isHolidayFromJSON(date);
        }
        
        // フォールバックの場合
        if (this.fallbackHolidays) {
            return this._isHolidayFromFallback(date);
        }
        
        return false;
    }

    /**
     * JSONデータから祝日判定
     */
    _isHolidayFromJSON(date) {
        const year = date.getFullYear().toString();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        if (!this.holidayData.holidays[year]) {
            return false;
        }

        return this.holidayData.holidays[year].some(holiday => holiday.date === dateKey);
    }

    /**
     * フォールバックデータから祝日判定（基本的な固定祝日のみ）
     */
    _isHolidayFromFallback(date) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const year = date.getFullYear();
        
        const dateKey = `${month}-${day}`;
        
        // 固定祝日チェック
        if (this.fallbackHolidays.fixedHolidays.includes(dateKey)) {
            return true;
        }
        
        // 移動祝日（簡易版）
        // 成人の日（1月第2月曜日）
        if (month === 1 && date.getDay() === 1) {
            const firstMonday = this._getNthWeekdayOfMonth(year, 1, 1, 1);
            const secondMonday = new Date(firstMonday);
            secondMonday.setDate(firstMonday.getDate() + 7);
            if (date.getDate() === secondMonday.getDate()) return true;
        }
        
        // 海の日（7月第3月曜日）
        if (month === 7 && date.getDay() === 1) {
            const thirdMonday = this._getNthWeekdayOfMonth(year, 7, 1, 3);
            if (date.getDate() === thirdMonday.getDate()) return true;
        }
        
        // 敬老の日（9月第3月曜日）
        if (month === 9 && date.getDay() === 1) {
            const thirdMonday = this._getNthWeekdayOfMonth(year, 9, 1, 3);
            if (date.getDate() === thirdMonday.getDate()) return true;
        }
        
        // スポーツの日（10月第2月曜日）
        if (month === 10 && date.getDay() === 1) {
            const secondMonday = this._getNthWeekdayOfMonth(year, 10, 1, 2);
            if (date.getDate() === secondMonday.getDate()) return true;
        }
        
        return false;
    }

    /**
     * 指定月の第N曜日を取得（フォールバック用）
     */
    _getNthWeekdayOfMonth(year, month, weekday, n) {
        const firstDay = new Date(year, month - 1, 1);
        const firstWeekday = firstDay.getDay();
        const offset = (weekday - firstWeekday + 7) % 7;
        const targetDate = new Date(year, month - 1, 1 + offset + (n - 1) * 7);
        return targetDate;
    }

    /**
     * 祝日データの状態を取得（デバッグ用）
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasJSONData: !!this.holidayData,
            hasFallbackData: !!this.fallbackHolidays,
            dataSource: this.holidayData ? 'JSON' : 'fallback',
            lastUpdated: this.holidayData ? this.holidayData.lastUpdated : null
        };
    }

    /**
     * 指定年の祝日一覧を取得（デバッグ用）
     */
    getHolidays(year) {
        if (!this.isInitialized || !this.holidayData) {
            return [];
        }
        
        const yearStr = year.toString();
        return this.holidayData.holidays[yearStr] || [];
    }
}

// グローバルインスタンス（シングルトンパターン）
window.holidayService = new HolidayService();