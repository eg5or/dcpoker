import mongoose from 'mongoose';
import { VotingSessionDocument } from './createOrUpdateVotingSession.js';

interface EmojiRecord {
  sessionId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  targetId: string;
  senderName: string;
  targetName: string;
  emoji: string;
  thrownAt: Date;
}

class EmojiBatcher {
  private batchQueue: EmojiRecord[] = [];
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 1000; // 1 секунда
  private flushTimeout: NodeJS.Timeout | null = null;

  constructor() {
    // Запускаем периодическую очистку очереди
    setInterval(() => this.flush(), this.FLUSH_INTERVAL);
  }

  public async addToBatch(
    session: VotingSessionDocument,
    senderId: mongoose.Types.ObjectId,
    targetId: string,
    senderName: string,
    targetName: string,
    emoji: string
  ) {
    const record: EmojiRecord = {
      sessionId: session._id,
      senderId,
      targetId,
      senderName,
      targetName,
      emoji,
      thrownAt: new Date()
    };

    this.batchQueue.push(record);

    // Если достигли размера батча, сразу записываем
    if (this.batchQueue.length >= this.BATCH_SIZE) {
      await this.flush();
    }
  }

  private async flush() {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    try {
      // Группируем записи по sessionId
      const groupedBySession = batch.reduce((acc, record) => {
        const sessionId = record.sessionId.toString();
        if (!acc[sessionId]) {
          acc[sessionId] = [];
        }
        acc[sessionId].push(record);
        return acc;
      }, {} as { [key: string]: EmojiRecord[] });

      // Обновляем каждую сессию одним запросом
      await Promise.all(
        Object.entries(groupedBySession).map(async ([sessionId, records]) => {
          const updateOperations = records.map(record => ({
            senderId: record.senderId,
            targetId: record.targetId,
            senderName: record.senderName,
            targetName: record.targetName,
            emoji: record.emoji,
            thrownAt: record.thrownAt
          }));

          await mongoose
            .model('VotingSession')
            .findByIdAndUpdate(
              sessionId,
              { $push: { emojis: { $each: updateOperations } } },
              { new: true }
            );
        })
      );

      console.log(`Successfully flushed ${batch.length} emoji records`);
    } catch (error) {
      console.error('Error flushing emoji batch:', error);
      // В случае ошибки возвращаем записи в очередь
      this.batchQueue = [...this.batchQueue, ...batch];
    }
  }
}

export const emojiBatcher = new EmojiBatcher(); 