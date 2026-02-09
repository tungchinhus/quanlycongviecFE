import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import type { DocumentReference } from 'firebase/firestore';
import { from, Observable } from 'rxjs';

export interface MailEventPayload {
  to: string;
  subject: string;
  status: string;
  /** Optional extra fields (e.g. body, error, timestamp) */
  [key: string]: unknown;
}

const MAIL_EVENTS_COLLECTION = 'mail_events';

/**
 * Service to log email-related events to Firestore collection `mail_events`.
 * A Cloud Function triggers on document creation and sends a Telegram notification.
 */
@Injectable({
  providedIn: 'root',
})
export class MailEventsService {
  private get mailEventsRef() {
    return collection(this.firestore, MAIL_EVENTS_COLLECTION);
  }

  constructor(private firestore: Firestore) {}

  /**
   * Adds a mail event document to Firestore. The Cloud Function will send a
   * push notification to Telegram when this document is created.
   */
  logMailEvent(payload: MailEventPayload): Observable<DocumentReference> {
    const doc = {
      ...payload,
      createdAt: serverTimestamp(),
    };
    return from(addDoc(this.mailEventsRef, doc));
  }
}
