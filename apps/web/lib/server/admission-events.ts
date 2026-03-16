// Event/audit side effects live behind a separate boundary so core admission
// imports do not look coupled to ledger emission by default.

export { writeTrustLedgerEvent } from './admission/trust-ledger.ts';
