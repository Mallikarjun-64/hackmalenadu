// ==UserScript==
// @name         Hack Malenadu '26 - Universal Security Sensor
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Intercepts console errors/warnings and streams them to the threat engine (CSP Bypassing).
// @author       Hack Malenadu Team
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// ==/UserScript==

(function() {
    'use strict';

    const BACKEND_URL = 'http://127.0.0.1:8000/api/ingest/client-log';
    let logBuffer = [];
    
    if (window.location.host.includes('localhost:5173')) return;

    function queueLog(level, message, source) {
        // Collect everything first
        logBuffer.push({
            message: String(message),
            level: level,
            url: window.location.href,
            source: source || 'console_hook',
            timestamp: new Date().toISOString()
        });
        
        // Visual indicator in console that log is queued
        console.log(`%c[Hack Malenadu] Event queued to buffer (Status: ${logBuffer.length} items)`, "color: #3b82f6; font-size: 10px;");
    }

    // Flush the buffer every 10 seconds
    setInterval(() => {
        if (logBuffer.length === 0) return;

        // Filtering: Only send logs that match our security criteria to avoid noise
        const securityKeywords = ['error', 'warn', 'refused', 'csp', 'xss', 'blocked', 'auth', 'login', 'fail', 'unauthorized', 'apikey', 'secret', 'not defined'];
        const filteredLogs = logBuffer.filter(log => {
            const lowerMsg = log.message.toLowerCase();
            return securityKeywords.some(k => lowerMsg.includes(k));
        });

        if (filteredLogs.length === 0) {
            logBuffer = []; // Clear buffer if nothing security-relevant found
            return;
        }

        console.log(`%c[Hack Malenadu] Sending batch of ${filteredLogs.length} logs to engine...`, "color: #f59e0b; font-weight: bold;");

        GM_xmlhttpRequest({
            method: "POST",
            url: BACKEND_URL,
            data: JSON.stringify(filteredLogs),
            headers: { "Content-Type": "application/json" },
            onload: function(res) {
                 if (res.status === 200) {
                    console.log("%c[Hack Malenadu] Batch sent successfully!", "color: #10b981; font-weight: bold;");
                 }
            }
        });

        logBuffer = []; // Clear the buffer
    }, 10000);

    // 1. Hook console.error
    const originalError = console.error;
    console.error = function() {
        queueLog('error', Array.from(arguments).join(' '), 'console_hook');
        originalError.apply(console, arguments);
    };

    // 2. Global Error Handler
    window.onerror = function(msg, url, lineNo, columnNo, error) {
        queueLog('error', msg, 'runtime_error');
        return false;
    };

    // 3. Unhandled Promises
    window.onunhandledrejection = function(event) {
        queueLog('error', event.reason, 'promise_error');
    };

    console.log("%c[Hack Malenadu Sensor] 🛡️ BATCH MODE ACTIVE (10s refresh)", "color: #ef4444; font-weight: bold; font-size: 14px; border: 1px solid red; padding: 4px;");
})();
