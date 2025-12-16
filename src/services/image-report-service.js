/**
 * Image Report Service
 * Handles community reporting of inappropriate images using Firebase Firestore.
 */

const { db } = require('../config/firebase-admin');
const crypto = require('crypto');

class ImageReportService {
    constructor() {
        this.collection = 'banned_images';
        // Threshold to trigger ban and deletion
        this.BAN_THRESHOLD = 3;
    }

    /**
     * Calculate SHA-256 hash of the word (consistent with other services)
     */
    getHash(word) {
        const normalized = word.trim().toLowerCase();
        return crypto.createHash('sha256').update(normalized).digest('hex');
    }

    /**
     * Get the current version of a word.
     * Default is 0. If banned, it increments.
     * Used to generate fresh Seeds.
     */
    async getWordVersion(word) {
        if (!db) return 0;

        try {
            const docId = this.getHash(word);
            const doc = await db.collection(this.collection).doc(docId).get();

            if (!doc.exists) return 0;
            return doc.data().version || 0;
        } catch (error) {
            console.error('Error fetching word version:', error);
            return 0; // Fallback to 0 on error
        }
    }

    /**
     * Process a user report for a specific word.
     * @param {string} word - The word being reported
     * @param {string} userIp - User's IP address (for basic vote limiting)
     * @returns {Promise<{status: string, message: string, newVersion?: number}>}
     */
    async reportImage(word, userIp) {
        if (!db) {
            return { status: 'error', message: 'Database not available' };
        }

        const docId = this.getHash(word);
        const docRef = db.collection(this.collection).doc(docId);

        try {
            return await db.runTransaction(async (t) => {
                const doc = await t.get(docRef);

                let data;
                let isNew = false;

                if (!doc.exists) {
                    isNew = true;
                    data = {
                        word: word,
                        votes: 0,
                        reporters: [],
                        version: 0,
                        created_at: new Date().toISOString(),
                        last_updated: new Date().toISOString()
                    };
                } else {
                    data = doc.data();
                }

                // Check if user already reported (simple IP check)
                // Hash IP to avoid storing raw PII
                const ipHash = crypto.createHash('md5').update(userIp || 'unknown').digest('hex');

                if (data.reporters && data.reporters.includes(ipHash)) {
                    return { status: 'already_voted', message: '您已經檢舉過這張圖片了' };
                }

                // Add vote
                data.votes += 1;
                if (!data.reporters) data.reporters = [];
                data.reporters.push(ipHash);
                data.last_updated = new Date().toISOString();

                // Check Threshold
                let action = 'voted';
                let newVersion = data.version;

                if (data.votes >= this.BAN_THRESHOLD) {
                    action = 'banned';
                    // Reset votes after ban? Or keep them? 
                    // Strategy: Increment version to invalidate old image.
                    // We can reset votes for the NEW version, but keep history?
                    // Simpler: Just increment version. The old image (v0) is gone.
                    // The new image (v1) starts fresh.

                    data.version += 1;
                    data.votes = 0; // Reset votes for the new version
                    data.reporters = []; // Reset reporters for the new version
                    data.last_banned_at = new Date().toISOString();
                    newVersion = data.version;
                }

                if (isNew) {
                    t.set(docRef, data);
                } else {
                    t.update(docRef, data);
                }

                return {
                    status: action,
                    message: action === 'banned' ? '圖片已刪除並將重新生成' : '感謝您的回報，我們會進行審核',
                    currentVotes: data.votes,
                    threshold: this.BAN_THRESHOLD,
                    newVersion: newVersion
                };
            });

        } catch (error) {
            console.error('Report transaction failed:', error);
            return { status: 'error', message: '系統忙碌中，請稍後再試' };
        }
    }
}

module.exports = new ImageReportService();
