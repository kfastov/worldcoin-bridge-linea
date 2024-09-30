import Datastore from 'nedb';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Datastore({
  filename: path.join(__dirname, 'messages.db'),
  autoload: true
});

export async function connectToDatabase() {
  console.log('Database connected successfully');
}

export async function saveMessage(messageData) {
  return new Promise((resolve, reject) => {
    db.insert(messageData, (err, newDoc) => {
      if (err) {
        console.error('Failed to save message:', err);
        reject(err);
      } else {
        console.log('Message saved successfully:', newDoc.messageHash);
        resolve(newDoc);
      }
    });
  });
}

export async function getUnconfirmedMessages() {
  return new Promise((resolve, reject) => {
    db.find({ status: 'pending' }, (err, docs) => {
      if (err) {
        console.error('Failed to get unconfirmed messages:', err);
        reject(err);
      } else {
        resolve(docs);
      }
    });
  });
}

export async function updateMessageStatus(messageHash, status) {
  return new Promise((resolve, reject) => {
    db.update({ messageHash }, { $set: { status, updatedAt: new Date() } }, {}, (err, numReplaced) => {
      if (err) {
        console.error('Failed to update message status:', err);
        reject(err);
      } else {
        console.log(`Message ${messageHash} status updated to ${status}`);
        resolve(numReplaced);
      }
    });
  });
}

export async function deleteConfirmedMessages() {
  return new Promise((resolve, reject) => {
    db.remove({ status: 'confirmed' }, { multi: true }, (err, numRemoved) => {
      if (err) {
        console.error('Failed to delete confirmed messages:', err);
        reject(err);
      } else {
        console.log(`Deleted ${numRemoved} confirmed messages`);
        resolve(numRemoved);
      }
    });
  });
}