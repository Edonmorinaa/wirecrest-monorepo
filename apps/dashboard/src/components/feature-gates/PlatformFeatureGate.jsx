/**
 * Platform Feature Gate Component
 * Simple passthrough for now - can be enhanced with platform-specific feature gating
 */

export function PlatformFeatureGate({ children, platform, tenantId, showUpgradePrompt, upgradeMessage }) {
    // For now, just render children
    // TODO: Implement platform-specific feature gating logic
    return children;
}
