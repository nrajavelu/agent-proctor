"use strict";
/**
 * Core types for Agentic AI Proctoring Platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskLevel = exports.AISensitivity = exports.ViolationSeverity = exports.ViolationType = exports.AgentStatus = exports.SessionStatus = void 0;
var SessionStatus;
(function (SessionStatus) {
    SessionStatus["PENDING"] = "pending";
    SessionStatus["ACTIVE"] = "active";
    SessionStatus["PAUSED"] = "paused";
    SessionStatus["COMPLETED"] = "completed";
    SessionStatus["TERMINATED"] = "terminated";
})(SessionStatus || (exports.SessionStatus = SessionStatus = {}));
var AgentStatus;
(function (AgentStatus) {
    AgentStatus["INITIALIZING"] = "initializing";
    AgentStatus["READY"] = "ready";
    AgentStatus["MONITORING"] = "monitoring";
    AgentStatus["PAUSED"] = "paused";
    AgentStatus["DISCONNECTED"] = "disconnected";
})(AgentStatus || (exports.AgentStatus = AgentStatus = {}));
var ViolationType;
(function (ViolationType) {
    // Visual violations
    ViolationType["MULTIPLE_FACES"] = "multiple_faces";
    ViolationType["NO_FACE_DETECTED"] = "no_face_detected";
    ViolationType["FACE_NOT_VISIBLE"] = "face_not_visible";
    ViolationType["SUSPICIOUS_OBJECT"] = "suspicious_object";
    // Audio violations  
    ViolationType["MULTIPLE_VOICES"] = "multiple_voices";
    ViolationType["BACKGROUND_NOISE"] = "background_noise";
    ViolationType["SUSPICIOUS_AUDIO"] = "suspicious_audio";
    // Screen violations
    ViolationType["TAB_SWITCH"] = "tab_switch";
    ViolationType["WINDOW_SWITCH"] = "window_switch";
    ViolationType["COPY_PASTE"] = "copy_paste";
    ViolationType["FULLSCREEN_EXIT"] = "fullscreen_exit";
    // Behavioral violations
    ViolationType["SUSPICIOUS_MOVEMENT"] = "suspicious_movement";
    ViolationType["LOOKING_AWAY"] = "looking_away";
    ViolationType["RAPID_TYPING"] = "rapid_typing";
})(ViolationType || (exports.ViolationType = ViolationType = {}));
var ViolationSeverity;
(function (ViolationSeverity) {
    ViolationSeverity["LOW"] = "low";
    ViolationSeverity["MEDIUM"] = "medium";
    ViolationSeverity["HIGH"] = "high";
    ViolationSeverity["CRITICAL"] = "critical";
})(ViolationSeverity || (exports.ViolationSeverity = ViolationSeverity = {}));
var AISensitivity;
(function (AISensitivity) {
    AISensitivity["LOW"] = "low";
    AISensitivity["MEDIUM"] = "medium";
    AISensitivity["HIGH"] = "high";
})(AISensitivity || (exports.AISensitivity = AISensitivity = {}));
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["VERY_LOW"] = "very_low";
    RiskLevel["LOW"] = "low";
    RiskLevel["MEDIUM"] = "medium";
    RiskLevel["HIGH"] = "high";
    RiskLevel["VERY_HIGH"] = "very_high";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
//# sourceMappingURL=index.js.map