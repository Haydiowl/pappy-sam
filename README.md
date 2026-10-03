# Pappy Sam Landing Page

A responsive landing page built from the supplied Pappy Sam design.

## Files

- `index.html` — the webpage structure
- `styles.css` — layout, responsive styling, hover states, and animations
- `script.js` — section reveal animations, service forms, offering tabs, and testimonial carousel
- `api/availability.js` — server-side Google Calendar availability endpoint
- `api/book.js` — server-side booking endpoint that rechecks availability before creating an event
- `.env.example` — safe placeholder names for required booking configuration
- `assets/pappy-sam-landing-page.svg` — the original design artwork

## Run it on your computer

Open `index.html` in a web browser. No installation or build command is required.

## Publish with Vercel

1. Upload these files to a new GitHub repository.
2. Go to [Vercel](https://vercel.com/new) and import that repository.
3. Choose **Other** as the framework preset, leave the build settings empty, and click **Deploy**.

## Enable real Google Calendar bookings

The appointment forms deliberately do not show sample availability or fake booking confirmations. They become operational only after the website owner connects a Google Calendar through Vercel's server-side environment variables.

1. In Google Cloud Console, create or select a project and enable the Google Calendar API.
2. Configure the OAuth consent screen for the calendar owner's Google account.
3. Create an OAuth web client, add your approved redirect URL, and complete an owner-authorized OAuth flow that requests calendar event access and produces a refresh token. Keep the token private.
4. Choose the calendar to receive bookings. Use `primary` for the owner's main calendar, or its calendar ID for a dedicated booking calendar.
5. In Vercel, open the project settings, then add the variables listed in `.env.example`. Never place these values in `index.html`, `script.js`, GitHub, or any `VITE_`/`NEXT_PUBLIC_` variable.
6. Set the working hours and timezone. The default timezone is `Africa/Lagos`, with availability from `09:00` to `17:00`.
7. Deploy, then test an available Therapy and Agricultural booking. Confirm that each event appears in the chosen Google Calendar before telling visitors booking is live.

The owner manages blocked time, existing events, and confirmed appointments directly in Google Calendar. The website checks busy periods before showing slots and rechecks immediately before event creation.
