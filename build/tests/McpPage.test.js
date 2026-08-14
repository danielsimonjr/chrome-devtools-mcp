/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose, inner;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        var r, s = 0;
        function next() {
            while (r = env.stack.pop()) {
                try {
                    if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                    if (r.dispose) {
                        var result = r.dispose.call(r.value);
                        if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                    }
                    else s |= 1;
                }
                catch (e) {
                    fail(e);
                }
            }
            if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { replaceHtmlElementsWithUids } from '../src/McpPage.js';
import { withMcpContext } from './utils.js';
describe('replaceHtmlElementsWithUids', () => {
    it('does nothing for boolean schemas', () => {
        const schemaTrue = true;
        const schemaFalse = false;
        replaceHtmlElementsWithUids(schemaTrue);
        replaceHtmlElementsWithUids(schemaFalse);
        assert.strictEqual(schemaTrue, true);
        assert.strictEqual(schemaFalse, false);
    });
    it('replaces HTMLElement type with uid string', () => {
        const schema = {
            type: 'object',
            properties: {
                foo: { type: 'string' },
                bar: { type: 'number' },
            },
            required: ['foo'],
        };
        Object.assign(schema, { 'x-mcp-type': 'HTMLElement' });
        replaceHtmlElementsWithUids(schema);
        if (typeof schema === 'object') {
            assert.deepStrictEqual(schema.properties, {
                uid: { type: 'string' },
            });
            assert.deepStrictEqual(schema.required, ['uid']);
        }
        else {
            assert.fail('Schema should be an object');
        }
    });
    it('does not replace if x-mcp-type is not HTMLElement', () => {
        const schema = {
            type: 'object',
            properties: {
                foo: { type: 'string' },
            },
        };
        Object.assign(schema, { 'x-mcp-type': 'OtherType' });
        replaceHtmlElementsWithUids(schema);
        if (typeof schema === 'object') {
            assert.deepStrictEqual(schema.properties, {
                foo: { type: 'string' },
            });
            assert.strictEqual(schema.required, undefined);
        }
        else {
            assert.fail('Schema should be an object');
        }
    });
    it('recurses into nested properties', () => {
        const schema = {
            type: 'object',
            properties: {
                element: {
                    type: 'object',
                    properties: {
                        foo: { type: 'string' },
                    },
                },
                other: {
                    type: 'string',
                },
            },
        };
        if (typeof schema === 'object' && schema.properties) {
            Object.assign(schema.properties.element, { 'x-mcp-type': 'HTMLElement' });
        }
        replaceHtmlElementsWithUids(schema);
        if (typeof schema === 'object' &&
            schema.properties &&
            typeof schema.properties.element === 'object') {
            const elementSchema = schema.properties.element;
            assert.deepStrictEqual(elementSchema.properties, {
                uid: { type: 'string' },
            });
            assert.deepStrictEqual(elementSchema.required, ['uid']);
        }
        else {
            assert.fail('Unexpected schema structure');
        }
    });
    it('recurses into array items (single schema object)', () => {
        const schema = {
            type: 'array',
            items: {
                type: 'object',
            },
        };
        if (typeof schema === 'object' && typeof schema.items === 'object') {
            Object.assign(schema.items, { 'x-mcp-type': 'HTMLElement' });
        }
        replaceHtmlElementsWithUids(schema);
        if (typeof schema === 'object' && typeof schema.items === 'object') {
            const itemsSchema = schema.items;
            if (!Array.isArray(itemsSchema)) {
                assert.deepStrictEqual(itemsSchema.properties, {
                    uid: { type: 'string' },
                });
                assert.deepStrictEqual(itemsSchema.required, ['uid']);
            }
            else {
                assert.fail('items should not be an array in this test case');
            }
        }
        else {
            assert.fail('Unexpected schema structure');
        }
    });
    it('recurses into array items (array of schemas)', () => {
        const schema = {
            type: 'array',
            items: [
                {
                    type: 'object',
                },
                {
                    type: 'string',
                },
            ],
        };
        if (typeof schema === 'object' && Array.isArray(schema.items)) {
            Object.assign(schema.items[0], { 'x-mcp-type': 'HTMLElement' });
        }
        replaceHtmlElementsWithUids(schema);
        if (typeof schema === 'object' && Array.isArray(schema.items)) {
            const firstItem = schema.items[0];
            if (typeof firstItem === 'object') {
                assert.deepStrictEqual(firstItem.properties, {
                    uid: { type: 'string' },
                });
                assert.deepStrictEqual(firstItem.required, ['uid']);
            }
            else {
                assert.fail('First item should be an object');
            }
            const secondItem = schema.items[1];
            if (typeof secondItem === 'object') {
                assert.strictEqual(secondItem.properties, undefined);
            }
            else {
                assert.fail('Second item should be an object');
            }
        }
        else {
            assert.fail('Unexpected schema structure');
        }
    });
    it('recurses into anyOf', () => {
        const schema = {
            anyOf: [
                {
                    type: 'object',
                },
                {
                    type: 'string',
                },
            ],
        };
        if (typeof schema === 'object' && Array.isArray(schema.anyOf)) {
            Object.assign(schema.anyOf[0], { 'x-mcp-type': 'HTMLElement' });
        }
        replaceHtmlElementsWithUids(schema);
        if (typeof schema === 'object' && Array.isArray(schema.anyOf)) {
            const firstItem = schema.anyOf[0];
            if (typeof firstItem === 'object') {
                assert.deepStrictEqual(firstItem.properties, {
                    uid: { type: 'string' },
                });
            }
            else {
                assert.fail('First item should be an object');
            }
        }
        else {
            assert.fail('Unexpected schema structure');
        }
    });
    it('recurses into allOf', () => {
        const schema = {
            allOf: [
                {
                    type: 'object',
                },
            ],
        };
        if (typeof schema === 'object' && Array.isArray(schema.allOf)) {
            Object.assign(schema.allOf[0], { 'x-mcp-type': 'HTMLElement' });
        }
        replaceHtmlElementsWithUids(schema);
        if (typeof schema === 'object' && Array.isArray(schema.allOf)) {
            const firstItem = schema.allOf[0];
            if (typeof firstItem === 'object') {
                assert.deepStrictEqual(firstItem.properties, {
                    uid: { type: 'string' },
                });
            }
            else {
                assert.fail('First item should be an object');
            }
        }
        else {
            assert.fail('Unexpected schema structure');
        }
    });
    it('recurses into oneOf', () => {
        const schema = {
            oneOf: [
                {
                    type: 'object',
                },
            ],
        };
        if (typeof schema === 'object' && Array.isArray(schema.oneOf)) {
            Object.assign(schema.oneOf[0], { 'x-mcp-type': 'HTMLElement' });
        }
        replaceHtmlElementsWithUids(schema);
        if (typeof schema === 'object' && Array.isArray(schema.oneOf)) {
            const firstItem = schema.oneOf[0];
            if (typeof firstItem === 'object') {
                assert.deepStrictEqual(firstItem.properties, {
                    uid: { type: 'string' },
                });
            }
            else {
                assert.fail('First item should be an object');
            }
        }
        else {
            assert.fail('Unexpected schema structure');
        }
    });
});
describe('McpPage', () => {
    it('creates a handle on the page and disposes it as such', async () => {
        await withMcpContext(async (response, context) => {
            const env_1 = { stack: [], error: void 0, hasError: false };
            try {
                const page = context.getSelectedMcpPage().pptrPage;
                const handle = __addDisposableResource(env_1, await page.evaluateHandle('new Set()'), false);
                {
                    const env_2 = { stack: [], error: void 0, hasError: false };
                    try {
                        const _ = __addDisposableResource(env_2, handle, false);
                    }
                    catch (e_1) {
                        env_2.error = e_1;
                        env_2.hasError = true;
                    }
                    finally {
                        __disposeResources(env_2);
                    }
                }
                // @ts-expect-error Internal Puppeteer API
                assert.ok(handle.disposed);
            }
            catch (e_2) {
                env_1.error = e_2;
                env_1.hasError = true;
            }
            finally {
                __disposeResources(env_1);
            }
        });
    });
});
//# sourceMappingURL=McpPage.test.js.map