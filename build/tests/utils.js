/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import path from 'node:path';
import logger from 'debug';
import puppeteer, { Locator } from 'puppeteer';
import sinon from 'sinon';
import { McpContext } from '../src/McpContext.js';
import { McpResponse } from '../src/McpResponse.js';
import { TextSnapshot } from '../src/TextSnapshot.js';
import { DevTools } from '../src/third_party/index.js';
import { stableIdSymbol } from '../src/utils/id.js';
export function assertNoServiceWorkerReported(targets, id) {
    const target = targets.find(target => {
        return target.url().includes(id) && target.type() === 'service_worker';
    });
    assert(target === undefined);
}
export function getTextContent(content) {
    if (content.type === 'text') {
        return content.text;
    }
    throw new Error(`Expected text content but got ${content.type}`);
}
export function getImageContent(content) {
    if (content.type === 'image') {
        return { data: content.data, mimeType: content.mimeType };
    }
    throw new Error(`Expected image content but got ${content.type}`);
}
export function extractExtensionId(response) {
    const responseLine = response.responseLines[0];
    assert.ok(responseLine, 'Response should not be empty');
    const match = responseLine.match(/Extension installed\. Id: (.+)/);
    const extensionId = match ? match[1] : null;
    assert.ok(extensionId, 'Response should contain a valid key');
    return extensionId;
}
const browsers = new Map();
let context;
export async function withBrowser(cb, options = {}) {
    const launchOptions = {
        executablePath: options.executablePath ?? process.env.PUPPETEER_EXECUTABLE_PATH,
        headless: !options.debug,
        defaultViewport: null,
        devtools: options.autoOpenDevTools ?? false,
        pipe: true,
        handleDevToolsAsPage: true,
        args: [...(options.args || []), '--screen-info={3840x2160}'],
        enableExtensions: true,
        blocklist: options.blockedUrlPattern,
        allowlist: options.allowedUrlPattern,
    };
    const key = JSON.stringify(launchOptions);
    let browser = browsers.get(key);
    if (!browser) {
        browser = await puppeteer.launch(launchOptions);
        browsers.set(key, browser);
    }
    const newPage = await browser.newPage();
    // Close other pages.
    await Promise.all((await browser.pages()).map(async (page) => {
        if (page !== newPage) {
            await page.close();
        }
    }));
    await cb(browser, newPage);
}
export async function withMcpContext(cb, options = {}, args = {}) {
    await withBrowser(async (browser) => {
        TextSnapshot.resetCounter();
        const response = new McpResponse(args);
        if (context) {
            context.dispose();
        }
        context = await McpContext.from(browser, logger('test'), {
            experimentalDevToolsDebugging: false,
            performanceCrux: options.performanceCrux ?? true,
            allowList: options.allowedUrlPattern,
            blocklist: options.blockedUrlPattern,
        }, Locator);
        response.setPage(context.getSelectedMcpPage());
        await cb(response, context);
    }, options);
}
export function getMockRequest(options = {}) {
    return {
        url() {
            return options.url ?? 'http://example.com';
        },
        method() {
            return options.method ?? 'GET';
        },
        fetchPostData() {
            return options.fetchPostData ?? Promise.reject();
        },
        hasPostData() {
            return options.hasPostData ?? false;
        },
        postData() {
            return options.postData;
        },
        response() {
            return options.response ?? null;
        },
        failure() {
            return options.failure?.() ?? null;
        },
        resourceType() {
            return options.resourceType ?? 'document';
        },
        headers() {
            return (options.headers ?? {
                'content-size': '10',
            });
        },
        redirectChain() {
            // Puppeteer returns a fresh copy on every call (HTTPRequest returns
            // `this._redirectChain.slice()`); mirror that so formatters can't share
            // and accidentally mutate the same array across calls.
            return [...(options.redirectChain ?? [])];
        },
        isNavigationRequest() {
            return options.navigationRequest ?? false;
        },
        frame() {
            return options.frame ?? {};
        },
        [stableIdSymbol]: options.stableId ?? 1,
    };
}
export function getMockResponse(options = {}) {
    return {
        status() {
            return options.status ?? 200;
        },
        headers() {
            return options.headers ?? {};
        },
    };
}
export function html(strings, ...values) {
    const bodyContent = strings.reduce((acc, str, i) => {
        return acc + str + (values[i] || '');
    }, '');
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My test page</title>
  </head>
  <body>
    ${bodyContent}
  </body>
</html>`;
}
export function stabilizeStructuredContent(content) {
    if (typeof content === 'string') {
        return stabilizeResponseOutput(content);
    }
    if (Array.isArray(content)) {
        return content.map(item => stabilizeStructuredContent(item));
    }
    if (typeof content === 'object' && content !== null) {
        const result = {};
        for (const [key, value] of Object.entries(content)) {
            if (key === 'snapshotFilePath' && typeof value === 'string') {
                result[key] = '<file>';
            }
            else {
                result[key] = stabilizeStructuredContent(value);
            }
        }
        return result;
    }
    return content;
}
export function stabilizeResponseOutput(text) {
    if (typeof text !== 'string') {
        throw new Error('Input must be string');
    }
    let output = text;
    const dateRegEx = /.{3}, \d{2} .{3} \d{4} \d{2}:\d{2}:\d{2} [A-Z]{3}/g;
    output = output.replaceAll(dateRegEx, '<long date>');
    const localhostRegEx = /localhost:\d{5}/g;
    output = output.replaceAll(localhostRegEx, 'localhost:<port>');
    const userAgentRegEx = /user-agent:.*\n/g;
    output = output.replaceAll(userAgentRegEx, 'user-agent:<user-agent>\n');
    const chUaRegEx = /sec-ch-ua:"Chromium";v="\d{3}"/g;
    output = output.replaceAll(chUaRegEx, 'sec-ch-ua:"Chromium";v="<version>"');
    // sec-ch-ua-platform:"Linux"
    const chUaPlatformRegEx = /sec-ch-ua-platform:"[a-zA-Z]*"/g;
    output = output.replaceAll(chUaPlatformRegEx, 'sec-ch-ua-platform:"<os>"');
    const savedSnapshot = /Saved snapshot to (.*)/g;
    output = output.replaceAll(savedSnapshot, 'Saved snapshot to <file>');
    const acceptLanguageRegEx = /accept-language:.*\n/g;
    output = output.replaceAll(acceptLanguageRegEx, 'accept-language:<lang>\n');
    // Stabilize URL-encoded file paths
    const fileUriRegEx = /file%3A%2F%2F%2F[^)\n]+/g;
    output = output.replaceAll(fileUriRegEx, '<file-path>');
    return output;
}
export function getMockAggregatedIssue() {
    const mockAggregatedIssue = sinon.createStubInstance(DevTools.AggregatedIssue);
    mockAggregatedIssue.getAllIssues.returns([]);
    return mockAggregatedIssue;
}
export function mockListener() {
    const listeners = {};
    return {
        on(eventName, listener) {
            if (listeners[eventName]) {
                listeners[eventName].push(listener);
            }
            else {
                listeners[eventName] = [listener];
            }
        },
        off(_eventName, _listener) {
            // no-op
        },
        emit(eventName, data) {
            for (const listener of listeners[eventName] ?? []) {
                listener(data);
            }
        },
    };
}
export function getMockPage() {
    const mainFrame = {};
    const cdpSession = {
        ...mockListener(),
        send: () => {
            // no-op
        },
        target: () => ({ _targetId: '<mock target ID>' }),
    };
    return {
        mainFrame() {
            return mainFrame;
        },
        ...mockListener(),
        // @ts-expect-error internal API.
        _client() {
            return cdpSession;
        },
    };
}
export function getMockBrowser() {
    const pages = [getMockPage()];
    return {
        pages() {
            return Promise.resolve(pages);
        },
        ...mockListener(),
    };
}
export const CLI_PATH = path.resolve('build/src/bin/chrome-devtools.js');
export async function runCli(args, sessionId) {
    return new Promise((resolve, reject) => {
        const finalArgs = [...args];
        if (sessionId) {
            finalArgs.push('--sessionId', sessionId);
        }
        const child = spawn('node', [CLI_PATH, ...finalArgs], {
            env: process.env,
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', chunk => {
            stdout += chunk;
            process.stdout.write(chunk);
        });
        child.stderr.on('data', chunk => {
            stderr += chunk;
            process.stderr.write(chunk);
        });
        child.on('close', status => resolve({ status, stdout, stderr }));
        child.on('error', reject);
    });
}
export async function assertDaemonIsNotRunning(sessionId) {
    const result = await runCli(['status'], sessionId);
    assert.strictEqual(result.stdout, 'chrome-devtools-mcp daemon is not running.\n');
}
export async function assertDaemonIsRunning(sessionId) {
    const result = await runCli(['status'], sessionId);
    assert.ok(result.stdout.startsWith('chrome-devtools-mcp daemon is running.\n'), 'chrome-devtools-mcp daemon is not running');
}
export async function waitExecutionFor(func, timeout) {
    const start = Date.now();
    while (Date.now() - start < 10000) {
        try {
            await func();
            return;
        }
        catch {
            await new Promise(resolve => setTimeout(resolve, 100)); // wait and retry
        }
    }
    throw new Error(`Timeout of ${timeout} reached.`);
}
//# sourceMappingURL=utils.js.map