"use strict";

/**
 * Memory store for Rate limiter
 *
 * Inspired by https://github.com/dotcypress/micro-ratelimit/
 *
 * @class MemoryStore
 */
class MemoryStore {

	/**
	 * Creates an instance of MemoryStore.
	 *
	 * @param {Number} clearPeriod
	 * @memberof MemoryStore
	 */
	constructor(clearPeriod) {
		this.hits = new Map();
		this.resetTime = Date.now() + clearPeriod;

		setInterval(() => {
			this.resetTime = Date.now() + clearPeriod;
			this.reset();
		}, clearPeriod);
	}

	/**
	 * Increment the counter by key
	 *
	 * @param {String} key
	 * @returns {Number}
	 * @memberof MemoryStore
	 */
	inc(key) {
		let counter = this.hits.get(key) || 0;
		counter++;
		this.hits.set(key, counter);
		return counter;
	}

	/**
	 * Reset all counters
	 *
	 * @memberof MemoryStore
	 */
	reset() {
		this.hits.clear();
	}
}

module.exports = MemoryStore;
