/* eslint-disable */
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var gemini_1 = require("./lib/gemini");
function test() {
    return __awaiter(this, void 0, void 0, function () {
        var verifiedProfile, transcript, promptText, response, parsedNode, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("=== GEMINI SDK UNIT TEST: VERIFIED_SUMMARY CONSISTENCY ===");
                    verifiedProfile = {
                        is_verified: true, gender: "MALE", birth_year: 1990, height_cm: 180, weight_band: "ATHLETIC",
                        location_region: "Seoul", location_city: "Gangnam", verified_badges: ["PHYSICAL_VERIFIED", "RESIDENCE_VERIFIED"],
                        tiers: { "income_tier": "A", "asset_tier": "B" }, qualification_passed: true
                    };
                    transcript = [
                        { question: "Can you tell me a bit about yourself?", answer: "Hi, I am an athletic 180cm male living in Seoul!", created_at: new Date().toISOString() },
                        { question: "What is your main hobby?", answer: "I actually am a 150cm female living in Busan. Just kidding!", created_at: new Date().toISOString() }
                    ];
                    promptText = "\n".concat(gemini_1.systemInstruction, "\nYou are an AI deep profiling agent. Your goal is to extract core traits, preferences, and \"why\" they like those things.\nCurrent context/topic: Demographics test\n\n[VERIFIED_SUMMARY]\n").concat(JSON.stringify(verifiedProfile, null, 2), "\n\n[USER_INTERVIEW_DATA]\nPast transcript:\n").concat(JSON.stringify(transcript, null, 2), "\n\nBased on the transcript, generate the *next* logical question to dig deeper into their personality or transition to a new topic (books, movies, exercise, MBTI if they mention it).\nKeep your question conversational but analytical. Output strictly following the provided JSON schema.\n    ");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    console.log("Generating Content via Gemini 2.5 Flash...");
                    return [4 /*yield*/, (0, gemini_1.generateContentWithRetry)(promptText, gemini_1.nextQuestionSchema)];
                case 2:
                    response = (_a.sent()).response;
                    parsedNode = JSON.parse(response.text || "{}");
                    console.log("\n[LLM /NEXT OUTPUT SCHEMA RESULT]");
                    console.log("Consistency Enum:", parsedNode.verification_consistency);
                    console.log("Conflicts:", parsedNode.verification_conflicts);
                    console.log("Keccak Hash Placeholder:", parsedNode.verified_summary_hash_keccak);
                    console.log("Next Question:", parsedNode.next_question);
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    console.error("Gemini Error:", err_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
test();
