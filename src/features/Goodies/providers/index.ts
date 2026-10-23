/* Provider selection. PROPOSED architecture (see spec): one codebase, two configurations.
   DEMO: sample data, simulated payment and order progress. PRODUCTION: real backend; simulated payment is disabled.
   Switch with the build-time flag below. No Supabase code is written yet (backend comes later). */
export type Mode = 'demo' | 'production';
export const MODE: Mode = ((globalThis as any).__WANTISS_MODE__ as Mode) || 'demo';
export const providerInfo = {demo: MODE === 'demo'};
export function assertDemoOnly(feature: string) {
  if (MODE !== 'demo') throw new Error('Blocked: ' + feature + ' is a demo-only simulation and cannot run in production mode.');
}
