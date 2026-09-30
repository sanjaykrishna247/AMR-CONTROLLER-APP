# ARCEUX Control: Multipurpose Mobile Robot console (PWA)

An operator console for the Multipurpose Mobile Robot (material handling + inspection).
It runs entirely in the browser with no backend. A built-in simulator drives the robot:
A* path planning on the SLAM map, LiDAR raycasting, towing missions, 4-DOF arm FK/IK,
and a battery model based on the report's design calculations.

## Run
```bash
npm install
npm run dev          # http://localhost:5173 (also reachable from a phone on the same Wi-Fi)
npm run build        # production build in dist/
npm run preview      # serve the build (service worker + install prompt work here)
```

## Pages
- **Overview**: robot status, KPIs, live map (tap to send robot), camera preview, current mission, activity log
- **Navigation**: occupancy map with LiDAR/costmap layers, station shortcuts, pose/odometry, teleop joystick, sim speed
- **Inspection Arm**: simulated camera feed with label/gauge lock, zoom, capture; side-view arm with tap-to-reach IK; joint sliders; posture macros
- **Missions**: plan tow / inspect / go-to missions, reorder the queue, history
- **System Health**: battery, per-subsystem current draw, drive motors, ROS 2 node graph, design specs

Built with React, Vite, React Router, and lucide-react. The IBM Plex fonts are bundled so the app works offline.

## Deploy to Vercel
1. Push this folder to a GitHub repo.
2. On vercel.com → **Add New… → Project** → import the repo.
3. Vercel detects Vite from `vercel.json` (build `npm run build`, output `dist`). Click **Deploy**.

Or from the terminal: `npx vercel` (preview) / `npx vercel --prod` (production).
