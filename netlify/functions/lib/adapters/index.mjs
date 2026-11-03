// Add one file per state feed, then register it here. enabled:false adapters are skipped.
import*as ca from './ca.mjs';
export const ADAPTERS=[{mod:ca,enabled:process.env.ENABLE_CA==='1'}];
