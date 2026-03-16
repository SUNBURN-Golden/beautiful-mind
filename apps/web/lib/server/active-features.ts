// Compatibility barrel. Prefer active-core.ts and active-trust.ts for new code.

export * from './active-core.ts';
export { submitActiveIncidentReport, submitParticipationRevokeRequest } from './active-trust.ts';
