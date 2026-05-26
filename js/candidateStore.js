// Candidate storage, ID generation, sorting, and persistence.
class CandidateStore {
    constructor(textGenerator, options = {}) {
        this.textGenerator = textGenerator;
        this.storageKey = options.storageKey || 'schedule-text-generator.candidates';
        this.idSequence = 0;
        this.candidates = this.load();
    }

    getAll() {
        return [...this.candidates];
    }

    setAll(candidates, options = {}) {
        this.candidates = this.sort((candidates || []).map(candidate => this.normalizeCandidate(candidate)));

        if (options.persist !== false) {
            this.save();
        }

        return this.getAll();
    }

    add(candidate) {
        const normalized = this.normalizeCandidate(candidate);
        this.candidates = this.sort([...this.candidates, normalized]);
        this.save();
        return normalized;
    }

    remove(id) {
        const removed = this.candidates.find(candidate => candidate.id === id);
        this.candidates = this.candidates.filter(candidate => candidate.id !== id);
        this.save();
        return removed || null;
    }

    removeMany(candidates) {
        const ids = new Set(candidates.map(candidate => candidate.id));
        const removed = this.candidates.filter(candidate => ids.has(candidate.id));
        this.candidates = this.candidates.filter(candidate => !ids.has(candidate.id));
        this.save();
        return removed;
    }

    clear() {
        this.candidates = [];
        this.save();
    }

    sort(candidates = this.candidates) {
        return this.textGenerator.sortCandidates(candidates);
    }

    getMerged() {
        return this.textGenerator.mergeContinuousCandidates(this.candidates);
    }

    findById(id) {
        return this.candidates.find(candidate => candidate.id === id) || null;
    }

    findFullDay(date) {
        const dateKey = this.textGenerator.getDateKey(date);

        return this.candidates.find(candidate => {
            return this.isFullDay(candidate) &&
                   this.textGenerator.getDateKey(candidate.date) === dateKey;
        }) || null;
    }

    findWithin(mergedCandidate) {
        if (this.isFullDay(mergedCandidate)) {
            return this.candidates.filter(candidate => candidate.id === mergedCandidate.id);
        }

        const startMinutes = mergedCandidate.startHour * 60 + mergedCandidate.startMinute;
        const endMinutes = mergedCandidate.endHour * 60 + mergedCandidate.endMinute;
        const dateKey = this.textGenerator.getDateKey(mergedCandidate.date);

        return this.candidates.filter(candidate => {
            if (this.isFullDay(candidate)) return false;

            const candidateStart = candidate.startHour * 60 + candidate.startMinute;
            const candidateEnd = candidate.endHour * 60 + candidate.endMinute;
            const candidateDateKey = this.textGenerator.getDateKey(candidate.date);

            return candidateDateKey === dateKey &&
                   candidateStart >= startMinutes &&
                   candidateEnd <= endMinutes;
        });
    }

    normalizeCandidate(candidate) {
        const normalized = {
            ...candidate,
            id: candidate.id || this.createId(),
            date: this.normalizeDate(candidate.date)
        };

        normalized.type = normalized.type || (candidate.isFullDay ? 'fullDay' : 'timeRange');
        normalized.isFullDay = normalized.type === 'fullDay';

        return normalized;
    }

    isFullDay(candidate) {
        return candidate.type === 'fullDay' || candidate.isFullDay;
    }

    createId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }

        this.idSequence += 1;
        return `candidate-${this.idSequence}-${Math.random().toString(36).slice(2, 10)}`;
    }

    normalizeDate(date) {
        if (date instanceof Date) {
            return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        }

        if (date && typeof date === 'object') {
            return new Date(date.year, date.month - 1, date.day);
        }

        return new Date(date);
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.candidates.map(candidate => ({
                ...candidate,
                date: {
                    year: candidate.date.getFullYear(),
                    month: candidate.date.getMonth() + 1,
                    day: candidate.date.getDate()
                }
            }))));
        } catch (error) {
            console.warn('Failed to save candidates:', error.message);
        }
    }

    load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return [];

            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];

            return this.sort(parsed.map(candidate => this.normalizeCandidate(candidate)));
        } catch (error) {
            console.warn('Failed to load candidates:', error.message);
            return [];
        }
    }
}
