/**
 * Pitch & Ground Booking Service — Mock Implementation
 *
 * Phase 1: Read-only directory (search, view details).
 * Phase 2 stubs: slot management, booking, owner dashboard — defined but
 *   return placeholder data until the Firestore collections are live.
 *
 * Replace each function body with real Firestore queries when ready.
 * The public API surface does not change between phases.
 */

import {
  Pitch,
  TimeSlot,
  PitchBooking,
  PitchSearchFilters,
  OwnerSlotConfig,
} from '../types/pitch';

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ─── Seed Data ─────────────────────────────────────────────────────────────────

const MOCK_PITCHES: Pitch[] = [
  {
    id: 'pitch_001',
    name: 'Al Quoz Sports Arena',
    location: {
      address: 'Street 10, Al Quoz Industrial 3, Dubai',
      emirate: 'Dubai',
      latitude: 25.1431,
      longitude: 55.2234,
      googleMapsUrl: 'https://maps.google.com/?q=25.1431,55.2234',
    },
    turfType: 'artificial-turf-5g',
    supportedFormats: ['5-a-side', '7-a-side'],
    amenityIds: ['floodlights', 'parking', 'changing-room', 'showers', 'cafeteria'],
    photos: [
      'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=800',
      'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800',
    ],
    rating: 4.6,
    reviewCount: 87,
    pricing: {
      unit: 'per-hour',
      amount: 300,
      currency: 'AED',
      peakRate: 450,
      peakHoursStart: '17:00',
      peakHoursEnd: '22:00',
    },
    capacity: 14,
    isVerified: true,
    isActive: true,
    operatingHours: {
      weekday: { open: '07:00', close: '00:00' },
      weekend: { open: '06:00', close: '01:00' },
    },
    contactPhone: '+971 4 123 4567',
    contactWhatsApp: '+971501234567',
    description: 'Premium 5G artificial turf pitches in the heart of Al Quoz. Fully floodlit, with changing rooms and on-site café.',
    createdAt: '2024-01-10T08:00:00Z',
  },
  {
    id: 'pitch_002',
    name: 'Sharjah Football Hub',
    location: {
      address: 'Industrial Area 7, Sharjah',
      emirate: 'Sharjah',
      latitude: 25.3463,
      longitude: 55.4209,
      googleMapsUrl: 'https://maps.google.com/?q=25.3463,55.4209',
    },
    turfType: 'artificial-turf-3g',
    supportedFormats: ['5-a-side', '7-a-side', '11-a-side'],
    amenityIds: ['floodlights', 'parking', 'changing-room', 'first-aid'],
    photos: [
      'https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=800',
    ],
    rating: 4.2,
    reviewCount: 53,
    pricing: {
      unit: 'per-hour',
      amount: 200,
      currency: 'AED',
      peakRate: 300,
      peakHoursStart: '16:00',
      peakHoursEnd: '21:00',
    },
    capacity: 22,
    isVerified: true,
    isActive: true,
    operatingHours: {
      weekday: { open: '08:00', close: '23:00' },
      weekend: { open: '07:00', close: '00:00' },
    },
    contactPhone: '+971 6 234 5678',
    description: 'Large multi-format ground — ideal for 11-a-side leagues and weekend tournaments.',
    createdAt: '2024-02-15T08:00:00Z',
  },
  {
    id: 'pitch_003',
    name: 'Ajman Indoor Futsal Center',
    location: {
      address: 'Sheikh Maktoum Bin Rashid Road, Ajman',
      emirate: 'Ajman',
      latitude: 25.4052,
      longitude: 55.5136,
      googleMapsUrl: 'https://maps.google.com/?q=25.4052,55.5136',
    },
    turfType: 'indoor-futsal',
    supportedFormats: ['futsal', '5-a-side'],
    amenityIds: ['parking', 'changing-room', 'showers', 'wifi', 'cafeteria'],
    photos: [
      'https://images.unsplash.com/photo-1594470117722-de4b9a02ebed?w=800',
    ],
    rating: 4.8,
    reviewCount: 121,
    pricing: {
      unit: 'per-hour',
      amount: 180,
      currency: 'AED',
    },
    capacity: 10,
    isVerified: true,
    isActive: true,
    operatingHours: {
      weekday: { open: '09:00', close: '23:00' },
      weekend: { open: '08:00', close: '00:00' },
    },
    contactPhone: '+971 6 345 6789',
    contactWhatsApp: '+971503456789',
    description: 'Climate-controlled indoor futsal arena. Great for year-round play regardless of weather.',
    createdAt: '2024-03-01T08:00:00Z',
  },
  {
    id: 'pitch_004',
    name: 'Dubai Sports City — 5-a-Side Pitches',
    location: {
      address: 'Dubai Sports City, Sheikh Mohammed Bin Zayed Rd, Dubai',
      emirate: 'Dubai',
      latitude: 25.0297,
      longitude: 55.2321,
      googleMapsUrl: 'https://maps.google.com/?q=25.0297,55.2321',
    },
    turfType: 'artificial-turf-5g',
    supportedFormats: ['5-a-side'],
    amenityIds: ['floodlights', 'parking', 'changing-room', 'showers', 'first-aid', 'scoreboard'],
    photos: [
      'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800',
    ],
    rating: 4.9,
    reviewCount: 204,
    pricing: {
      unit: 'per-hour',
      amount: 400,
      currency: 'AED',
      peakRate: 550,
      peakHoursStart: '17:00',
      peakHoursEnd: '22:00',
      depositRequired: 100,
    },
    capacity: 10,
    isVerified: true,
    isActive: true,
    operatingHours: {
      weekday: { open: '06:00', close: '00:00' },
      weekend: { open: '06:00', close: '01:00' },
    },
    contactPhone: '+971 4 456 7890',
    contactWhatsApp: '+971504567890',
    description: 'World-class 5G pitches at Dubai Sports City. Broadcast scoreboards available for league nights.',
    createdAt: '2024-01-05T08:00:00Z',
  },
];

