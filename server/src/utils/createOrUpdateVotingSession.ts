import mongoose from "mongoose";
import VotingSession from "../models/session.model.js";

// Типизируем документ MongoDB для правильной работы с ID и параметрами
export type VotingSessionDocument = {
  _id: mongoose.Types.ObjectId;
  get: (name: string) => any;
  set: (data: any) => void;
  save: () => Promise<any>;
};

// Функция для создания новой сессии голосования
export async function createOrUpdateVotingSession(
  currentSession: VotingSessionDocument | null,
  initialCreatorId?: string
): Promise<VotingSessionDocument> {
  try {
    // Если текущая сессия не существует, создаем новую
    if (!currentSession) {
      const creatorId = initialCreatorId
        ? new mongoose.Types.ObjectId(initialCreatorId)
        : new mongoose.Types.ObjectId();

      currentSession = (await VotingSession.create({
        createdBy: creatorId,
        title: `Сессия ${new Date().toLocaleString()}`,
        status: 'active',
        participants: [],
        votes: [],
        emojis: [],
        wasRevealed: false,
        createdAt: new Date(),
      })) as unknown as VotingSessionDocument;

      console.log('Создана новая сессия голосования:', currentSession._id);
    }

    return currentSession;
  } catch (error) {
    console.error('Ошибка при создании/обновлении сессии голосования:', error);
    throw error;
  }
}