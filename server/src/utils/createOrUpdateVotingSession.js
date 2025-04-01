import mongoose from 'mongoose';

const votingSessionSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
  revealedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' }, // Добавляем ссылку на комнату
  roomCode: { type: String }, // Добавляем код комнаты для удобства поиска
  isActive: { type: Boolean, default: true },
  votes: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      socketId: { type: String },
      username: { type: String },
      initialVote: { type: Number },
      finalVote: { type: Number },
      changedAfterReveal: { type: Boolean, default: false },
    },
  ],
  averageVote: { type: Number, default: null },
  consistency: {
    emoji: { type: String, default: null },
    description: { type: String, default: null },
  },
});

votingSessionSchema.index({ createdAt: -1 });
votingSessionSchema.index({ isActive: 1 });
votingSessionSchema.index({ roomId: 1 });
votingSessionSchema.index({ roomCode: 1 });

const VotingSession = mongoose.model('VotingSession', votingSessionSchema);

export const createOrUpdateVotingSession = async (currentSession, userId, roomId = null, roomCode = null) => {
  try {
    // Завершаем текущую сессию, если она существует
    if (currentSession && currentSession.isActive) {
      currentSession.isActive = false;
      currentSession.completedAt = new Date();
      await currentSession.save();
      console.log(`Сессия ${currentSession._id} завершена`);
    }

    // Создаем новую сессию
    const newSession = new VotingSession({
      createdAt: new Date(),
      initiatedBy: new mongoose.Types.ObjectId(userId),
      isActive: true,
      participants: [new mongoose.Types.ObjectId(userId)],
      roomId: roomId ? new mongoose.Types.ObjectId(roomId) : null,
      roomCode: roomCode,
    });

    await newSession.save();
    console.log(`Создана новая сессия ${newSession._id}`);
    return newSession;
  } catch (error) {
    console.error('Ошибка при создании/обновлении сессии голосования:', error);
    return currentSession;
  }
};

// Для типизации в TypeScript
export class VotingSessionDocument extends mongoose.Document {
  createdAt: Date;
  revealedAt: Date | null;
  completedAt: Date | null;
  participants: mongoose.Types.ObjectId[];
  initiatedBy: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId | null;
  roomCode: string | null;
  isActive: boolean;
  votes: {
    userId: mongoose.Types.ObjectId;
    socketId: string;
    username: string;
    initialVote: number;
    finalVote: number;
    changedAfterReveal: boolean;
  }[];
  averageVote: number | null;
  consistency: {
    emoji: string | null;
    description: string | null;
  };
} 