// ─── Phase 1 — Read-Only Directory ─────────────────────────────────────────────

/**
 * Search pitches using the provided filters.
 * Phase 1: client-side filtering on mock data.
 * Phase 2: replace with a Firestore compound query.
 */
export async function searchPitches(filters: PitchSearchFilters = {}): Promise<Pitch[]> {
  await delay(500);
  let results = MOCK_PITCHES.filter(p => p.isActive);

  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase();
    results = results.filter(
      p =>
        p.name.toLowerCase().includes(kw) ||
        p.location.address.toLowerCase().includes(kw) ||
        p.description?.toLowerCase().includes(kw)
    );
  }
  if (filters.emirate) {
    results = results.filter(p => p.location.emirate === filters.emirate);
  }
  if (filters.turfType) {
    results = results.filter(p => p.turfType === filters.turfType);
  }
  if (filters.format) {
    results = results.filter(p => p.supportedFormats.includes(filters.format!));
  }
  if (filters.maxPricePerHour !== undefined) {
    results = results.filter(p => p.pricing.amount <= filters.maxPricePerHour!);
  }
  if (filters.amenityIds && filters.amenityIds.length > 0) {
    results = results.filter(p =>
      filters.amenityIds!.every(id => p.amenityIds.includes(id))
    );
  }

  // Sort: verified first, then by rating desc
  return results.sort((a, b) => {
    if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
    return b.rating - a.rating;
  });
}

/**
 * Fetch a single pitch by its ID.
 */
export async function getPitchById(pitchId: string): Promise<Pitch | null> {
  await delay(300);
  return MOCK_PITCHES.find(p => p.id === pitchId) ?? null;
}

// ─── Phase 2 — Slot & Booking Management ──────────────────────────────────────

/**
 * [Phase 2] Fetch available time slots for a pitch on a given date.
 * Currently returns a stub — wire up to Firestore when ready.
 */
export async function getPitchSlots(pitchId: string, date: string): Promise<TimeSlot[]> {
  await delay(400);
  // Stub: generate hourly slots from 08:00–22:00
  const slots: TimeSlot[] = [];
  for (let h = 8; h < 22; h++) {
    const start = `${String(h).padStart(2, '0')}:00`;
    const end = `${String(h + 1).padStart(2, '0')}:00`;
    slots.push({
      id: `slot_${pitchId}_${date}_${h}`,
      pitchId,
      date,
      startTime: start,
      endTime: end,
      durationMinutes: 60,
      status: Math.random() > 0.4 ? 'available' : 'confirmed',
      price: 300,
      currency: 'AED',
    });
  }
  return slots;
}

/**
 * [Phase 2] Book a slot.
 * Stub — implement with a Firestore transaction to prevent double-booking.
 */
export async function bookSlot(
  pitchId: string,
  slotId: string,
  userId: string,
  teamId?: string
): Promise<PitchBooking> {
  await delay(600);
  const pitch = await getPitchById(pitchId);
  return {
    id: `booking_${Math.random().toString(36).slice(2, 9)}`,
    pitchId,
    pitchName: pitch?.name ?? 'Unknown Pitch',
    slotId,
    userId,
    teamId,
    date: new Date().toISOString().split('T')[0],
    startTime: '18:00',
    endTime: '19:00',
    status: 'pending',
    totalAmount: pitch?.pricing.amount ?? 0,
    currency: 'AED',
    paymentStatus: 'pending',
    createdAt: new Date().toISOString(),
  };
}

/**
 * [Phase 2] Ground owner: configure slots for a date.
 */
export async function configureOwnerSlots(config: OwnerSlotConfig): Promise<void> {
  await delay(400);
  // Stub — write to Firestore pitches/{pitchId}/slots sub-collection
  console.info('[pitchService] configureOwnerSlots stub called', config);
}

/**
 * [Phase 2] Fetch all bookings for a user.
 */
export async function getUserBookings(userId: string): Promise<PitchBooking[]> {
  await delay(350);
  return []; // Return Firestore results in Phase 2
}
