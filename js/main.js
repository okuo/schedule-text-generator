// アプリケーションのメインクラス
class ScheduleApp {
    constructor() {
        this.scheduler = new Scheduler();
        this.textGenerator = new TextGenerator();
        this.selectedCandidates = [];
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        
        this.init();
    }
    
    async init() {
        // 祝日サービスを初期化
        await this.initializeHolidayService();
        
        this.setupEventListeners();
        this.renderCalendar();
        this.updateWeekDisplay();
    }
    
    // 祝日サービスを初期化
    async initializeHolidayService() {
        try {
            if (window.holidayService) {
                await window.holidayService.initialize();
                console.log('✅ 祝日サービスの初期化完了');
            } else {
                console.warn('⚠️ HolidayService が利用できません');
            }
        } catch (error) {
            console.error('❌ 祝日サービスの初期化エラー:', error.message);
        }
    }
    
    setupEventListeners() {
        // 週間ナビゲーション
        document.getElementById('prev-week').addEventListener('click', () => {
            this.scheduler.moveToPreviousWeek();
            this.renderCalendar();
            this.updateWeekDisplay();
            this.reapplySelectedCells();
        });
        
        document.getElementById('next-week').addEventListener('click', () => {
            this.scheduler.moveToNextWeek();
            this.renderCalendar();
            this.updateWeekDisplay();
            this.reapplySelectedCells();
        });
        
        document.getElementById('today-btn').addEventListener('click', () => {
            this.scheduler.moveToThisWeek();
            this.renderCalendar();
            this.updateWeekDisplay();
            this.reapplySelectedCells();
        });
        
        // ボタン
        document.getElementById('copy-btn').addEventListener('click', () => {
            this.copyToClipboard();
        });
        
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetAll();
        });
    }
    
    // 週表示を更新
    updateWeekDisplay() {
        const monthName = this.scheduler.getMonthName(this.scheduler.currentWeek);
        document.getElementById('current-month-year').textContent = monthName;
    }
    
    // カレンダーを描画
    renderCalendar() {
        this.renderTimeColumn();
        this.renderDaysGrid();
        this.updateDateHeaders();
        this.setupDayHeaderClickEvents(); // カレンダー再描画後にイベントを再設定
    }
    
    // 日付ヘッダーのクリックイベントを設定
    setupDayHeaderClickEvents() {
        document.querySelectorAll('.day-header').forEach((header, index) => {
            header.addEventListener('click', (e) => {
                // 時間セルのクリックイベントと競合しないようにする
                e.stopPropagation();
                this.selectFullDay(index);
            });
        });
    }
    
    // 指定した日を終日選択/解除
    selectFullDay(dayIndex) {
        const weekDates = this.scheduler.getWeekDates();
        const selectedDate = weekDates[dayIndex];
        const dayHeader = document.querySelector(`.day-header[data-day="${dayIndex}"]`);
        
        // 既に選択されているかチェック
        const existingCandidate = this.selectedCandidates.find(candidate => {
            return candidate.isFullDay && 
                   candidate.dayOffset === dayIndex &&
                   this.textGenerator.getDateKey(candidate.date) === this.textGenerator.getDateKey(selectedDate);
        });
        
        if (existingCandidate) {
            // 既に選択されている場合は解除
            this.selectedCandidates = this.selectedCandidates.filter(c => c.id !== existingCandidate.id);
            if (dayHeader) {
                dayHeader.classList.remove('selected');
            }
        } else {
            // 新規選択
            const candidate = {
                id: Date.now(),
                date: selectedDate,
                startHour: 9,
                startMinute: 0,
                endHour: 18,
                endMinute: 0,
                isFullDay: true,
                dayOffset: dayIndex
            };
            
            this.selectedCandidates.push(candidate);
            if (dayHeader) {
                dayHeader.classList.add('selected');
            }
        }
        
        this.updateCandidatesList();
        this.updateOutputText();
    }
    
    // 時間軸を描画
    renderTimeColumn() {
        const timeColumn = document.getElementById('time-column');
        timeColumn.innerHTML = '';
        
        const timeSlots = this.scheduler.generateTimeSlots();
        let skipNext = 0;
        
        timeSlots.forEach((slot, index) => {
            if (skipNext > 0) {
                skipNext--;
                return;
            }
            
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            
            if (slot.isHourMark) {
                timeSlot.classList.add('hour-mark');
                timeSlot.textContent = slot.timeString;
                skipNext = 3; // 次の3つのスロットをスキップ
            }
            
            timeColumn.appendChild(timeSlot);
        });
    }
    
    // 日付グリッドを描画
    renderDaysGrid() {
        const calendarUnified = document.getElementById('calendar-unified');
        const existingDayColumns = calendarUnified.querySelectorAll('.day-column');
        existingDayColumns.forEach(col => col.remove());
        
        const timeSlots = this.scheduler.generateTimeSlots();
        
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column';
            dayColumn.dataset.dayOffset = dayOffset;
            
            // 各日の時間セル
            timeSlots.forEach(slot => {
                const timeCell = document.createElement('div');
                timeCell.className = 'time-cell';
                timeCell.dataset.day = dayOffset;
                timeCell.dataset.hour = slot.hour;
                timeCell.dataset.minute = slot.minute;
                
                // 時間境界（毎時45分）にクラスを追加
                if (slot.minute === 45) {
                    timeCell.classList.add('hour-boundary');
                }
                
                // イベントリスナー
                timeCell.addEventListener('mousedown', (e) => {
                    this.startSelection(e);
                });
                
                timeCell.addEventListener('mouseover', (e) => {
                    this.updateSelection(e);
                });
                
                timeCell.addEventListener('mouseup', (e) => {
                    this.endSelection(e);
                });
                
                dayColumn.appendChild(timeCell);
            });
            
            calendarUnified.appendChild(dayColumn);
        }
        
        // マウスアップイベントをドキュメント全体に追加（重複回避）
        if (!this.documentMouseUpListenerAdded) {
            document.addEventListener('mouseup', () => {
                if (this.isSelecting) {
                    this.endSelection();
                }
            });
            this.documentMouseUpListenerAdded = true;
        }
    }
    
    // 日付ヘッダーを更新
    updateDateHeaders() {
        const weekDates = this.scheduler.getWeekDates();
        
        weekDates.forEach((date, index) => {
            const dateElement = document.getElementById(`date-${index}`);
            const headerElement = document.querySelector(`.day-header[data-day="${index}"]`);
            const columnElement = document.querySelector(`[data-day-offset="${index}"]`);
            
            dateElement.textContent = date.getDate();
            
            // 既存のクラスをクリア
            headerElement.classList.remove('today', 'saturday', 'sunday', 'holiday');
            if (columnElement) {
                columnElement.classList.remove('today', 'saturday', 'sunday', 'holiday');
            }
            
            // 今日かどうかチェック
            if (this.scheduler.isToday(date)) {
                headerElement.classList.add('today');
            }
            
            // 祝日チェック
            if (this.scheduler.isHoliday(date)) {
                headerElement.classList.add('holiday');
                if (columnElement) columnElement.classList.add('holiday');
            }
            // 土曜日チェック
            else if (this.scheduler.isSaturday(date)) {
                headerElement.classList.add('saturday');
                if (columnElement) columnElement.classList.add('saturday');
            }
            // 日曜日チェック  
            else if (this.scheduler.isSunday(date)) {
                headerElement.classList.add('sunday');
                if (columnElement) columnElement.classList.add('sunday');
            }
            
            // 今日が土曜日の場合、両方のクラスを適用
            if (this.scheduler.isToday(date) && this.scheduler.isSaturday(date)) {
                headerElement.classList.add('saturday');
            }
        });
    }
    
    // セルが既に選択されているかチェック
    isSelectedCell(cell) {
        return cell.classList.contains('selected') && cell.dataset.candidateId;
    }

    // 選択されたセルに対応する候補を見つける
    findCandidateByCell(cell) {
        const candidateId = parseInt(cell.dataset.candidateId);
        return this.selectedCandidates.find(candidate => candidate.id === candidateId);
    }

    // 選択開始
    startSelection(event) {
        event.preventDefault();
        
        const cell = event.target;
        
        // 既に選択されているセルをクリックした場合はトグル（解除）
        if (this.isSelectedCell(cell)) {
            const candidate = this.findCandidateByCell(cell);
            if (candidate) {
                this.removeCandidate(candidate.id);
            }
            return; // ドラッグ選択は開始しない
        }
        
        // 通常のドラッグ選択開始
        this.isSelecting = true;
        this.selectionStart = {
            day: parseInt(event.target.dataset.day),
            hour: parseInt(event.target.dataset.hour),
            minute: parseInt(event.target.dataset.minute)
        };
        this.selectionEnd = { ...this.selectionStart };
        this.updateSelectionDisplay();
        this.showDragTimeDisplay(event);
    }
    
    // 選択更新
    updateSelection(event) {
        if (!this.isSelecting) return;
        
        const day = parseInt(event.target.dataset.day);
        const hour = parseInt(event.target.dataset.hour);
        const minute = parseInt(event.target.dataset.minute);
        
        // 同じ日のみ選択可能
        if (day === this.selectionStart.day) {
            this.selectionEnd = { day, hour, minute };
            this.updateSelectionDisplay();
            this.updateDragTimeDisplay(event);
        }
    }
    
    // 選択終了
    endSelection(event) {
        if (!this.isSelecting) return;
        
        this.isSelecting = false;
        
        if (this.selectionStart && this.selectionEnd) {
            this.addCandidate();
        }
        
        this.clearSelectionDisplay();
        this.hideDragTimeDisplay();
    }
    
    // 選択表示を更新
    updateSelectionDisplay() {
        // すべてのセルから選択クラスを削除
        document.querySelectorAll('.time-cell').forEach(cell => {
            cell.classList.remove('selecting');
        });
        
        if (!this.selectionStart || !this.selectionEnd) return;
        
        const startTime = this.selectionStart.hour * 60 + this.selectionStart.minute;
        const endTime = this.selectionEnd.hour * 60 + this.selectionEnd.minute;
        
        const minTime = Math.min(startTime, endTime);
        const maxTime = Math.max(startTime, endTime);
        
        // 選択範囲のセルにクラスを追加
        document.querySelectorAll(`.time-cell[data-day="${this.selectionStart.day}"]`).forEach(cell => {
            const cellHour = parseInt(cell.dataset.hour);
            const cellMinute = parseInt(cell.dataset.minute);
            const cellTime = cellHour * 60 + cellMinute;
            
            if (cellTime >= minTime && cellTime <= maxTime) {
                cell.classList.add('selecting');
            }
        });
    }
    
    // 選択表示をクリア
    clearSelectionDisplay() {
        document.querySelectorAll('.time-cell').forEach(cell => {
            cell.classList.remove('selecting');
        });
        this.hideDragTimeDisplay();
    }
    
    // 候補を追加
    addCandidate() {
        if (!this.selectionStart || !this.selectionEnd) return;
        
        const startTime = this.selectionStart.hour * 60 + this.selectionStart.minute;
        const endTime = this.selectionEnd.hour * 60 + this.selectionEnd.minute;
        
        let minTime = Math.min(startTime, endTime);
        let maxTime = Math.max(startTime, endTime);
        
        // 同じ時間の場合は15分間隔で終了時間を設定
        if (startTime === endTime) {
            maxTime = minTime + 15;
        } else {
            // ドラッグの場合、終了時刻に15分を追加（選択した最後のマスも含める）
            maxTime = maxTime + 15;
        }
        
        // 日付を計算
        const weekDates = this.scheduler.getWeekDates();
        const selectedDate = weekDates[this.selectionStart.day];
        
        const candidate = {
            id: Date.now(),
            date: new Date(selectedDate),
            startHour: Math.floor(minTime / 60),
            startMinute: minTime % 60,
            endHour: Math.floor(maxTime / 60),
            endMinute: maxTime % 60,
            dayOffset: this.selectionStart.day
        };
        
        this.selectedCandidates.push(candidate);
        this.sortCandidates();
        this.updateCandidatesList();
        this.updateOutputText();
        this.markSelectedCells(candidate);
        
        this.selectionStart = null;
        this.selectionEnd = null;
    }
    
    // 選択されたセルをマークする
    markSelectedCells(candidate) {
        const startMinutes = candidate.startHour * 60 + candidate.startMinute;
        const endMinutes = candidate.endHour * 60 + candidate.endMinute;
        
        document.querySelectorAll(`.time-cell[data-day="${candidate.dayOffset}"]`).forEach(cell => {
            const cellHour = parseInt(cell.dataset.hour);
            const cellMinute = parseInt(cell.dataset.minute);
            const cellMinutes = cellHour * 60 + cellMinute;
            
            // 常に終了時刻は含めない（時間計算で15分追加済みのため）
            if (cellMinutes >= startMinutes && cellMinutes < endMinutes) {
                cell.classList.add('selected');
                cell.dataset.candidateId = candidate.id;
            }
        });
    }
    
    // 選択マークをクリア
    clearSelectedCells(candidateId = null) {
        const selector = candidateId 
            ? `.time-cell[data-candidate-id="${candidateId}"]`
            : '.time-cell.selected';
        
        document.querySelectorAll(selector).forEach(cell => {
            cell.classList.remove('selected');
            if (cell.dataset.candidateId) {
                delete cell.dataset.candidateId;
            }
        });
    }
    
    // 候補をソート（時系列順）
    sortCandidates() {
        this.selectedCandidates = this.textGenerator.sortCandidates(this.selectedCandidates);
    }
    
    // 候補リストを更新
    updateCandidatesList() {
        const candidatesDisplay = document.getElementById('candidates-display');
        
        if (this.selectedCandidates.length === 0) {
            candidatesDisplay.innerHTML = '<div class="empty-message">選択した日時がここに表示されます</div>';
            return;
        }
        
        candidatesDisplay.innerHTML = '';
        
        // 連続する時間枠を結合
        const mergedCandidates = this.textGenerator.mergeContinuousCandidates(this.selectedCandidates);
        
        mergedCandidates.forEach(candidate => {
            const line = document.createElement('div');
            line.className = 'candidate-line';
            
            const text = document.createElement('span');
            text.className = 'candidate-text';
            text.textContent = this.textGenerator.formatCandidate(candidate);
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '削除';
            removeBtn.addEventListener('click', () => {
                // 結合された時間枠に対応する全ての個別候補を削除
                this.removeMergedCandidate(candidate);
            });
            
            line.appendChild(text);
            line.appendChild(removeBtn);
            candidatesDisplay.appendChild(line);
        });
    }
    
    // 候補を削除
    removeCandidate(id) {
        this.clearSelectedCells(id);
        this.selectedCandidates = this.selectedCandidates.filter(c => c.id !== id);
        this.updateCandidatesList();
        this.updateOutputText();
    }
    
    // 結合された候補に対応する全ての個別候補を削除
    removeMergedCandidate(mergedCandidate) {
        const startMinutes = mergedCandidate.startHour * 60 + mergedCandidate.startMinute;
        const endMinutes = mergedCandidate.endHour * 60 + mergedCandidate.endMinute;
        const dateKey = this.textGenerator.getDateKey(mergedCandidate.date);
        
        // 同じ日付で時間範囲内の全ての候補を特定
        const candidatesToRemove = this.selectedCandidates.filter(candidate => {
            const candidateStart = candidate.startHour * 60 + candidate.startMinute;
            const candidateEnd = candidate.endHour * 60 + candidate.endMinute;
            const candidateDateKey = this.textGenerator.getDateKey(candidate.date);
            
            return candidateDateKey === dateKey &&
                   candidateStart >= startMinutes &&
                   candidateEnd <= endMinutes;
        });
        
        // 終日選択の場合は日付ヘッダーの選択状態を解除
        const fullDayCandidate = candidatesToRemove.find(c => c.isFullDay);
        if (fullDayCandidate && fullDayCandidate.dayOffset !== undefined) {
            const dayHeader = document.querySelector(`.day-header[data-day="${fullDayCandidate.dayOffset}"]`);
            if (dayHeader) {
                dayHeader.classList.remove('selected');
            }
        }
        
        // 特定された候補を全て削除
        candidatesToRemove.forEach(candidate => {
            this.clearSelectedCells(candidate.id);
        });
        
        this.selectedCandidates = this.selectedCandidates.filter(candidate => {
            return !candidatesToRemove.includes(candidate);
        });
        
        this.updateCandidatesList();
        this.updateOutputText();
    }
    
    // 候補をフォーマット（TextGeneratorクラスに移動済み）
    
    // 出力テキストを更新
    updateOutputText() {
        const copyBtn = document.getElementById('copy-btn');
        
        if (this.selectedCandidates.length === 0) {
            copyBtn.disabled = true;
        } else {
            copyBtn.disabled = false;
        }
    }
    
    // クリップボードにコピー
    async copyToClipboard() {
        const notification = document.getElementById('copy-notification');
        
        if (this.selectedCandidates.length === 0) return;
        
        // 連続する時間枠を結合してからフォーマット
        const mergedCandidates = this.textGenerator.mergeContinuousCandidates(this.selectedCandidates);
        const textToCopy = this.textGenerator.formatCandidates(mergedCandidates);
        
        try {
            await navigator.clipboard.writeText(textToCopy);
            
            // 通知を表示
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
            }, 2000);
        } catch (err) {
            // フォールバック - 一時的なテキストエリアを作成
            const tempTextArea = document.createElement('textarea');
            tempTextArea.value = textToCopy;
            tempTextArea.style.position = 'fixed';
            tempTextArea.style.left = '-9999px';
            document.body.appendChild(tempTextArea);
            tempTextArea.select();
            document.execCommand('copy');
            document.body.removeChild(tempTextArea);
            
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
            }, 2000);
        }
    }
    
    // すべてリセット
    resetAll() {
        this.clearSelectedCells();
        this.selectedCandidates = [];
        this.updateCandidatesList();
        this.updateOutputText();
        this.clearSelectionDisplay();
        
        // 日付ヘッダーの選択状態もクリア
        document.querySelectorAll('.day-header.selected').forEach(header => {
            header.classList.remove('selected');
        });
    }
    
    // 選択セルを再適用（週移動時）
    reapplySelectedCells() {
        const currentWeekDates = this.scheduler.getWeekDates();
        
        this.selectedCandidates.forEach(candidate => {
            // 候補の日付が現在の週に含まれているかチェック
            const candidateDateStr = candidate.date.toDateString();
            const dayIndex = currentWeekDates.findIndex(date => date.toDateString() === candidateDateStr);
            
            if (dayIndex >= 0) {
                // 現在の週に含まれている場合、セルをマーク
                const updatedCandidate = { ...candidate, dayOffset: dayIndex };
                this.markSelectedCells(updatedCandidate);
            }
        });
    }
    
    // ドラッグ時間表示を表示
    showDragTimeDisplay(event) {
        const display = document.getElementById('drag-time-display');
        display.style.display = 'block';
        this.updateDragTimeDisplay(event);
    }
    
    // ドラッグ時間表示を更新
    updateDragTimeDisplay(event) {
        if (!this.selectionStart || !this.selectionEnd) return;
        
        const display = document.getElementById('drag-time-display');
        
        // 時間範囲を計算
        const startTime = this.selectionStart.hour * 60 + this.selectionStart.minute;
        const endTime = this.selectionEnd.hour * 60 + this.selectionEnd.minute;
        let minTime = Math.min(startTime, endTime);
        let maxTime = Math.max(startTime, endTime);
        
        // 同じ時間の場合は15分間隔で終了時間を設定
        if (startTime === endTime) {
            maxTime = minTime + 15;
        }
        
        // 時間を文字列に変換
        const startHour = Math.floor(minTime / 60);
        const startMinute = minTime % 60;
        const endHour = Math.floor(maxTime / 60);
        const endMinute = maxTime % 60;
        
        const timeText = `${startHour}:${String(startMinute).padStart(2, '0')}〜${endHour}:${String(endMinute).padStart(2, '0')}`;
        display.textContent = timeText;
        
        // マウス位置に表示
        display.style.left = (event.clientX + 15) + 'px';
        display.style.top = (event.clientY - 30) + 'px';
    }
    
    // ドラッグ時間表示を隠す
    hideDragTimeDisplay() {
        const display = document.getElementById('drag-time-display');
        display.style.display = 'none';
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const app = new ScheduleApp();
        // 非同期初期化のため、awaitは不要（コンストラクタ内で処理）
    } catch (error) {
        console.error('❌ アプリケーションの初期化エラー:', error);
    }
});