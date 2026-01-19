# Project Tasks & Progress

## Current Task: Add Interactive Location Map to Campaign Wizard (COMPLETED)

### Goal
Add a Facebook-like interactive map with click-to-pin and radius targeting to the campaign wizard.

### Todo
- [x] Install leaflet and react-leaflet packages
- [x] Create InteractiveLocationMap component with Leaflet
- [x] Add click-to-pin with radius selection
- [x] Update wizard to use new interactive map
- [x] Add custom location support to mutations service

### Changes Made

#### 1. Installed Dependencies
- `leaflet` - Map library
- `react-leaflet` - React wrapper for Leaflet
- `@types/leaflet` - TypeScript types

#### 2. Created InteractiveLocationMap.tsx
New component at `meta-dashboard/src/components/uploader/InteractiveLocationMap.tsx`:
- Full Leaflet map with dark CARTO tiles
- Click anywhere to drop a red pin
- Draggable pins - move them around
- Radius circles showing targeting area (default 25km)
- Popup with +/- buttons to adjust radius (1-500km)
- Blue markers for searched locations
- Red markers for custom pins
- Remove pins from popup

#### 3. Updated Wizard (page.tsx)
- Added `customPins` state for map-clicked locations
- Added pin handlers: `addCustomPin`, `updateCustomPin`, `removeCustomPin`
- Updated `canSubmit` to allow either searched locations OR custom pins
- Updated payload to combine both location types with lat/lng/radius for custom pins

#### 4. Updated mutations.service.ts
- Extended `GeoLocationTarget` type to support `custom_location` type
- Added optional `latitude`, `longitude`, `radius` fields

#### 5. Added Leaflet CSS
- Imported in layout.tsx: `import "leaflet/dist/leaflet.css"`

### Features
- **Click to pin**: Click anywhere on map to drop a targeting pin
- **Drag to move**: Pins are draggable
- **Radius control**: +/- buttons in popup to adjust radius (1-500km)
- **Visual feedback**: Red circles show targeting radius
- **Dual mode**: Works with both search results (blue) and custom pins (red)
- **Dark theme**: Uses CARTO dark basemap to match wizard UI

---

## Previous Task: Enhance AI Data with Complete Account Data

### Summary
Enhanced the AI services to receive all available account data for smarter analysis.

---

## Previous Completed Tasks

### Change Report Builder Toggle from X to +/- Icons
- Changed X icon to Minus (-) icon when panel is open
- Changed collapsed button from Filter icon to Plus (+) icon when panel is closed

### Insights Page Full Localization
Added complete translation support for all hardcoded English text on the Insights page, including RTL layout fixes for Hebrew/Arabic.

### Age-Gender Translation Support
Added translation logic to detect the `" | "` separator and translate only the gender portion.

### Reports Account Filtering Bug Fix + Platform Breakdown
Fixed account filtering bug and added Platform as separate breakdown option.
