import { Server } from 'socket.io';

interface BroadcastEvent {
  event: string;
  data: any[];
}

class EventBroadcaster {
  private pendingBroadcasts: Map<string, BroadcastEvent[]> = new Map();
  private readonly BROADCAST_THROTTLE = 50; // ms

  constructor() {}

  public throttledBroadcast(io: Server, room: string, event: string, ...data: any[]) {
    if (!this.pendingBroadcasts.has(room)) {
      this.pendingBroadcasts.set(room, []);
      
      setTimeout(() => {
        const events = this.pendingBroadcasts.get(room);
        if (events && events.length > 0) {
          // Группируем события по типу
          const groupedEvents = events.reduce((acc, event) => {
            if (!acc[event.event]) {
              acc[event.event] = [];
            }
            acc[event.event].push(event.data);
            return acc;
          }, {} as { [key: string]: any[][] });

          // Отправляем события пакетами
          Object.entries(groupedEvents).forEach(([eventName, eventDataArray]) => {
            if (eventDataArray.length === 1) {
              // Если только одно событие, отправляем как обычно
              io.to(room).emit(eventName, ...eventDataArray[0]);
            } else {
              // Если несколько событий, отправляем как пакет
              io.to(room).emit(`${eventName}:batch`, eventDataArray);
            }
          });
        }
        this.pendingBroadcasts.delete(room);
      }, this.BROADCAST_THROTTLE);
    }

    this.pendingBroadcasts.get(room)?.push({
      event,
      data
    });
  }
}

export const eventBroadcaster = new EventBroadcaster(); 