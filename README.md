# ⚽ Pich — The UAE Amateur Football Hub

Pich is a premium React Native & Expo application designed specifically for amateur football players, teams, and tournament organizers in the United Arab Emirates (UAE). By combining location-based pitch booking, dynamic player matchmaking, team challenges, tournament management, and state-of-the-art **Pich AI Video Processing**, Pich acts as the ultimate digital home for the local football community.

---

## 🌟 Core Features

### 1. 🏟️ Interactive Pitch Booking
* **Pitches Search**: Find pitches across the UAE with map integration.
* **Smart Filtering**: Filter pitches by size (5v5, 7v7, 11v11), type (indoor/outdoor, natural/artificial turf), price range, and amenities (showers, parking, bibs, water).
* **Direct Booking**: Check real-time availability slots and book directly from the app.

### 2. ⚡ Pickup Games & Matchmaking
* **Create Pickup Matches**: Set up a game, choose team sizes, game format, pitch venue, date, time, and specify if it is open to all.
* **Join Matches**: Discover local games happening nearby and request to join.
* **Live Lineups**: Visual positioning of players in the squad layout (GK, DEF, MID, FWD) so teams are balanced before kickoff.

### 3. ⚔️ Team Challenges & Management
* **Team Squads**: Create a team, design an identity, manage the roster, and recruit **Free Agents**.
* **Direct Challenges**: Send team-vs-team challenge requests to other clubs in the region with pitch location, date, and stakes.
* **Submit Results**: Report match outcomes (wins, losses, draws) with goals, assists, and team scores, subject to co-verification.

### 4. 🧠 Pich AI Video Processing (Auto-Highlights)
* **Footage Submission**: Upload raw matches via single-phone, dual-camera rigs (automatically stitched), or external links (YouTube, Google Drive).
* **Branded Outputs**: Generate:
  * **Highlights Reels**: Condensed match action.
  * **Player Reels**: 9:16 vertical video formatted for Instagram/TikTok focusing on a single player's touches.
  * **Scoreboard Overlays**: Broadcast-quality scoreboards, sponsor graphics, and team badges.
* **Auto-Ball Tracking**: Smart crop/pan simulating a moving camera following the match play.
* **Detected Events**: AI automatically identifies goals (⚽), saves (🧤), skills (🪄), and tackles.

### 5. 🏆 Tournaments & Leagues
* **Tournament Setup**: Organizers can generate schedules, groups, and brackets (knockout / round-robin).
* **Live Standings**: Real-time points tables showing wins, losses, goal differences, and top scorers.
* **Dynamic Fixtures**: Interactive brackets detailing matches from the Round of 16 through to the Finals.

### 6. 📈 Dynamic Rating & Stats System
* **Player Cards**: Custom card layouts displaying statistics (matches played, goals, assists, clean sheets).
* **Formula-Based Ratings**: Algorithmic recalculation of player capability points based on recent performances, positions, and opponent difficulty tiers.

### 7. 💬 Real-Time Chats & Feeds
* **Match Chats**: Instant communication channels for every specific pickup match.
* **Team Channels**: Dedicated discussions for club rosters.
* **Direct Messages**: Keep in touch with friends and arrange local games.

---

## 📁 Project Architecture & Directory Layout

Pich is structured using a clean, scalable separation of concerns using Expo's file-based router (`expo-router`):

