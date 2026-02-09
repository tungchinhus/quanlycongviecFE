import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import axios from "axios";

const telegramBotToken = defineSecret("TELEGRAM_BOT_TOKEN");
const telegramChatId = defineSecret("TELEGRAM_CHAT_ID");

const MAIL_EVENTS_COLLECTION = "mail_events";

interface MailEventData {
  to?: string;
  subject?: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * Triggered when a new document is created in the `mail_events` collection.
 * Sends a formatted notification to Telegram.
 */
export const onMailEventCreated = onDocumentCreated(
  {
    document: `${MAIL_EVENTS_COLLECTION}/{docId}`,
    secrets: [telegramBotToken, telegramChatId],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.warn("No data associated with the event");
      return;
    }

    const data = snapshot.data() as MailEventData;
    const to = data?.to ?? "(no recipient)";
    const subject = data?.subject ?? "(no subject)";
    const status = data?.status ?? "(no status)";

    const message = [
      "📧 *Mail event*",
      "",
      `*To:* ${escapeMarkdown(to)}`,
      `*Subject:* ${escapeMarkdown(subject)}`,
      `*Status:* ${escapeMarkdown(status)}`,
    ].join("\n");

    const token = telegramBotToken.value();
    const chatId = telegramChatId.value();

    if (!token || !chatId) {
      console.error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set");
      return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
      await axios.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });
      console.log("Telegram notification sent successfully");
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data : String(err);
      console.error("Failed to send Telegram notification:", msg);
      throw err;
    }
  }
);

/** Escape special MarkdownV1 characters for Telegram */
function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+=|{}.!-])/g, "\\$1");
}
