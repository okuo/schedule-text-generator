// Encodes and decodes shareable schedule state in a compact URL parameter.
class ShareService {
    static get queryParam() {
        return 'share';
    }

    static buildUrl(state, baseUrl = window.location.href) {
        const url = new URL(baseUrl);
        url.searchParams.set(this.queryParam, this.encode(state));
        return url.toString();
    }

    static readFromUrl(url = window.location.href) {
        try {
            const parsedUrl = new URL(url);
            const encoded = parsedUrl.searchParams.get(this.queryParam);
            if (!encoded) return null;
            return this.decode(encoded);
        } catch (error) {
            console.warn('Failed to read shared schedule:', error.message);
            return null;
        }
    }

    static encode(state) {
        const json = JSON.stringify({
            version: 1,
            ...state
        });
        const bytes = new TextEncoder().encode(json);
        let binary = '';
        bytes.forEach(byte => {
            binary += String.fromCharCode(byte);
        });

        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/g, '');
    }

    static decode(encoded) {
        const base64 = encoded
            .replace(/-/g, '+')
            .replace(/_/g, '/')
            .padEnd(Math.ceil(encoded.length / 4) * 4, '=');
        const binary = atob(base64);
        const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
        const parsed = JSON.parse(new TextDecoder().decode(bytes));

        if (!parsed || parsed.version !== 1) {
            throw new Error('Unsupported share format');
        }

        return parsed;
    }

    static serializeDate(date) {
        return {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate()
        };
    }
}
