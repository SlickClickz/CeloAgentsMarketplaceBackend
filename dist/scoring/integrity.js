"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeIntegrityScore = computeIntegrityScore;
// ─────────────────────────────────────────
// Maps AgentScan activity category strings
// to our internal SkillCategory enum.
// AgentScan returns raw category strings
// from on-chain transaction patterns.
// ─────────────────────────────────────────
const ACTIVITY_CATEGORY_MAP = {
    swap: "token-swap",
    "token-swap": "token-swap",
    "stable-swap": "token-swap",
    savings: "stablecoin-savings",
    "auto-save": "stablecoin-savings",
    "stablecoin-savings": "stablecoin-savings",
    yield: "yield-optimization",
    "yield-farm": "yield-optimization",
    "yield-optimization": "yield-optimization",
    bridge: "cross-chain-transfer",
    "cross-chain": "cross-chain-transfer",
    payment: "payment-automation",
    "auto-payment": "payment-automation",
    "payment-automation": "payment-automation",
    oracle: "data-oracle",
    "price-feed": "data-oracle",
    nft: "nft-management",
    "nft-mint": "nft-management",
    governance: "governance",
    vote: "governance",
};
function normalizeActivityCategory(raw) {
    const cleaned = raw.trim().toLowerCase();
    return ACTIVITY_CATEGORY_MAP[cleaned] ?? "other";
}
// ─────────────────────────────────────────
// Build a set of observed categories from
// AgentScan activity — only count categories
// with meaningful transaction volume (5+)
// ─────────────────────────────────────────
function buildObservedCategorySet(activity) {
    const observed = new Set();
    for (const entry of activity.activityCategories) {
        if (entry.count >= 5) {
            observed.add(normalizeActivityCategory(entry.category));
        }
    }
    return observed;
}
// ─────────────────────────────────────────
// Main export
// Compares declared skills vs on-chain
// activity to produce integrity score (0-30)
// ─────────────────────────────────────────
function computeIntegrityScore(skills, activity) {
    const flags = [];
    const declaredCategories = [
        ...new Set(skills.map((s) => s.category)),
    ];
    // No activity data — can't verify, partial score
    if (!activity || activity.activityCategories.length === 0) {
        return {
            score: 10, // partial credit — registered but unverifiable
            flags: [
                {
                    type: "UNVERIFIED",
                    message: "No on-chain activity found to verify declared skills",
                    severity: "info",
                },
            ],
            meta: {
                declaredCategories,
                observedCategories: [],
                matchedCategories: [],
                unmatchedCategories: declaredCategories,
            },
        };
    }
    const observedCategories = [
        ...buildObservedCategorySet(activity),
    ];
    const matchedCategories = declaredCategories.filter((cat) => observedCategories.includes(cat));
    const unmatchedCategories = declaredCategories.filter((cat) => !observedCategories.includes(cat) && cat !== "other");
    // Flag skill mismatches
    if (unmatchedCategories.length > 0) {
        flags.push({
            type: "SKILL_MISMATCH",
            message: `Declared skills not observed on-chain: ${unmatchedCategories.join(", ")}`,
            severity: unmatchedCategories.length >= declaredCategories.length
                ? "critical"
                : "warning",
        });
    }
    // Score — proportional to match rate + bonus for full match
    const matchRate = declaredCategories.length === 0
        ? 0
        : matchedCategories.length / declaredCategories.length;
    let score = Math.round(matchRate * 25); // up to 25 for match rate
    // Full match bonus
    if (matchedCategories.length === declaredCategories.length &&
        declaredCategories.length > 0) {
        score += 5; // full 30 for perfect integrity
    }
    return {
        score: Math.min(score, 30), // hard cap at 30
        flags,
        meta: {
            declaredCategories,
            observedCategories,
            matchedCategories,
            unmatchedCategories,
        },
    };
}
//# sourceMappingURL=integrity.js.map