// Simple device fingerprinting for referral abuse prevention
export const generateDeviceFingerprint = (): string => {
  const components: string[] = [];

  // Screen properties
  if (typeof window !== 'undefined') {
    components.push(window.screen.width.toString());
    components.push(window.screen.height.toString());
    components.push(window.screen.colorDepth.toString());
    components.push((window.screen.availWidth || 0).toString());
    
    // Navigator properties
    components.push(navigator.language || '');
    components.push(navigator.platform || '');
    components.push(navigator.hardwareConcurrency?.toString() || '');
    components.push(navigator.maxTouchPoints?.toString() || '');
    
    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
    
    // User agent (simplified)
    const ua = navigator.userAgent;
    components.push(ua.length.toString());
    
    // Canvas fingerprint (simple)
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('VibeBaze', 2, 2);
        components.push(canvas.toDataURL().slice(-50));
      }
    } catch {
      // Canvas fingerprinting blocked
    }
  }

  // Create a hash from components
  const fingerprint = components.join('|');
  return btoa(fingerprint).slice(0, 32);
};

// Get approximate IP via a public service (for client-side detection)
export const getClientInfo = async (): Promise<{ fingerprint: string }> => {
  const fingerprint = generateDeviceFingerprint();
  return { fingerprint };
};