```text
pich/
├── app/                        # Expo Router Pages (Navigation & Views)
│   ├── (tabs)/                 # Main Application Tab Views
│   │   ├── index.tsx           # Home Feed (Nearby matches, tournaments)
│   │   ├── my-team.tsx         # User's Team hub
│   │   └── profile.tsx         # Personal Player Card & Stats
│   ├── chat/                   # Match & Pickup group chats
│   ├── chat-team/              # Team specific group chats
│   ├── direct-chat/            # Friend-to-Friend DMs
│   ├── team/                   # Detailed team profiles
│   ├── tournament/             # Tournament lists & bracket pages
│   ├── ai-highlights.tsx       # Pich AI Video Submission & Status Dashboard
│   ├── login.tsx               # User sign-in page
│   ├── signup.tsx              # Account creation flow
│   ├── profile-setup.tsx       # Onboarding setup (position, height, rating)
│   └── _layout.tsx             # Global navigation layout & providers
│
├── src/                        # Logic & Business Components
│   ├── components/             # Reusable UI Components
│   │   ├── pitch/              # Pitch search & filters
│   │   ├── video/              # Submit video modals & job cards
│   │   ├── CustomDialog.tsx    # Branded overlay dialogues
│   │   └── PremiumBackground.tsx # Sleek animated particle background
│   │
│   ├── config/                 # Configurations
│   │   └── firebase.ts         # Firebase client SDK initialization
│   │
│   ├── context/                # Context API Providers
│   │   └── DialogContext.tsx   # Global alert/dialog state
│   │
│   ├── services/               # Mock & API Services
│   │   ├── aiVideoService.ts   # Pich AI Video processing mock API
│   │   └── pitchService.ts     # UAE Pitch retrieval & reservations
│   │
│   ├── types/                  # TypeScript interface definitions
│   │   ├── aiVideo.ts          # VideoJob, Reels, Event definitions
│   │   └── pitch.ts            # Pitches, slots, bookings structures
│   │
│   └── utils/                  # Helper Utilities & Mathematical Models
│       ├── challengeService.ts # Roster challenges & match proposals
│       ├── friendsService.ts   # Follower / Friends connection database
│       ├── matchService.ts     # Game bookings & stats submissions
│       ├── ratingService.ts    # Player performance recalculation formulas
│       └── teamService.ts      # Roster management & transfer systems
│
├── constants/
│   └── theme.ts                # Branding colors (Dark palette & Neon Mint tint)
├── firestore.rules             # Database security policies
├── app.json                    # Expo build configurations (iOS/Android bundles)
└── package.json                # Project dependencies
```

---

## 🏛️ Technical Stack & Integrations

* **Core Framework**: React Native 0.81.x with Expo SDK 54
* **Navigation**: File-based Expo Router v6
* **Database & Auth**: Google Firebase v12 (Firestore, Firebase Auth)
* **Programming Language**: TypeScript
* **Styling**: Vanilla React Native StyleSheet with custom HSL tailored theme tokens
* **Animations**: React Native Reanimated (dynamic particle flows on authentication/premium screens)
* **Location & Maps**: `expo-location` and `react-native-maps` for geolocating matches and venues in Dubai, Abu Dhabi, and Sharjah

---

## ⚙️ Mathematical Models & Ratings

Pich calculates player rankings algorithmically based on game statistics. The rating model considers:
* **Position Weighting**: Goals carry more weight for Forward positions, whereas clean sheets and successful tackles dictate rating boosts for Goalkeepers and Defenders.
* **Opponent Difficulty**: Matches won against teams with a higher average squad rating yield a significantly higher points multiplier.
* **Fair Play & Attendance**: Consistent match attendance and low card rates trigger bonus rating points.

---

## 🎨 Design & Aesthetic Guidelines

Pich employs a custom, high-fidelity dark-mode layout aimed at delivering a premium, elite feel:
* **Base Color**: Jet Black (`#050505` to `#0D0D0D`)
* **Accents/Tints**: Neon Lime/Mint Tint (`Colors.dark.tint`), indicating active components and buttons.
* **Overlays**: Subtle glassmorphism gradients using semi-transparent white/gray borders (`rgba(255,255,255,0.05)`) to layer card structures over the animated particle background (`PremiumBackground.tsx`).
* **Fonts**: Modern sans-serif typography utilizing clean spacing and bold weights for headings to make player cards feel professional.

---

## 🚀 Environment Setup & Installation

### Prerequisites
Ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [Expo Go](https://expo.dev/go) app on your mobile device (for quick testing) or Android Studio/Xcode (for emulator testing)

### Installation Steps
1. **Clone the repository & navigate to workspace**:
   ```bash
   cd "Pich football app/pich"
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

   Ensure you run the server with clear cache if you encounter any Expo bundle issues:
   ```bash
   npx expo start --clear
   ```

---

## 🛠️ Diagnostics & Code Quality

* **TypeScript Compilation Check**: Compile the project with zero-emit to verify types:
  ```bash
  npx tsc --noEmit
  ```
* **Linting Code Quality**: Run the linter check:
  ```bash
  npm run lint
  ```
