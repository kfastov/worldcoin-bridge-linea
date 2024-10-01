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

export async function getUnclaimedMessages() {
  return new Promise((resolve, reject) => {
    db.find({ status: 'confirmed' }, (err, docs) => {
      if (err) {
        console.error('Failed to get unclaimed messages:', err);
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

export async function deleteClaimedMessages() {
  return new Promise((resolve, reject) => {
    db.remove({ status: 'claimed' }, { multi: true }, (err, numRemoved) => {
      if (err) {
        console.error('Failed to delete claimed messages:', err);
        reject(err);
      } else {
        console.log(`Deleted ${numRemoved} claimed messages`);
        resolve(numRemoved);
      }
    });
  });
}