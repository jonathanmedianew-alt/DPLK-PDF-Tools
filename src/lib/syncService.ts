import { AccessRequest } from '../types';

// Deterministic hash function for simple hostname unique keying
function getSyncId(): string {
  // Use a stable, constant identifier derived from the applet ID to prevent database partitioning.
  // This ensures localhost, dev servers, and live URLs all synchronize to the exact same workspace registry.
  return 'ff8081819d82fab6019e5e4dd3c2765f';
}

const DEFAULT_USERS: AccessRequest[] = [
  { email: 'jonathanmedianew@gmail.com', submittedAt: new Date(Date.now() - 86400000 * 3).toISOString(), status: 'approved' },
  { email: 'colleague@dplktools.com', submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'approved' }
];

export async function fetchCloudRequests(): Promise<AccessRequest[]> {
  const objectId = getSyncId();
  try {
    const res = await fetch(`https://api.restful-api.dev/objects/${objectId}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.data && Array.isArray(data.data.requests)) {
        return data.data.requests;
      }
    } else if (res.status === 404) {
      // Not created on cloud yet, let's write default schema
      await writeCloudRequests(DEFAULT_USERS);
      return DEFAULT_USERS;
    }
  } catch (error) {
    console.warn('SyncService: falling back to local list due to network error', error);
  }
  
  // Local storage fallback
  const saved = localStorage.getItem('dplk_access_requests');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return DEFAULT_USERS;
}

export async function writeCloudRequests(requests: AccessRequest[]): Promise<boolean> {
  const objectId = getSyncId();
  const payload = {
    id: objectId,
    name: "DPLK Tools Cloud Access Registry",
    data: {
      requests,
      lastUpdated: new Date().toISOString()
    }
  };

  try {
    // Try updating with PUT first
    const putRes = await fetch(`https://api.restful-api.dev/objects/${objectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.name,
        data: payload.data
      })
    });

    if (putRes.ok) {
      localStorage.setItem('dplk_access_requests', JSON.stringify(requests));
      return true;
    }

    // If PUT fails (e.g. because it wasn't POSTed first in this API service), POST it
    const postRes = await fetch('https://api.restful-api.dev/objects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (postRes.ok) {
      localStorage.setItem('dplk_access_requests', JSON.stringify(requests));
      return true;
    }
  } catch (error) {
    console.error('SyncService: remote write failed', error);
  }

  // Backup to localStorage
  localStorage.setItem('dplk_access_requests', JSON.stringify(requests));
  return false;
}
