// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// Instantiating a DevTools universe requires settings from these meta files.
// Until settings registration is handled differently, the easiest solution is to
// just import relevant meta files (as long as they don't contain any UI related code)
import '../front_end/core/sdk/sdk-meta.js';
import '../front_end/models/workspace/workspace-meta.js';
import '../front_end/models/persistence/persistence-meta.js';
import '../front_end/models/logs/logs-meta.js';
import '../front_end/models/badges/badges-meta.js';
import * as Common_1 from '../front_end/core/common/common.js';
export { Common_1 as Common };
import * as Host_1 from '../front_end/core/host/host.js';
export { Host_1 as Host };
import * as I18n_1 from '../front_end/core/i18n/i18n.js';
export { I18n_1 as I18n };
export { ConnectionTransport } from '../front_end/core/protocol_client/ConnectionTransport.js';
import * as ProtocolClient_1 from '../front_end/core/protocol_client/protocol_client.js';
export { ProtocolClient_1 as ProtocolClient };
export { PuppeteerDevToolsConnection } from '../front_end/core/protocol_client/PuppeteerDevToolsConnection.js';
export { DebuggerModel } from '../front_end/core/sdk/DebuggerModel.js';
import * as NetworkManager_1 from '../front_end/core/sdk/NetworkManager.js';
export { NetworkManager_1 as NetworkManager };
export { RuntimeModel } from '../front_end/core/sdk/RuntimeModel.js';
import * as SourceMapManager_1 from '../front_end/core/sdk/SourceMapManager.js';
export { SourceMapManager_1 as SourceMapManager };
export { Target } from '../front_end/core/sdk/Target.js';
export { TargetManager } from '../front_end/core/sdk/TargetManager.js';
import * as Foundation_1 from '../front_end/foundation/foundation.js';
export { Foundation_1 as Foundation };
import * as Protocol_1 from '../front_end/generated/protocol.js';
export { Protocol_1 as Protocol };
import * as NetworkRequestFormatter_1 from '../front_end/models/ai_assistance/data_formatters/NetworkRequestFormatter.js';
export { NetworkRequestFormatter_1 as NetworkRequestFormatter };
export { PerformanceInsightFormatter, } from '../front_end/models/ai_assistance/data_formatters/PerformanceInsightFormatter.js';
export { PerformanceTraceFormatter, } from '../front_end/models/ai_assistance/data_formatters/PerformanceTraceFormatter.js';
export { AgentFocus } from '../front_end/models/ai_assistance/performance/AIContext.js';
export { DebuggerWorkspaceBinding } from '../front_end/models/bindings/DebuggerWorkspaceBinding.js';
import * as CrUXManager_1 from '../front_end/models/crux-manager/CrUXManager.js';
export { CrUXManager_1 as CrUXManager };
import * as Formatter_1 from '../front_end/models/formatter/formatter.js';
export { Formatter_1 as Formatter };
import * as HeapSnapshotModel_1 from '../front_end/models/heap_snapshot/heap_snapshot.js';
export { HeapSnapshotModel_1 as HeapSnapshotModel };
export { Issue } from '../front_end/models/issues_manager/Issue.js';
export { AggregatedIssue, IssueAggregator, } from '../front_end/models/issues_manager/IssueAggregator.js';
export { createIssuesFromProtocolIssue, isIssueCodeSupported, IssuesManager, } from '../front_end/models/issues_manager/IssuesManager.js';
import * as MarkdownIssueDescription_1 from '../front_end/models/issues_manager/MarkdownIssueDescription.js';
export { MarkdownIssueDescription_1 as MarkdownIssueDescription };
import * as StackTrace_1 from '../front_end/models/stack_trace/stack_trace.js';
export { StackTrace_1 as StackTrace };
import * as TraceEngine_1 from '../front_end/models/trace/trace.js';
export { TraceEngine_1 as TraceEngine };
export { IgnoreListManager } from '../front_end/models/workspace/IgnoreListManager.js';
import * as Marked_1 from '../front_end/third_party/marked/marked.js';
export { Marked_1 as Marked };
//# sourceMappingURL=mcp.js.map