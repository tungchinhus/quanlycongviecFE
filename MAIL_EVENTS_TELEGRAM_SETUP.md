# Mail Events → Telegram Notification Setup

This guide covers setting up the **mail_events** Firestore flow and the Cloud Function that sends Telegram notifications.

---

## 1. Firebase Cloud Functions (npm)

From the **project root** (where `firebase.json` lives):

```bash
cd functions
npm install
npm run build
```

This installs `firebase-functions`, `firebase-admin`, and `axios`, and compiles TypeScript to `lib/`.

To deploy only functions:

```bash
# From project root
firebase deploy --only functions
```

---

## 2. Angular app (Firestore)

The Angular app already uses Firebase. Firestore is provided in `main.ts` via `provideFirestore()`. No extra npm install is needed for the mail-events feature.

To use the service in a component:

```ts
import { MailEventsService } from '../services/mail-events.service';

constructor(private mailEvents: MailEventsService) {}

// When you want to log an email event (e.g. after sending):
this.mailEvents.logMailEvent({
  to: 'user@example.com',
  subject: 'Your report',
  status: 'sent'
}).subscribe(ref => console.log('Logged:', ref.id));
```

---

## 3. Firebase secrets (Telegram Bot Token & Chat ID)

**Do not** put the Telegram bot token or chat ID in code. Use Firebase (Google Cloud) secret manager.

### Create a Telegram Bot and get Chat ID

1. In Telegram, open [@BotFather](https://t.me/BotFather), create a bot with `/newbot`, and copy the **bot token** (e.g. `123456789:ABCdef...`).
2. Start a chat with your bot or add it to a group. For your user chat ID, message [@userinfobot](https://t.me/userinfobot) or use the Telegram API: `https://api.telegram.org/bot<TOKEN>/getUpdates` after sending a message to your bot; the `chat.id` in the response is your **chat ID**.

### Set secrets in Firebase CLI

From the **project root**:

```bash
# Set the two secrets (you will be prompted to enter the values)
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
firebase functions:secrets:set TELEGRAM_CHAT_ID
```

When prompted, paste:

- **TELEGRAM_BOT_TOKEN**: the bot token from BotFather.
- **TELEGRAM_CHAT_ID**: your (or the group) chat ID, e.g. `123456789`.

To confirm they exist (names only):

```bash
firebase functions:secrets:access TELEGRAM_BOT_TOKEN
firebase functions:secrets:access TELEGRAM_CHAT_ID
```

---

## 4. Firestore rules (optional)

Ensure only allowed clients can create documents in `mail_events`. Example (adjust to your auth model):

```javascript
match /mail_events/{docId} {
  allow create: if request.auth != null;
  allow read, update, delete: if false;
}
```

---

## 5. Summary

| Step | Command / action |
|------|-------------------|
| Install function deps | `cd functions && npm install` |
| Build functions | `npm run build` (inside `functions/`) |
| Set Telegram token | `firebase functions:secrets:set TELEGRAM_BOT_TOKEN` |
| Set Telegram chat ID | `firebase functions:secrets:set TELEGRAM_CHAT_ID` |
| Deploy functions | `firebase deploy --only functions` |
| Use in Angular | Inject `MailEventsService` and call `logMailEvent({ to, subject, status })` |

After deployment, creating a document in the `mail_events` collection (e.g. via `MailEventsService.logMailEvent()`) will trigger the Cloud Function and send a formatted message to your Telegram chat.
