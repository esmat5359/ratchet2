// Tiny, dependency-free lookup so UI code can label demo accounts without loading the simulator.
const NAMES = {
  '0x7a3c5e91b2d84f60a1c9e3d57b8f2046ac19de35': 'Ada', '0x4be2d9f1708c35a6e1b94d27c03fa85d6e12b7c4': 'Bo',
  '0x91d05c7e3ab84f2d6c1e09b7a5348df2e60c1b9a': 'Cleo', '0xc08e6b24f9a1d375e2b80c46d91f7a3e5b04d28f': 'Dev',
  '0x2f6a9d03c1e8b57a4d90e6f3b8125c7ad4e91f60': 'Eli', '0x5d1b7e9a04c2f863a9e10d4b7c358f26ad91e0b3': 'Guest',
};
export const demoName = (a) => {
  try { if (window.localStorage.getItem('ratchet.demo') !== '1' && !new URLSearchParams(window.location.search).has('demo')) return null; } catch { return null; }
  return NAMES[String(a || '').toLowerCase()] ?? null;
};
