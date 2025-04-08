// Migration: Levels Update
// Description: Adds room functionality and updates existing collections

db = db.getSiblingDB('dcpoker');

print('Starting migration: Levels Update');

// 1. Create new collections if they don't exist
try {
    db.createCollection('rooms');
    db.createCollection('userstats');
    db.createCollection('globalstats');
    print('✅ Created collections');
} catch (e) {
    if (e.codeName === 'NamespaceExists') {
        print('ℹ️ Collections already exist');
    } else {
        print('❌ Error creating collections:', e);
        throw e;
    }
}

// 2. Create required indexes
print('Creating indexes...');
try {
    db.rooms.createIndex({ "code": 1 }, { unique: true });
    db.rooms.createIndex({ "lastActivity": -1 });
    db.rooms.createIndex({ "isActive": 1 });
    db.sessions.createIndex({ "roomCode": 1 });
    db.userstats.createIndex({ "userId": 1 });
    db.userstats.createIndex({ "lastUpdated": -1 });
    print('✅ Created all required indexes');
} catch (e) {
    print('❌ Error creating indexes:', e);
    throw e;
}

// 3. Update existing sessions to include room information
print('Updating existing sessions...');
try {
    const sessions = db.sessions.find({
        roomId: { $exists: false },
        roomCode: { $exists: false }
    });

    sessions.forEach(session => {
        // Create room if doesn't exist
        const roomCode = session.roomCode || `R${Math.random().toString(36).substr(2, 6)}`;
        const roomName = `Room ${roomCode}`;

        const room = db.rooms.findOneAndUpdate(
            { code: roomCode },
            {
                $setOnInsert: {
                    name: roomName,
                    code: roomCode,
                    createdAt: new Date(),
                    lastActivity: new Date(),
                    isActive: true,
                    settings: {
                        votingSequence: [0.1, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100],
                        allowObservers: true,
                        autoReveal: false
                    }
                }
            },
            { upsert: true, returnNewDocument: true }
        );

        // Update session with room info
        db.sessions.updateOne(
            { _id: session._id },
            {
                $set: {
                    roomId: room._id,
                    roomCode: roomCode
                }
            }
        );
    });
    print('✅ Updated existing sessions');
} catch (e) {
    print('❌ Error updating sessions:', e);
    throw e;
}

// 4. Update user model to support emoji passwords
print('Updating user model...');
try {
    db.users.updateMany(
        { emojiPassword: { $exists: false } },
        {
            $set: {
                emojiPassword: "🎲🎲🎲" // Default emoji password
            }
        }
    );
    print('✅ Updated user model');
} catch (e) {
    print('❌ Error updating user model:', e);
    throw e;
}

// 5. Initialize global stats if not exists
print('Initializing global stats...');
try {
    const globalStats = db.globalstats.findOne();
    if (!globalStats) {
        const totalSessions = db.sessions.count();
        const completedSessions = db.sessions.count({ status: 'completed' });
        const totalUsers = db.users.count();
        const activeUsers = db.users.count({
            lastActivityAt: { 
                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
            }
        });

        db.globalstats.insertOne({
            totalSessions,
            completedSessions,
            totalUsers,
            activeUsers,
            votesStats: {
                total: 0,
                values: [],
                averagePerSession: 0,
                changedAfterReveal: 0
            },
            emojisStats: {
                total: 0,
                topEmojis: []
            },
            processedSessionIds: [],
            lastUpdated: new Date()
        });
        print('✅ Initialized global stats');
    } else {
        print('ℹ️ Global stats already exist');
    }
} catch (e) {
    print('❌ Error initializing global stats:', e);
    throw e;
}

print('Migration completed successfully!'); 