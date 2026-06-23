/**
 * Pitch & Ground Booking — TypeScript interfaces.
 *
 * Architecture
 * ──────────────
 * Phase 1 (now): Read-only directory. Players search, view details, find
 *   contact info. Pitch & TimeSlot data is seeded / manually managed.
 *
 * Phase 2 (future): Ground owners can log in, manage their pitches, configure
 *   real-time availability slots, variable pricing, and accept bookings.
 *   All Phase 2 interfaces are defined here but remain unused until that
 *   backend work is done — this keeps the migration cost near zero.
 */

// ─── Enumerations ──────────────────────────────────────────────────────────────

export type TurfType =
  | 'natural-grass'
  | 'artificial-turf-3g'
  | 'artificial-turf-5g'
  | 'hybrid'
  | 'indoor-futsal';

export type PitchFormat = '5-a-side' | '7-a-side' | '11-a-side' | 'futsal';

export type BookingStatus = 'available' | 'pending' | 'confirmed' | 'cancelled';

export type PricingUnit = 'per-hour' | 'per-session';

export type UAE_Emirate =
  | 'Dubai'
  | 'Sharjah'
  | 'Ajman'
  | 'Abu Dhabi'
  | 'Ras Al Khaimah'
  | 'Fujairah'
  | 'Umm Al Quwain';

// ─── Amenities ─────────────────────────────────────────────────────────────────

export interface PitchAmenity {
  id: string;
  /** Display label, e.g. "Floodlights". */
  label: string;
  /** Ionicons icon name. */
  icon: string;
}

/** Canonical amenity catalog. Used for filter chips. */
export const PITCH_AMENITIES: PitchAmenity[] = [
  { id: 'floodlights',   label: 'Floodlights',    icon: 'bulb-outline' },
  { id: 'parking',       label: 'Parking',         icon: 'car-outline' },
  { id: 'changing-room', label: 'Changing Rooms',  icon: 'shirt-outline' },
  { id: 'showers',       label: 'Showers',         icon: 'water-outline' },
  { id: 'cafeteria',     label: 'Cafeteria',       icon: 'cafe-outline' },
  { id: 'wifi',          label: 'Wi-Fi',           icon: 'wifi-outline' },
  { id: 'scoreboard',    label: 'Scoreboard',      icon: 'stats-chart-outline' },
  { id: 'first-aid',     label: 'First Aid',       icon: 'medkit-outline' },
];

// ─── Location & Pricing ────────────────────────────────────────────────────────

export interface PitchLocation {
  address: string;
  emirate: UAE_Emirate;
  latitude: number;
  longitude: number;
  googleMapsUrl?: string;
}

export interface PitchPricing {
  unit: PricingUnit;
  /** Standard rate in AED. */
  amount: number;
  currency: 'AED';
  /** Phase 2: elevated rate during peak hours. */
  peakRate?: number;
  /** Phase 2: 24h time string e.g. "17:00". */
  peakHoursStart?: string;
  peakHoursEnd?: string;
  /** Phase 2: deposit amount required to confirm. */
  depositRequired?: number;
}

// ─── Core Pitch Entity ─────────────────────────────────────────────────────────

export interface Pitch {
  id: string;
  name: string;
  /** Phase 2: UID of the ground-owner user who manages this pitch. */
  ownerId?: string;
  location: PitchLocation;
  turfType: TurfType;
  supportedFormats: PitchFormat[];
  /** IDs from PITCH_AMENITIES catalog. */
  amenityIds: string[];
  /** Array of photo download URLs (Firebase Storage / CDN). */
  photos: string[];
  rating: number; // 0–5, averaged from reviews
  reviewCount: number;
  pricing: PitchPricing;
  /** Maximum player capacity across the full pitch area. */
  capacity: number;
  /** Ground has been manually verified by Pich admins. */
  isVerified: boolean;
  isActive: boolean;
  operatingHours: {
    weekday: { open: string; close: string }; // e.g. "07:00" / "23:00"
    weekend: { open: string; close: string };
  };
  contactPhone?: string;
  contactWhatsApp?: string;
  description?: string;
  createdAt: string;
}

// ─── Phase 2 — Slot Management ─────────────────────────────────────────────────

/** A single bookable time window on a pitch. */
export interface TimeSlot {
  id: string;
  pitchId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;
  durationMinutes: number;
  status: BookingStatus;
  price: number;
  currency: 'AED';
  /** Phase 2: which team has this slot. */
  bookedByTeamId?: string;
  bookedByUserId?: string;
}

/** Phase 2: Booking confirmation record. */
export interface PitchBooking {
  id: string;
  pitchId: string;
  pitchName: string;
  slotId: string;
  teamId?: string;
  teamName?: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  totalAmount: number;
  currency: 'AED';
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  notes?: string;
  createdAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
}

/** Phase 2: Ground owner slot configuration payload. */
export interface OwnerSlotConfig {
  pitchId: string;
  date: string;
  slots: Omit<TimeSlot, 'id' | 'status' | 'bookedByTeamId' | 'bookedByUserId'>[];
}

// ─── Search ────────────────────────────────────────────────────────────────────

export interface PitchSearchFilters {
  keyword?: string;
  emirate?: UAE_Emirate;
  turfType?: TurfType;
  format?: PitchFormat;
  maxPricePerHour?: number;
  /** Phase 2: only show pitches with availability on this date. */
  date?: string;
  /** Filter by amenity IDs from PITCH_AMENITIES catalog. */
  amenityIds?: string[];
}
