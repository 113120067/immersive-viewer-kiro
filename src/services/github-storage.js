const { Octokit } = require('@octokit/rest');
const crypto = require('crypto');
const axios = require('axios');

class GitHubStorageService {
    constructor() {
        this.octokit = null;
        this.owner = process.env.GITHUB_OWNER;
        this.repo = process.env.GITHUB_REPO;
        // Default path: public/library (can be overridden)
        this.basePath = process.env.GITHUB_PATH || 'public/library';
        this.initialized = false;
    }

    init() {
        if (this.initialized) return true;

        const token = process.env.GITHUB_TOKEN;
        if (!token || !this.owner || !this.repo) {
            console.warn('⚠️ GitHub Storage not configured: Missing GITHUB_TOKEN, OWNER, or REPO.');
            return false;
        }

        try {
            this.octokit = new Octokit({ auth: token });
            this.initialized = true;
            console.log(`✅ GitHub Storage Service initialized for ${this.owner}/${this.repo}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Octokit:', error);
            return false;
        }
    }

    /**
     * Calculate SHA-256 hash of the input string (trimmed, lowercase)
     * Returns the first 12 characters of the hex string.
     */
    calculateHash(input) {
        const normalized = input.trim().toLowerCase();
        const hash = crypto.createHash('sha256').update(normalized).digest('hex');
        return hash.substring(0, 12);
    }

    /**
     * Check if file exists in GitHub Repo via API (to avoid 409)
     * @param {string} filename 
     */
    async checkFileExists(filename) {
        if (!this.init()) return false;

        try {
            await this.octokit.repos.getContent({
                owner: this.owner,
                repo: this.repo,
                path: `${this.basePath}/${filename}`,
                method: 'HEAD' // optimization if supported, but getContent usually returns metadata
            });
            return true;
        } catch (error) {
            if (error.status === 404) return false;
            console.error(`Error checking file ${filename}:`, error.message);
            return false;
        }
    }

    /**
     * Upload image buffer to GitHub
     * @param {string} word - The original word (for logging/hashing)
     * @param {Buffer} buffer - Image data
     * @param {string} ext - Extension (default: jpg)
     */
    async uploadImage(word, buffer, ext = 'jpg') {
        if (!this.init()) return null;

        const hash = this.calculateHash(word);
        const filename = `${hash}.${ext}`;
        const path = `${this.basePath}/${filename}`;
        const message = `Add image for "${word}" (${hash})`;
        const content = buffer.toString('base64');

        console.log(`🚀 Uploading ${filename} to GitHub...`);

        try {
            // Check existence first to prevent overwriting or errors (optional, or let it fail)
            // We will try to create. If it exists, Octokit throws 422 usually or we can use createOrUpdate logic if we want to overwrite.
            // For now, we assume if it exists we might not need to upload, OR we overwrite. 
            // Let's safe check: if 409 (conflict), it means it's there. 
            // But simple putFile requires 'sha' if updating. 
            // Strategy: Try to get 'sha' first. If exists, skip (we don't overwrite generated images usually).

            let sha;
            try {
                const { data } = await this.octokit.repos.getContent({
                    owner: this.owner,
                    repo: this.repo,
                    path: path
                });
                sha = data.sha;
                console.log(`⚠️ Image ${filename} already exists. Skipping upload.`);
                return this.getRawUrl(filename);
            } catch (e) {
                // 404 means not found, proceed.
                if (e.status !== 404) throw e;
            }

            await this.octokit.repos.createOrUpdateFileContents({
                owner: this.owner,
                repo: this.repo,
                path: path,
                message: message,
                content: content,
                committer: {
                    name: 'KidsVocabBot',
                    email: 'bot@kidsvocab.generated'
                }
            });

            console.log(`✅ Upload successful: ${path}`);
            return this.getRawUrl(filename);

        } catch (error) {
            console.error(`❌ GitHub Upload Failed for ${word}:`, error.message);
            return null;
        }
    }

    getRawUrl(filename) {
        // Return GitHub Pages URL
        // Format: https://{owner}.github.io/{repo}/{path}/{filename}
        return `https://${this.owner.toLowerCase()}.github.io/${this.repo}/${this.basePath}/${filename}`;
    }

    /**
     * Delete an image from GitHub (used when an image is reported/banned)
     * @param {string} word - The word to identify the file
     * @param {string} ext - Extension (default: jpg)
     */
    async deleteImage(word, ext = 'jpg') {
        if (!this.init()) return false;

        const hash = this.calculateHash(word);
        const filename = `${hash}.${ext}`;
        const path = `${this.basePath}/${filename}`;
        const message = `Delete banned image for "${word}"`;

        console.log(`🗑️ Deleting ${filename} from GitHub...`);

        try {
            // Need 'sha' to delete
            const { data } = await this.octokit.repos.getContent({
                owner: this.owner,
                repo: this.repo,
                path: path
            });

            await this.octokit.repos.deleteFile({
                owner: this.owner,
                repo: this.repo,
                path: path,
                message: message,
                sha: data.sha,
                committer: {
                    name: 'KidsVocabBot',
                    email: 'bot@kidsvocab.generated'
                }
            });

            console.log(`✅ Delete successful: ${path}`);
            return true;
        } catch (error) {
            console.error(`❌ GitHub Delete Failed for ${word}:`, error.message);
            return false;
        }
    }
}

module.exports = new GitHubStorageService();
