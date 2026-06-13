"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.governanceLocalStorage = void 0;
const node_async_hooks_1 = require("node:async_hooks");
/**
 * Enterprise-grade AsyncLocalStorage for governing runtime side-effects.
 * Ensures strict tenant isolation and replay purity across async boundaries.
 * Extracted to a standalone module to prevent circular dependencies between
 * interceptors, observability, and proof collectors.
 */
exports.governanceLocalStorage = new node_async_hooks_1.AsyncLocalStorage();
