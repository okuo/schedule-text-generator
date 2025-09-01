const fs = require('fs');
const path = require('path');

/**
 * 祝日データを内閣府のCSVから取得してJSONファイルを生成する
 */
class HolidayFetcher {
    constructor() {
        this.csvUrl = 'https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv';
        this.outputPath = path.join(process.cwd(), 'assets', 'holidays.json');
    }

    /**
     * CSVデータを取得
     */
    async fetchCSV() {
        try {
            console.log('📡 内閣府のCSVデータを取得中...');
            
            // Node.js 18以降のfetchを使用
            const response = await fetch(this.csvUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // バイナリデータとして取得してShift_JISとしてデコード
            const buffer = await response.arrayBuffer();
            const decoder = new TextDecoder('shift_jis');
            const csvText = decoder.decode(buffer);
            
            console.log('✅ CSVデータの取得完了');
            return csvText;
            
        } catch (error) {
            console.error('❌ CSVデータの取得に失敗:', error.message);
            // Shift_JISデコードに失敗した場合はUTF-8で再試行
            try {
                console.log('⚠️ Shift_JISデコードに失敗、UTF-8で再試行...');
                const response = await fetch(this.csvUrl);
                const csvText = await response.text();
                return csvText;
            } catch (fallbackError) {
                throw new Error(`CSVデータの取得に失敗: ${error.message}`);
            }
        }
    }

    /**
     * CSVをパースしてJSONに変換
     */
    parseCSV(csvText) {
        console.log('📊 CSVデータをパース中...');
        
        const lines = csvText.split('\n');
        const holidays = {};
        let totalCount = 0;
        const currentYear = new Date().getFullYear(); // 2025年

        // ヘッダー行をスキップ
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const [dateStr, nameStr] = line.split(',');
            
            if (!dateStr || !nameStr) continue;

            // 日付を解析 (YYYY/MM/DD形式)
            const dateParts = dateStr.trim().split('/');
            if (dateParts.length !== 3) continue;

            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]);
            const day = parseInt(dateParts[2]);

            // 今年以前の祝日はスキップ（スケジュール調整用途のため）
            if (year < currentYear) {
                continue;
            }

            // 有効な日付かチェック
            const dateObj = new Date(year, month - 1, day);
            if (dateObj.getFullYear() !== year || 
                dateObj.getMonth() !== month - 1 || 
                dateObj.getDate() !== day) {
                continue;
            }

            // ISO形式の日付文字列を生成
            const isoDate = dateObj.toISOString().split('T')[0];
            const holidayName = nameStr.replace(/"/g, '').trim();

            // 年別にグループ化
            if (!holidays[year]) {
                holidays[year] = [];
            }

            holidays[year].push({
                date: isoDate,
                name: holidayName
            });

            totalCount++;
        }

        // 各年のデータを日付順にソート
        Object.keys(holidays).forEach(year => {
            holidays[year].sort((a, b) => a.date.localeCompare(b.date));
        });

        console.log(`✅ パース完了: ${totalCount}件の祝日データ（${currentYear}年以降）`);
        console.log(`📅 年数: ${Object.keys(holidays).length}年分`);

        return holidays;
    }

    /**
     * JSONファイルを生成
     */
    async generateJSON(holidays) {
        console.log('💾 JSONファイルを生成中...');

        const outputData = {
            lastUpdated: new Date().toISOString().split('T')[0],
            generatedBy: 'GitHub Actions',
            dataSource: '内閣府「国民の祝日」について',
            sourceUrl: this.csvUrl,
            holidays: holidays
        };

        // ディレクトリが存在しない場合は作成
        const outputDir = path.dirname(this.outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // JSONファイルを書き込み
        const jsonContent = JSON.stringify(outputData, null, 2);
        fs.writeFileSync(this.outputPath, jsonContent, 'utf8');

        console.log(`✅ JSONファイルを生成: ${this.outputPath}`);
        console.log(`📊 データサイズ: ${Math.round(jsonContent.length / 1024 * 10) / 10}KB`);

        return outputData;
    }

    /**
     * 統計情報を表示
     */
    showStatistics(holidays) {
        console.log('\n📈 統計情報:');
        
        const years = Object.keys(holidays).sort();
        const currentYear = new Date().getFullYear();
        
        years.forEach(year => {
            const count = holidays[year].length;
            const status = year == currentYear ? ' (今年)' : 
                          year == currentYear + 1 ? ' (来年)' : '';
            console.log(`  ${year}年: ${count}件の祝日${status}`);
        });

        // 来年の主要祝日を表示（参考）
        const nextYear = currentYear + 1;
        if (holidays[nextYear]) {
            console.log(`\n🎌 ${nextYear}年の主要祝日（抜粋）:`);
            holidays[nextYear].slice(0, 5).forEach(holiday => {
                const date = new Date(holiday.date);
                const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
                console.log(`  ${holiday.date} (${weekday}) - ${holiday.name}`);
            });
            if (holidays[nextYear].length > 5) {
                console.log(`  ... 他${holidays[nextYear].length - 5}件`);
            }
        }
    }

    /**
     * メイン実行
     */
    async run() {
        try {
            console.log('🚀 祝日データの取得を開始\n');

            const csvText = await this.fetchCSV();
            const holidays = this.parseCSV(csvText);
            const outputData = await this.generateJSON(holidays);
            
            this.showStatistics(holidays);

            console.log('\n✨ 祝日データの更新が完了しました！');
            return outputData;

        } catch (error) {
            console.error('\n❌ エラーが発生しました:', error.message);
            process.exit(1);
        }
    }
}

// スクリプトとして実行された場合
if (require.main === module) {
    const fetcher = new HolidayFetcher();
    fetcher.run();
}

module.exports = HolidayFetcher;