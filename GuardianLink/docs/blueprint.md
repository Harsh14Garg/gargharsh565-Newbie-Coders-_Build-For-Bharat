# **App Name**: GuardianLink

## Core Features:

- On-device Distress Detection: Real-time client-side monitoring of audio for predefined distress keywords and panic sounds using a lightweight AI model. When detected, alerts are triggered via Next.js API routes.
- Emergency Location Sharing: Automatically capture and securely transmit the user's live GPS coordinates via a Google Maps link to alert recipients upon detection of distress.
- Short Audio Clip Recording: Capture a 10-second audio clip immediately after distress detection, which is then sent along with the alert to provide critical context.
- Emergency Alert Dispatch: Send immediate alert notifications (e.g., SMS, email) to pre-registered emergency contacts using Next.js API routes that interface with an external messaging service.
- Personalized Alert Messaging: Utilize a generative AI tool to create concise, contextual emergency messages, dynamically including detected keywords, user's live location, and a clear call for help.
- Contact Management: Allow users to securely add, view, and modify a list of emergency contacts who will receive alerts, storing this information in Firestore.
- Simulated Volunteer Notification: A UI component to simulate and display the dispatch of alerts to nearby 'verified' volunteers, showcasing the broader network capability (prototype scope).

## Style Guidelines:

- Primary interactive color: A calming, deep blue (#1F66AD) to convey trust and reliability, standing out clearly against a light background.
- Background color: A very subtle, cool light gray (#F0F2F4), derived from the primary hue, ensuring excellent readability and a clean interface.
- Accent color: A vibrant yet analogous blue-violet (#5252E0) for critical actions and attention-grabbing elements, ensuring high visibility without clashing.
- Headlines and body text font: 'Inter' (sans-serif), chosen for its modern, clear, and objective aesthetic, suitable for conveying important information effectively across all screen sizes.
- Use clear, universally recognizable icons related to safety, location, and communication, prioritizing clarity over stylistic flair for immediate understanding in emergencies. Material Symbols are a good reference.
- Design a clean, mobile-first layout with crucial information and action buttons prominently positioned. Minimize clutter to ensure immediate usability under stress.
- Employ subtle, functional animations for feedback and status changes (e.g., alert sent confirmation, monitoring active), avoiding elaborate or distracting decorative effects.