# Review QR landing image slots

The landing page currently uses CSS fallback visuals so production builds do not depend on missing images.

Future image files can be added here:

- `hero-counter.jpg`: Beauty counter with Review QR stand and phone review flow, for the hero visual.
- `customer-checkout.jpg`: Customer at checkout seeing a QR stand before leaving, for the real shop scene section.
- `beauty-counter.jpg`: Premium beauty salon counter environment, for mid-page visual support.

After adding real images, update `src/app/review-qr-system/ReviewQrLandingClient.tsx` to render the image inside the matching `ReviewQrImageSlot`.
